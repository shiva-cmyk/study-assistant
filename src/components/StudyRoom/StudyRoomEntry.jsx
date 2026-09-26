import React, { useState } from 'react';
import { Users, Plus, LogIn, Sparkles, Shield, Lock, Globe, ArrowLeft, AlertTriangle } from 'lucide-react';
import { getSocket } from '../../lib/socket';

export function StudyRoomEntry({
  studyData,
  onRoomJoined,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [roomName, setRoomName] = useState(
    studyData?.title ? `${studyData.title.slice(0, 24)} Group` : 'Study Session'
  );
  const [hostName, setHostName] = useState('Host');
  const [joinName, setJoinName] = useState('Student');
  const [joinCode, setJoinCode] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [privacy, setPrivacy] = useState('code');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit(
      'room:create',
      {
        name: roomName,
        topic: studyData?.title || 'General Study',
        studySet: studyData,
        maxParticipants,
        privacy,
        hostName: hostName.trim() || 'Host',
      },
      (res) => {
        setIsLoading(false);
        if (res && res.success) {
          onRoomJoined({
            roomId: res.roomId,
            roomState: res.roomState,
            userName: hostName.trim() || 'Host',
            isHost: true,
          });
        } else {
          setErrorMessage(res?.error || 'Could not create study room.');
        }
      }
    );
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
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
        userName: joinName.trim() || 'Student',
      },
      (res) => {
        setIsLoading(false);
        if (res && res.success) {
          onRoomJoined({
            roomId: res.roomId,
            roomState: res.roomState,
            userName: joinName.trim() || 'Student',
            isHost: res.participant?.isHost || false,
          });
        } else {
          setErrorMessage(res?.error || 'Room not found or is currently full.');
        }
      }
    );
  };

  return (
    <div className="study-room-entry-card animate-fadeIn">
      <div className="entry-header">
        <div className="entry-badge">
          <Users size={18} />
          <span>Collaborative AI Study Room</span>
        </div>
        <h2>Study Together with Voice, Video & AI</h2>
        <p className="entry-subtitle">
          Join a shared study room with classmates on <strong>"{studyData?.title || 'this topic'}"</strong> to discuss concepts, take synchronized quizzes, and get grounded AI clarifications.
        </p>
      </div>

      {/* Tabs: Create vs Join */}
      <div className="entry-tab-bar">
        <button
          type="button"
          className={`entry-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('create');
            setErrorMessage(null);
          }}
        >
          <Plus size={16} />
          <span>Create Study Room</span>
        </button>

        <button
          type="button"
          className={`entry-tab-btn ${activeTab === 'join' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('join');
            setErrorMessage(null);
          }}
        >
          <LogIn size={16} />
          <span>Join Existing Room</span>
        </button>
      </div>

      {errorMessage && (
        <div className="entry-error-banner animate-fadeIn">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Create Room Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateRoom} className="entry-form">
          <div className="form-group">
            <label className="form-label">Study Topic (Synced to room)</label>
            <div className="topic-display-box">
              <span>{studyData?.title || 'General Concept Review'}</span>
              <span className="topic-items-count">
                {studyData?.cards?.length || 0} Cards · {studyData?.quiz?.length || 0} Quiz Questions
              </span>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Room Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. OS Revision Group"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={40}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your Name (Host)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Shiva"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                maxLength={24}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Maximum Participants</label>
              <div className="toggle-group">
                {[4, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`toggle-btn ${maxParticipants === num ? 'active' : ''}`}
                    onClick={() => setMaxParticipants(num)}
                  >
                    {num} Members
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Privacy Access</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${privacy === 'code' ? 'active' : ''}`}
                  onClick={() => setPrivacy('code')}
                >
                  <Globe size={14} /> Anyone with Code
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${privacy === 'invite' ? 'active' : ''}`}
                  onClick={() => setPrivacy('invite')}
                >
                  <Lock size={14} /> Invite Only
                </button>
              </div>
            </div>
          </div>

          <div className="entry-actions">
            {onBack && (
              <button type="button" className="btn btn-secondary" onClick={onBack}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
              <Plus size={18} />
              <span>{isLoading ? 'Creating Room...' : 'Create Room & Enter'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Join Room Form */}
      {activeTab === 'join' && (
        <form onSubmit={handleJoinRoom} className="entry-form">
          <div className="form-group">
            <label className="form-label">Room Code</label>
            <input
              type="text"
              className="form-input room-code-input"
              placeholder="e.g. OS4821"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              required
              autoFocus
            />
            <span className="form-hint">Enter the 6-character room code shared by your host.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Rahul"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={24}
              required
            />
          </div>

          <div className="entry-actions">
            {onBack && (
              <button type="button" className="btn btn-secondary" onClick={onBack}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading || !joinCode.trim()}>
              <LogIn size={18} />
              <span>{isLoading ? 'Connecting...' : 'Join Study Room'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
