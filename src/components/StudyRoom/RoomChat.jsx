import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, MessageSquare, Shield } from 'lucide-react';

export function RoomChat({
  messages = [],
  onSendMessage,
  onAskAi,
  currentUserId,
}) {
  const [inputText, setInputText] = useState('');
  const [isAskingAi, setIsAskingAi] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    if (isAskingAi) {
      onAskAi(clean);
      setIsAskingAi(false);
    } else {
      onSendMessage(clean);
    }
    setInputText('');
  };

  return (
    <div className="room-chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={16} />
          <span>Study Room Chat</span>
        </div>
        <span className="chat-badge-live">Live</span>
      </div>

      {/* Message List */}
      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <Bot size={28} className="empty-icon" />
            <p>Welcome to the study room!</p>
            <span>Ask questions, discuss concepts, or tag @StudyFlow AI for help.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            const isSystem = msg.isSystem;
            const isAi = msg.isAi;

            if (isSystem) {
              return (
                <div key={msg.id} className="chat-msg system-msg">
                  <span className="system-msg-text">{msg.message}</span>
                </div>
              );
            }

            if (isAi) {
              return (
                <div key={msg.id} className="chat-msg ai-msg animate-fadeIn">
                  <div className="ai-msg-header">
                    <div className="ai-msg-name">
                      <Sparkles size={14} />
                      <span>{msg.userName}</span>
                    </div>
                    <span className="msg-time">{msg.timestamp}</span>
                  </div>
                  <div className="ai-msg-content">
                    <p>{msg.message}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`chat-msg ${isMe ? 'my-msg' : 'peer-msg'}`}>
                <div className="msg-header">
                  <span className="msg-author">{isMe ? 'You' : msg.userName}</span>
                  <span className="msg-time">{msg.timestamp}</span>
                </div>
                <div className="msg-bubble">
                  <p>{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="chat-input-wrapper">
          <button
            type="button"
            className={`btn-ai-toggle ${isAskingAi ? 'active' : ''}`}
            onClick={() => setIsAskingAi((prev) => !prev)}
            title={isAskingAi ? 'Switch to regular group chat' : 'Ask StudyFlow AI Moderator'}
          >
            <Sparkles size={14} />
            <span>{isAskingAi ? 'AI Prompt' : 'Ask AI'}</span>
          </button>

          <input
            type="text"
            className={`chat-input ${isAskingAi ? 'ai-mode' : ''}`}
            placeholder={
              isAskingAi
                ? 'Ask AI Moderator to clarify a concept from this topic...'
                : 'Type a message to study group (Enter to send)...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={400}
          />

          <button
            type="submit"
            className="btn-chat-send"
            disabled={!inputText.trim()}
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
