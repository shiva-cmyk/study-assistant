/**
 * speech.js
 * 
 * Browser Speech Synthesis (TTS) and Speech Recognition (STT) abstractions.
 * Provides clean lifecycle callbacks, voice selection, interruption controls,
 * and graceful fallback for browsers without speech support.
 */

class TextToSpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.activeUtterance = null;
    this.isSpeaking = false;
  }

  isSupported() {
    return Boolean(this.synth && typeof window.SpeechSynthesisUtterance !== 'undefined');
  }

  getBestVoice() {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    // Prefer English natural voices
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium'))
    );
    return preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  speak(text, { onStart, onEnd, onError, rate = 1.0, pitch = 1.0 } = {}) {
    if (!this.isSupported() || !text || text.trim().length === 0) {
      if (onEnd) onEnd();
      return;
    }

    // Stop previous utterance if active
    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = 'en-US';

      const voice = this.getBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.activeUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.activeUtterance = null;
        // Ignore deliberate cancellation errors
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[TextToSpeech] Synthesis warning:', e.error);
        }
        if (onError) onError(e);
        else if (onEnd) onEnd();
      };

      this.activeUtterance = utterance;
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[TextToSpeech] speak failed:', err);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    }
  }

  stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (err) {
        console.warn('[TextToSpeech] cancel error:', err);
      }
    }
    this.isSpeaking = false;
    this.activeUtterance = null;
  }
}

class SpeechToTextService {
  constructor() {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    this.SpeechRecognition = SpeechRecognition;
    this.recognition = null;
    this.isListening = false;
  }

  isSupported() {
    return Boolean(this.SpeechRecognition);
  }

  startListening({ onInterim, onFinal, onError, onEnd, lang = 'en-US' } = {}) {
    if (!this.isSupported()) {
      if (onError) onError(new Error('Speech recognition is not supported in this browser.'));
      return null;
    }

    this.stopListening();

    try {
      const recognition = new this.SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      let finalTranscript = '';

      recognition.onstart = () => {
        this.isListening = true;
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment + ' ';
            if (onFinal) onFinal(finalTranscript.trim());
          } else {
            interimTranscript += transcriptSegment;
          }
        }
        if (onInterim) onInterim(interimTranscript.trim(), finalTranscript.trim());
      };

      recognition.onerror = (event) => {
        this.isListening = false;
        if (event.error !== 'no-speech') {
          console.warn('[SpeechToText] Recognition error:', event.error);
        }
        if (onError) onError(event);
      };

      recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd(finalTranscript.trim());
      };

      recognition.start();
      this.recognition = recognition;
      return recognition;
    } catch (err) {
      console.warn('[SpeechToText] startListening failed:', err);
      this.isListening = false;
      if (onError) onError(err);
      return null;
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore stop on inactive instance
      }
      this.recognition = null;
    }
    this.isListening = false;
  }
}

export const tts = new TextToSpeechService();
export const stt = new SpeechToTextService();
