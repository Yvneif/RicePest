/**
 * Read-aloud support for treatment steps using the browser's built-in
 * speech engine — helps farmers who read with difficulty.
 */

/** Pure text builder so the spoken script is easy to verify. */
export function buildAdviceScript(result) {
  const t = result.technique;
  const lines = [
    `Rekomendasyon para sa ${result.pestType}: ${t.name}.`,
    ...t.steps.map((s, i) => `Hakbang ${i + 1}. ${s}`),
  ];
  if (t.precautions.length > 0) lines.push("Mga babala.", ...t.precautions);
  return lines.join(" ");
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => /^(fil|tl)/i.test(v.lang)) ?? null;
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak text aloud; returns false when speech is unavailable. */
export function speak(text, onEnd) {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "fil-PH";
  utterance.rate = 0.95;
  if (onEnd) utterance.onend = onEnd;
  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
