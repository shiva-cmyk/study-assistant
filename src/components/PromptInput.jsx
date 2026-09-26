import React, { useState, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Cpu,
  Globe,
  Lightbulb,
  Database,
  Brain,
  ShieldCheck,
  Sliders,
  Users,
  Mic,
  Zap,
  CheckCircle2,
  Layers,
  HelpCircle,
  Trophy,
  Play,
} from 'lucide-react';

const EXAMPLE_TOPICS = [
  {
    icon: <Cpu size={15} />,
    title: 'OS Process Scheduling',
    category: 'Computer Science',
    prompt:
      'Explain CPU process scheduling in operating systems, comparing FCFS, Shortest Job First (SJF), Round Robin with time quantum, and Priority Scheduling. Include turnaround time, waiting time, and starvation solutions like aging.',
  },
  {
    icon: <BookOpen size={15} />,
    title: 'JS Event Loop & Tasks',
    category: 'Web Dev',
    prompt:
      'Explain the JavaScript Event Loop, call stack, Web APIs, Task Queue (Macrotasks), and Microtask Queue (Promises, queueMicrotask, MutationObserver) with execution order rules.',
  },
  {
    icon: <Lightbulb size={15} />,
    title: 'Photosynthesis & Respiration',
    category: 'Biology',
    prompt:
      'Explain the light-dependent reactions and Calvin Cycle of photosynthesis and compare with glycolysis, Krebs cycle, and oxidative phosphorylation in cellular respiration.',
  },
  {
    icon: <Globe size={15} />,
    title: 'WWII Turning Points',
    category: 'History',
    prompt:
      'Key turning points of World War II: Battle of Stalingrad, Battle of Midway, D-Day (Operation Overlord), and Second Battle of El Alamein, including strategic impacts.',
  },
  {
    icon: <Database size={15} />,
    title: 'SQL Indexing & ACID',
    category: 'Databases',
    prompt:
      'Explain database indexing with B-Trees, Clustered vs Non-Clustered indexes, and ACID transaction isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable).',
  },
  {
    icon: <Brain size={15} />,
    title: 'Neural Networks & Backprop',
    category: 'Machine Learning',
    prompt:
      'Explain forward propagation, loss functions (Cross-Entropy, MSE), backpropagation via the chain rule, and gradient descent optimization (learning rate, vanishing gradient problem).',
  },
];

export function PromptInput({
  onGenerate,
  isLoading,
  initialValue = '',
  initialConfig = {},
  existingStudySet = null,
  onContinueExisting,
  onOpenJoinRoom,
  onOpenCreateRoom,
}) {
  const [input, setInput] = useState(initialValue);
  const [difficulty, setDifficulty] = useState(initialConfig.difficulty || 'intermediate');
  const [cardCount, setCardCount] = useState(initialConfig.cardCount || 8);
  const [quizCount, setQuizCount] = useState(initialConfig.quizCount || 5);
  const [mode, setMode] = useState(initialConfig.mode || 'balanced');
  const [validationError, setValidationError] = useState('');

  const inputFormRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      setValidationError('Please enter a topic or paste study notes.');
      return;
    }

    if (trimmed.length < 2) {
      setValidationError('Please provide at least 2 characters.');
      return;
    }

    setValidationError('');
    onGenerate(trimmed, { difficulty, cardCount, quizCount, mode });
  };

  const handleSelectExample = (promptText) => {
    setInput(promptText);
    setValidationError('');
    inputFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToGenerator = () => {
    inputFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="home-dashboard-view">
      {/* 1. HERO SECTION */}
      <section className="hero-saas-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI-Powered Active Learning & Collaboration</span>
          </div>

          <h1 className="hero-title">
            Learn smarter. <br />
            Practice better. <br />
            <span className="brand-ai-gradient">Study together.</span>
          </h1>

          <p className="hero-description">
            Turn lecture notes and technical concepts into interactive 3D flashcards, self-grading quizzes, AI oral mock viva examinations, and synchronized collaborative study rooms.
          </p>

          <div className="hero-cta-group">
            <button type="button" className="btn btn-primary btn-lg" onClick={scrollToGenerator}>
              <Sparkles size={18} />
              <span>Generate Study Set</span>
              <ArrowRight size={18} />
            </button>

            {onOpenJoinRoom && (
              <button type="button" className="btn btn-secondary btn-lg" onClick={onOpenJoinRoom}>
                <Users size={18} />
                <span>Join Study Room</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative Visual Product Preview */}
        <div className="hero-preview-wrapper" aria-hidden="true">
          <div className="preview-card-scene">
            <div className="preview-mini-header">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
              <span className="preview-topic-title">Operating System Process Scheduling</span>
            </div>

            <div className="preview-mini-body">
              <div className="preview-col-left">
                <div className="preview-deck-box">
                  <div className="deck-tag">Flashcard 1 of 8</div>
                  <h4>What is Round Robin scheduling?</h4>
                  <p>A preemptive algorithm using fixed time quanta...</p>
                  <div className="preview-mastery-row">
                    <span className="mastery-pill">Mastered</span>
                    <span className="review-pill">Category: Algorithm</span>
                  </div>
                </div>
              </div>

              <div className="preview-col-right">
                <div className="preview-room-box">
                  <div className="room-box-header">
                    <Users size={13} />
                    <span>Study Room • OS4821</span>
                  </div>
                  <div className="preview-avatars">
                    <span className="avatar-chip">Shiva (Host)</span>
                    <span className="avatar-chip">Rahul 🎤</span>
                    <span className="avatar-chip">Priya</span>
                  </div>
                  <div className="preview-ai-bubble">
                    <Sparkles size={12} />
                    <span>AI: Round Robin balances response time...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CONTINUE LEARNING (IF STUDY SET EXISTS) */}
      {existingStudySet && (
        <section className="continue-learning-section animate-fadeIn">
          <div className="continue-card">
            <div className="continue-left">
              <span className="continue-label">ACTIVE STUDY SESSION</span>
              <h3 className="continue-title">{existingStudySet.title}</h3>
              <p className="continue-meta">
                {existingStudySet.cards?.length || 0} Flashcards · {existingStudySet.quiz?.length || 0} Practice Questions · Viva & Study Room Ready
              </p>
            </div>
            <div className="continue-actions">
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={onContinueExisting}
              >
                <Play size={16} />
                <span>Continue Learning</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. STUDY TOGETHER (COLLABORATIVE ROOMS) */}
      <section className="study-together-banner">
        <div className="study-together-info">
          <div className="together-badge">
            <Users size={16} />
            <span>Real-Time Collaboration</span>
          </div>
          <h2>Study Together with Voice, Video & AI</h2>
          <p>
            Join your friends in a synchronized study room to tackle shared quizzes, discuss tough concepts, and get grounded AI assistance in real time.
          </p>
        </div>

        <div className="study-together-actions">
          {onOpenCreateRoom && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={onOpenCreateRoom}
            >
              <Sparkles size={16} />
              <span>Create Study Room</span>
            </button>
          )}

          {onOpenJoinRoom && (
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={onOpenJoinRoom}
            >
              <Users size={16} />
              <span>Join with Code</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. MAIN GENERATOR INPUT CARD */}
      <section ref={inputFormRef} className="generator-section">
        <div className="generator-header">
          <div className="section-badge">
            <Zap size={14} />
            <span>Instant AI Study Generator</span>
          </div>
          <h2>Generate a Custom Study Set</h2>
          <p>Enter any technical topic, paste lecture notes, or pick a domain prompt below.</p>
        </div>

        <div className="input-card">
          <form onSubmit={handleSubmit}>
            {/* Main Textarea */}
            <div className="textarea-wrapper">
              <textarea
                className="prompt-textarea"
                placeholder="Paste study notes or enter a topic (e.g., 'Operating system process scheduling algorithms: FCFS, SJF, Round Robin...')"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={isLoading}
                rows={5}
                aria-label="Study notes or topic input"
              />
              <div className="textarea-footer">
                <span className="char-count">{input.length} characters</span>
                {validationError && (
                  <span className="error-text">
                    {validationError}
                  </span>
                )}
              </div>
            </div>

            {/* Compact Study Set Configuration */}
            <div className="config-panel">
              <div className="config-header">
                <Sliders size={15} />
                <span>Study Set Preferences</span>
              </div>

              <div className="config-grid">
                {/* Difficulty */}
                <div className="config-group">
                  <label className="config-label">Difficulty Level</label>
                  <div className="toggle-group">
                    {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        className={`toggle-btn ${difficulty === lvl ? 'active' : ''}`}
                        onClick={() => setDifficulty(lvl)}
                        disabled={isLoading}
                      >
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Learning Mode */}
                <div className="config-group">
                  <label className="config-label">Focus Mode</label>
                  <div className="toggle-group">
                    {[
                      { id: 'balanced', label: 'Balanced' },
                      { id: 'concept', label: 'Concepts' },
                      { id: 'exam', label: 'Exam Focus' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`toggle-btn ${mode === m.id ? 'active' : ''}`}
                        onClick={() => setMode(m.id)}
                        disabled={isLoading}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flashcards Count */}
                <div className="config-group">
                  <label className="config-label">Flashcards</label>
                  <div className="toggle-group">
                    {[5, 8, 10].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`toggle-btn ${cardCount === count ? 'active' : ''}`}
                        onClick={() => setCardCount(count)}
                        disabled={isLoading}
                      >
                        {count} Cards
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quiz Questions Count */}
                <div className="config-group">
                  <label className="config-label">Practice Quiz</label>
                  <div className="toggle-group">
                    {[5, 8, 10].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`toggle-btn ${quizCount === count ? 'active' : ''}`}
                        onClick={() => setQuizCount(count)}
                        disabled={isLoading}
                      >
                        {count} Questions
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="generator-submit-bar">
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isLoading || !input.trim()}
              >
                <Sparkles size={18} />
                <span>Generate Active Learning Set</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>

          {/* Example Topics */}
          <div className="examples-section">
            <div className="examples-title">
              <Sparkles size={14} />
              <span>Explore curated technical topics:</span>
            </div>
            <div className="example-chips">
              {EXAMPLE_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="example-chip"
                  onClick={() => handleSelectExample(item.prompt)}
                  disabled={isLoading}
                >
                  <span className="chip-content">
                    {item.icon}
                    <strong>{item.title}</strong>
                    <span className="chip-tag">{item.category}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>




    </div>
  );
}


