import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing.");
    return;
  }
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Initialize chat session
  chatSession = genAI.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, // Slightly creative/warm
      topK: 40,
      topP: 0.95,
    },
  });
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    initializeGemini();
  }

  if (!chatSession) {
    // Fallback if initialization failed (e.g. no key)
    return "I'm having a little trouble connecting right now. Can we try again in a moment?";
  }

  try {
    const result: GenerateContentResponse = await chatSession.sendMessage({ message });
    return result.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm here, but I missed that. Could you say it again gently?";
  }
};