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

    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    setSending(true);

    try {
      const response = await api.sendChatMessage(userMessage);
      
      // Add AI response to UI
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString()
      }]);

      // Check if needs were extracted and matches found
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200 group"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-200" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              AI Learning Assistant
            </h1>
            <p className="text-xs text-slate-400">Find experts & learn new skills</p>
          </div>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-1 bg-slate-800 rounded-full"></div>
                </div>
              </div>
              <p className="text-slate-400">Loading your chat...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-md">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Hello! 👋</h2>
                <p className="text-slate-400">I'm your AI learning assistant. Tell me what you want to learn, and I'll help you find the perfect expert to connect with.</p>
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
                    className="text-left px-4 py-3 bg-slate-700/50 hover:bg-slate-600 rounded-xl text-sm text-slate-200 transition-all duration-200 hover:translate-x-1 border border-slate-600/50 hover:border-orange-500/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-5 py-3.5 rounded-2xl transition-all duration-200 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-br-none shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40'
                      : msg.isError
                      ? 'bg-red-900/30 text-red-200 border border-red-700/50 rounded-bl-none'
                      : 'bg-slate-700/80 text-slate-100 rounded-bl-none border border-slate-600/50 backdrop-blur'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  {msg.isError && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-red-300">
                      Try again
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {sending && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-slate-700/80 border border-slate-600/50 text-slate-100 px-5 py-3.5 rounded-2xl rounded-bl-none backdrop-blur">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 bg-gradient-to-t from-slate-900 to-slate-800/50 backdrop-blur px-6 py-6">
        <form onSubmit={handleSendMessage} className="space-y-3 max-w-4xl mx-auto">
          <div className="relative flex items-center gap-3 bg-slate-700/50 border border-slate-600 rounded-2xl px-5 py-3.5 focus-within:border-orange-500 focus-within:shadow-lg focus-within:shadow-orange-500/20 transition-all duration-200 backdrop-blur hover:border-slate-500">
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
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending}
              className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                inputValue.trim() && !sending
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30 hover:scale-110 active:scale-95'
                  : 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 px-5">
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

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ChatAssistant;
