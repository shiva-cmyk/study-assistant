import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Award, ArrowRight, Eye, Play, Sparkles } from 'lucide-react';

export function GroupQuizView({
  quizState,
  isHost = false,
  currentUserId,
  participants = [],
  onSubmitAnswer,
  onRevealAnswer,
  onNextQuestion,
}) {
  const [selectedOption, setSelectedOption] = useState(null);

  if (!quizState || !quizState.currentQuestion) return null;

  const currentQ = quizState.currentQuestion;
  const qIndex = quizState.questionIndex || 0;
  const totalQ = quizState.totalQuestions || 1;
  const status = quizState.status; // 'question' | 'reveal' | 'finished'

  // Check if current user has submitted
  const myAnswerRecord = quizState.answers?.find((a) => a.userId === currentUserId);
  const hasSubmitted = Boolean(myAnswerRecord);

  const handleSubmit = () => {
    if (selectedOption !== null && !hasSubmitted) {
      onSubmitAnswer(selectedOption);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="group-quiz-card animate-fadeIn">
      {/* Quiz Top Status */}
      <div className="group-quiz-top">
        <div className="quiz-badge-group">
          <span className="quiz-counter-badge">
            Question {qIndex + 1} of {totalQ}
          </span>
          <span className="card-category">{currentQ.category || 'Core Concept'}</span>
        </div>

        {status === 'question' && (
          <div className="quiz-status-pill answering">
            <Clock size={14} />
            <span>
              {quizState.answers?.length || 0}/{participants.length} Answered
            </span>
          </div>
        )}
      </div>

      {/* Question Text */}
      <h3 className="group-quiz-question">{currentQ.question}</h3>

      {/* Options List */}
      <div className="group-quiz-options">
        {(currentQ.options || []).map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrectAnswer = Number(currentQ.answer) === idx;

          let optionClass = 'quiz-option-btn';
          if (status === 'question') {
            if (isSelected) optionClass += ' selected';
          } else if (status === 'reveal') {
            if (isCorrectAnswer) optionClass += ' option-correct';
            else if (isSelected && !isCorrectAnswer) optionClass += ' option-wrong';
          }

          // In reveal mode, list which participants picked this option
          const respondents =
            status === 'reveal'
              ? quizState.answers
                  ?.filter((a) => a.optionIndex === idx)
                  .map((a) => {
                    const p = participants.find((part) => part.id === a.userId);
                    return p?.name || 'Participant';
                  }) || []
              : [];

          return (
            <button
              key={idx}
              type="button"
              className={optionClass}
              onClick={() => {
                if (status === 'question' && !hasSubmitted) {
                  setSelectedOption(idx);
                }
              }}
              disabled={hasSubmitted || status === 'reveal'}
            >
              <div className="option-row-main">
                <span className="option-prefix">{optionLabels[idx]}</span>
                <span className="option-text">{opt}</span>
                {status === 'reveal' && isCorrectAnswer && (
                  <CheckCircle2 size={18} className="option-icon-correct" />
                )}
                {status === 'reveal' && isSelected && !isCorrectAnswer && (
                  <XCircle size={18} className="option-icon-wrong" />
                )}
              </div>

              {/* Respondent badges in reveal mode */}
              {respondents.length > 0 && (
                <div className="option-respondents">
                  <span className="respondents-label">Chosen by:</span>
                  {respondents.map((name, ri) => (
                    <span key={ri} className="respondent-chip">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Box on Reveal */}
      {status === 'reveal' && currentQ.explanation && (
        <div className="quiz-explanation-box animate-fadeIn">
          <h4>💡 Explanation:</h4>
          <p>{currentQ.explanation}</p>
        </div>
      )}

      {/* Action Footer */}
      <div className="group-quiz-actions">
        {status === 'question' && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={handleSubmit}
              disabled={selectedOption === null || hasSubmitted}
            >
              <span>{hasSubmitted ? '✓ Answer Locked In' : 'Submit Answer'}</span>
            </button>

            {isHost && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onRevealAnswer}
                title="Reveal correct answers to all members now"
              >
                <Eye size={15} />
                <span>Reveal to Room</span>
              </button>
            )}
          </>
        )}

        {status === 'reveal' && isHost && (
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onNextQuestion}
          >
            <span>
              {qIndex + 1 < totalQ ? 'Next Question' : 'Finish Quiz & View Results'}
            </span>
            <ArrowRight size={16} />
          </button>
        )}

        {status === 'reveal' && !isHost && (
          <span className="waiting-host-notice">
            Waiting for host to proceed to the next question...
          </span>
        )}
      </div>
    </div>
  );
}
