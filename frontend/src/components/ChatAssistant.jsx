import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Loader, Sparkles } from 'lucide-react';
import api from '../services/api';
import MatchedUsersOverlay from './MatchedUsersOverlay';

const ChatAssistant = ({ onBack }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [extractedNeeds, setExtractedNeeds] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const history = await api.getChatHistory();
      if (history && history.messages) {
        setMessages(history.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    try {
      const matchId = 'from_chat_' + Date.now();
      const message = extractedNeeds && extractedNeeds.length > 0
        ? `Hi! I'm interested in learning ${extractedNeeds.map(n => n.name || n).join(', ')}. Would you be interested in collaborating?`
        : 'Hi! I\'m interested in connecting with you to learn and exchange skills!';

      await api.sendMessageRequest(userId, matchId, message);
      setShowMatches(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ Connection request sent! They\'ll review your request shortly.',
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Connection error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to send connection request. Please try again.',
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    setSending(true);

    try {
      const response = await api.sendChatMessage(userMessage);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString()
      }]);

      if (response.needs_extraction_ready && response.matched_users && response.matched_users.length > 0) {
        setExtractedNeeds(response.needs);
        setMatchedUsers(response.matched_users);
        setShowMatches(true);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-mesh flex flex-col">
      {/* Header */}
      <div className="border-b border-glass-border bg-glass-bg backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="btn btn-ghost p-2"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-cyan" />
              AI Learning Assistant
            </h1>
            <p className="text-xs text-text-secondary">Find experts & learn new skills</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary-light border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-text-muted">Loading your chat...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-md">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-text-primary">Hello! 👋</h2>
                <p className="text-text-secondary">I'm your AI learning assistant. Tell me what you want to learn, and I'll help you find the perfect expert to connect with.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4">
                {[
                  'I want to learn React',
                  'Can you help me with Python?',
                  'Find someone who teaches UI Design',
                  'I need help with machine learning'
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(suggestion);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="text-left px-4 py-3 glass-card hover:bg-white/10 text-sm text-text-primary transition-all duration-200 hover:translate-x-1"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div
                  className={`max-w-[85%] px-5 py-3.5 rounded-2xl transition-all duration-200 ${msg.role === 'user'
                      ? 'bg-gradient-secondary text-white rounded-br-none shadow-lg'
                      : msg.isError
                        ? 'bg-accent-rose/20 text-accent-rose border border-accent-rose/30 rounded-bl-none'
                        : 'glass-card text-text-primary rounded-bl-none'
                    }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  {msg.isError && (
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                      Try again
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start animate-slide-up">
                <div className="glass-card px-5 py-3.5 rounded-2xl rounded-bl-none">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-text-muted">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-glass-border bg-glass-bg backdrop-blur-md px-4 md:px-6 py-6">
        <form onSubmit={handleSendMessage} className="space-y-3 max-w-4xl mx-auto">
          <div className="relative flex items-center gap-3 glass-card px-5 py-3.5 focus-within:ring-2 focus-within:ring-primary-light transition-all duration-200">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="What would you like to learn today?"
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending}
              className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${inputValue.trim() && !sending
                  ? 'bg-gradient-primary text-white hover:shadow-glow hover:scale-105 active:scale-95'
                  : 'bg-glass-border text-text-muted cursor-not-allowed'
                }`}
            >
              {sending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-text-muted px-5">
            💡 Tip: Be specific about what you want to learn for better matches
          </p>
        </form>
      </div>

      {/* Matched Users Overlay */}
      {showMatches && matchedUsers.length > 0 && (
        <MatchedUsersOverlay
          users={matchedUsers}
          learningNeeds={extractedNeeds}
          onClose={() => setShowMatches(false)}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
};

export default ChatAssistant;
