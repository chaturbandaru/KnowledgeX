import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Calendar, CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const Requests = ({ onBack }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    loadRequests();
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
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      setAcceptingId(requestId);
      await api.acceptMessageRequest(requestId);
      setRequests(requests.filter(r => r._id !== requestId));
      // Optional: Show success message
    } catch (err) {
      console.error('Failed to accept request:', err);
      setError('Failed to accept request');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (requestId) => {
    try {
      setAcceptingId(requestId);
      await api.rejectMessageRequest(requestId);
      setRequests(requests.filter(r => r._id !== requestId));
    } catch (err) {
      console.error('Failed to reject request:', err);
      setError('Failed to reject request');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-4 animate-spin">
            <div className="w-12 h-12 bg-slate-900 rounded-full"></div>
          </div>
          <p className="text-slate-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Mail className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-white">Connection Requests</h1>
          </div>
          <p className="text-slate-400">
            {requests.length === 0 
              ? 'No incoming requests yet' 
              : `You have ${requests.length} pending request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl">
            <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-slate-300 mb-2">No Requests</h2>
            <p className="text-slate-400">
              When someone wants to connect with you, their requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-orange-500/10"
              >
                {/* Request Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {request.from_user_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                    Pending
                  </span>
                </div>

                {/* Message Preview */}
                {request.initial_message && (
                  <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-slate-400">Message: </span>
                      {request.initial_message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <button
                    onClick={() => handleAccept(request._id)}
                    disabled={acceptingId === request._id}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(request._id)}
                    disabled={acceptingId === request._id}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 hover:text-slate-100 font-semibold py-2 px-4 rounded-lg transition-all duration-200 border border-slate-600"
                  >
                    <XCircle className="w-5 h-5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;
