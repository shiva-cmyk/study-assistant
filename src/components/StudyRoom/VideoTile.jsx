import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Crown, User } from 'lucide-react';

export function VideoTile({
  participant,
  stream,
  isLocal = false,
  isSpeaking = false,
  micEnabled = true,
  cameraEnabled = true,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, cameraEnabled]);

  const initials = (participant?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasVideoStream = Boolean(stream && stream.getVideoTracks().length > 0 && cameraEnabled);

  return (
    <div className={`video-tile ${isSpeaking ? 'speaking' : ''} ${isLocal ? 'local-tile' : ''}`}>
      {/* Speaking border halo */}
      {isSpeaking && <div className="speaking-aura" />}

      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local video to prevent audio feedback loop
        className={`tile-video-element ${hasVideoStream ? 'visible' : 'hidden'}`}
      />

      {/* Avatar Placeholder when Camera is off */}
      {!hasVideoStream && (
        <div className="tile-avatar-fallback">
          <div className="avatar-circle">
            <span>{initials}</span>
          </div>
          <span className="avatar-name-sub">{participant?.name || 'Participant'}</span>
        </div>
      )}

      {/* Bottom Overlay Label */}
      <div className="tile-bottom-bar">
        <div className="tile-name-tag">
          {participant?.isHost && (
            <span className="host-badge" title="Room Host">
              <Crown size={12} />
            </span>
          )}
          <span className="participant-name">
            {participant?.name || 'Participant'} {isLocal ? '(You)' : ''}
          </span>
        </div>

        <div className="tile-status-icons">
          <span className={`status-icon-badge ${micEnabled ? 'mic-on' : 'mic-off'}`}>
            {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
          </span>
          <span className={`status-icon-badge ${cameraEnabled ? 'cam-on' : 'cam-off'}`}>
            {cameraEnabled ? <Video size={13} /> : <VideoOff size={13} />}
          </span>
        </div>
      </div>
    </div>
  );
}
