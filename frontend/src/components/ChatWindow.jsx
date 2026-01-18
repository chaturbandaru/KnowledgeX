import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreHorizontal, User, Clock, Check, CheckCircle, Loader, MessageCircle } from 'lucide-react';
import api from '../services/api';

const ChatWindow = ({ otherUserId, otherUserName, otherUserPhoto, onBack, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        loadMessages();
        // Poll for new messages every 2 seconds
        pollIntervalRef.current = setInterval(loadMessages, 2000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [otherUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        try {
            const data = await api.getConversation(otherUserId);
            setMessages(data || []);
            if (loading) setLoading(false);
        } catch (error) {
            console.error('Failed to load messages:', error);
            if (loading) setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const messageContent = newMessage;
        const tempMessage = {
            _id: `temp_${Date.now()}`,
            content: messageContent,
            from_user_id: currentUser?.user?._id,
            to_user_id: otherUserId,
            created_at: new Date().toISOString(),
            is_read: false,
            isTemp: true
        };

        // Optimistic update
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setSending(true);

        try {
            await api.sendMessage(otherUserId, messageContent);
            // Reload to get the real message with ID and correct timestamp
            await loadMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
            // Remove temp message on error
            setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
            setNewMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    const getInitials = (name) => {
        return (name || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString();
    };

    const groupMessagesByDate = (msgs) => {
        const groups = {};
        msgs.forEach(msg => {
            const date = formatDate(msg.created_at);
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const messageGroups = groupMessagesByDate(messages);

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-[#0f172a] items-center justify-center">
                <Loader className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-400">Loading conversation...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200">
            {/* Header */}
            <div className="bg-slate-800/80 backdrop-blur-md shadow-md border-b border-white/5 p-4 flex items-center justify-between z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-300 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    {otherUserPhoto ? (
                        <img
                            src={otherUserPhoto}
                            alt={otherUserName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/50"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            {getInitials(otherUserName)}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-white text-lg">{otherUserName}</h3>
                        <p className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Active now
                        </p>
                    </div>
                </div>
                <button className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white">
                    <MoreHorizontal className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-mesh-dark">
                {Object.keys(messageGroups).length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageCircle className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No messages yet</h3>
                            <p className="text-slate-400">Send a message to start the conversation!</p>
                        </div>
                    </div>
                ) : (
                    Object.entries(messageGroups).map(([date, msgs]) => (
                        <div key={date}>
                            {/* Date Divider */}
                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-xs font-semibold text-slate-500 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">{date}</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Messages */}
                            {msgs.map((msg) => {
                                const isOwnMessage = msg.from_user_id === currentUser?.user?._id;
                                return (
                                    <div
                                        key={msg._id}
                                        className={`flex gap-3 mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {!isOwnMessage && !otherUserPhoto && (
                                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                                                {getInitials(otherUserName)}
                                            </div>
                                        )}
                                        {!isOwnMessage && otherUserPhoto && (
                                            <img
                                                src={otherUserPhoto}
                                                alt={otherUserName}
                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                                            />
                                        )}

                                        <div
                                            className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${isOwnMessage
                                                ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-500/10'
                                                : 'bg-slate-800 text-slate-200 border border-white/10 rounded-bl-none shadow-sm'
                                                }`}
                                        >
                                            <p className="break-words leading-relaxed">{msg.content}</p>
                                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOwnMessage ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                {formatTime(msg.created_at)}
                                                {isOwnMessage && (
                                                    msg.isTemp ? (
                                                        <Loader className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-3 h-3" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-slate-900 border-t border-white/10 p-4">
                <form onSubmit={handleSend} className="flex gap-3 items-end max-w-5xl mx-auto">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-200 placeholder-slate-500 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center aspect-square h-[50px]"
                    >
                        {sending ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
