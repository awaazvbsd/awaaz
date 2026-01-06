/**
 * Text-to-Speech service using Microsoft Edge TTS (FREE, no API key required)
 * Falls back to improved browser SpeechSynthesis if Edge TTS fails
 */

export interface TTSOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voice?: SpeechSynthesisVoice;
}

/**
 * Use Microsoft Edge TTS API - FREE, no API key required, uses neural voices
 * This is Microsoft's free TTS service used by Edge browser
 */
const useEdgeTTS = async (text: string, options: TTSOptions = {}): Promise<void> => {
  // Edge TTS voice options (neural voices - high quality)
  // en-US-AriaNeural (female), en-US-JennyNeural (female), en-US-GuyNeural (male)
  const voiceName = 'en-US-AriaNeural'; // Natural female voice

  // Convert rate to SSML format (0.5x to 2.0x, default 1.0x)
  const rate = options.rate ?? 0.95; // Slightly slower for clarity
  const ratePercent = Math.round(rate * 100);

  // Convert pitch to SSML format (-50% to +50%, default 0%)
  const pitch = options.pitch ?? 1.0;
  const pitchPercent = Math.round((pitch - 1.0) * 50);

  // Create SSML for better control
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voiceName}">
        <prosody rate="${ratePercent}%" pitch="${pitchPercent >= 0 ? '+' : ''}${pitchPercent}%">
          ${text}
        </prosody>
      </voice>
    </speak>
  `.trim();

  try {
    // Edge TTS endpoint - free, no API key needed
    // We'll use a public Edge TTS service endpoint
    const response = await fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/tts?key=preview&Language=en-US', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Get the TTS token first
    const tokenResponse = await fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustClient=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Edge TTS token');
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Now synthesize speech
    const synthesizeResponse = await fetch(
      `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustClient=true&Text=${encodeURIComponent(text)}&Voice=${voiceName}&Rate=${ratePercent}&Pitch=${pitchPercent >= 0 ? '+' : ''}${pitchPercent}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!synthesizeResponse.ok) {
      throw new Error(`Edge TTS API error: ${synthesizeResponse.statusText}`);
    }

    const audioBlob = await synthesizeResponse.blob();

    // Play audio using Web Audio API
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;

          // Apply volume
          const gainNode = audioContext.createGain();
          gainNode.gain.value = options.volume ?? 1.0;

          source.connect(gainNode);
          gainNode.connect(audioContext.destination);

          source.onended = () => {
            audioContext.close();
            resolve();
          };

          source.onerror = (e) => {
            audioContext.close();
            reject(e);
          };

          source.start(0);
        } catch (error) {
          audioContext.close();
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(audioBlob);
    });
  } catch (error) {
    console.error('Edge TTS error:', error);
    throw error;
  }
};

/**
 * Simpler Edge TTS implementation using a public proxy/service
 * This uses a free public Edge TTS service
 */
const useEdgeTTSProxy = async (text: string, options: TTSOptions = {}): Promise<void> => {
  const voiceName = 'en-US-AriaNeural'; // Natural female voice
  const rate = options.rate ?? 0.95;

  // Use a public Edge TTS service (no API key needed)
  const url = `https://edge.microsoft.com/tts/api/v1/synthesize`;

  const requestBody = {
    ssml: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voiceName}"><prosody rate="${Math.round(rate * 100)}%">${text}</prosody></voice></speak>`,
    format: 'audio-24khz-48kbitrate-mono-mp3',
  };

  try {
    // Try direct Edge TTS via a simple approach
    // Use the browser's fetch to get audio from Edge TTS
    const response = await fetch(
      `https://api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': 'free', // Edge TTS doesn't require real key for basic usage
        },
      }
    );

    // Actually, let's use a simpler approach - use a public Edge TTS endpoint
    const audioUrl = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustClient=true&Text=${encodeURIComponent(text)}&Voice=${voiceName}&Rate=${Math.round(rate * 100)}`;

    const audioResponse = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Edge TTS failed: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();

    // Play audio
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;

          const gainNode = audioContext.createGain();
          gainNode.gain.value = options.volume ?? 1.0;

          source.connect(gainNode);
          gainNode.connect(audioContext.destination);

          source.onended = () => {
            audioContext.close();
            resolve();
          };

          source.onerror = (e) => {
            audioContext.close();
            reject(e);
          };

          source.start(0);
        } catch (error) {
          audioContext.close();
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(audioBlob);
    });
  } catch (error) {
    console.error('Edge TTS proxy error:', error);
    throw error;
  }
};

/**
 * Use a reliable free TTS service - Google Translate TTS (free, no key needed)
 * This is the simplest and most reliable free option
 */
const useGoogleTranslateTTS = async (text: string, options: TTSOptions = {}): Promise<void> => {
  // Google Translate TTS is free and doesn't require API key
  // It's used by Google Translate website
  const encodedText = encodeURIComponent(text);
  const lang = 'en';
  const speed = options.rate ? Math.min(Math.max(options.rate, 0.25), 4.0) : 1.0;

  // Google Translate TTS endpoint (free, public)
  const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob&ttsspeed=${speed}`;

  try {
    const response = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Translate TTS failed: ${response.statusText}`);
    }

    const audioBlob = await response.blob();

    // Play audio
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;

          const gainNode = audioContext.createGain();
          gainNode.gain.value = options.volume ?? 1.0;

          source.connect(gainNode);
          gainNode.connect(audioContext.destination);

          source.onended = () => {
            audioContext.close();
            resolve();
          };

          source.onerror = (e) => {
            audioContext.close();
            reject(e);
          };

          source.start(0);
        } catch (error) {
          audioContext.close();
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(audioBlob);
    });
  } catch (error) {
    console.error('Google Translate TTS error:', error);
    throw error;
  }
};

/**
 * Improved browser voice selection - prioritize the best available voices
 */
export const getNaturalVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();

  if (voices.length === 0) return null;

  // Priority list of high-quality voices by name (best first)
  const preferredVoiceNames = [
    'Google US English',
    'Microsoft Zira - English (United States)',
    'Microsoft David - English (United States)',
    'Samantha',
    'Alex',
    'Google UK English Female',
    'Microsoft Hazel - English (Great Britain)',
    'Karen',
    'Victoria',
    'Moira',
  ];

  // First, try to find exact matches from preferred list
  for (const preferredName of preferredVoiceNames) {
    const voice = voices.find(v =>
      v.name.includes(preferredName) || preferredName.includes(v.name.split(' ')[0])
    );
    if (voice && voice.lang.startsWith('en')) {
      return voice;
    }
  }

  // Second, look for neural/premium/enhanced voices
  const premiumVoices = voices.filter(v => {
    const name = v.name.toLowerCase();
    return (
      name.includes('neural') ||
      name.includes('premium') ||
      name.includes('enhanced') ||
      name.includes('wavenet') ||
      (name.includes('google') && !v.localService)
    );
  });

  if (premiumVoices.length > 0) {
    const englishPremium = premiumVoices.filter(v => v.lang.startsWith('en'));
    if (englishPremium.length > 0) return englishPremium[0];
  }

  // Third, prefer non-local voices (often cloud-based and higher quality)
  const cloudVoices = voices.filter(v => !v.localService && v.lang.startsWith('en'));
  if (cloudVoices.length > 0) {
    return cloudVoices[0];
  }

  // Fourth, any English voice
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  if (englishVoices.length > 0) {
    // Prefer female voices for more natural sound
    const femaleVoice = englishVoices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('hazel');
    });
    return femaleVoice || englishVoices[0];
  }

  // Last resort: default voice
  return voices.find(v => v.default) || voices[0] || null;
};

/**
 * Speak text with the best available FREE TTS method
 * Uses Google Translate TTS (free, no API key) with fallback to improved browser TTS
 */
export const speakText = async (
  text: string,
  options: TTSOptions = {}
): Promise<void> => {
  // Try Google Translate TTS first (free, reliable, no API key needed)
  try {
    return await useGoogleTranslateTTS(text, options);
  } catch (error) {
    console.warn('Google Translate TTS failed, falling back to browser TTS:', error);
    // Fall through to browser TTS
  }

  // Fallback to improved browser TTS
  return new Promise((resolve, reject) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Get best available voice
    const voices = window.speechSynthesis.getVoices();
    let voice = options.voice;

    if (!voice) {
      voice = getNaturalVoice();
    }

    // If voices not loaded yet, wait for them
    if (voices.length === 0 || !voice) {
      const loadVoices = () => {
        const loadedVoices = window.speechSynthesis.getVoices();
        utterance.voice = getNaturalVoice();
        if (utterance.voice) {
          configureUtterance(utterance, options);
          window.speechSynthesis.speak(utterance);
        } else {
          reject(new Error('No voices available'));
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      // Trigger voice loading if it hasn't started
      window.speechSynthesis.getVoices();
      return;
    }

    // Configure utterance
    const configureUtterance = (utt: SpeechSynthesisUtterance, opts: TTSOptions) => {
      utt.voice = voice;
      utt.rate = opts.rate ?? 0.92; // Slightly slower for clarity
      utt.pitch = opts.pitch ?? 1.0;
      utt.volume = opts.volume ?? 1.0;
      utt.lang = 'en-US';
    };

    configureUtterance(utterance, options);

    utterance.onend = () => resolve();
    utterance.onerror = (error) => {
      console.error('Browser TTS error:', error);
      reject(error);
    };

    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Stop any ongoing speech
 */
export const stopSpeech = (): void => {
  window.speechSynthesis.cancel();
};

/**
 * Check if speech is currently speaking
 */
export const isSpeaking = (): boolean => {
  return window.speechSynthesis.speaking;
};
