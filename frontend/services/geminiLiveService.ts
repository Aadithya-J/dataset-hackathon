/**
 * Gemini Live Voice Service - FIXED VERSION
 * Production-ready real-time voice chat with proper:
 * - Anti-aliasing downsampling (Box Filter)
 * - VAD interruption handling
 * - Audio queue management
 * - Proper turn-taking
 * 
 * Based on official Google Gemini Live API documentation (Dec 2025)
 */

import { GoogleGenAI, Modality } from '@google/genai';

const MODEL_NAME = "gemini-2.5-flash-native-audio-preview-12-2025";
const TARGET_SAMPLE_RATE = 16000;        // Gemini input: 16kHz
const PLAYBACK_SAMPLE_RATE = 24000;      // Gemini output: 24kHz
const VAD_SILENCE_MS = 1000;             // Silence duration before auto-end
const VOLUME_THRESHOLD = 0.08;           // For UI feedback only

/**
 * AudioRecordingWorklet with Box Filter Downsampling
 * This prevents aliasing by averaging samples instead of skipping them.
 */
const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.buffer = new Int16Array(2048);
        this.bufferWriteIndex = 0;
        this.inputSampleRate = options.processorOptions?.sampleRate || 48000;
        this.targetSampleRate = options.processorOptions?.targetSampleRate || 16000;
        
        // Box filter downsampling state
        this.ratio = this.inputSampleRate / this.targetSampleRate;
        this.accumulatedSamples = 0;
        this.processBuffer = 0;
        this.processCount = 0;
    }

    process(inputs) {
        if (inputs.length > 0 && inputs[0].length > 0) {
            const inputChannel = inputs[0][0];
            
            // Box Filter Downsampling: Average samples instead of skipping
            // This acts as a low-pass anti-aliasing filter
            for (let i = 0; i < inputChannel.length; i++) {
                this.processBuffer += inputChannel[i];
                this.processCount++;
                this.accumulatedSamples++;

                if (this.accumulatedSamples >= this.ratio) {
                    // Average the accumulated samples
                    const average = this.processBuffer / this.processCount;
                    
                    // Clamp to [-1, 1] and convert to Int16
                    const clamped = Math.max(-1.0, Math.min(1.0, average));
                    this.buffer[this.bufferWriteIndex++] = Math.floor(clamped * 32767);
                    
                    // Reset accumulators
                    this.processBuffer = 0;
                    this.processCount = 0;
                    this.accumulatedSamples -= this.ratio;

                    // Send buffer if full
                    if (this.bufferWriteIndex >= this.buffer.length) {
                        const dataToSend = this.buffer.slice(0, this.bufferWriteIndex);
                        this.port.postMessage({
                            eventType: "audioData",
                            audioData: dataToSend.buffer
                        }, [dataToSend.buffer]);
                        this.buffer = new Int16Array(2048);
                        this.bufferWriteIndex = 0;
                    }
                }
            }
        }
        return true;
    }
}
registerProcessor('audio-processing-worklet', AudioProcessingWorklet);
`;

/**
 * Volume meter worklet for UI feedback
 */
const VolumeMeterWorklet = `
class VolumeMeter extends AudioWorkletProcessor {
    constructor() {
        super();
        this.volume = 0;
        this.lastUpdate = 0;
    }
    
    process(inputs) {
        const input = inputs[0];
        if (input.length > 0 && input[0].length > 0) {
            let sumOfSquares = 0.0;
            for (const sample of input[0]) {
                sumOfSquares += sample * sample;
            }
            const rms = Math.sqrt(sumOfSquares / input[0].length);
            this.volume = Math.min(1.0, rms * 5); // Boost for visibility
            
            // Throttle to ~60fps
            const now = currentTime;
            if (now - this.lastUpdate > 0.016) {
                this.port.postMessage({ volume: this.volume });
                this.lastUpdate = now;
            }
        }
        return true;
    }
}
registerProcessor('volume-meter', VolumeMeter);
`;

export interface GeminiLiveCallbacks {
    onReady?: () => void;
    onListening?: () => void;
    onSpeaking?: () => void;
    onTranscript?: (text: string, isUser: boolean) => void;
    onVolume?: (volume: number) => void;
    onError?: (error: string) => void;
    onClose?: () => void;
}

export class GeminiLiveService {
    private genAI: GoogleGenAI | null = null;
    private liveSession: any = null;
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private audioSource: MediaStreamAudioSourceNode | null = null;
    private audioWorkletNode: AudioWorkletNode | null = null;
    private volumeWorkletNode: AudioWorkletNode | null = null;
    private playbackContext: AudioContext | null = null;
    
    private isStreaming = false;
    private isPlaying = false;
    private callbacks: GeminiLiveCallbacks = {};
    
    // Audio queue and playback management
    private audioQueue: AudioBuffer[] = [];
    private currentSource: AudioBufferSourceNode | null = null;

    constructor(callbacks: GeminiLiveCallbacks) {
        this.callbacks = callbacks;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async start(apiKey: string, systemPrompt: string): Promise<void> {
        if (this.isStreaming) return;

        try {
            // Initialize GoogleGenAI Client
            this.genAI = new GoogleGenAI({ apiKey });

            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create audio context for recording (try native 16kHz first, fallback to resampling)
            try {
                this.audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
            } catch {
                // Fallback if browser doesn't support explicit sample rate
                this.audioContext = new AudioContext();
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const actualSampleRate = this.audioContext.sampleRate;
            console.log('[GeminiLive] AudioContext sample rate:', actualSampleRate);

            this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Add audio processing worklet
            const workletBlob = new Blob([AudioRecordingWorklet], { type: 'application/javascript' });
            const workletURL = URL.createObjectURL(workletBlob);
            await this.audioContext.audioWorklet.addModule(workletURL);

            // Add volume meter worklet
            const volumeBlob = new Blob([VolumeMeterWorklet], { type: 'application/javascript' });
            const volumeURL = URL.createObjectURL(volumeBlob);
            await this.audioContext.audioWorklet.addModule(volumeURL);

            // Create worklet nodes with proper resampling parameters
            this.audioWorkletNode = new AudioWorkletNode(
                this.audioContext,
                'audio-processing-worklet',
                {
                    processorOptions: {
                        sampleRate: actualSampleRate,
                        targetSampleRate: TARGET_SAMPLE_RATE
                    }
                }
            );

            this.volumeWorkletNode = new AudioWorkletNode(this.audioContext, 'volume-meter');

            this.audioSource.connect(this.audioWorkletNode);
            this.audioSource.connect(this.volumeWorkletNode);

            // Handle volume updates (UI feedback only)
            this.volumeWorkletNode.port.onmessage = (event) => {
                if (this.isStreaming && event.data.volume !== undefined) {
                    this.callbacks.onVolume?.(event.data.volume);
                }
            };

            // Create playback context at Gemini's output rate
            this.playbackContext = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });

            // Connect to Gemini Live API
            this.liveSession = await this.genAI.live.connect({
                model: MODEL_NAME,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: "Zephyr"
                            }
                        }
                    },
                    systemInstruction: systemPrompt,
                },
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiLive] Connected');
                        this.isStreaming = true;
                        this.callbacks.onReady?.();
                    },
                    onmessage: (message: any) => {
                        this.handleMessage(message);
                    },
                    onerror: (error: any) => {
                        console.error('[GeminiLive] Error:', error);
                        this.callbacks.onError?.(error.message || 'Connection error');
                        this.stop();
                    },
                    onclose: (event: any) => {
                        console.log('[GeminiLive] Closed:', event);
                        if (this.isStreaming) {
                            this.callbacks.onClose?.();
                            this.stop();
                        }
                    }
                }
            });

            // Handle audio data from worklet
            this.audioWorkletNode.port.onmessage = (event) => {
                if (event.data.eventType === 'audioData' && this.liveSession && this.isStreaming) {
                    const audioDataBuffer = event.data.audioData;
                    const base64AudioData = this.arrayBufferToBase64(audioDataBuffer);

                    try {
                        this.liveSession.sendRealtimeInput({
                            audio: {
                                data: base64AudioData,
                                mimeType: `audio/pcm;rate=${TARGET_SAMPLE_RATE}`
                            }
                        });
                    } catch (err) {
                        console.error('[GeminiLive] Error sending audio:', err);
                    }
                }
            };

            this.callbacks.onListening?.();

        } catch (error: any) {
            console.error('[GeminiLive] Start error:', error);
            this.callbacks.onError?.(error.message || 'Failed to start');
            await this.stop();
        }
    }

    /**
     * Handle server messages from Gemini
     * Critical: Watch for `interrupted` flag to stop playback immediately
     */
    private handleMessage(message: any) {
        // Check for interruption FIRST (user spoke while model speaking)
        if (message.serverContent?.interrupted) {
            console.log('[GeminiLive] Interruption detected - stopping playback');
            this.stopAudioPlayback();
            return;
        }

        // Handle model turn with audio/text
        if (message.serverContent?.modelTurn?.parts?.length > 0) {
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                    // Audio data - queue it for playback
                    this.callbacks.onSpeaking?.();
                    this.queueAudio(part.inlineData.data);
                }
                if (part.text) {
                    // Model's speech as text
                    this.callbacks.onTranscript?.(part.text, false);
                }
            }
        }

        // Handle input transcription (user speech recognized)
        if (message.serverContent?.inputTranscription?.text) {
            this.callbacks.onTranscript?.(message.serverContent.inputTranscription.text, true);
        }

        // Handle output transcription (model speech as text)
        if (message.serverContent?.outputTranscription?.text) {
            console.log('[GeminiLive] Model said:', message.serverContent.outputTranscription.text);
        }

        // Handle turn complete - go back to listening
        if (message.serverContent?.turnComplete) {
            setTimeout(() => {
                if (this.isStreaming && !this.isPlaying) {
                    this.callbacks.onReady?.();
                }
            }, 300);
        }
    }

    /**
     * Queue audio for playback with proper sequencing
     */
    private queueAudio(base64Audio: string) {
        if (!this.playbackContext) return;

        try {
            const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
            const pcm16 = new Int16Array(arrayBuffer);
            const float32 = new Float32Array(pcm16.length);

            // Convert Int16 to Float32
            for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / 32768.0;
            }

            const audioBuffer = this.playbackContext.createBuffer(
                1,
                float32.length,
                PLAYBACK_SAMPLE_RATE
            );
            audioBuffer.getChannelData(0).set(float32);

            this.audioQueue.push(audioBuffer);

            // Start playback if not already playing
            if (!this.isPlaying) {
                this.processAudioQueue();
            }
        } catch (err) {
            console.error('[GeminiLive] Audio decode error:', err);
        }
    }

    /**
     * Process audio queue sequentially
     * Handles interruptions by checking if queue was cleared
     */
    private processAudioQueue() {
        if (this.audioQueue.length === 0 || !this.playbackContext) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const buffer = this.audioQueue.shift()!;

        this.currentSource = this.playbackContext.createBufferSource();
        this.currentSource.buffer = buffer;
        this.currentSource.connect(this.playbackContext.destination);

        // When this chunk finishes, play the next one
        this.currentSource.onended = () => {
            this.processAudioQueue();
        };

        // Play immediately (gapless playback)
        const now = this.playbackContext.currentTime;
        this.currentSource.start(Math.max(now, 0));
    }

    /**
     * CRITICAL: Stop audio playback immediately
     * Called when user interrupts or on VAD detection
     */
    private stopAudioPlayback() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (e) {
                /* ignore */
            }
            this.currentSource = null;
        }

        // Clear entire queue to stop playback chain
        this.audioQueue = [];
        this.isPlaying = false;

        // Signal that we're ready to listen again
        this.callbacks.onReady?.();
    }

    async stop(): Promise<void> {
        this.isStreaming = false;
        this.stopAudioPlayback();

        if (this.liveSession) {
            try {
                this.liveSession.close();
            } catch (e) {
                console.error('[GeminiLive] Error closing session:', e);
            }
            this.liveSession = null;
        }

        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect();
            this.audioWorkletNode = null;
        }

        if (this.volumeWorkletNode) {
            this.volumeWorkletNode.disconnect();
            this.volumeWorkletNode = null;
        }

        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                await this.audioContext.close();
            } catch (e) {
                console.error('[GeminiLive] Error closing audio context:', e);
            }
            this.audioContext = null;
        }

        if (this.playbackContext && this.playbackContext.state !== 'closed') {
            try {
                await this.playbackContext.close();
            } catch (e) {
                console.error('[GeminiLive] Error closing playback context:', e);
            }
            this.playbackContext = null;
        }

        this.genAI = null;
    }

    get streaming(): boolean {
        return this.isStreaming;
    }

    get playing(): boolean {
        return this.isPlaying;
    }
}
