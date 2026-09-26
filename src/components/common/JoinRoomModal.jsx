import React, { useState, useEffect } from 'react';
import { LogIn, Users, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { getSocket } from '../../lib/socket';

export function JoinRoomModal({
  isOpen,
  onClose,
  onJoined,
  onCreateRoomClick,
  initialCode = '',
}) {
  const [roomCode, setRoomCode] = useState(initialCode);
  const [userName, setUserName] = useState('Student');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (initialCode) {
      setRoomCode(initialCode.toUpperCase().trim());
    }
  }, [initialCode]);

  // Reset errors when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleJoin = (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a valid 6-character room code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit(
      'room:join',
      {
        roomId: cleanCode,
        userName: userName.trim() || 'Student',
      },
      (res) => {
        setIsLoading(false);
        if (res && res.success) {
          onJoined({
            roomId: res.roomId,
            roomState: res.roomState,
            userName: userName.trim() || 'Student',
            isHost: res.participant?.isHost || false,
          });
          onClose();
        } else {
          setErrorMessage(res?.error || 'Room not found or is currently full.');
        }
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join a Study Room"
      subtitle="Enter the 6-character room code shared by your host to collaborate in real time."
      maxWidth="460px"
    >
      <form onSubmit={handleJoin} className="join-modal-form">
        {errorMessage && (
          <div className="join-modal-error animate-fadeIn">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Room Code</label>
          <input
            type="text"
            className="form-input room-code-input"
            placeholder="e.g. OS4821"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              if (errorMessage) setErrorMessage(null);
            }}
            maxLength={8}
            required
            autoFocus
          />
          <span className="form-hint">Codes are 6 alphanumeric characters (e.g. OS4821).</span>
        </div>

        <div className="form-group">
          <label className="form-label">Your Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Shiva"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={24}
            required
          />
        </div>

        <div className="join-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            <span>Cancel</span>
          </button>
          <button type="submit" className="btn btn-primary" disabled={isLoading || !roomCode.trim()}>
            <LogIn size={16} />
            <span>{isLoading ? 'Connecting...' : 'Join Room'}</span>
          </button>
        </div>

        <div className="join-modal-footer-link">
          <span>Don't have a code? </span>
          <button
            type="button"
            className="btn-link-action"
            onClick={() => {
              onClose();
              if (onCreateRoomClick) onCreateRoomClick();
            }}
          >
            Create a new room
          </button>
        </div>
      </form>
    </Modal>
  );
}
