// English pronunciation through the browser's built-in text-to-speech.

let voice: SpeechSynthesisVoice | null = null;

function supported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice() {
  if (!supported()) return;
  const voices = window.speechSynthesis.getVoices();
  voice =
    voices.find(
      (v) =>
        /^en[-_]US/i.test(v.lang) && /google|samantha|aria|jenny/i.test(v.name)
    ) ??
    voices.find((v) => /^en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null;
}

if (supported()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export function speak(text: string, rate = 0.9) {
  if (!supported() || !text) return;
  if (!voice) pickVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? "en-US";
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}
