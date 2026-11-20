/**
 * A short two-note chime made in the browser (Web Audio), so there is no
 * sound file to ship. Used when a player calls the director.
 *
 * Browsers only allow sound after the page has been tapped. {@link primeChime}
 * attaches a one-time listener that unlocks audio on the first tap; until
 * then {@link playChime} stays silent rather than failing.
 */
type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function audioContextClass(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

/** Unlock audio on the first tap anywhere on the page. */
export function primeChime(): void {
  if (typeof window === "undefined") return;
  const unlock = () => {
    void getContext()
      ?.resume()
      .catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { once: true });
}

/** Play the chime, if the browser allows sound right now. */
export function playChime(): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const start = ctx.currentTime;
    // Two notes, a fifth apart, each fading out quickly.
    [880, 1318.5].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const t = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {
    // No sound is better than a broken screen.
  }
}

/** Forget the audio context (tests). */
export function resetChime(): void {
  context = null;
}
