import React from 'react';
import { VideoTile } from './VideoTile';

export function ParticipantGrid({
  participants = [],
  localParticipant,
  localStream,
  remoteStreams = new Map(),
  localMicEnabled = true,
  localCameraEnabled = true,
  localIsSpeaking = false,
}) {
  const count = participants.length;
  const gridClass =
    count <= 1
      ? 'grid-1'
      : count === 2
      ? 'grid-2'
      : count <= 4
      ? 'grid-4'
      : count <= 6
      ? 'grid-6'
      : 'grid-8';

  // Remote participants excluding local user
  const remoteParticipants = participants.filter((p) => p.id !== localParticipant?.id);

  return (
    <div className={`participant-video-grid ${gridClass}`}>
      {/* 1. Local Participant Tile */}
      {localParticipant && (
        <VideoTile
          participant={localParticipant}
          stream={localStream}
          isLocal={true}
          isSpeaking={localIsSpeaking}
          micEnabled={localMicEnabled}
          cameraEnabled={localCameraEnabled}
        />
      )}

      {/* 2. Remote Participant Tiles */}
      {remoteParticipants.map((p) => {
        const stream = remoteStreams.get ? remoteStreams.get(p.id) : remoteStreams[p.id];
        return (
          <VideoTile
            key={p.id}
            participant={p}
            stream={stream}
            isLocal={false}
            isSpeaking={p.isSpeaking}
            micEnabled={p.micEnabled}
            cameraEnabled={p.cameraEnabled}
          />
        );
      })}
    </div>
  );
}
