'use client';

export type MusicalFeedbackKind = 'correct' | 'incorrect';

type AudioContextConstructor = typeof AudioContext;

let feedbackContext: AudioContext | null = null;

export function prepareMusicalFeedbackAudio() {
  const context = getFeedbackContext();
  if (!context || context.state !== 'suspended') return;
  void context.resume().catch(() => undefined);
}

export function playMusicalFeedback(kind: MusicalFeedbackKind) {
  const context = getFeedbackContext();
  if (!context) return;

  if (context.state === 'suspended') {
    void context
      .resume()
      .then(() => scheduleFeedback(context, kind))
      .catch(() => undefined);
    return;
  }
  scheduleFeedback(context, kind);
}

function getFeedbackContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (feedbackContext) return feedbackContext;

  const AudioContextClass =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    feedbackContext = new AudioContextClass();
    return feedbackContext;
  } catch {
    return null;
  }
}

function scheduleFeedback(context: AudioContext, kind: MusicalFeedbackKind) {
  const start = context.currentTime;
  if (kind === 'correct') {
    playTone(context, 660, start, 0.09, 'sine', 0.045);
    playTone(context, 880, start + 0.08, 0.14, 'sine', 0.05);
    return;
  }

  playTone(context, 220, start, 0.13, 'sawtooth', 0.035);
  playTone(context, 165, start + 0.08, 0.16, 'sawtooth', 0.03);
}

function playTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
