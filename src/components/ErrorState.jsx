import React from 'react';
import { AlertTriangle, RotateCcw, Edit3, ShieldAlert, WifiOff, Clock, Sparkles } from 'lucide-react';

export function ErrorState({ error, onRetry, onEditInput }) {
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message || 'Something went wrong while generating your study set.';

  const errorDetails = typeof error === 'object' ? error?.details : null;
  const errorStatus = typeof error === 'object' ? error?.status : 500;

  let icon = <AlertTriangle size={28} />;
  let title = 'Generation Interrupted';
  let guidance = 'Please review your input or try generating again.';

  if (errorStatus === 503 || errorMessage.toLowerCase().includes('connect')) {
    icon = <WifiOff size={28} />;
    title = 'Connection Unavailable';
    guidance = 'Could not connect to the study generator backend server.';
  } else if (errorStatus === 429 || errorMessage.toLowerCase().includes('busy')) {
    icon = <Clock size={28} />;
    title = 'AI Service Busy';
    guidance = 'The AI service is experiencing high traffic. Please wait a moment and try again.';
  } else if (errorStatus === 401 || errorMessage.toLowerCase().includes('api key')) {
    icon = <ShieldAlert size={28} />;
    title = 'API Key Configuration';
    guidance = 'Please verify your GEMINI_API_KEY in the server .env file.';
  } else if (errorStatus === 408 || errorMessage.toLowerCase().includes('timed out')) {
    icon = <Clock size={28} />;
    title = 'Request Timed Out';
    guidance = 'The model or server took too long to respond. Retrying will usually succeed.';
  }

  return (
    <div className="error-card" role="alert" aria-live="assertive">
      <div className="error-icon-box">
        {icon}
      </div>

      <h3 className="error-title">{title}</h3>
      <p className="error-message">{errorMessage}</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>{guidance}</p>

      {errorDetails && (
        <div className="error-details">
          <strong>Validation Info:</strong>
          <div>{errorDetails}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>
        )}
        {onEditInput && (
          <button type="button" className="btn btn-secondary" onClick={onEditInput}>
            <Edit3 size={16} />
            <span>Edit Notes & Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
