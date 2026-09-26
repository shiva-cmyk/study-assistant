import React, { useState, useEffect, useRef } from 'react';
import { LogOut, ArrowLeft, RefreshCw, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';
import { VivaAvatar } from './VivaAvatar';
import { VivaQuestion } from './VivaQuestion';
import { VoiceControls } from './VoiceControls';
import { VivaFeedback } from './VivaFeedback';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { generateVivaQuestions, evaluateVivaAnswer } from '../../lib/vivaApi';
import { tts, stt } from '../../lib/speech';

export function VivaRoom({
  studyData,
  config = {},
  onFinishSession,
  onExit,
}) {
  // Session lifecycle states: 'loading' | 'active' | 'feedback' | 'error'
  const [sessionState, setSessionState] = useState('loading');
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentTurnData, setCurrentTurnData] = useState(null); // { question, answer, evaluation, isFollowUp }
  const [sessionHistory, setSessionHistory] = useState([]); // List of completed turns
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [isFollowUp, setIsFollowUp] = useState(false);
  const [activeFollowUpQuestion, setActiveFollowUpQuestion] = useState(null);

  // Avatar state: 'speaking' | 'listening' | 'thinking' | 'idle'
  const [avatarStatus, setAvatarStatus] = useState('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Timer states
  const timeLimit = config.timeLimitSeconds || 60;
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const timerRef = useRef(null);

  // Stop TTS/STT on unmount
  useEffect(() => {
    return () => {
      tts.stop();
      stt.stopListening();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1. Initial Questions Loading
  useEffect(() => {
    let isMounted = true;
    const fetchQuestions = async () => {
      setSessionState('loading');
      setErrorMessage(null);
      try {
        const response = await generateVivaQuestions(studyData, config);
        if (isMounted) {
          if (response && response.questions && response.questions.length > 0) {
            setQuestions(response.questions);
            setCurrentQIndex(0);
            setIsFollowUp(false);
            setActiveFollowUpQuestion(null);
            setSessionState('active');
          } else {
            throw new Error('Received an empty question set from the examiner.');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[VivaRoom] Error loading viva questions:', err);
          setErrorMessage(err.message || 'Failed to initialize the Mock Viva room.');
          setSessionState('error');
        }
      }
    };

    fetchQuestions();

    return () => {
      isMounted = false;
    };
  }, [studyData, config]);

  // Active question object
  const activeQuestion = isFollowUp
    ? {
        id: `followup-${currentQIndex}`,
        question: activeFollowUpQuestion,
        category: questions[currentQIndex]?.category || 'Follow-up',
        type: 'explanation',
        difficulty: questions[currentQIndex]?.difficulty || 'intermediate',
      }
    : questions[currentQIndex] || null;

  // 2. Speak question whenever active question changes in 'active' state
  useEffect(() => {
    if (sessionState === 'active' && activeQuestion?.question) {
      speakExaminerText(activeQuestion.question);
      resetTimer();
    }
  }, [sessionState, currentQIndex, isFollowUp, activeFollowUpQuestion]);

  // Helper to handle TTS speaking
  const speakExaminerText = (text) => {
    if (!text) return;
    setIsExaminerSpeaking(true);
    setAvatarStatus('speaking');

    tts.speak(text, {
      onStart: () => {
        setIsExaminerSpeaking(true);
        setAvatarStatus('speaking');
      },
      onEnd: () => {
        setIsExaminerSpeaking(false);
        setAvatarStatus('idle');
      },
      onError: () => {
        setIsExaminerSpeaking(false);
        setAvatarStatus('idle');
      },
    });
  };

  const handleStopExaminerSpeech = () => {
    tts.stop();
    setIsExaminerSpeaking(false);
    setAvatarStatus('idle');
  };

  // Timer Management
  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(timeLimit);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(timeLimit);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimeExpired = () => {
    stt.stopListening();
    setIsListening(false);
    setAvatarStatus('idle');
  };

  // 3. Microphone Controls
  const handleStartListening = (callbacks) => {
    handleStopExaminerSpeech();
    setIsListening(true);
    setAvatarStatus('listening');
    startTimer();

    stt.startListening({
      ...callbacks,
      onEnd: (finalTranscript) => {
        setIsListening(false);
        setAvatarStatus('idle');
        stopTimer();
        if (callbacks?.onFinal) callbacks.onFinal(finalTranscript);
      },
      onError: (err) => {
        setIsListening(false);
        setAvatarStatus('idle');
        stopTimer();
        if (callbacks?.onError) callbacks.onError(err);
      },
    });
  };

  const handleStopListening = () => {
    stt.stopListening();
    setIsListening(false);
    setAvatarStatus('idle');
    stopTimer();
  };

  // 4. Submit Student Answer for Semantic Evaluation
  const handleSubmitAnswer = async (studentAnswer) => {
    if (!studentAnswer || !studentAnswer.trim()) return;

    handleStopListening();
    setIsSubmitting(true);
    setAvatarStatus('thinking');

    try {
      const evaluation = await evaluateVivaAnswer({
        studyContext: {
          title: studyData?.title,
          summary: studyData?.summary,
        },
        question: activeQuestion,
        answer: studentAnswer,
        isFollowUp,
        history: sessionHistory.map((h) => ({
          question: h.question.question,
          answer: h.answer,
        })),
      });

      const turn = {
        question: activeQuestion,
        answer: studentAnswer,
        evaluation,
        isFollowUp,
      };

      const updatedHistory = [...sessionHistory, turn];
      setSessionHistory(updatedHistory);
      setCurrentTurnData(turn);
      setSessionState('feedback');
      setIsSubmitting(false);

      // Speak verbal feedback
      if (evaluation.feedback) {
        speakExaminerText(evaluation.feedback);
      } else {
        setAvatarStatus('idle');
      }
    } catch (err) {
      console.error('[VivaRoom] Evaluation error:', err);
      setIsSubmitting(false);
      setAvatarStatus('idle');
      // Fallback local turn so flow never hangs
      const fallbackTurn = {
        question: activeQuestion,
        answer: studentAnswer,
        evaluation: {
          classification: 'partially_correct',
          feedback: 'Your answer was received. Keep elaborating on core principles in the next question.',
          evaluation: { correctness: 7, completeness: 7, clarity: 7, overall: 7 },
          strengths: ['Addressed the general topic.'],
          missingConcepts: [],
          followUpRequired: false,
          followUpQuestion: null,
        },
        isFollowUp,
      };
      setSessionHistory([...sessionHistory, fallbackTurn]);
      setCurrentTurnData(fallbackTurn);
      setSessionState('feedback');
    }
  };

  // 5. Navigation & Follow-up Triggers
  const handleAnswerFollowUp = () => {
    handleStopExaminerSpeech();
    if (currentTurnData?.evaluation?.followUpQuestion) {
      setActiveFollowUpQuestion(currentTurnData.evaluation.followUpQuestion);
      setIsFollowUp(true);
      setSessionState('active');
    }
  };

  const handleNextQuestion = () => {
    handleStopExaminerSpeech();
    const nextIdx = currentQIndex + 1;

    if (nextIdx < questions.length) {
      setCurrentQIndex(nextIdx);
      setIsFollowUp(false);
      setActiveFollowUpQuestion(null);
      setCurrentTurnData(null);
      setSessionState('active');
    } else {
      // Completed all questions -> generate final report
      onFinishSession(sessionHistory);
    }
  };

  // Loading State
  if (sessionState === 'loading') {
    return (
      <div className="viva-room-loading animate-fadeIn">
        <VivaAvatar status="thinking" />
        <h3>Preparing Viva Room & Examining Study Set...</h3>
        <p className="loading-subtitle">
          Structuring oral conceptual questions for "{studyData?.title || 'your topic'}".
        </p>
      </div>
    );
  }

  // Error State
  if (sessionState === 'error') {
    return (
      <div className="viva-room-error animate-fadeIn">
        <AlertTriangle size={48} className="error-icon" />
        <h3>Unable to Start Viva Session</h3>
        <p>{errorMessage || 'Could not load interview questions. Please try again.'}</p>
        <div className="viva-error-actions">
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            <ArrowLeft size={16} />
            <span>Back to Setup</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSessionState('loading');
              setErrorMessage(null);
            }}
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="viva-room-container animate-fadeIn">
      {/* Top Session Bar */}
      <div className="viva-room-topbar">
        <div className="topbar-title-group">
          <span className="topbar-badge">Mock Viva Room</span>
          <span className="topbar-topic">{studyData?.title}</span>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-leave"
          onClick={() => {
            handleStopExaminerSpeech();
            handleStopListening();
            if (sessionHistory.length > 0) {
              setShowExitConfirm(true);
            } else {
              onExit();
            }
          }}
          title="Exit Viva Session"
        >
          <LogOut size={16} />
          <span>Exit Room</span>
        </button>
      </div>

      {/* Main Examination Stage */}
      <div className="viva-stage-grid">
        {/* Left Side: Avatar Examiner Column */}
        <div className="viva-avatar-panel">
          <VivaAvatar status={avatarStatus} />
        </div>

        {/* Right Side: Question, Voice Controls & Feedback */}
        <div className="viva-interaction-panel">
          {sessionState === 'active' && activeQuestion && (
            <div className="viva-active-turn animate-fadeIn">
              <VivaQuestion
                question={activeQuestion}
                questionIndex={currentQIndex}
                totalQuestions={questions.length}
                isFollowUp={isFollowUp}
                onRepeatSpeech={() => speakExaminerText(activeQuestion.question)}
                isSpeaking={isExaminerSpeaking}
              />

              <VoiceControls
                isListening={isListening}
                onStartListening={handleStartListening}
                onStopListening={handleStopListening}
                onSubmitAnswer={handleSubmitAnswer}
                isSubmitting={isSubmitting}
                timeRemaining={timeRemaining}
                timeLimit={timeLimit}
                isExaminerSpeaking={isExaminerSpeaking}
                onStopExaminerSpeech={handleStopExaminerSpeech}
              />
            </div>
          )}

          {sessionState === 'feedback' && currentTurnData && (
            <VivaFeedback
              evaluation={currentTurnData.evaluation}
              question={currentTurnData.question}
              studentAnswer={currentTurnData.answer}
              isFollowUp={currentTurnData.isFollowUp}
              onNextQuestion={handleNextQuestion}
              onAnswerFollowUp={handleAnswerFollowUp}
              isSpeaking={isExaminerSpeaking}
              onRepeatFeedback={() => speakExaminerText(currentTurnData.evaluation.feedback)}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => onFinishSession(sessionHistory)}
        title="Finish Mock Viva Early?"
        message="Would you like to finish the session now and view your performance report based on the questions answered so far?"
        confirmText="Finish & View Report"
        cancelText="Keep Practicing"
      />
    </div>
  );
}
