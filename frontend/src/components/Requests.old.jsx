import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Calendar, CheckCircle, XCircle, Mail, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const Requests = ({ onBack, onAcceptRequest }) => {
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

  const handleAccept = async (requestId, fromUserId, fromUserName) => {
    try {
      setAcceptingId(requestId);
      await api.acceptMessageRequest(requestId);
      setRequests(requests.filter(r => r._id !== requestId));

      if (onAcceptRequest) {
        onAcceptRequest(fromUserId, fromUserName);
      }
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
      <div className="min-h-screen bg-gradient-mesh p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-mid border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-ghost p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="bg-gradient-primary rounded-lg p-2">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary">Connection Requests</h1>
          </div>
          <p className="text-text-secondary">
            {requests.length === 0
              ? 'No incoming requests yet'
              : `You have ${requests.length} pending request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose">
            {error}
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Requests</h2>
            <p className="text-text-secondary">
              When someone wants to connect with you, their requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="glass-card p-6 animate-slide-up"
              >
                {/* Request Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="avatar avatar-md">
                      {request.from_user_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {request.from_user_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-warning">
                    Pending
                  </span>
                </div>

                {/* Message Preview */}
                {request.initial_message && (
                  <div className="mb-4 p-4 bg-black/10 rounded-lg border border-glass-border">
                    <p className="text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Message: </span>
                      {request.initial_message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-glass-border">
                  <button
                    onClick={() => handleAccept(request._id, request.from_user_id, request.from_user_name)}
                    disabled={acceptingId === request._id}
                    className="flex-1 btn bg-gradient-to-r from-accent-emerald to-green-600 text-white shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(request._id)}
                    disabled={acceptingId === request._id}
                    className="flex-1 btn btn-secondary hover:text-accent-rose hover:border-accent-rose disabled:opacity-50"
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
