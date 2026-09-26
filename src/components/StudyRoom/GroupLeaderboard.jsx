import React from 'react';
import { Trophy, Award, AlertCircle, BookOpen, RotateCcw, ArrowRight, CheckCircle } from 'lucide-react';

export function GroupLeaderboard({
  quizState,
  isHost = false,
  onRestartQuiz,
  onReviewWeakAreas,
}) {
  const scores = (quizState?.scores || []).sort((a, b) => (b.score || 0) - (a.score || 0));
  const weakCategories = quizState?.weakCategories || [];

  return (
    <div className="group-leaderboard-card animate-fadeIn">
      <div className="leaderboard-header">
        <div className="leaderboard-badge">
          <Trophy size={18} />
          <span>Group Performance Summary</span>
        </div>
        <h3>Quiz Completed!</h3>
        <p>Great collaborative practice session. Check the group rankings and weak concept areas below.</p>
      </div>

      {/* Leaderboard Table */}
      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Participant</th>
              <th>Score</th>
              <th>Mastery</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, idx) => {
              const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              return (
                <tr key={s.userId || idx} className={idx === 0 ? 'top-rank' : ''}>
                  <td className="rank-cell">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                  </td>
                  <td className="name-cell">{s.name}</td>
                  <td className="score-cell">
                    {s.score} / {s.total}
                  </td>
                  <td className="pct-cell">
                    <span className={`score-badge ${pct >= 80 ? 'good' : pct >= 50 ? 'average' : 'poor'}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Group Weak Areas */}
      {weakCategories.length > 0 && (
        <div className="group-weak-areas-box">
          <div className="weak-header">
            <AlertCircle size={18} className="weak-icon" />
            <h4>Group Focus Areas</h4>
          </div>
          <p className="weak-desc">
            Topics where mistakes were made during the group quiz:
          </p>
          <div className="weak-chips-list">
            {weakCategories.map((w, idx) => (
              <span key={idx} className="weak-topic-chip">
                {w.category}
              </span>
            ))}
          </div>

          {onReviewWeakAreas && (
            <button
              type="button"
              className="btn btn-warning btn-sm btn-review-weak"
              onClick={() => onReviewWeakAreas(weakCategories.map((w) => w.category))}
            >
              <BookOpen size={14} />
              <span>Review Topics in Flashcards</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Host Controls */}
      {isHost && onRestartQuiz && (
        <div className="leaderboard-actions">
          <button type="button" className="btn btn-secondary btn-md" onClick={onRestartQuiz}>
            <RotateCcw size={16} />
            <span>Retake Group Quiz</span>
          </button>
        </div>
      )}
    </div>
  );
}
