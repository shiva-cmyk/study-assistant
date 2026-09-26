import React, { useState, useEffect, useRef } from 'react';
import { Users, Copy, Check, Shield, AlertTriangle, MessageSquare, Volume2, Sparkles, LogOut, Crown } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { WebRTCManager } from '../../lib/webrtc';
import { ParticipantGrid } from './ParticipantGrid';
import { RoomChat } from './RoomChat';
import { SharedStudyTabs } from './SharedStudyTabs';
import { RoomToolbar } from './RoomToolbar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export function StudyRoomLayout({
  initialRoomState,
  currentUserName,
  onLeave,
  onReviewWeakAreas,
}) {
  const [roomState, setRoomState] = useState(initialRoomState);
  const [localMicEnabled, setLocalMicEnabled] = useState(true);
  const [localCameraEnabled, setLocalCameraEnabled] = useState(true);
  const [localIsSpeaking, setLocalIsSpeaking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState(null);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const toast = useToast();

  // WebRTC streams state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  const webrtcManagerRef = useRef(null);
  const socketRef = useRef(null);

  const socket = getSocket();
  socketRef.current = socket;

  const currentUserId = socket.id;
  const isHost = roomState?.hostId === currentUserId;

  // Initialize WebRTC and Socket listeners
  useEffect(() => {
    let isMounted = true;

    const manager = new WebRTCManager({
      socket,
      onRemoteStream: (peerId, stream) => {
        if (!isMounted) return;
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(peerId, stream);
          return updated;
        });
      },
      onPeerLeft: (peerId) => {
        if (!isMounted) return;
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
      },
      onSpeakingChange: (speaking) => {
        if (!isMounted) return;
        setLocalIsSpeaking(speaking);
        socket.emit('webrtc:media-state', {
          roomId: roomState?.id,
          micEnabled: localMicEnabled,
          cameraEnabled: localCameraEnabled,
          isSpeaking: speaking,
        });
      },
      onMediaError: (err) => {
        if (!isMounted) return;
        setPermissionNotice(err.message);
      },
    });

    webrtcManagerRef.current = manager;

    // Start local media (with automatic fallback to audio-only or chat-only)
    manager.startLocalMedia({ video: true, audio: true }).then((res) => {
      if (isMounted) {
        setLocalStream(res.stream);
        setLocalCameraEnabled(res.hasVideo);
        setLocalMicEnabled(res.hasAudio);

        // Initiate mesh connections with existing participants
        (roomState?.participants || []).forEach((p) => {
          if (p.id !== currentUserId) {
            manager.initiateCall(p.id);
          }
        });
      }
    });

    // Socket Event Listeners
    const handleStateUpdate = (newState) => {
      if (isMounted && newState) {
        setRoomState(newState);
      }
    };

    const handleParticipantJoined = ({ participant, roomState: updatedState }) => {
      if (!isMounted) return;
      if (updatedState) setRoomState(updatedState);
      if (participant && participant.id !== currentUserId) {
        manager.initiateCall(participant.id);
        toast.info(`${participant.name} joined the room.`);
      }
    };

    const handleMediaStateUpdated = ({ participantId, micEnabled, cameraEnabled, isSpeaking }) => {
      if (!isMounted) return;
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedParts = (prev.participants || []).map((p) => {
          if (p.id === participantId) {
            return {
              ...p,
              micEnabled: typeof micEnabled === 'boolean' ? micEnabled : p.micEnabled,
              cameraEnabled: typeof cameraEnabled === 'boolean' ? cameraEnabled : p.cameraEnabled,
              isSpeaking: typeof isSpeaking === 'boolean' ? isSpeaking : p.isSpeaking,
            };
          }
          return p;
        });
        return { ...prev, participants: updatedParts };
      });
    };

    const handleChatMessage = (msg) => {
      if (!isMounted || !msg) return;
      setRoomState((prev) => {
        if (!prev) return prev;
        if (prev.chatMessages?.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          chatMessages: [...(prev.chatMessages || []), msg].slice(-60),
        };
      });
    };

    const handleRoomEnded = ({ message }) => {
      toast.warning(message || 'The study room has ended.');
      onLeave();
    };

    socket.on('room:state-update', handleStateUpdate);
    socket.on('room:participant-joined', handleParticipantJoined);
    socket.on('webrtc:media-state-updated', handleMediaStateUpdated);
    socket.on('chat:message', handleChatMessage);
    socket.on('room:ended', handleRoomEnded);

    return () => {
      isMounted = false;
      manager.cleanup();
      socket.off('room:state-update', handleStateUpdate);
      socket.off('room:participant-joined', handleParticipantJoined);
      socket.off('webrtc:media-state-updated', handleMediaStateUpdated);
      socket.off('chat:message', handleChatMessage);
      socket.off('room:ended', handleRoomEnded);
    };
  }, []);

  // Toolbar Handlers
  const handleToggleMic = () => {
    const nextState = !localMicEnabled;
    setLocalMicEnabled(nextState);
    webrtcManagerRef.current?.toggleAudio(nextState);
    socket.emit('webrtc:media-state', {
      roomId: roomState?.id,
      micEnabled: nextState,
      cameraEnabled: localCameraEnabled,
      isSpeaking: false,
    });
  };

  const handleToggleCamera = () => {
    const nextState = !localCameraEnabled;
    setLocalCameraEnabled(nextState);
    webrtcManagerRef.current?.toggleVideo(nextState);
    socket.emit('webrtc:media-state', {
      roomId: roomState?.id,
      micEnabled: localMicEnabled,
      cameraEnabled: nextState,
      isSpeaking: localIsSpeaking,
    });
  };

  const handleSendMessage = (messageText) => {
    socket.emit('chat:send', {
      roomId: roomState?.id,
      message: messageText,
      userName: currentUserName,
    });
  };

  const handleAskAi = (userQuery) => {
    socket.emit('ai:ask', {
      roomId: roomState?.id,
      userQuery,
      userName: currentUserName,
    });
  };

  const handleStartGroupQuiz = () => {
    socket.emit('quiz:start', { roomId: roomState?.id });
  };

  const handleSubmitQuizAnswer = (optionIndex) => {
    socket.emit('quiz:submit-answer', { roomId: roomState?.id, optionIndex });
  };

  const handleRevealQuizAnswer = () => {
    socket.emit('quiz:reveal', { roomId: roomState?.id });
  };

  const handleNextQuizQuestion = () => {
    socket.emit('quiz:next', { roomId: roomState?.id });
  };

  const handleStartAiChallenge = () => {
    socket.emit('ai:challenge-start', { roomId: roomState?.id });
  };

  const handleRevealAiChallenge = () => {
    socket.emit('ai:challenge-analyze', { roomId: roomState?.id });
  };

  const handleCopyCode = () => {
    if (roomState?.id) {
      navigator.clipboard.writeText(roomState.id).then(() => {
        setCopiedCode(true);
        toast.success(`Room code "${roomState.id}" copied to clipboard!`);
        setTimeout(() => setCopiedCode(false), 2500);
      });
    }
  };

  const confirmLeaveRoom = () => {
    socket.emit('room:leave');
    onLeave();
  };

  const localParticipant =
    roomState?.participants?.find((p) => p.id === currentUserId) || {
      id: currentUserId,
      name: currentUserName || 'You',
      isHost,
      micEnabled: localMicEnabled,
      cameraEnabled: localCameraEnabled,
    };

  return (
    <div className="study-room-layout animate-fadeIn">
      {/* Top Navigation / Room Info Header */}
      <div className="study-room-header">
        <div className="header-left-group">
          <div className="room-title-block">
            <h2>{roomState?.name || 'Study Room'}</h2>
            <span className="room-topic-badge">{roomState?.topic || 'Core Concept'}</span>
          </div>
        </div>

        <div className="header-center-code">
          <div className="room-code-badge" onClick={handleCopyCode} title="Click to copy room code">
            <span className="code-label">ROOM CODE:</span>
            <strong className="code-text">{roomState?.id}</strong>
            {copiedCode ? (
              <Check size={14} className="copied-icon" />
            ) : (
              <Copy size={14} className="copy-icon" />
            )}
          </div>
        </div>

        <div className="header-right-group">
          <span className="member-count-pill">
            <Users size={14} />
            <span>
              {roomState?.participants?.length || 1}/{roomState?.maxParticipants || 6} Members
            </span>
          </span>

          <button
            type="button"
            className="btn btn-secondary btn-sm btn-leave-top"
            onClick={() => setIsLeaveConfirmOpen(true)}
          >
            <LogOut size={14} />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Permission Fallback Notice */}
      {permissionNotice && (
        <div className="permission-notice-banner animate-fadeIn">
          <AlertTriangle size={16} />
          <span>{permissionNotice}</span>
          <button
            type="button"
            className="btn-dismiss-notice"
            onClick={() => setPermissionNotice(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Video Stage */}
      <div className="study-room-video-section">
        <ParticipantGrid
          participants={roomState?.participants || []}
          localParticipant={localParticipant}
          localStream={localStream}
          remoteStreams={remoteStreams}
          localMicEnabled={localMicEnabled}
          localCameraEnabled={localCameraEnabled}
          localIsSpeaking={localIsSpeaking}
        />
      </div>

      {/* Split Interactive Panel (Chat on Left, Study Content on Right) */}
      <div className="study-room-split-panel">
        <div className="split-left-chat">
          <RoomChat
            messages={roomState?.chatMessages || []}
            onSendMessage={handleSendMessage}
            onAskAi={handleAskAi}
            currentUserId={currentUserId}
          />
        </div>

        <div className="split-right-study">
          <SharedStudyTabs
            roomState={roomState}
            isHost={isHost}
            currentUserId={currentUserId}
            onStartQuiz={handleStartGroupQuiz}
            onSubmitQuizAnswer={handleSubmitQuizAnswer}
            onRevealQuizAnswer={handleRevealQuizAnswer}
            onNextQuizQuestion={handleNextQuizQuestion}
            onAskAi={handleAskAi}
            onStartAiChallenge={handleStartAiChallenge}
            onRevealAiChallenge={handleRevealAiChallenge}
            onReviewWeakAreas={onReviewWeakAreas}
          />
        </div>
      </div>

      {/* Bottom Control Toolbar */}
      <RoomToolbar
        micEnabled={localMicEnabled}
        cameraEnabled={localCameraEnabled}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onOpenAiPrompt={() => handleAskAi(`Clarify the primary core mechanism in ${roomState?.topic}`)}
        isHost={isHost}
        onHostStartQuiz={handleStartGroupQuiz}
        onHostStartChallenge={handleStartAiChallenge}
        onLeaveRoom={() => setIsLeaveConfirmOpen(true)}
      />

      {/* Confirm Leave Room Dialog */}
      <ConfirmDialog
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={confirmLeaveRoom}
        title="Leave Study Room"
        message="Are you sure you want to leave this study session? You can always rejoin using the room code."
        confirmText="Leave Room"
        isDanger={true}
      />
    </div>
  );
}
