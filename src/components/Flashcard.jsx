import React from 'react';
import { RotateCw, HelpCircle, CheckCircle2, Eye } from 'lucide-react';

export function Flashcard({ card, isFlipped, onFlip }) {
  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onFlip();
    }
  };

  const difficultyClass = card.difficulty ? `difficulty-${card.difficulty}` : 'difficulty-medium';

  return (
    <div
      className="card-scene"
      onClick={onFlip}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Flashcard: ${card.question}. ${isFlipped ? 'Answer showing' : 'Click or press Space to reveal answer'}`}
    >
      <div className={`card-object ${isFlipped ? 'is-flipped' : ''}`}>
        {/* Front of card */}
        <div className="card-face card-face-front">
          <div className="card-top">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="card-category">{card.category || 'Core Concept'}</span>
              {card.difficulty && (
                <span className={`card-difficulty-badge ${difficultyClass}`}>
                  {card.difficulty}
                </span>
              )}
            </div>
            <span className="card-hint">
              <HelpCircle size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Question
            </span>
          </div>

          <div className="card-main">
            <p className="card-question">{card.question}</p>
          </div>

          <div className="card-bottom">
            <div className="card-flip-prompt">
              <RotateCw size={14} />
              <span>Click or press <span className="kbd">Space</span> to reveal answer</span>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div className="card-face card-face-back">
          <div className="card-top">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="card-category">{card.category || 'Core Concept'}</span>
              {card.difficulty && (
                <span className={`card-difficulty-badge ${difficultyClass}`}>
                  {card.difficulty}
                </span>
              )}
            </div>
            <span className="card-hint" style={{ color: '#86efac' }}>
              <CheckCircle2 size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Answer
            </span>
          </div>

          <div className="card-main">
            <p className="card-answer">{card.answer}</p>
          </div>

          <div className="card-bottom">
            <div className="card-flip-prompt">
              <RotateCw size={14} />
              <span>Click or press <span className="kbd">Space</span> to flip back</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
