// TTS module with warm-up, queue management, and in-app browser handling

let warmedUp = false;
let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Prefer en-US, then any en
  const enUS = voices.find((v) => v.lang === 'en-US');
  if (enUS) return enUS;
  const enAny = voices.find((v) => v.lang.startsWith('en'));
  if (enAny) return enAny;
  return voices[0];
}

export function initTTS(): boolean {
  if (!('speechSynthesis' in window)) return false;
  // Load voices — some browsers load asynchronously
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = pickVoice();
  };
  preferredVoice = pickVoice();
  return true;
}

export function warmUpTTS(): void {
  if (warmedUp) return;
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    u.rate = 1;
    window.speechSynthesis.speak(u);
    warmedUp = true;
  } catch {
    // ignore
  }
}

export function speak(text: string, onError?: () => void): void {
  if (!('speechSynthesis' in window)) {
    onError?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    if (!preferredVoice) {
      preferredVoice = pickVoice();
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    if (preferredVoice) {
      u.voice = preferredVoice;
    }
    u.onerror = () => {
      onError?.();
    };
    window.speechSynthesis.speak(u);
  } catch {
    onError?.();
  }
}

export function isTTSAvailable(): boolean {
  return 'speechSynthesis' in window;
}
