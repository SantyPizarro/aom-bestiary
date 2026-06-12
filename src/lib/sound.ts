let audioContext: AudioContext | null = null;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function playUiTone(kind: "hover" | "select" | "toggle") {
  try {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    const now = context.currentTime;
    const frequency = kind === "hover" ? 330 : kind === "toggle" ? 180 : 240;
    const duration = kind === "hover" ? 0.04 : 0.08;

    oscillator.type = kind === "toggle" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // AudioContext can be blocked before user interaction; UI remains fully usable.
  }
}

export function playAssetSound(url: string | undefined) {
  if (!url) {
    return false;
  }

  try {
    const audio = new Audio(url);
    audio.volume = 0.48;
    void audio.play().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
