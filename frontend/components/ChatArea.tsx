import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, X } from 'lucide-react';
import { Message } from '../types';
import { Button } from './Button';
import { webSocketService } from '../services/websocketService';
import { GeminiLiveService } from '../services/gemini-live';
import { COMPANION_NAME } from '../constants';

interface ChatAreaProps {
  isVoiceMode: boolean;
  setIsVoiceMode: (val: boolean) => void;
  isDarkMode: boolean;
  sessionId: string;
}

const SYSTEM_PROMPT = `You are a supportive, empathetic AI companion and friend for mental wellness.
Speak naturally and warmly, like a caring friend.
Keep responses brief (1-3 sentences) to allow natural back-and-forth conversation.
Listen more than you speak. Ask open-ended questions. Validate feelings.
If someone expresses distress, be supportive but encourage professional help if needed.
Never be judgmental. Always be kind and understanding.`;

const ChatArea: React.FC<ChatAreaProps> = ({ isVoiceMode, setIsVoiceMode, isDarkMode, sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'model',
      text: "I'm here with you. Take your time.",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'ready' | 'listening' | 'speaking' | 'connecting'>('ready');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [audioVolume, setAudioVolume] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gemini Live Service ref
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);
  const apiKeyRef = useRef<string>('');

  // Initialize text WebSocket for regular chat
  useEffect(() => {
    const userId = localStorage.getItem('user_id') || `guest-${Math.random().toString(36).substr(2, 9)}`;
    
    setMessages([{
      id: 'init-1',
      role: 'model',
      text: "I'm here with you. Take your time.",
      timestamp: new Date()
    }]);

    webSocketService.connect(userId, sessionId, (eventData) => {
      try {
        const parsed = JSON.parse(eventData);
        
        if (parsed.type === 'history') {
          const historyMessages = parsed.data.map((msg: any) => ({
            id: Math.random().toString(),
            role: msg.role,
            text: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          if (historyMessages.length > 0) {
            setMessages(historyMessages);
          }
        } else if (parsed.type === 'message') {
          const botMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: parsed.content,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMsg]);
          setIsLoading(false);
        }
      } catch (e) {
        console.warn("Received non-JSON message:", eventData);
        const botMsg: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: eventData,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
      }
    });

    return () => {
      webSocketService.disconnect();
    };
  }, [sessionId]);

  // Fetch API key on mount
  useEffect(() => {
    fetch('http://localhost:8000/voice/config')
      .then(res => res.json())
      .then(data => {
        apiKeyRef.current = data.apiKey || '';
        console.log('[Voice] API key fetched:', apiKeyRef.current ? 'Yes' : 'No');
      })
      .catch(err => console.error('[Voice] Failed to fetch API key:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    webSocketService.sendMessage(userMsg.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice Mode Functions using direct Gemini Live API
  const startVoiceSession = useCallback(async () => {
    if (!apiKeyRef.current) {
      console.error('[Voice] No API key available');
      alert('Voice API key not configured. Please check your backend .env file.');
      return;
    }

    setVoiceStatus('connecting');

    // Create new service instance with callbacks
    geminiServiceRef.current = new GeminiLiveService({
      onReady: () => {
        console.log('[Voice] Ready');
        setVoiceStatus('listening');
      },
      onListening: () => {
        console.log('[Voice] Listening');
        setVoiceStatus('listening');
      },
      onSpeaking: () => {
        console.log('[Voice] Speaking');
        setVoiceStatus('speaking');
      },
      onTranscript: (text: string, isUser: boolean) => {
        console.log(`[Voice] Transcript (${isUser ? 'user' : 'model'}):`, text);
        if (isUser) {
          setCurrentTranscript(prev => prev + text);
        } else {
          // Add model response to messages
          const botMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: text,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMsg]);
        }
      },
      onVolume: (volume: number) => {
        setAudioVolume(volume);
      },
      onError: (error: string) => {
        console.error('[Voice] Error:', error);
        setVoiceStatus('ready');
        alert(`Voice error: ${error}`);
      },
      onClose: () => {
        console.log('[Voice] Closed');
        setVoiceStatus('ready');
      }
    });

    try {
      // Get user context from backend
      const userId = localStorage.getItem('user_id') || 'default_user';
      let userContext = '';
      try {
        const contextRes = await fetch(`http://localhost:8000/voice/context/${userId}`);
        const contextData = await contextRes.json();
        userContext = contextData.context || '';
      } catch (e) {
        console.warn('[Voice] Could not fetch user context');
      }

      const fullPrompt = userContext ? `${userContext}\n\n${SYSTEM_PROMPT}` : SYSTEM_PROMPT;
      await geminiServiceRef.current.start(apiKeyRef.current, fullPrompt);
    } catch (err: any) {
      console.error('[Voice] Failed to start:', err);
      setVoiceStatus('ready');
    }
  }, []);

  const stopVoiceSession = useCallback(async () => {
    if (geminiServiceRef.current) {
      await geminiServiceRef.current.stop();
      geminiServiceRef.current = null;
    }
    
    // If there was a transcript, add it as a user message
    if (currentTranscript.trim()) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: currentTranscript.trim(),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      setCurrentTranscript('');
    }
    
    setVoiceStatus('ready');
  }, [currentTranscript]);

  const toggleVoiceMode = useCallback(() => {
    if (!isVoiceMode) {
      setIsVoiceMode(true);
      startVoiceSession();
    } else if (geminiServiceRef.current?.streaming) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  }, [isVoiceMode, setIsVoiceMode, startVoiceSession, stopVoiceSession]);

  const closeVoiceMode = useCallback(async () => {
    await stopVoiceSession();
    setIsVoiceMode(false);
    setCurrentTranscript('');
  }, [setIsVoiceMode, stopVoiceSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (geminiServiceRef.current) {
        geminiServiceRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Voice Mode Overlay */}
      {isVoiceMode && (
        <div className="absolute inset-0 z-50 bg-background/95 dark:bg-[#0F1115]/95 backdrop-blur-xl flex animate-fade-in transition-all duration-500">
          
          {/* Main Voice UI */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Close Button */}
            <Button 
              variant="ghost" 
              className="absolute top-6 right-6 rounded-full w-12 h-12 !p-0 hover:bg-gray-100 dark:hover:bg-white/10 z-10"
              onClick={closeVoiceMode}
            >
              <X className="w-6 h-6 text-text-muted dark:text-slate-400" />
            </Button>

            {/* Status Text */}
            <div className="text-accent-blue dark:text-accent-teal mb-12 text-2xl font-light tracking-[0.2em] uppercase animate-pulse">
              {voiceStatus === 'connecting' ? "Connecting..." : 
               voiceStatus === 'speaking' ? "Speaking" : 
               voiceStatus === 'listening' ? "Listening" : "Ready"}
            </div>

            {/* Main Visual */}
            <div className="relative flex items-center justify-center h-64 w-64">
              {voiceStatus === 'speaking' && (
                <div className="absolute inset-0 rounded-full bg-accent-blue/20 dark:bg-accent-teal/20 animate-ping" />
              )}
              
              <div className={`relative z-10 flex items-center justify-center w-32 h-32 rounded-full transition-all duration-500 ${
                voiceStatus === 'listening' ? 'bg-red-500/10' : 
                voiceStatus === 'speaking' ? 'bg-accent-blue/10 dark:bg-accent-teal/10 scale-125' : 
                voiceStatus === 'connecting' ? 'bg-accent-tan/10 dark:bg-accent-violet/10 animate-pulse' :
                'bg-gray-100 dark:bg-white/5'
              }`}
              style={voiceStatus === 'listening' ? { transform: `scale(${1 + audioVolume})` } : {}}
              >
                {voiceStatus === 'listening' ? (
                  <div className="flex gap-1 h-8 items-end">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-2 bg-red-500 rounded-full animate-wave"
                        style={{ 
                          animationDelay: `${i * 0.1}s`, 
                          height: `${Math.max(20, audioVolume * 100)}%` 
                        }}
                      />
                    ))}
                  </div>
                ) : voiceStatus === 'speaking' ? (
                  <div className="w-full h-full rounded-full border-4 border-accent-blue dark:border-accent-teal opacity-50 animate-ping-slow" />
                ) : (
                  <Mic className={`w-12 h-12 ${voiceStatus === 'connecting' ? 'text-accent-tan dark:text-accent-violet animate-spin' : 'text-text-muted dark:text-slate-400'}`} />
                )}
              </div>
            </div>

            {/* Transcript / Subtitles */}
            <p className="mt-12 text-text-primary dark:text-slate-200 max-w-2xl text-center px-8 text-lg font-light leading-relaxed min-h-[3rem]">
              {currentTranscript || (voiceStatus === 'listening' ? "Listening..." : voiceStatus === 'speaking' ? "..." : "Tap the microphone to start")}
            </p>

            {/* Controls */}
            <div className="mt-16 flex items-center gap-8">
              <Button 
                variant="ghost"
                className={`w-20 h-20 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                  voiceStatus === 'listening' 
                    ? 'border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20 scale-110' 
                    : 'border-gray-300 dark:border-white/20 hover:border-accent-blue dark:hover:border-accent-teal hover:scale-105'
                }`}
                onClick={toggleVoiceMode}
                disabled={voiceStatus === 'connecting'}
              >
                {voiceStatus === 'listening' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </Button>
            </div>
          </div>

          {/* Debug / History Panel */}
          <div className="w-96 border-l border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 p-6 overflow-y-auto font-mono text-xs hidden lg:block backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted dark:text-slate-500 mb-6 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${voiceStatus === 'listening' || voiceStatus === 'speaking' ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
              Live Conversation Logs
            </div>
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                      msg.role === 'user' 
                        ? 'bg-accent-blue/10 text-accent-blue dark:text-accent-teal dark:bg-accent-teal/10' 
                        : 'bg-accent-tan/10 text-accent-tan dark:text-accent-violet dark:bg-accent-violet/10'
                    }`}>
                      {msg.role === 'user' ? 'USER' : 'AI_AGENT'}
                    </span>
                    <span className="text-[10px] text-text-muted dark:text-slate-600 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-text-primary dark:text-slate-300 opacity-90 leading-relaxed pl-1 border-l-2 border-gray-200 dark:border-white/5 ml-1">
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full animate-fade-in ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] p-4 md:p-5 text-[15px] md:text-base leading-relaxed shadow-sm transition-colors duration-300 ${
                msg.role === 'user'
                  ? 'bg-accent-blue text-white dark:bg-[#1E293B] dark:text-[#E2E8F0] rounded-2xl rounded-tr-sm border border-transparent dark:border-slate-700/50'
                  : 'bg-white text-text-primary border border-gray-100 dark:bg-gradient-to-br dark:from-[#2D2A4A] dark:to-[#25223C] dark:text-[#E2E8F0] rounded-2xl rounded-tl-sm dark:border-accent-violet/20 shadow-md'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full animate-fade-in">
            <div className="bg-white dark:bg-[#2D2A4A] p-4 rounded-2xl rounded-tl-sm flex items-center gap-1 border border-gray-100 dark:border-accent-violet/20 shadow-md">
              <span className="w-2 h-2 bg-accent-tan dark:bg-accent-violet rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-accent-tan dark:bg-accent-violet rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-accent-tan dark:bg-accent-violet rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent dark:from-[#0F1115] dark:via-[#0F1115] dark:to-transparent z-10 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
          <Button 
            variant="ghost" 
            className={`rounded-full w-10 h-10 md:w-12 md:h-12 !p-0 hover:bg-gray-100 dark:hover:bg-white/5 ${isVoiceMode ? 'text-accent-blue dark:text-accent-teal' : 'text-text-muted dark:text-slate-500'}`}
            onClick={toggleVoiceMode}
            title="Voice Mode"
          >
            <Mic className={`w-5 h-5 ${voiceStatus === 'listening' ? 'animate-pulse text-accent-blue dark:text-accent-teal' : ''}`} />
          </Button>
          
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary dark:text-[#E2E8F0] placeholder-text-muted dark:placeholder-slate-500 px-2 text-base"
          />

          <Button 
            onClick={() => handleSend()} 
            disabled={!inputText.trim()}
            variant={inputText.trim() ? "primary" : "ghost"}
            className={`rounded-full w-10 h-10 md:w-12 md:h-12 !p-0 transition-all duration-200 ${inputText.trim() ? 'bg-accent-blue dark:bg-accent-teal text-white shadow-lg hover:shadow-xl hover:scale-105' : 'text-text-muted dark:text-slate-500'}`}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] text-text-muted dark:text-slate-600 uppercase tracking-widest font-medium opacity-70">{COMPANION_NAME} • Secure & Private</span>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
