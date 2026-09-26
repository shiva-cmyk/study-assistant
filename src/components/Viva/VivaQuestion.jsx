import React from 'react';
import { Volume2, HelpCircle, Layers, Award, Sparkles, Tag, GitBranch } from 'lucide-react';

export function VivaQuestion({
  question,
  questionIndex,
  totalQuestions,
  isFollowUp = false,
  onRepeatSpeech,
  isSpeaking,
}) {
  if (!question) return null;

  const typeLabels = {
    definition: 'Definition',
    explanation: 'Explanation',
    comparison: 'Comparison',
    why: 'Conceptual Reasoning',
    scenario: 'Scenario & Application',
    technical: 'Technical Mechanism',
  };

  const typeName = typeLabels[question.type] || 'Concept Question';

  return (
    <div className="viva-question-card">
      <div className="viva-question-top">
        <div className="viva-badge-group">
          <span className={`viva-counter-badge ${isFollowUp ? 'follow-up' : ''}`}>
            {isFollowUp ? (
              <>
                <GitBranch size={13} />
                <span>Follow-up Question</span>
              </>
            ) : (
              <span>Question {questionIndex + 1} of {totalQuestions}</span>
            )}
          </span>

          <span className="card-category">{question.category || 'Core Concept'}</span>

          <span className="viva-type-badge">
            <Tag size={12} />
            <span>{typeName}</span>
          </span>

          {question.difficulty && (
            <span className={`card-difficulty-badge difficulty-${question.difficulty}`}>
              {question.difficulty}
            </span>
          )}
        </div>

        {/* Repeat Question Button */}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onRepeatSpeech}
          title="Repeat Question Audio"
        >
          <Volume2 size={16} className={isSpeaking ? 'icon-pulse' : ''} />
          <span>Repeat Question</span>
        </button>
      </div>

      <h3 className="viva-question-title">{question.question}</h3>
    </div>
  );
}
