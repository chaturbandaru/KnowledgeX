import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Search, Clock, Loader } from 'lucide-react';
import api from '../services/api';
import ChatWindow from './ChatWindow';

const ConversationsPage = ({ onBack, userData, initialChatUser }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(initialChatUser ? {
        userId: initialChatUser.userId,
        userName: initialChatUser.userName,
        userPhoto: initialChatUser.userPhoto
    } : null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadConversations();
        const interval = setInterval(loadConversations, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const data = await api.getConversations();
            setConversations(data || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        (conv.user_name || conv.user_full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
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

    const formatMessage = (message) => {
        if (!message) return 'No messages yet';
        return message.length > 50 ? message.substring(0, 50) + '...' : message;
    };

    if (selectedConversation) {
        return (
            <ChatWindow
                otherUserId={selectedConversation.userId}
                otherUserName={selectedConversation.userName}
                otherUserPhoto={selectedConversation.userPhoto}
                onBack={() => setSelectedConversation(null)}
                currentUser={userData}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            {/* Background Mesh (Optional, kept subtle) */}
            <div className="absolute inset-0 bg-gradient-mesh opacity-10 pointer-events-none fixed"></div>

            <div className="max-w-4xl mx-auto p-6 relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-4xl font-bold text-white">
                                Messages
                            </h1>
                            <p className="text-slate-400 mt-1">
                                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-500 hover:bg-slate-800/80"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {loading && conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Loading conversations...</p>
                    </div>
                ) : filteredConversations.length > 0 ? (
                    <div className="space-y-3">
                        {filteredConversations.map((conv) => (
                            <button
                                key={conv.user_id}
                                onClick={() => setSelectedConversation({
                                    userId: conv.user_id,
                                    userName: conv.user_name || conv.user_full_name || 'Unknown',
                                    userPhoto: conv.avatar_url || conv.user_photo // Assuming backend sends this
                                })}
                                className="w-full glass-card p-4 hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all text-left group rounded-xl"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        {conv.avatar_url || conv.user_photo ? (
                                            <img
                                                src={conv.avatar_url || conv.user_photo}
                                                alt={conv.user_name}
                                                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">
                                                {(conv.user_name || conv.user_full_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                                                    {conv.user_full_name || conv.user_name || 'Unknown User'}
                                                </h3>
                                                {conv.unread_count > 0 && (
                                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-500 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-500/25">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-sm truncate group-hover:text-slate-300 transition-colors">
                                                {formatMessage(conv.last_message)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {formatTimestamp(conv.last_message_time)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-white/5">
                        <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-300 text-lg font-bold mb-2">No conversations yet</p>
                        <p className="text-slate-500">Start by connecting with someone on the dashboard!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConversationsPage;

