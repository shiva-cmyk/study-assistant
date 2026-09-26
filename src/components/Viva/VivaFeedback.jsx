import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  GitBranch,
  ShieldCheck,
  Award
} from 'lucide-react';

export function VivaFeedback({
  evaluation,
  question,
  studentAnswer,
  isFollowUp = false,
  onNextQuestion,
  onAnswerFollowUp,
  isSpeaking = false,
  onRepeatFeedback,
}) {
  if (!evaluation) return null;

  const {
    classification = 'partially_correct',
    feedback = '',
    evaluation: scores = { correctness: 7, completeness: 7, clarity: 7, overall: 7 },
    strengths = [],
    missingConcepts = [],
    followUpRequired = false,
    followUpQuestion = null,
  } = evaluation;

  // Status badges & color styling
  const badgeConfig = {
    correct: {
      label: 'Correct & Well Articulated',
      className: 'viva-badge-correct',
      icon: <CheckCircle2 size={18} className="badge-icon" />,
    },
    partially_correct: {
      label: 'Partially Correct / Incomplete',
      className: 'viva-badge-partial',
      icon: <AlertTriangle size={18} className="badge-icon" />,
    },
    incorrect: {
      label: 'Needs Conceptual Revision',
      className: 'viva-badge-incorrect',
      icon: <XCircle size={18} className="badge-icon" />,
    },
  };

  const badge = badgeConfig[classification] || badgeConfig.partially_correct;

  return (
    <div className="viva-feedback-card animate-fadeIn">
      {/* Header with Classification Badge and Repeat Audio Button */}
      <div className="viva-feedback-header">
        <div className={`viva-status-badge ${badge.className}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>

        {onRepeatFeedback && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onRepeatFeedback}
            title="Replay Examiner Spoken Feedback"
          >
            <Volume2 size={16} className={isSpeaking ? 'icon-pulse' : ''} />
            <span>Replay Feedback</span>
          </button>
        )}
      </div>

      {/* Main Spoken Examiner Assessment */}
      <div className="viva-examiner-comment">
        <div className="examiner-quote-box">
          <p className="examiner-quote-text">"{feedback}"</p>
        </div>
      </div>

      {/* Numerical Metric Breakdown */}
      <div className="viva-metric-grid">
        <div className="viva-metric-item">
          <div className="metric-header">
            <span className="metric-title">Correctness</span>
            <span className="metric-score">{scores.correctness || 0}/10</span>
          </div>
          <div className="metric-bar-bg">
            <div
              className="metric-bar-fill fill-green"
              style={{ width: `${((scores.correctness || 0) / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="viva-metric-item">
          <div className="metric-header">
            <span className="metric-title">Completeness</span>
            <span className="metric-score">{scores.completeness || 0}/10</span>
          </div>
          <div className="metric-bar-bg">
            <div
              className="metric-bar-fill fill-blue"
              style={{ width: `${((scores.completeness || 0) / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="viva-metric-item">
          <div className="metric-header">
            <span className="metric-title">Clarity & Precision</span>
            <span className="metric-score">{scores.clarity || 0}/10</span>
          </div>
          <div className="metric-bar-bg">
            <div
              className="metric-bar-fill fill-purple"
              style={{ width: `${((scores.clarity || 0) / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Strengths and Missing Key Points */}
      <div className="viva-points-grid">
        {strengths.length > 0 && (
          <div className="viva-points-column strengths">
            <h4 className="viva-points-heading">
              <ShieldCheck size={16} />
              <span>What You Explained Well</span>
            </h4>
            <ul className="viva-points-list">
              {strengths.map((str, idx) => (
                <li key={idx} className="point-item-positive">
                  <span className="point-bullet">✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingConcepts.length > 0 && (
          <div className="viva-points-column missing">
            <h4 className="viva-points-heading">
              <AlertCircle size={16} />
              <span>Missing Nuances / Key Points</span>
            </h4>
            <ul className="viva-points-list">
              {missingConcepts.map((mis, idx) => (
                <li key={idx} className="point-item-gap">
                  <span className="point-bullet">!</span>
                  <span>{mis}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Follow-up Question Callout (If adaptive follow-up is triggered) */}
      {!isFollowUp && followUpRequired && followUpQuestion && (
        <div className="viva-followup-callout">
          <div className="followup-badge">
            <GitBranch size={15} />
            <span>Examiner Follow-up Prompt</span>
          </div>
          <p className="followup-text">{followUpQuestion}</p>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="viva-feedback-actions">
        {!isFollowUp && followUpRequired && followUpQuestion ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onNextQuestion}
              title="Skip follow-up and move to next main question"
            >
              <span>Skip Follow-up</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onAnswerFollowUp}
            >
              <GitBranch size={16} />
              <span>Answer Follow-up Question</span>
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onNextQuestion}
          >
            <span>Continue Next Question</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
