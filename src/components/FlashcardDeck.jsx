import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Shuffle,
  Filter,
  RotateCcw,
  Eye,
  Layers,
} from 'lucide-react';
import { Flashcard } from './Flashcard';

export function FlashcardDeck({
  initialCards = [],
  focusedCategories = [],
  onClearFocusCategory,
  onProgressUpdate,
}) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  // cardStatus maps card.id => 'known' | 'review'
  const [cardStatus, setCardStatus] = useState({});
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'review' | 'weak'
  const isAdvancingRef = useRef(false);

  // Sync if initialCards change
  useEffect(() => {
    setCards(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCardStatus({});
    setViewFilter(focusedCategories.length > 0 ? 'weak' : 'all');
  }, [initialCards, focusedCategories]);

  // Derived filtered cards
  let displayedCards = cards;
  if (viewFilter === 'review') {
    displayedCards = cards.filter((c) => cardStatus[c.id] === 'review');
  } else if (viewFilter === 'weak' && focusedCategories.length > 0) {
    displayedCards = cards.filter((c) =>
      focusedCategories.some((cat) => c.category?.toLowerCase() === cat.toLowerCase())
    );
    if (displayedCards.length === 0) displayedCards = cards; // fallback if no exact category match
  }

  // Ensure currentIndex stays within bounds
  useEffect(() => {
    if (currentIndex >= displayedCards.length && displayedCards.length > 0) {
      setCurrentIndex(displayedCards.length - 1);
    }
  }, [displayedCards.length, currentIndex]);

  const currentCard = displayedCards[currentIndex] || null;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < displayedCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, displayedCards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleMarkStatus = useCallback(
    (status) => {
      if (!currentCard || isAdvancingRef.current) return;
      isAdvancingRef.current = true;

      setCardStatus((prev) => {
        const next = { ...prev, [currentCard.id]: status };
        if (onProgressUpdate) {
          const known = Object.values(next).filter((s) => s === 'known').length;
          const review = Object.values(next).filter((s) => s === 'review').length;
          onProgressUpdate({ known, review, total: initialCards.length });
        }
        return next;
      });

      // Auto advance to next card after a small delay
      if (currentIndex < displayedCards.length - 1) {
        setTimeout(() => {
          setIsFlipped(false);
          setCurrentIndex((prev) => prev + 1);
          isAdvancingRef.current = false;
        }, 180);
      } else {
        isAdvancingRef.current = false;
      }
    },
    [currentCard, currentIndex, displayedCards.length, initialCards.length, onProgressUpdate]
  );

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleResetStatuses = () => {
    setCardStatus({});
    setViewFilter('all');
    setCurrentIndex(0);
    setIsFlipped(false);
    if (onClearFocusCategory) onClearFocusCategory();
    if (onProgressUpdate) {
      onProgressUpdate({ known: 0, review: 0, total: initialCards.length });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === '1') {
        e.preventDefault();
        handleMarkStatus('known');
      } else if (e.key === '2') {
        e.preventDefault();
        handleMarkStatus('review');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFlip, handleMarkStatus]);

  // Status counts
  const knownCount = Object.values(cardStatus).filter((s) => s === 'known').length;
  const reviewCount = Object.values(cardStatus).filter((s) => s === 'review').length;
  const masteryPercentage = Math.round((knownCount / (cards.length || 1)) * 100);

  if (displayedCards.length === 0) {
    return (
      <div className="flashcard-deck" style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          {viewFilter === 'review'
            ? 'No flashcards currently marked for review. Great work!'
            : 'No flashcards match the active filter.'}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setViewFilter('all');
            if (onClearFocusCategory) onClearFocusCategory();
          }}
        >
          <RotateCcw size={16} />
          <span>Show All Flashcards ({cards.length})</span>
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / displayedCards.length) * 100);
  const currentStatus = currentCard ? cardStatus[currentCard.id] : null;

  return (
    <div className="flashcard-deck">
      {/* Deck Toolbar */}
      <div className="deck-toolbar">
        <div>
          <span style={{ fontWeight: 700 }}>
            Card {currentIndex + 1} of {displayedCards.length}
          </span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({progressPercent}%)</span>
          {viewFilter === 'weak' && focusedCategories.length > 0 && (
            <span style={{ color: 'var(--warning)', marginLeft: 8, fontWeight: 600 }}>
              (Focusing: {focusedCategories.join(', ')})
            </span>
          )}
        </div>

        <div className="stats-pills">
          <span className="stat-pill known">
            <Check size={12} /> {knownCount} Mastered
          </span>
          <span className="stat-pill review">
            <AlertCircle size={12} /> {reviewCount} Review
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="deck-progress-bar">
        <div
          className="deck-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main 3D Flashcard */}
      {currentCard && (
        <Flashcard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      )}

      {/* Primary Deck Controls */}
      <div className="deck-controls">
        <div className="deck-nav-group">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            title="Previous card (Left Arrow)"
          >
            <ChevronLeft size={18} />
            <span>Prev</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleFlip}
            title="Flip card (Space)"
          >
            <Eye size={16} />
            <span>{isFlipped ? 'Show Question' : 'Show Answer'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleNext}
            disabled={currentIndex === displayedCards.length - 1}
            title="Next card (Right Arrow)"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="deck-action-group">
          <button
            type="button"
            className={`btn btn-sm ${currentStatus === 'review' ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => handleMarkStatus('review')}
            title="Mark for review (Key 2)"
          >
            <AlertCircle size={16} />
            <span>Need Review</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${currentStatus === 'known' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => handleMarkStatus('known')}
            title="Mark as known (Key 1)"
          >
            <Check size={16} />
            <span>I Knew It</span>
          </button>
        </div>
      </div>

      {/* Extra tools: Shuffle, Review filter, Reset */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleShuffle}
          title="Shuffle cards"
        >
          <Shuffle size={14} />
          <span>Shuffle</span>
        </button>

        {reviewCount > 0 && (
          <button
            type="button"
            className={`btn btn-sm ${viewFilter === 'review' ? 'btn-warning' : 'btn-ghost'}`}
            onClick={() => {
              setViewFilter((prev) => (prev === 'review' ? 'all' : 'review'));
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          >
            <Filter size={14} />
            <span>{viewFilter === 'review' ? 'Show All Cards' : `Review Only (${reviewCount})`}</span>
          </button>
        )}

        {viewFilter === 'weak' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setViewFilter('all');
              if (onClearFocusCategory) onClearFocusCategory();
            }}
          >
            <Layers size={14} />
            <span>Clear Focus Filter</span>
          </button>
        )}

        {(knownCount > 0 || reviewCount > 0) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetStatuses}
          >
            <RotateCcw size={14} />
            <span>Reset Deck Progress</span>
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="keyboard-hints">
        <span><span className="kbd">Space</span> Flip</span>
        <span><span className="kbd">←</span> / <span className="kbd">→</span> Nav</span>
        <span><span className="kbd">1</span> Knew It</span>
        <span><span className="kbd">2</span> Need Review</span>
      </div>
    </div>
  );
}
