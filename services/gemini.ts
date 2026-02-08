
import { GoogleGenAI, Chat, GenerateContentResponse, Modality, Type, FunctionDeclaration } from "@google/genai";
import { getSystemInstruction } from "../constants";
import { GroundingSource } from "../types";

// Primary models as per instructions
const CHAT_MODEL = 'gemini-3-pro-preview';
const PRIMARY_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const FALLBACK_TTS_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'; 

/**
 * Initializes the Gemini AI client using the API key from environment variables.
 */
const getAIClient = () => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API key is missing. Please check your configuration.");
  return new GoogleGenAI({ apiKey: key });
};

export const createChatSession = (memories: string[] = [], history: any[] = []): Chat => {
  const ai = getAIClient();
  return ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction: getSystemInstruction(memories),
      tools: [
        { googleSearch: {} }
      ],
    },
    history: history
  });
};

export const sendMultimodalMessage = async (
  chat: Chat, 
  text: string, 
  imageB64?: string
) => {
  if (imageB64) {
    const parts = [
      { text: text },
      { 
        inlineData: { 
          data: imageB64.split(',')[1] || imageB64, 
          mimeType: 'image/jpeg' 
        } 
      }
    ];
    return chat.sendMessageStream({ message: { parts } as any });
  }
  return chat.sendMessageStream({ message: text });
};

export const extractSources = (response: GenerateContentResponse): GroundingSource[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];

  const sources: GroundingSource[] = [];
  chunks.forEach((chunk: any) => {
    if (chunk.web?.uri && chunk.web?.title) {
      sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    }
  });
  return sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
};

const cleanTextForTTS = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^#+\s+/gm, '') 
    .replace(/[#`_~]/g, '')
    .replace(/^[-+]\s+/gm, '') 
    .trim();
};

const chunkText = (text: string, maxLength = 150): string[] => {
  const cleaned = cleanTextForTTS(text);
  if (!cleaned) return [];
  const segments = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const result: string[] = [];
  let current = "";
  for (const seg of segments) {
    if ((current + seg).length > maxLength && current.length > 0) {
      result.push(current.trim());
      current = seg;
    } else {
      current += seg;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
};

async function callTTSWithRetry(chunk: string, maxRetries = 3): Promise<string> {
  let currentModel = PRIMARY_TTS_MODEL;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const ttsAi = getAIClient();
      const response = await ttsAi.models.generateContent({
        model: currentModel,
        contents: [{ parts: [{ text: `Read this clearly: ${chunk}` }] }], 
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });
      
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error("Content blocked by safety filters.");
      }

      const audio = candidate?.content?.parts?.[0]?.inlineData?.data;
      if (audio) return audio;
      
      throw new Error("No audio data returned from service.");
    } catch (e: any) {
      lastError = e;
      const errorText = e?.message || "";
      const isQuotaError = errorText.includes("429") || errorText.toLowerCase().includes("quota");

      if (isQuotaError && currentModel === PRIMARY_TTS_MODEL) {
        currentModel = FALLBACK_TTS_MODEL;
      }

      if (attempt < maxRetries - 1) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 800));
        continue;
      }
    }
  }
  throw lastError || new Error("Failed to generate audio after multiple attempts.");
}

export const generateSpeechChunks = async (text: string): Promise<string[]> => {
  const chunks = chunkText(text);
  if (chunks.length === 0) return [];
  
  const audioResults: string[] = [];
  let errorOccurred = false;
  let lastErrorMessage = "";

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const audio = await callTTSWithRetry(chunk);
      audioResults.push(audio);
    } catch (e: any) {
      errorOccurred = true;
      lastErrorMessage = e.message;
      break; // Stop on first hard failure for better UX
    }
  }

  if (errorOccurred && audioResults.length === 0) {
    throw new Error(lastErrorMessage || "Failed to generate speech.");
  }
  
  return audioResults;
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
