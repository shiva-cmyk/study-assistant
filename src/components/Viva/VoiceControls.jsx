import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Edit3, Keyboard, Clock, RefreshCw, VolumeX, Volume2 } from 'lucide-react';
import { stt } from '../../lib/speech';

export function VoiceControls({
  isListening,
  onStartListening,
  onStopListening,
  onSubmitAnswer,
  isSubmitting,
  timeRemaining,
  timeLimit,
  isExaminerSpeaking,
  onStopExaminerSpeech,
}) {
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const recognitionSupported = stt.isSupported();

  // Reset transcript when ready for new answer
  useEffect(() => {
    if (!isListening && !isSubmitting) {
      setInterimText('');
    }
  }, [isListening, isSubmitting]);

  const handleToggleMic = () => {
    if (isExaminerSpeaking) {
      onStopExaminerSpeech();
    }

    if (isListening) {
      onStopListening(transcript);
    } else {
      setTranscript('');
      setInterimText('');
      onStartListening({
        onInterim: (interim, final) => {
          setInterimText(interim);
          if (final) setTranscript(final);
        },
        onFinal: (final) => {
          setTranscript(final);
          setInterimText('');
        },
        onError: (err) => {
          console.warn('[VoiceControls] Mic error:', err);
          // If error occurs, smoothly allow manual typing
          setManualMode(true);
        },
      });
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (transcript.trim() && !isSubmitting) {
      onSubmitAnswer(transcript.trim());
    }
  };

  const displayText = transcript + (interimText ? (transcript ? ' ' : '') + interimText : '');

  const progressPercent = timeLimit > 0 ? Math.max((timeRemaining / timeLimit) * 100, 0) : 0;
  const isTimeCritical = timeRemaining <= 10;

  return (
    <div className="voice-controls-card">
      {/* Live Transcript Display */}
      <div className="transcript-box">
        <div className="transcript-header">
          <span className="transcript-label">
            {isListening ? (
              <span className="live-indicator">
                <span className="live-dot" /> LIVE TRANSCRIPT
              </span>
            ) : manualMode ? (
              'TYPE YOUR EXPLANATION'
            ) : (
              'YOUR EXPLANATION'
            )}
          </span>

          {/* Time Remaining Indicator */}
          {timeLimit > 0 && (
            <div className={`viva-timer ${isTimeCritical ? 'critical' : ''}`}>
              <Clock size={14} />
              <span>{timeRemaining}s remaining</span>
            </div>
          )}
        </div>

        {manualMode ? (
          <textarea
            className="transcript-textarea"
            placeholder="Type your explanation here as if answering the examiner verbally..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            autoFocus
          />
        ) : (
          <div className="transcript-text">
            {displayText ? (
              <p>{displayText}</p>
            ) : (
              <p className="transcript-placeholder">
                {isListening
                  ? 'Listening... Speak your explanation clearly.'
                  : isExaminerSpeaking
                  ? 'Listening to question... Press the microphone when ready to answer.'
                  : 'Press "Start Answer" to begin speaking, or switch to typing mode.'}
              </p>
            )}
          </div>
        )}

        {/* Timer Bar */}
        {timeLimit > 0 && isListening && (
          <div className="timer-progress-bar">
            <div
              className={`timer-progress-fill ${isTimeCritical ? 'critical' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Main Mic & Action Toolbar */}
      <div className="voice-actions-toolbar">
        {/* Toggle Mode Button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setManualMode((prev) => !prev)}
          title={manualMode ? 'Switch to Voice Input' : 'Type Answer Instead'}
        >
          {manualMode ? <Mic size={15} /> : <Keyboard size={15} />}
          <span>{manualMode ? 'Use Voice' : 'Type Answer'}</span>
        </button>

        {/* Big Mic Record Button */}
        {!manualMode && recognitionSupported ? (
          <button
            type="button"
            className={`btn-mic-main ${isListening ? 'listening' : ''}`}
            onClick={handleToggleMic}
            disabled={isSubmitting}
            aria-label={isListening ? 'Stop recording answer' : 'Start recording answer'}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            <span>{isListening ? 'Finish Speaking' : 'Start Answer'}</span>
          </button>
        ) : null}

        {/* Submit Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (isListening) onStopListening();
            if (transcript.trim()) onSubmitAnswer(transcript.trim());
          }}
          disabled={!transcript.trim() || isSubmitting}
        >
          <Send size={16} />
          <span>{isSubmitting ? 'Evaluating...' : 'Submit Explanation'}</span>
        </button>
      </div>
    </div>
  );
}
