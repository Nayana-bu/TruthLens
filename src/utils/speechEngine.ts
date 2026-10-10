// Speech Engine for TruthLens Verify (Kannada, Hindi, English)
export interface SpeechPlaybackState {
  isPlaying: boolean;
  activeLanguage: 'kn' | 'hi' | 'en' | null;
}

let activeAudioElement: HTMLAudioElement | null = null;

export async function speakText(
  text: string,
  lang: 'kn' | 'hi' | 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<void> {
  // Stop any currently playing audio or speech
  stopSpeech();

  // Step 1: Try server-side Studio TTS for high-fidelity native voice
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.audioBase64) {
        const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
        activeAudioElement = new Audio(audioSrc);
        
        activeAudioElement.onplay = () => onStart?.();
        activeAudioElement.onended = () => {
          activeAudioElement = null;
          onEnd?.();
        };
        activeAudioElement.onerror = () => {
          activeAudioElement = null;
          fallbackBrowserSpeech(text, lang, onStart, onEnd, onError);
        };

        await activeAudioElement.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Server TTS unavailable, falling back to browser speech synthesis:', err);
  }

  // Step 2: Fallback to browser SpeechSynthesis
  fallbackBrowserSpeech(text, lang, onStart, onEnd, onError);
}

function fallbackBrowserSpeech(
  text: string,
  lang: 'kn' | 'hi' | 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported on this browser');
    onStart?.();
    setTimeout(() => onEnd?.(), 3000);
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Slightly slower for clear Indian language phonetic comprehension
  utterance.pitch = 1.0;

  // Language codes for India
  if (lang === 'kn') {
    utterance.lang = 'kn-IN';
  } else if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'en-IN';
  }

  // Try to find matching voice if installed
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const matchedVoice = voices.find(
      (v) =>
        (lang === 'kn' && (v.lang.includes('kn') || v.name.toLowerCase().includes('kannada'))) ||
        (lang === 'hi' && (v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'))) ||
        (lang === 'en' && (v.lang.includes('en-IN') || v.lang.includes('en')))
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    onError?.(e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
