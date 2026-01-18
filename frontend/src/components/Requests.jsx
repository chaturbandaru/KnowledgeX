import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Calendar, CheckCircle, XCircle, Mail, ArrowLeft, Loader } from 'lucide-react';
import api from '../services/api';

const Requests = ({ onBack, onAcceptRequest }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getIncomingRequests();
      setRequests(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setError(err.message || 'Failed to load connection requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId, fromUserId, fromUserName) => {
    try {
      setProcessingId(requestId);
      await api.acceptMessageRequest(requestId);

      // Refresh requests list
      await loadRequests();

      // Navigate to chat with accepted user
      if (onAcceptRequest) {
        onAcceptRequest(fromUserId, fromUserName);
      }
    } catch (err) {
      console.error('Failed to accept request:', err);
      setError('Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setProcessingId(requestId);
      await api.rejectMessageRequest(requestId);
      setRequests(requests.filter(r => r._id !== requestId));
    } catch (err) {
      console.error('Failed to reject request:', err);
      setError('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && requests.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 relative">
      <div className="absolute inset-0 bg-gradient-mesh opacity-10 pointer-events-none fixed"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg p-2 shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Connection Requests</h1>
          </div>
          <p className="text-slate-400 ml-14">
            {requests.length === 0
              ? 'No incoming requests yet'
              : `You have ${requests.length} pending request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Requests List */}
        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="glass-card rounded-xl p-6 shadow-2xl border border-white/5 bg-slate-800/50 hover:bg-slate-800/70 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    {request.avatar_url ? (
                      <img src={request.avatar_url} alt="User" className="w-14 h-14 rounded-full border border-white/10 object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                        {(request.from_user_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {request.from_user_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-slate-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(request.created_at)}
                        </span>
                      </p>

                      {/* Initial Message */}
                      {request.initial_message && (
                        <div className="bg-slate-900/50 border-l-4 border-indigo-500 p-3 rounded">
                          <p className="text-sm text-slate-300">
                            <span className="font-semibold text-white">Message: </span>
                            {request.initial_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 border border-indigo-500/20">
                    Pending
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleAccept(
                      request._id,
                      request.from_user_id,
                      request.from_user_name
                    )}
                    disabled={processingId === request._id}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    {processingId === request._id ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Accept & Chat
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(request._id)}
                    disabled={processingId === request._id}
                    className="flex-1 bg-slate-700 hover:bg-red-500/20 disabled:opacity-50 text-slate-300 hover:text-red-400 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-red-500/30"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-white/5">
            <MessageCircle className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Connection Requests</h2>
            <p className="text-slate-400">
              When someone connects with you, their request will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
