import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Search, User, Clock } from 'lucide-react';
import api from '../services/api';
import ChatWindow from './ChatWindow';

const ConversationsPage = ({ onBack, userData, initialChatUser }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(initialChatUser ? {
        userId: initialChatUser.userId,
        userName: initialChatUser.userName
    } : null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            setLoading(true);
            // Get all accepted message requests
            const requests = await api.getIncomingRequests();

            // Filter accepted ones and get unique conversations
            const acceptedRequests = requests.filter(r => r.status === 'accepted');

            // Create conversation list
            const convos = acceptedRequests.map(req => ({
                userId: req.from_user_id,
                userName: req.from_user_name,
                lastMessage: req.initial_message,
                timestamp: req.created_at,
                unread: 0
            }));

            setConversations(convos);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
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

    if (selectedConversation) {
        return (
            <ChatWindow
                otherUserId={selectedConversation.userId}
                otherUserName={selectedConversation.userName}
                onBack={() => setSelectedConversation(null)}
                currentUser={userData}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-mesh">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="btn btn-ghost p-2"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-4xl font-bold text-gradient">Messages</h1>
                            <p className="text-text-secondary mt-1">
                                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="input pl-12"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-4">
                                <div className="flex items-center gap-4">
                                    <div className="skeleton w-12 h-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="skeleton h-4 w-32" />
                                        <div className="skeleton h-3 w-48" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                            {searchQuery ? 'No conversations found' : 'No messages yet'}
                        </h3>
                        <p className="text-text-secondary">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Start connecting with people to begin conversations'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredConversations.map((conversation) => (
                            <button
                                key={conversation.userId}
                                onClick={() => setSelectedConversation(conversation)}
                                className="w-full glass-card card-lift p-4 text-left transition-all hover:border-primary-light"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="avatar avatar-lg flex-shrink-0">
                                        <User className="w-6 h-6" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-text-primary truncate">
                                                {conversation.userName}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                                <Clock className="w-3 h-3" />
                                                {formatTimestamp(conversation.timestamp)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-text-secondary truncate">
                                            {conversation.lastMessage}
                                        </p>
                                    </div>

                                    {/* Unread Badge */}
                                    {conversation.unread > 0 && (
                                        <div className="badge badge-primary">
                                            {conversation.unread}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationsPage;

