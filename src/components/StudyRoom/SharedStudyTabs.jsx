import React, { useState } from 'react';
import { BookOpen, HelpCircle, Sparkles, Trophy, Lightbulb, Play, Eye, Tag, AlertCircle } from 'lucide-react';
import { GroupQuizView } from './GroupQuizView';
import { GroupLeaderboard } from './GroupLeaderboard';

export function SharedStudyTabs({
  roomState,
  isHost = false,
  currentUserId,
  onStartQuiz,
  onSubmitQuizAnswer,
  onRevealQuizAnswer,
  onNextQuizQuestion,
  onAskAi,
  onStartAiChallenge,
  onRevealAiChallenge,
  onReviewWeakAreas,
}) {
  const [activeTab, setActiveTab] = useState('quiz'); // 'material' | 'quiz' | 'ai' | 'challenge'
  const [aiQuestionInput, setAiQuestionInput] = useState('');

  if (!roomState) return null;

  const { studySet, topic, quizState, aiChallenge, participants } = roomState;
  const cards = studySet?.cards || [];

  const handleAskAiSubmit = (e) => {
    e.preventDefault();
    if (aiQuestionInput.trim()) {
      onAskAi(aiQuestionInput.trim());
      setAiQuestionInput('');
    }
  };

  return (
    <div className="shared-study-tabs-container">
      {/* Tab Navigation Header */}
      <div className="study-tab-header">
        <button
          type="button"
          className={`study-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <HelpCircle size={15} />
          <span>🎯 Group Quiz</span>
          {quizState?.active && <span className="tab-indicator-dot" />}
        </button>

        <button
          type="button"
          className={`study-tab-btn ${activeTab === 'material' ? 'active' : ''}`}
          onClick={() => setActiveTab('material')}
        >
          <BookOpen size={15} />
          <span>📚 Study Deck</span>
          <span className="tab-pill-count">{cards.length}</span>
        </button>

        <button
          type="button"
          className={`study-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles size={15} />
          <span>🧠 AI Moderator</span>
        </button>

        <button
          type="button"
          className={`study-tab-btn ${activeTab === 'challenge' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenge')}
        >
          <Lightbulb size={15} />
          <span>💡 AI Challenge</span>
          {aiChallenge?.active && <span className="tab-indicator-dot" />}
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="study-tab-body">
        {/* Tab 1: Group Quiz */}
        {activeTab === 'quiz' && (
          <div className="tab-pane animate-fadeIn">
            {quizState?.active && quizState.status !== 'finished' ? (
              <GroupQuizView
                quizState={quizState}
                isHost={isHost}
                currentUserId={currentUserId}
                participants={participants}
                onSubmitAnswer={onSubmitQuizAnswer}
                onRevealAnswer={onRevealQuizAnswer}
                onNextQuestion={onNextQuizQuestion}
              />
            ) : quizState?.status === 'finished' ? (
              <GroupLeaderboard
                quizState={quizState}
                isHost={isHost}
                onRestartQuiz={onStartQuiz}
                onReviewWeakAreas={onReviewWeakAreas}
              />
            ) : (
              <div className="quiz-start-hero">
                <HelpCircle size={36} className="hero-icon" />
                <h3>Synchronized Group Quiz</h3>
                <p>
                  Test your group's mastery on <strong>"{topic}"</strong>. All participants receive questions simultaneously, answer independently, and see combined results and weak areas.
                </p>
                {isHost ? (
                  <button type="button" className="btn btn-primary btn-lg" onClick={onStartQuiz}>
                    <Play size={18} />
                    <span>Start Group Quiz Now</span>
                  </button>
                ) : (
                  <div className="waiting-pill">
                    <span>Waiting for room host to start the group quiz...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shared Study Material (Cards & Summary) */}
        {activeTab === 'material' && (
          <div className="tab-pane animate-fadeIn">
            <div className="material-summary-box">
              <h4>Currently Studying: {topic}</h4>
              {studySet?.summary && <p>{studySet.summary}</p>}
            </div>

            <div className="shared-cards-list">
              {cards.map((card, idx) => (
                <div key={card.id || idx} className="shared-card-item">
                  <div className="card-item-header">
                    <span className="card-item-index">Card #{idx + 1}</span>
                    <span className="card-item-category">{card.category || 'Concept'}</span>
                  </div>
                  <h5 className="card-item-q">{card.question}</h5>
                  <p className="card-item-a">{card.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: AI Study Moderator */}
        {activeTab === 'ai' && (
          <div className="tab-pane animate-fadeIn">
            <div className="ai-mod-info-card">
              <div className="ai-mod-badge">
                <Sparkles size={16} />
                <span>Grounded Topic Moderator</span>
              </div>
              <h3>Ask StudyFlow AI About "{topic}"</h3>
              <p>
                The AI Moderator is strictly grounded in the current study set. It clarifies mechanisms, explains trade-offs, and resolves student disagreements without going off-topic.
              </p>
            </div>

            <form onSubmit={handleAskAiSubmit} className="ai-mod-form">
              <div className="form-group">
                <label className="form-label">Ask a conceptual question to clarify:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`e.g. Why is this algorithm considered preemptive in ${topic}?`}
                  value={aiQuestionInput}
                  onChange={(e) => setAiQuestionInput(e.target.value)}
                  maxLength={300}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!aiQuestionInput.trim()}>
                <Sparkles size={15} />
                <span>Ask AI & Broadcast to Group Chat</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: AI Group Challenge */}
        {activeTab === 'challenge' && (
          <div className="tab-pane animate-fadeIn">
            {!aiChallenge?.active ? (
              <div className="challenge-start-hero">
                <Lightbulb size={36} className="hero-icon" />
                <h3>AI Group Discussion Challenge</h3>
                <p>
                  StudyFlow AI generates a high-level conceptual scenario for your study group to discuss over voice/video. Once discussed, reveal the AI analysis of key principles and common misconceptions.
                </p>
                {isHost ? (
                  <button type="button" className="btn btn-primary btn-lg" onClick={onStartAiChallenge}>
                    <Lightbulb size={18} />
                    <span>Launch AI Group Challenge</span>
                  </button>
                ) : (
                  <div className="waiting-pill">
                    <span>Waiting for host to start an AI challenge...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="active-challenge-card">
                <div className="challenge-prompt-box">
                  <span className="challenge-label">💡 Group Conceptual Question:</span>
                  <h4 className="challenge-question">{aiChallenge.question}</h4>
                  <p className="challenge-hint">
                    🗣️ Discuss this question verbally with your group. Brainstorm trade-offs and real-world system behavior.
                  </p>
                </div>

                {aiChallenge.status === 'discussing' && isHost && (
                  <div className="challenge-host-actions">
                    <button type="button" className="btn btn-primary btn-md" onClick={onRevealAiChallenge}>
                      <Eye size={16} />
                      <span>Reveal AI Conceptual Analysis</span>
                    </button>
                  </div>
                )}

                {aiChallenge.status === 'analyzed' && aiChallenge.analysis && (
                  <div className="challenge-analysis-box animate-fadeIn">
                    <h4>🧠 StudyFlow AI Discussion Summary</h4>

                    <div className="analysis-section">
                      <h5>✅ Essential Principles</h5>
                      <ul>
                        {aiChallenge.analysis.correctReasoning?.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="analysis-section">
                      <h5>⚠️ Common Misconceptions to Avoid</h5>
                      <ul>
                        {aiChallenge.analysis.misconceptions?.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="analysis-section">
                      <h5>🎯 Recommended Follow-Up Focus</h5>
                      <ul>
                        {aiChallenge.analysis.recommendedReview?.map((rev, i) => (
                          <li key={i}>{rev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
