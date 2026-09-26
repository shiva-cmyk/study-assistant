import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  RotateCcw,
  BookOpen,
  Mic,
  Plus,
  Menu,
  X,
  Compass,
  Zap,
  Moon,
  Sun,
} from 'lucide-react';

export function Header({
  onReset,
  hasActiveStudySet,
  onOpenJoinRoom,
  onOpenCreateRoom,
  currentView = 'home', // 'home' | 'result' | 'viva' | 'room'
  onNavigateHome,
  onNavigateStudySets,
  onNavigateViva,
  onNavigateRooms,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'dark';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleNavClick = (callback) => {
    if (callback) callback();
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-header">
      {/* Brand Logo & Title */}
      <div className="brand" onClick={onNavigateHome} role="button" tabIndex={0}>
        <div className="brand-icon">
          <Sparkles size={20} />
        </div>
        <div className="brand-text">
          <div className="brand-title-row">
            <h1>
              StudyFlow <span className="brand-ai-gradient">AI</span>
            </h1>
            <span className="brand-badge-pill">ACTIVE RECALL</span>
          </div>
        </div>
      </div>

      {/* Center Desktop Navigation */}
      <nav className="desktop-nav" aria-label="Main Navigation">
        <button
          type="button"
          className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
          onClick={onNavigateHome}
        >
          <span>Home</span>
        </button>

        {hasActiveStudySet && (
          <button
            type="button"
            className={`nav-link ${currentView === 'result' ? 'active' : ''}`}
            onClick={onNavigateStudySets}
          >
            <span>Study Material</span>
          </button>
        )}

        {hasActiveStudySet && (
          <button
            type="button"
            className={`nav-link ${currentView === 'viva' ? 'active' : ''}`}
            onClick={onNavigateViva}
          >
            <span>Mock Viva</span>
          </button>
        )}

        <button
          type="button"
          className={`nav-link ${currentView === 'room' ? 'active' : ''}`}
          onClick={onNavigateRooms}
        >
          <span>Study Rooms</span>
        </button>
      </nav>

      {/* Right Desktop Quick Actions */}
      <div className="header-actions">
        {onOpenJoinRoom && (
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-join-header"
            onClick={onOpenJoinRoom}
            title="Join an existing study room with room code"
          >
            <Users size={14} />
            <span>Join Room</span>
          </button>
        )}

        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {hasActiveStudySet ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onReset}
            title="Create a new study set from new notes"
          >
            <Plus size={14} />
            <span>New Set</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNavigateHome}
          >
            <Sparkles size={14} />
            <span>Get Started</span>
          </button>
        )}

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer animate-fadeIn">
          <div className="mobile-nav-links">
            <button
              type="button"
              className={`mobile-nav-item ${currentView === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick(onNavigateHome)}
            >
              <Compass size={18} />
              <span>Home & Overview</span>
            </button>

            {hasActiveStudySet && (
              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'result' ? 'active' : ''}`}
                onClick={() => handleNavClick(onNavigateStudySets)}
              >
                <BookOpen size={18} />
                <span>Active Study Material</span>
              </button>
            )}

            {hasActiveStudySet && (
              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'viva' ? 'active' : ''}`}
                onClick={() => handleNavClick(onNavigateViva)}
              >
                <Mic size={18} />
                <span>AI Mock Viva</span>
              </button>
            )}

            <button
              type="button"
              className={`mobile-nav-item ${currentView === 'room' ? 'active' : ''}`}
              onClick={() => handleNavClick(onNavigateRooms)}
            >
              <Users size={18} />
              <span>Study Rooms</span>
            </button>
          </div>

          <div className="mobile-nav-actions">
            {onOpenJoinRoom && (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => handleNavClick(onOpenJoinRoom)}
              >
                <Users size={16} />
                <span>Join Study Room</span>
              </button>
            )}

            {hasActiveStudySet && (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => handleNavClick(onReset)}
              >
                <RotateCcw size={16} />
                <span>New Study Set</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
