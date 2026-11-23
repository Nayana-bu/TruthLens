// Robust Hybrid Speech Engine for TruthLens Verify (Kannada, Hindi, English)
// Primary: Authentic Multi-Sentence Native Audio via high-speed MP3 endpoint
// Secondary: Resilient Browser SpeechSynthesis with sentence queue & GC shield

export interface SpeechPlaybackState {
  isPlaying: boolean;
  activeLanguage: 'kn' | 'hi' | 'en' | null;
}

// Global references for audio playback and browser speech
let currentAudio: HTMLAudioElement | null = null;
const activeUtterancesSet = new Set<SpeechSynthesisUtterance>();
let keepAliveTimer: number | null = null;
let isExplicitlyStopped = false;
let currentLanguage: 'kn' | 'hi' | 'en' | null = null;
let playbackSessionId = 0;
let activeFetchController: AbortController | null = null;

/**
 * Splits text into natural sentence-level chunks using Indian & Latin punctuation.
 */
function splitIntoNaturalSentences(text: string): string[] {
  if (!text) return [];

  const cleaned = text
    .replace(/[*_#`~>🚨⚠️✅❌]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const rawParts = cleaned.split(/(?<=[.!?\n।॥])\s+/);
  const sentences: string[] = [];

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.length > 130) {
      const subClauses = trimmed.split(/(?<=[,;:—])\s+/);
      let buffer = '';
      for (const clause of subClauses) {
        if ((buffer + ' ' + clause).length > 110 && buffer.length > 0) {
          sentences.push(buffer.trim());
          buffer = clause;
        } else {
          buffer = buffer ? `${buffer} ${clause}` : clause;
        }
      }
      if (buffer.trim()) {
        sentences.push(buffer.trim());
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences.length > 0 ? sentences : [cleaned];
}

/**
 * Fallback: Finds browser voice matching language
 */
function pickLanguageVoice(lang: 'kn' | 'hi' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === 'kn') {
    const knVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('kn') ||
        v.name.toLowerCase().includes('kannada') ||
        v.name.toLowerCase().includes('kn-in')
    );
    if (knVoice) return knVoice;

    const indianVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === 'en-in' ||
        v.name.toLowerCase().includes('india') ||
        v.lang.toLowerCase().startsWith('hi')
    );
    if (indianVoice) return indianVoice;
  } else if (lang === 'hi') {
    const hiVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('hi-in')
    );
    if (hiVoice) return hiVoice;

    const indianVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === 'en-in' ||
        v.name.toLowerCase().includes('india')
    );
    if (indianVoice) return indianVoice;
  } else {
    const enInVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === 'en-in' ||
        (v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('india'))
    );
    if (enInVoice) return enInVoice;

    const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (enVoice) return enVoice;
  }

  return null;
}

/**
 * Fallback browser speech queue: delivers sentence-by-sentence
 */
function fallbackBrowserSpeech(
  text: string,
  lang: 'kn' | 'hi' | 'en',
  sessionId: number,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  if (isExplicitlyStopped || sessionId !== playbackSessionId) {
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (sessionId === playbackSessionId && !isExplicitlyStopped) {
      currentLanguage = null;
      onEnd?.();
    }
    return;
  }

  const sentences = splitIntoNaturalSentences(text);
  if (sentences.length === 0) {
    if (sessionId === playbackSessionId && !isExplicitlyStopped) {
      currentLanguage = null;
      onEnd?.();
    }
    return;
  }

  window.speechSynthesis.cancel();

  if (keepAliveTimer !== null) {
    window.clearInterval(keepAliveTimer);
  }
  keepAliveTimer = window.setInterval(() => {
    if (isExplicitlyStopped || sessionId !== playbackSessionId) {
      if (keepAliveTimer !== null) {
        window.clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      return;
    }
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking &&
      !window.speechSynthesis.paused
    ) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 4000);

  let sentenceIdx = 0;
  let hasTriggeredStart = false;

  const playNextSentence = () => {
    if (isExplicitlyStopped || sessionId !== playbackSessionId) {
      activeUtterancesSet.clear();
      return;
    }

    if (sentenceIdx >= sentences.length) {
      if (keepAliveTimer !== null) {
        window.clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      activeUtterancesSet.clear();
      currentLanguage = null;
      onEnd?.();
      return;
    }

    const currentSentence = sentences[sentenceIdx];
    const utterance = new SpeechSynthesisUtterance(currentSentence);

    if (lang === 'kn') {
      utterance.lang = 'kn-IN';
    } else if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const matchedVoice = pickLanguageVoice(lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    activeUtterancesSet.add(utterance);

    utterance.onstart = () => {
      if (isExplicitlyStopped || sessionId !== playbackSessionId) return;
      if (!hasTriggeredStart) {
        hasTriggeredStart = true;
        onStart?.();
      }
    };

    utterance.onend = () => {
      activeUtterancesSet.delete(utterance);
      if (!isExplicitlyStopped && sessionId === playbackSessionId) {
        sentenceIdx++;
        playNextSentence();
      }
    };

    utterance.onerror = (e) => {
      activeUtterancesSet.delete(utterance);
      if (
        isExplicitlyStopped ||
        sessionId !== playbackSessionId ||
        e.error === 'interrupted' ||
        e.error === 'canceled'
      ) {
        return;
      }
      if (e.error === 'not-allowed' || e.error === 'synthesis-unavailable') {
        if (keepAliveTimer !== null) {
          window.clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        currentLanguage = null;
        onError?.(e);
        return;
      }
      sentenceIdx++;
      playNextSentence();
    };

    window.speechSynthesis.speak(utterance);
  };

  playNextSentence();
}

/**
 * Main Speak Function:
 * 1. Queries server /api/tts for genuine native Kannada/Hindi/English audio.
 * 2. Plays with HTML5 Audio with 0 delay and complete finish.
 * 3. Seamlessly falls back to browser SpeechSynthesis if offline.
 */
export async function speakText(
  text: string,
  lang: 'kn' | 'hi' | 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<void> {
  // Halt any previous playback immediately
  stopSpeech();
  const sessionId = ++playbackSessionId;
  isExplicitlyStopped = false;
  currentLanguage = lang;

  const cleanText = text
    .replace(/[*_#`~>🚨⚠️✅❌]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    currentLanguage = null;
    onEnd?.();
    return;
  }

  // Pre-notify start to give user immediate UI feedback
  onStart?.();

  try {
    const controller = new AbortController();
    activeFetchController = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, lang }),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);
    if (activeFetchController === controller) {
      activeFetchController = null;
    }

    if (isExplicitlyStopped || sessionId !== playbackSessionId) return;

    if (response.ok) {
      const data = await response.json();
      if (isExplicitlyStopped || sessionId !== playbackSessionId) return;

      if (data.success && data.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        currentAudio = audio;

        audio.onended = () => {
          if (currentAudio === audio) {
            currentAudio = null;
            currentLanguage = null;
          }
          if (!isExplicitlyStopped && sessionId === playbackSessionId) {
            onEnd?.();
          }
        };

        audio.onerror = () => {
          if (currentAudio === audio) {
            currentAudio = null;
          }
          if (!isExplicitlyStopped && sessionId === playbackSessionId) {
            fallbackBrowserSpeech(cleanText, lang, sessionId, undefined, onEnd, onError);
          }
        };

        await audio.play();
        // Guard in case Stop was clicked while audio.play() was resolving
        if (isExplicitlyStopped || sessionId !== playbackSessionId) {
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.currentTime = 0;
          if (currentAudio === audio) {
            currentAudio = null;
          }
        }
        return;
      }
    }
  } catch {
    // Network, abort, or timeout: if not stopped, switch gracefully to browser engine
  }

  if (!isExplicitlyStopped && sessionId === playbackSessionId) {
    fallbackBrowserSpeech(cleanText, lang, sessionId, undefined, onEnd, onError);
  }
}

/**
 * Halts any active audio or speech immediately.
 */
export function stopSpeech(): void {
  playbackSessionId++;
  isExplicitlyStopped = true;
  currentLanguage = null;

  if (activeFetchController) {
    try {
      activeFetchController.abort();
    } catch {
      // ignore
    }
    activeFetchController = null;
  }

  if (currentAudio) {
    try {
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch {
      // ignore
    }
    currentAudio = null;
  }

  if (keepAliveTimer !== null) {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  activeUtterancesSet.clear();
}

export function getActiveSpeechLanguage(): 'kn' | 'hi' | 'en' | null {
  return isExplicitlyStopped ? null : currentLanguage;
}
