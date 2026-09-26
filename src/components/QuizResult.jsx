import React from 'react';
import { Award, RotateCcw, CheckCircle2, XCircle, ArrowRight, Layers, Target, AlertTriangle } from 'lucide-react';

export function QuizResult({
  score,
  total,
  incorrectQuestions = [],
  fullQuiz = [],
  onRetryIncorrect,
  onRestartFullQuiz,
  onSwitchToFlashcards,
  onReviewWeakCategories,
}) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPerfect = score === total;
  const hasIncorrect = incorrectQuestions.length > 0;
  const correctCount = score;
  const incorrectCount = total - score;

  // Derive weak vs strong categories from quiz items
  const weakCategorySet = new Set(
    incorrectQuestions
      .map((q) => q.category)
      .filter((cat) => typeof cat === 'string' && cat.trim().length > 0)
  );

  const strongCategories = fullQuiz
    .filter((q) => !weakCategorySet.has(q.category))
    .map((q) => q.category)
    .filter((v, i, a) => v && a.indexOf(v) === i);

  let feedbackTitle = 'Study Session Complete';
  let feedbackDesc = 'Review your performance metrics and focus on the areas that need reinforcement.';

  if (isPerfect) {
    feedbackTitle = 'Flawless Session! 🏆';
    feedbackDesc = 'You answered every question correctly in this session! Your understanding of these concepts is strong.';
  } else if (percentage >= 80) {
    feedbackTitle = 'Great Performance! 🌟';
    feedbackDesc = 'Solid mastery of the core concepts. Retrying the missed questions will help solidify the finer details.';
  } else if (percentage >= 60) {
    feedbackTitle = 'Good Progress! 📚';
    feedbackDesc = 'You understand the fundamentals. Reviewing weak areas and retesting will close the remaining gaps.';
  } else {
    feedbackTitle = 'Practice Needed 💪';
    feedbackDesc = 'These topics have several tricky distinctions. Spend time with the flashcards before retaking the quiz.';
  }

  return (
    <div className="quiz-result-card">
      <div className="score-badge-circle">
        <span className="score-percentage">{percentage}%</span>
        <span className="score-fraction">{score} of {total} correct</span>
      </div>

      <h3 className="quiz-feedback-title">{feedbackTitle}</h3>
      <p className="quiz-feedback-desc">{feedbackDesc}</p>

      {/* Metrics breakdown */}
      <div className="metrics-grid">
        <div className="metric-box">
          <span className="metric-num">{total}</span>
          <span className="metric-name">Questions</span>
        </div>
        <div className="metric-box success">
          <span className="metric-num">{correctCount}</span>
          <span className="metric-name">Correct</span>
        </div>
        <div className="metric-box danger">
          <span className="metric-num">{incorrectCount}</span>
          <span className="metric-name">Incorrect</span>
        </div>
        <div className="metric-box">
          <span className="metric-num">{percentage}%</span>
          <span className="metric-name">Accuracy</span>
        </div>
      </div>

      {/* Focus Areas Section */}
      {weakCategorySet.size > 0 && (
        <div className="focus-areas-card">
          <div className="focus-areas-header">
            <Target size={16} />
            <span>Identified Focus Areas</span>
          </div>
          <div className="focus-pills-list">
            {Array.from(weakCategorySet).map((cat, idx) => (
              <span key={idx} className="focus-pill weak">
                <AlertTriangle size={12} />
                <span>{cat}</span>
                <small>(Needs Review)</small>
              </span>
            ))}
            {strongCategories.slice(0, 3).map((cat, idx) => (
              <span key={idx} className="focus-pill strong">
                <CheckCircle2 size={12} />
                <span>{cat}</span>
                <small>(Strong)</small>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="quiz-result-actions">
        {hasIncorrect && (
          <button
            type="button"
            className="btn btn-warning btn-lg"
            onClick={onRetryIncorrect}
          >
            <RotateCcw size={18} />
            <span>Retry Wrong Answers ({incorrectQuestions.length})</span>
          </button>
        )}

        {weakCategorySet.size > 0 && onReviewWeakCategories && (
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => onReviewWeakCategories(Array.from(weakCategorySet))}
          >
            <Layers size={18} />
            <span>Review Weak Areas ({weakCategorySet.size})</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={onRestartFullQuiz}
        >
          <RotateCcw size={18} />
          <span>Retake Full Quiz</span>
        </button>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onSwitchToFlashcards}
        >
          <Layers size={18} />
          <span>Review Flashcards</span>
        </button>
      </div>
    </div>
  );
}
