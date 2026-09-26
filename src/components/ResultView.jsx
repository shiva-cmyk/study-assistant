import React, { useState, useEffect } from 'react';
import {
  Layers,
  HelpCircle,
  Clock,
  BarChart2,
  Zap,
  RotateCcw,
  Copy,
  Check,
  Sliders,
  Sparkles,
  Tag,
  Target,
  Mic,
  Users,
} from 'lucide-react';
import { FlashcardDeck } from './FlashcardDeck';
import { Quiz } from './Quiz';
import { VivaSetup } from './Viva/VivaSetup';
import { VivaRoom } from './Viva/VivaRoom';
import { VivaReport } from './Viva/VivaReport';
import { StudyRoomEntry } from './StudyRoom/StudyRoomEntry';
import { StudyRoomLayout } from './StudyRoom/StudyRoomLayout';

export function ResultView({
  studyData,
  onRegenerate,
  onChangeSettings,
}) {
  const [studyMode, setStudyMode] = useState('learn'); // 'learn' | 'practice' | 'exam' | 'viva' | 'room'
  const [focusedCategories, setFocusedCategories] = useState([]);
  const [copiedToast, setCopiedToast] = useState(false);

  // Viva sub-states
  const [vivaStage, setVivaStage] = useState('setup'); // 'setup' | 'room' | 'report'
  const [vivaConfig, setVivaConfig] = useState({
    difficulty: studyData?.metadata?.difficulty || 'intermediate',
    interviewType: 'mixed',
    questionCount: 5,
    timeLimitSeconds: 60,
  });
  const [vivaSessionData, setVivaSessionData] = useState([]);

  // Study Room sub-states
  const [roomStage, setRoomStage] = useState('entry'); // 'entry' | 'in_room'
  const [activeRoomData, setActiveRoomData] = useState(null); // { roomId, roomState, userName, isHost }

  // Session progress state
  const [flashcardStats, setFlashcardStats] = useState({ known: 0, review: 0, total: 0 });
  const [quizStats, setQuizStats] = useState({ answered: 0, correct: 0, total: 0 });

  useEffect(() => {
    if (studyData) {
      setFlashcardStats({ known: 0, review: 0, total: studyData.cards?.length || 0 });
      setQuizStats({ answered: 0, correct: 0, total: studyData.quiz?.length || 0 });
      setFocusedCategories([]);
      setVivaStage('setup');
      setVivaSessionData([]);
      setRoomStage('entry');
      setActiveRoomData(null);
    }
  }, [studyData]);

  if (!studyData) return null;

  const { title, summary, metadata = {}, cards = [], quiz = [] } = studyData;

  const totalCards = cards.length;
  const totalQuiz = quiz.length;
  const totalItems = totalCards + totalQuiz;

  const reviewedCardsCount = flashcardStats.known + flashcardStats.review;
  const sessionMasteryPercent = totalCards > 0
    ? Math.round((flashcardStats.known / totalCards) * 100)
    : 0;

  const totalProgressPercent = totalItems > 0
    ? Math.round(((reviewedCardsCount + quizStats.answered) / totalItems) * 100)
    : 0;

  const handleCopyStudySet = () => {
    const textOutput = [
      `# ${title}`,
      `Summary: ${summary}`,
      `Difficulty: ${metadata.difficulty || 'Intermediate'} | Estimated Time: ~${metadata.estimatedMinutes || 12} mins`,
      '',
      '## Flashcards:',
      ...cards.map((c, i) => `${i + 1}. Q: ${c.question}\n   A: ${c.answer} [Category: ${c.category || 'Core'}]`),
      '',
      '## Practice Quiz:',
      ...quiz.map((q, i) => `${i + 1}. ${q.question}\n` +
        q.options.map((opt, oIdx) => `   [${String.fromCharCode(65 + oIdx)}] ${opt}`).join('\n') +
        `\n   Correct Answer: [${String.fromCharCode(65 + q.answer)}] ${q.options[q.answer]}` +
        `\n   Explanation: ${q.explanation}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(textOutput).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    });
  };

  const handleReviewWeakCategories = (categories) => {
    setFocusedCategories(categories);
    setStudyMode('learn'); // Switch back to flashcard deck filtered to weak topics
  };

  const handleStartViva = (config) => {
    setVivaConfig(config);
    setVivaStage('room');
  };

  const handleFinishVivaSession = (history) => {
    setVivaSessionData(history);
    setVivaStage('report');
  };

  const handleRoomJoined = (roomData) => {
    setActiveRoomData(roomData);
    setRoomStage('in_room');
  };

  const handleLeaveRoom = () => {
    setRoomStage('entry');
    setActiveRoomData(null);
  };

  return (
    <div className="study-result-view">
      {/* Top Study Dashboard */}
      <div className="study-dashboard-card">
        <div className="dashboard-top-row">
          <div>
            <div className="dashboard-badge-row">
              <span className={`meta-badge difficulty-${metadata.difficulty || 'intermediate'}`}>
                {metadata.difficulty ? metadata.difficulty.toUpperCase() : 'INTERMEDIATE'}
              </span>
              <span className="meta-badge">
                <Clock size={12} />
                <span>~{metadata.estimatedMinutes || 12} mins</span>
              </span>
              <span className="meta-badge">
                <Target size={12} />
                <span>{cards.length} Cards · {quiz.length} Questions · Study Room</span>
              </span>
            </div>
            <h2 className="study-title">{title}</h2>
            {summary && <p className="study-summary">{summary}</p>}
          </div>

          {/* Action Toolbar */}
          <div className="dashboard-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyStudySet}
              title="Copy study set text to clipboard"
            >
              {copiedToast ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
              <span>{copiedToast ? 'Copied!' : 'Copy Study Set'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onChangeSettings}
              title="Change difficulty, card count, or topic"
            >
              <Sliders size={14} />
              <span>Change Settings</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRegenerate}
              title="Regenerate this study set with fresh questions"
            >
              <RotateCcw size={14} />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* Concept Topics Tags */}
        {metadata.topics && metadata.topics.length > 0 && (
          <div className="dashboard-topics">
            <span className="topics-label">
              <Tag size={13} />
              <span>Covered Concepts:</span>
            </span>
            {metadata.topics.map((topic, i) => (
              <span key={i} className="topic-chip">{topic}</span>
            ))}
          </div>
        )}

        {/* Live Learning Session Progress Card */}
        <div className="session-progress-grid">
          <div className="progress-stat-card">
            <div className="stat-label">Session Progress</div>
            <div className="stat-value">{totalProgressPercent}%</div>
            <div className="stat-subtext">
              {reviewedCardsCount + quizStats.answered} of {totalItems} items completed
            </div>
          </div>

          <div className="progress-stat-card">
            <div className="stat-label">Flashcard Mastery</div>
            <div className="stat-value">{sessionMasteryPercent}%</div>
            <div className="stat-subtext">
              {flashcardStats.known} mastered · {flashcardStats.review} flagged for review
            </div>
          </div>

          <div className="progress-stat-card">
            <div className="stat-label">Quiz Readiness</div>
            <div className="stat-value">
              {quizStats.total > 0 && quizStats.answered > 0
                ? `${Math.round((quizStats.correct / quizStats.answered) * 100)}%`
                : 'Not Started'}
            </div>
            <div className="stat-subtext">
              {quizStats.answered} of {totalQuiz} answered ({quizStats.correct} correct)
            </div>
          </div>
        </div>

        {/* Study Mode Selector Pills */}
        <div className="study-mode-bar">
          <span className="mode-bar-label">Active Mode:</span>
          <div className="view-tabs">
            <button
              type="button"
              className={`tab-btn ${studyMode === 'learn' ? 'active' : ''}`}
              onClick={() => setStudyMode('learn')}
            >
              <Layers size={16} />
              <span>📚 Flashcards</span>
              <span className="tab-count">{cards.length}</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${studyMode === 'practice' ? 'active' : ''}`}
              onClick={() => setStudyMode('practice')}
            >
              <HelpCircle size={16} />
              <span>🎯 Practice Quiz</span>
              <span className="tab-count">{quiz.length}</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${studyMode === 'exam' ? 'active' : ''}`}
              onClick={() => setStudyMode('exam')}
            >
              <Zap size={16} />
              <span>⚡ Exam Mode</span>
            </button>

            <button
              type="button"
              className={`tab-btn tab-btn-viva ${studyMode === 'viva' ? 'active' : ''}`}
              onClick={() => setStudyMode('viva')}
            >
              <Mic size={16} className="tab-viva-icon" />
              <span>🎤 Mock Viva</span>
            </button>

            <button
              type="button"
              className={`tab-btn tab-btn-room ${studyMode === 'room' ? 'active' : ''}`}
              onClick={() => setStudyMode('room')}
            >
              <Users size={16} className="tab-room-icon" />
              <span>👥 Study Room</span>
              <span className="tab-badge-collab">LIVE AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Mode Content */}
      <div className="study-mode-content">
        {studyMode === 'learn' && (
          <FlashcardDeck
            initialCards={cards}
            focusedCategories={focusedCategories}
            onClearFocusCategory={() => setFocusedCategories([])}
            onProgressUpdate={(stats) => setFlashcardStats(stats)}
          />
        )}

        {(studyMode === 'practice' || studyMode === 'exam') && (
          <Quiz
            fullQuiz={quiz}
            isExamMode={studyMode === 'exam'}
            onSwitchToFlashcards={() => setStudyMode('learn')}
            onReviewWeakCategories={handleReviewWeakCategories}
            onProgressUpdate={(stats) => setQuizStats(stats)}
          />
        )}

        {studyMode === 'viva' && (
          <div className="viva-mode-wrapper">
            {vivaStage === 'setup' && (
              <VivaSetup
                studyTitle={title}
                initialDifficulty={metadata.difficulty || 'intermediate'}
                onStartViva={handleStartViva}
                onBack={() => setStudyMode('learn')}
              />
            )}

            {vivaStage === 'room' && (
              <VivaRoom
                studyData={studyData}
                config={vivaConfig}
                onFinishSession={handleFinishVivaSession}
                onExit={() => setVivaStage('setup')}
              />
            )}

            {vivaStage === 'report' && (
              <VivaReport
                sessionData={vivaSessionData}
                config={vivaConfig}
                studyTitle={title}
                onRetry={() => setVivaStage('setup')}
                onReviewWeakCategories={handleReviewWeakCategories}
                onPracticeQuiz={() => setStudyMode('practice')}
                onReset={onChangeSettings}
              />
            )}
          </div>
        )}

        {studyMode === 'room' && (
          <div className="study-room-mode-wrapper">
            {roomStage === 'entry' && (
              <StudyRoomEntry
                studyData={studyData}
                onRoomJoined={handleRoomJoined}
                onBack={() => setStudyMode('learn')}
              />
            )}

            {roomStage === 'in_room' && activeRoomData && (
              <StudyRoomLayout
                initialRoomState={activeRoomData.roomState}
                currentUserName={activeRoomData.userName}
                onLeave={handleLeaveRoom}
                onReviewWeakAreas={handleReviewWeakCategories}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
