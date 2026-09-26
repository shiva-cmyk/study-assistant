import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { QuizResult } from './QuizResult';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function Quiz({
  fullQuiz = [],
  isExamMode = false,
  onSwitchToFlashcards,
  onReviewWeakCategories,
  onProgressUpdate,
}) {
  const [activeQuestions, setActiveQuestions] = useState(fullQuiz);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Store results: { [stableQuestionId]: { selected: number, isCorrect: boolean, question: object } }
  const [quizResults, setQuizResults] = useState({});
  const [isFinished, setIsFinished] = useState(false);

  // Sync if fullQuiz changes
  useEffect(() => {
    setActiveQuestions(fullQuiz);
    setIsRetryMode(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setQuizResults({});
    setIsFinished(false);
  }, [fullQuiz]);

  const currentQuestion = activeQuestions[currentIndex] || null;

  const handleSelectOption = (index) => {
    if (isSubmitted) return; // Prevent changing after submission
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;

    // Use STABLE question ID exclusively
    const questionId = currentQuestion.id;
    const isCorrect = selectedOption === currentQuestion.answer;

    setQuizResults((prev) => {
      const next = {
        ...prev,
        [questionId]: {
          selected: selectedOption,
          isCorrect,
          question: currentQuestion,
        },
      };

      if (onProgressUpdate) {
        const answeredCount = Object.keys(next).length;
        const correctCount = Object.values(next).filter((r) => r.isCorrect).length;
        onProgressUpdate({
          answered: answeredCount,
          correct: correctCount,
          total: fullQuiz.length,
        });
      }

      return next;
    });

    setIsSubmitted(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestartFullQuiz = () => {
    setActiveQuestions(fullQuiz);
    setIsRetryMode(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setQuizResults({});
    setIsFinished(false);
  };

  const handleRetryIncorrect = () => {
    // Filter only questions answered incorrectly in this round using STABLE IDs
    const wrongQuestions = activeQuestions.filter((q) => {
      const result = quizResults[q.id];
      return result && !result.isCorrect;
    });

    if (wrongQuestions.length === 0) return;

    setActiveQuestions(wrongQuestions);
    setIsRetryMode(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setQuizResults({});
    setIsFinished(false);
  };

  if (!fullQuiz || fullQuiz.length === 0) {
    return (
      <div className="quiz-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No quiz questions available for this study set.</p>
      </div>
    );
  }

  // If completed, show summary and retry options
  if (isFinished) {
    const total = activeQuestions.length;
    const score = Object.values(quizResults).filter((r) => r.isCorrect).length;
    const incorrectQuestions = activeQuestions.filter((q) => {
      const res = quizResults[q.id];
      return res && !res.isCorrect;
    });

    return (
      <QuizResult
        score={score}
        total={total}
        incorrectQuestions={incorrectQuestions}
        fullQuiz={fullQuiz}
        onRetryIncorrect={handleRetryIncorrect}
        onRestartFullQuiz={handleRestartFullQuiz}
        onSwitchToFlashcards={onSwitchToFlashcards}
        onReviewWeakCategories={onReviewWeakCategories}
      />
    );
  }

  if (!currentQuestion) return null;

  const isCurrentCorrect = selectedOption === currentQuestion.answer;
  const progressPercent = Math.round(((currentIndex + 1) / activeQuestions.length) * 100);
  const difficultyClass = currentQuestion.difficulty ? `difficulty-${currentQuestion.difficulty}` : 'difficulty-medium';

  return (
    <div className="quiz-container">
      <div className="quiz-card">
        {/* Header with category and progress */}
        <div className="quiz-header">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="quiz-badge">
              {isRetryMode ? 'Retry Mode' : isExamMode ? 'Exam Mode' : 'Practice Quiz'}
            </span>
            <span className="card-category">{currentQuestion.category || 'Concept Check'}</span>
            {currentQuestion.difficulty && (
              <span className={`card-difficulty-badge ${difficultyClass}`}>
                {currentQuestion.difficulty}
              </span>
            )}
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Question {currentIndex + 1} of {activeQuestions.length} ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="deck-progress-bar" style={{ marginBottom: 20 }}>
          <div className="deck-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Question Text */}
        <h3 className="quiz-question-text">{currentQuestion.question}</h3>

        {/* 4 Options List */}
        <div className="quiz-options-list">
          {currentQuestion.options.map((optionText, idx) => {
            let optionClass = 'quiz-option-btn';

            if (isSubmitted) {
              if (idx === currentQuestion.answer) {
                optionClass += ' correct';
              } else if (idx === selectedOption) {
                optionClass += ' incorrect';
              }
            } else if (selectedOption === idx) {
              optionClass += ' selected';
            }

            return (
              <button
                key={idx}
                type="button"
                className={optionClass}
                onClick={() => handleSelectOption(idx)}
                disabled={isSubmitted}
                aria-label={`Option ${OPTION_LETTERS[idx]}: ${optionText}`}
              >
                <span className="option-letter">{OPTION_LETTERS[idx]}</span>
                <span className="option-label">{optionText}</span>
                {isSubmitted && idx === currentQuestion.answer && (
                  <CheckCircle2 size={20} style={{ color: 'var(--success)', marginLeft: 'auto', flexShrink: 0 }} />
                )}
                {isSubmitted && idx === selectedOption && idx !== currentQuestion.answer && (
                  <XCircle size={20} style={{ color: 'var(--danger)', marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation displayed once submitted */}
        {isSubmitted && (
          <div className="explanation-box">
            <div className="explanation-title">
              {isCurrentCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <p className="explanation-text">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Action Controls */}
        <div className="quiz-actions">
          {!isSubmitted ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
            >
              <span>Submit Answer</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextQuestion}
            >
              <span>{currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'View Results'}</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
