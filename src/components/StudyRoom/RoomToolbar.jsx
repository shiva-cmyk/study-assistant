import React from 'react';
import { Mic, MicOff, Video, VideoOff, Sparkles, Play, LogOut, Crown } from 'lucide-react';

export function RoomToolbar({
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onOpenAiPrompt,
  isHost,
  onHostStartQuiz,
  onHostStartChallenge,
  onLeaveRoom,
}) {
  return (
    <div className="room-control-toolbar">
      {/* Media Controls */}
      <div className="toolbar-group media-controls">
        <button
          type="button"
          className={`toolbar-btn ${micEnabled ? 'active-media' : 'muted-media'}`}
          onClick={onToggleMic}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          <span>{micEnabled ? 'Mute' : 'Unmuted'}</span>
        </button>

        <button
          type="button"
          className={`toolbar-btn ${cameraEnabled ? 'active-media' : 'muted-media'}`}
          onClick={onToggleCamera}
          title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          <span>{cameraEnabled ? 'Camera' : 'Cam Off'}</span>
        </button>
      </div>

      {/* Center Study AI Actions */}
      <div className="toolbar-group ai-controls">
        <button
          type="button"
          className="toolbar-btn btn-ai-sparkle"
          onClick={onOpenAiPrompt}
          title="Ask StudyFlow AI Moderator"
        >
          <Sparkles size={17} />
          <span>Ask StudyFlow AI</span>
        </button>

        {isHost && (
          <>
            <button
              type="button"
              className="toolbar-btn btn-host-action"
              onClick={onHostStartQuiz}
              title="Start Synchronized Group Quiz"
            >
              <Play size={16} />
              <span>Start Group Quiz</span>
            </button>
          </>
        )}
      </div>

      {/* Leave Room */}
      <div className="toolbar-group end-controls">
        <button
          type="button"
          className="toolbar-btn btn-leave-room"
          onClick={onLeaveRoom}
          title="Leave Study Room"
        >
          <LogOut size={17} />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
}
