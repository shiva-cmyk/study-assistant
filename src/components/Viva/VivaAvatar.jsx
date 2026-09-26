import React from 'react';
import { Mic, Volume2, Brain, UserCheck } from 'lucide-react';

export function VivaAvatar({ status = 'idle' }) {
  // status: 'speaking' | 'listening' | 'thinking' | 'waiting' | 'idle'

  let statusLabel = 'Examiner Ready';
  let icon = <UserCheck size={28} />;

  if (status === 'speaking') {
    statusLabel = 'Speaking Question...';
    icon = <Volume2 size={28} className="icon-pulse" />;
  } else if (status === 'listening') {
    statusLabel = 'Listening to Your Answer...';
    icon = <Mic size={28} className="icon-pulse-red" />;
  } else if (status === 'thinking') {
    statusLabel = 'Analyzing Concept Clarity...';
    icon = <Brain size={28} className="icon-spin" />;
  }

  return (
    <div className={`viva-avatar-container status-${status}`}>
      <div className="avatar-pulse-ring" />
      <div className="avatar-pulse-ring ring-outer" />

      {/* Main avatar head circle */}
      <div className="avatar-head">
        <div className="avatar-face">
          {/* Eyes with blink/look state */}
          <div className="avatar-eyes">
            <div className="avatar-eye left" />
            <div className="avatar-eye right" />
          </div>

          {/* Sound waves or mouth indicator */}
          {status === 'speaking' ? (
            <div className="avatar-voice-waves">
              <span className="wave-bar w1" />
              <span className="wave-bar w2" />
              <span className="wave-bar w3" />
              <span className="wave-bar w4" />
              <span className="wave-bar w5" />
            </div>
          ) : status === 'listening' ? (
            <div className="avatar-listening-indicator">
              <span className="radar-dot" />
            </div>
          ) : (
            <div className="avatar-mouth neutral" />
          )}
        </div>
      </div>

      {/* Status indicator badge */}
      <div className="avatar-status-pill">
        <span className={`status-dot dot-${status}`} />
        <span>{statusLabel}</span>
      </div>
    </div>
  );
}
