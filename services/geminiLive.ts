import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { THERAPIST_SYSTEM_PROMPT } from '../constants';

// This file uses a global variable for the API key.
// In a real-world app, this would be handled more securely.
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext
    }
}

let ai: GoogleGenAI;

try {
  // Use environment variable for API key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not available. Please set it in your environment.");
  }
  ai = new GoogleGenAI({ apiKey });
} catch(e) {
  console.error("API_KEY is not available. Please set it in your environment.");
}

export const GeminiLiveService = {
  // Connect to Gemini Live with callbacks
  connect: (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
  }): ReturnType<typeof ai.live.connect> => {
    if (!ai) {
      return Promise.reject(new Error("Gemini AI not initialized. Check API Key."));
    }
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: THERAPIST_SYSTEM_PROMPT,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
  },

  createAudioBlob: (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] < 0 ? data[i] * 32768 : data[i] * 32767;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: `audio/pcm;rate=16000`,
    };
  }
};

// Helper functions for base64 encoding/decoding, as required by the Gemini docs
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
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

