import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { ResultView } from './components/ResultView';
import { StudyRoomLayout } from './components/StudyRoom/StudyRoomLayout';
import { JoinRoomModal } from './components/common/JoinRoomModal';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { ToastProvider, useToast } from './context/ToastContext';
import { generateStudySet } from './lib/api';
import Chatbot from "./components/chatbot/Chatbot";


function AppContent() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error' | 'in_room'
  const [studyData, setStudyData] = useState(null);
  const [error, setError] = useState(null);
  const [lastInput, setLastInput] = useState('');
  const [lastConfig, setLastConfig] = useState({
    difficulty: 'intermediate',
    cardCount: 8,
    quizCount: 5,
    mode: 'balanced',
  });

  // Active standalone room session if joined from Home or direct link
  const [standaloneRoom, setStandaloneRoom] = useState(null); // { roomId, roomState, userName, isHost }
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [initialRoomCode, setInitialRoomCode] = useState('');
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);

  const toast = useToast();

  // Protect against stale / out-of-order asynchronous responses
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Check URL query for room invite code (e.g. ?room=OS4821 or /room/OS4821)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromQuery = params.get('room');
    if (roomFromQuery) {
      setInitialRoomCode(roomFromQuery.toUpperCase());
      setIsJoinModalOpen(true);
    }
  }, []);

  /**
   * Main generation trigger
   */
  const handleGenerate = async (userInput, config = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentRequestId = ++requestIdRef.current;
    const currentConfig = { ...lastConfig, ...config };
    setLastInput(userInput);
    setLastConfig(currentConfig);
    setStatus('loading');
    setError(null);

    try {
      const data = await generateStudySet(userInput, currentConfig, abortController.signal);

      if (currentRequestId !== requestIdRef.current) {
        console.warn(`[StudyFlow] Ignored stale response from request #${currentRequestId}`);
        return;
      }

      setStudyData(data);
      setStatus('success');
      toast.success(`Generated "${data.title}" successfully!`);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      if (err.status === 499) return;

      console.error('[StudyFlow] Generation failed:', err);
      setError({
        message: err.message || 'Something went wrong while generating your study set.',
        details: err.details || null,
        status: err.status || 500,
      });
      setStatus('error');
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      handleGenerate(lastInput, lastConfig);
    } else {
      setStatus('idle');
    }
  };

  const handleRegenerate = () => {
    if (lastInput) {
      handleGenerate(lastInput, lastConfig);
    }
  };

  const handleChangeSettings = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setError(null);
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    requestIdRef.current++;
    setStatus('idle');
    setStudyData(null);
    setError(null);
    setStandaloneRoom(null);
    setLastInput('');
    setLastConfig({
      difficulty: 'intermediate',
      cardCount: 8,
      quizCount: 5,
      mode: 'balanced',
    });
  };

  // Direct room join handler
  const handleDirectRoomJoined = (roomData) => {
    setStandaloneRoom(roomData);
    setStatus('in_room');
    toast.success(`Joined room "${roomData.roomState?.name || roomData.roomId}"!`);
  };

  const handleLeaveStandaloneRoom = () => {
    setStandaloneRoom(null);
    if (studyData) {
      setStatus('success');
    } else {
      setStatus('idle');
    }
    toast.info('Left study room.');
  };

  // Clean up pending abort controllers on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  let currentViewName = 'home';
  if (status === 'success') currentViewName = 'result';
  if (status === 'in_room') currentViewName = 'room';

  return (
    <div className="app-container">
      <Header
        onReset={handleReset}
        hasActiveStudySet={Boolean(studyData)}
        onOpenJoinRoom={() => setIsJoinModalOpen(true)}
        onOpenCreateRoom={() => {
          if (studyData) {
            setStatus('success');
          } else {
            handleGenerate('Operating System Process Scheduling', { difficulty: 'intermediate', cardCount: 8, quizCount: 5 });
          }
        }}
        currentView={currentViewName}
        onNavigateHome={() => {
          if (status === 'in_room') {
            if (window.confirm('Leave active study room to return home?')) {
              handleLeaveStandaloneRoom();
            }
          } else {
            setStatus('idle');
          }
        }}
        onNavigateStudySets={() => {
          if (studyData) setStatus('success');
          else setStatus('idle');
        }}
        onNavigateViva={() => {
          if (studyData) setStatus('success');
          else setStatus('idle');
        }}
        onNavigateRooms={() => {
          if (studyData) setStatus('success');
          else setIsJoinModalOpen(true);
        }}
      />

      <main className="app-main">
        {status === 'idle' && (
          <PromptInput
            onGenerate={handleGenerate}
            isLoading={false}
            initialValue={lastInput}
            initialConfig={lastConfig}
            existingStudySet={studyData}
            onContinueExisting={() => setStatus('success')}
            onOpenJoinRoom={() => setIsJoinModalOpen(true)}
            onOpenCreateRoom={() => {
              if (studyData) {
                setStatus('success');
              } else {
                handleGenerate('Operating System Process Scheduling', { difficulty: 'intermediate', cardCount: 8, quizCount: 5 });
              }
            }}
          />
        )}

        {status === 'loading' && <LoadingState />}

        {status === 'error' && (
          <ErrorState
            error={error}
            onRetry={handleRetry}
            onEditInput={handleChangeSettings}
          />
        )}

        {status === 'success' && studyData && (
          <ResultView
            studyData={studyData}
            onRegenerate={handleRegenerate}
            onChangeSettings={handleChangeSettings}
          />
        )}

        {status === 'in_room' && standaloneRoom && (
          <StudyRoomLayout
            initialRoomState={standaloneRoom.roomState}
            currentUserName={standaloneRoom.userName}
            onLeave={handleLeaveStandaloneRoom}
            onReviewWeakAreas={(categories) => {
              if (studyData) {
                setStatus('success');
              }
            }}
          />
        )}
      </main>

      {/* Global Join Room Modal */}
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        initialCode={initialRoomCode}
        onJoined={handleDirectRoomJoined}
        onCreateRoomClick={() => {
          if (studyData) {
            setStatus('success');
          } else {
            handleGenerate('Operating System Process Scheduling', { difficulty: 'intermediate', cardCount: 8, quizCount: 5 });
          }
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <Chatbot />
      <AppContent />

    </ToastProvider>
  );
}

export default App;
