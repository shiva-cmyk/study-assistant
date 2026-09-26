import React, { useState } from 'react';
import { Mic, Sliders, Play, Award, Clock, HelpCircle, ArrowLeft } from 'lucide-react';

export function VivaSetup({
  studyTitle,
  initialDifficulty = 'intermediate',
  onStartViva,
  onBack,
}) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [interviewType, setInterviewType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(60);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStartViva({
      difficulty,
      interviewType,
      questionCount,
      timeLimitSeconds,
    });
  };

  return (
    <div className="viva-setup-card">
      <div className="viva-setup-header">
        <div className="viva-badge-hero">
          <Mic size={20} />
          <span>AI Oral Examination</span>
        </div>
        <h2>Mock Viva: {studyTitle}</h2>
        <p>
          Practice explaining concepts out loud. An AI examiner will ask verbal questions, evaluate your responses conceptually, ask adaptive follow-ups, and generate a performance report.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="viva-setup-form">
        <div className="config-grid">
          {/* Difficulty */}
          <div className="config-group">
            <label className="config-label">Examination Level</label>
            <div className="toggle-group">
              {[
                { id: 'beginner', label: 'Beginner' },
                { id: 'intermediate', label: 'Intermediate' },
                { id: 'advanced', label: 'Advanced' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={`toggle-btn ${difficulty === lvl.id ? 'active' : ''}`}
                  onClick={() => setDifficulty(lvl.id)}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interview Type */}
          <div className="config-group">
            <label className="config-label">Interview Style</label>
            <div className="toggle-group">
              {[
                { id: 'mixed', label: 'Mixed' },
                { id: 'conceptual', label: 'Conceptual' },
                { id: 'technical', label: 'Technical' },
                { id: 'viva', label: 'University Viva' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`toggle-btn ${interviewType === t.id ? 'active' : ''}`}
                  onClick={() => setInterviewType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions Count */}
          <div className="config-group">
            <label className="config-label">Question Count</label>
            <div className="toggle-group">
              {[
                { count: 3, label: '3 (Quick)' },
                { count: 5, label: '5 (Standard)' },
                { count: 10, label: '10 (Full Viva)' },
              ].map((q) => (
                <button
                  key={q.count}
                  type="button"
                  className={`toggle-btn ${questionCount === q.count ? 'active' : ''}`}
                  onClick={() => setQuestionCount(q.count)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Answer Time Limit */}
          <div className="config-group">
            <label className="config-label">Answer Time Limit</label>
            <div className="toggle-group">
              {[
                { sec: 30, label: '30s' },
                { sec: 60, label: '60s' },
                { sec: 90, label: '90s' },
              ].map((t) => (
                <button
                  key={t.sec}
                  type="button"
                  className={`toggle-btn ${timeLimitSeconds === t.sec ? 'active' : ''}`}
                  onClick={() => setTimeLimitSeconds(t.sec)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="viva-setup-actions">
          {onBack && (
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-lg">
            <Play size={18} />
            <span>Enter Viva Room</span>
          </button>
        </div>
      </form>
    </div>
  );
}
