import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  FileQuestion,
  Tag,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export function VivaReport({
  sessionData = [],
  config = {},
  studyTitle = 'Study Topic',
  onRetry,
  onReviewWeakCategories,
  onPracticeQuiz,
  onReset,
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Filter out any empty turns
  const validTurns = sessionData.filter((t) => t && t.evaluation);

  // Compute aggregate metrics
  const totalQuestions = validTurns.length;
  let sumOverall = 0;
  let sumCorrectness = 0;
  let sumCompleteness = 0;
  let sumClarity = 0;

  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;

  const categoryScores = {};
  const strongPoints = [];
  const missingPoints = [];
  const weakCategoriesSet = new Set();

  validTurns.forEach((turn) => {
    const ev = turn.evaluation?.evaluation || {};
    const cls = turn.evaluation?.classification || 'partially_correct';
    const cat = turn.question?.category || 'Core Concepts';

    const overall = typeof ev.overall === 'number' ? ev.overall : 7;
    const corr = typeof ev.correctness === 'number' ? ev.correctness : 7;
    const comp = typeof ev.completeness === 'number' ? ev.completeness : 7;
    const clar = typeof ev.clarity === 'number' ? ev.clarity : 7;

    sumOverall += overall;
    sumCorrectness += corr;
    sumCompleteness += comp;
    sumClarity += clar;

    if (cls === 'correct') correctCount++;
    else if (cls === 'partially_correct') {
      partialCount++;
      if (overall < 7.5) weakCategoriesSet.add(cat);
    } else {
      incorrectCount++;
      weakCategoriesSet.add(cat);
    }

    if (!categoryScores[cat]) {
      categoryScores[cat] = { totalScore: 0, count: 0 };
    }
    categoryScores[cat].totalScore += overall;
    categoryScores[cat].count += 1;

    if (Array.isArray(turn.evaluation?.strengths)) {
      strongPoints.push(...turn.evaluation.strengths);
    }
    if (Array.isArray(turn.evaluation?.missingConcepts)) {
      missingPoints.push(...turn.evaluation.missingConcepts);
    }
  });

  const avgOverall = totalQuestions > 0 ? Math.round((sumOverall / totalQuestions) * 10) : 0; // %
  const avgCorrectness = totalQuestions > 0 ? Math.round((sumCorrectness / totalQuestions) * 10) : 0;
  const avgCompleteness = totalQuestions > 0 ? Math.round((sumCompleteness / totalQuestions) * 10) : 0;
  const avgClarity = totalQuestions > 0 ? Math.round((sumClarity / totalQuestions) * 10) : 0;

  const weakCategories = Array.from(weakCategoriesSet);

  // Performance tier assessment
  let performanceTier = 'Satisfactory';
  let tierColor = 'badge-partial';
  let tierAdvice = 'Good effort! Focus on revising missed technical nuances.';

  if (avgOverall >= 85) {
    performanceTier = 'Mastery / Excellent';
    tierColor = 'badge-correct';
    tierAdvice = 'Outstanding conceptual articulation! You demonstrated confident mastery.';
  } else if (avgOverall >= 70) {
    performanceTier = 'Proficient';
    tierColor = 'badge-correct';
    tierAdvice = 'Solid foundation. A few areas need more precise terminology.';
  } else if (avgOverall < 55) {
    performanceTier = 'Needs In-Depth Review';
    tierColor = 'badge-incorrect';
    tierAdvice = 'Recommended to review the flashcards and practice active recall before retrying.';
  }

  const toggleExpand = (idx) => {
    setExpandedIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="viva-report-dashboard animate-fadeIn">
      {/* Header Banner */}
      <div className="viva-report-header">
        <div className="viva-badge-hero">
          <Award size={20} />
          <span>Oral Examination Transcript & Evaluation</span>
        </div>
        <h2>Mock Viva Performance Report</h2>
        <p className="viva-report-subtitle">Topic: <strong>{studyTitle}</strong></p>
      </div>

      {/* Main Score Hero Card */}
      <div className="viva-score-hero-card">
        <div className="viva-score-circle">
          <div className="score-number">{avgOverall}%</div>
          <div className="score-subtext">Overall Score</div>
        </div>

        <div className="viva-score-summary-text">
          <div className={`viva-tier-pill ${tierColor}`}>
            <span>{performanceTier}</span>
          </div>
          <p className="viva-tier-advice">{tierAdvice}</p>

          <div className="viva-quick-counts">
            <span className="count-item count-correct">
              <CheckCircle2 size={16} /> {correctCount} Correct
            </span>
            <span className="count-item count-partial">
              <AlertTriangle size={16} /> {partialCount} Partially Correct
            </span>
            <span className="count-item count-incorrect">
              <XCircle size={16} /> {incorrectCount} Needs Work
            </span>
          </div>
        </div>
      </div>

      {/* 3 Core Skill Bars */}
      <div className="viva-skills-grid">
        <div className="viva-skill-card">
          <div className="skill-card-top">
            <span className="skill-name">Conceptual Correctness</span>
            <span className="skill-val">{avgCorrectness}%</span>
          </div>
          <div className="metric-bar-bg">
            <div className="metric-bar-fill fill-green" style={{ width: `${avgCorrectness}%` }} />
          </div>
          <p className="skill-hint">Accuracy of scientific and domain facts provided.</p>
        </div>

        <div className="viva-skill-card">
          <div className="skill-card-top">
            <span className="skill-name">Depth & Completeness</span>
            <span className="skill-val">{avgCompleteness}%</span>
          </div>
          <div className="metric-bar-bg">
            <div className="metric-bar-fill fill-blue" style={{ width: `${avgCompleteness}%` }} />
          </div>
          <p className="skill-hint">Coverage of key mechanisms, dependencies, and reasons.</p>
        </div>

        <div className="viva-skill-card">
          <div className="skill-card-top">
            <span className="skill-name">Verbal Clarity & Flow</span>
            <span className="skill-val">{avgClarity}%</span>
          </div>
          <div className="metric-bar-bg">
            <div className="metric-bar-fill fill-purple" style={{ width: `${avgClarity}%` }} />
          </div>
          <p className="skill-hint">Structure, conciseness, and precision of oral explanation.</p>
        </div>
      </div>

      {/* Weak Areas & Targeted Active Learning Action */}
      {weakCategories.length > 0 && (
        <div className="viva-weak-areas-banner">
          <div className="weak-banner-info">
            <AlertCircle size={24} className="weak-banner-icon" />
            <div>
              <h3>Areas Recommended for Targeted Revision</h3>
              <p>
                The examiner noted gaps in: <strong>{weakCategories.join(', ')}</strong>. Review these concepts in the flashcard deck to solidify your understanding.
              </p>
            </div>
          </div>
          {onReviewWeakCategories && (
            <button
              type="button"
              className="btn btn-warning btn-md"
              onClick={() => onReviewWeakCategories(weakCategories)}
            >
              <BookOpen size={16} />
              <span>Review in Flashcards</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* Question by Question Detailed Breakdown */}
      <div className="viva-breakdown-section">
        <h3 className="section-title">
          <FileQuestion size={18} />
          <span>Question-by-Question Transcript & Examiner Notes</span>
        </h3>

        <div className="viva-breakdown-list">
          {validTurns.map((turn, idx) => {
            const isExpanded = expandedIndex === idx;
            const ev = turn.evaluation?.evaluation || {};
            const cls = turn.evaluation?.classification || 'partially_correct';

            return (
              <div key={idx} className={`viva-breakdown-card status-${cls}`}>
                <div className="breakdown-card-header" onClick={() => toggleExpand(idx)}>
                  <div className="breakdown-header-left">
                    <span className="breakdown-index">
                      {turn.isFollowUp ? `Follow-up ${idx + 1}` : `Q${idx + 1}`}
                    </span>
                    <span className="breakdown-qtext">{turn.question?.question}</span>
                  </div>

                  <div className="breakdown-header-right">
                    <span className={`breakdown-score-badge score-${cls}`}>
                      {ev.overall || 7}/10
                    </span>
                    <button type="button" className="btn btn-ghost btn-icon">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="breakdown-card-body animate-fadeIn">
                    <div className="breakdown-row">
                      <span className="row-label">Your Verbal Response:</span>
                      <p className="row-answer">"{turn.answer || 'No transcript recorded.'}"</p>
                    </div>

                    <div className="breakdown-row">
                      <span className="row-label">Examiner Feedback:</span>
                      <p className="row-feedback">{turn.evaluation?.feedback}</p>
                    </div>

                    {turn.evaluation?.missingConcepts?.length > 0 && (
                      <div className="breakdown-row">
                        <span className="row-label">Missing Nuances:</span>
                        <ul className="breakdown-missing-list">
                          {turn.evaluation.missingConcepts.map((m, mi) => (
                            <li key={mi}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="viva-report-actions">
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            <RotateCcw size={16} />
            <span>Retake Mock Viva</span>
          </button>
        )}

        {onPracticeQuiz && (
          <button type="button" className="btn btn-secondary" onClick={onPracticeQuiz}>
            <Sparkles size={16} />
            <span>Take Practice Quiz</span>
          </button>
        )}

        {onReset && (
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            <span>Start New Topic</span>
          </button>
        )}
      </div>
    </div>
  );
}
