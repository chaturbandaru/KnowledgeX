import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreHorizontal, User, Clock, Check, CheckCircle } from 'lucide-react';
import api from '../services/api';

const ChatWindow = ({ otherUserId, otherUserName, onBack, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, [otherUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        try {
            // First load, set loading true
            if (messages.length === 0) setLoading(true);

            const data = await api.getConversation(otherUserId);

            // Only update if changes to avoid jitter
            // Simple check: different length or last message ID different
            // For now, just setting it is fine as React handles diffing
            setMessages(data || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            if (messages.length === 0) setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const tempMessage = {
            id: `temp_${Date.now()}`,
            content: newMessage,
            from_user_id: currentUser.user._id, // Assuming currentUser structure
            to_user_id: otherUserId,
            created_at: new Date().toISOString(),
            is_read: false,
            isTemp: true
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setSending(true);

        try {
            await api.sendMessage(otherUserId, tempMessage.content);
            // Reload to get the real message with ID and correct timestamp
            await loadMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
            // Could add error state to the message here
        } finally {
            setSending(false);
        }
    };

    const groupMessagesByDate = (msgs) => {
        const groups = {};
        msgs.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] max-w-4xl mx-auto glass-card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-glass-border flex items-center justify-between bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn btn-ghost p-2 rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5 text-text-primary" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="avatar avatar-md border border-white/10">
                            {otherUserName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary">{otherUserName}</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse"></span>
                                <span className="text-xs text-text-secondary">Online</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button className="btn btn-ghost p-2">
                    <MoreHorizontal className="w-5 h-5 text-text-secondary" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-black/5">
                {loading && messages.length === 0 ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                <div className="skeleton w-1/2 h-12 rounded-2xl" />
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-60">
                        <Clock className="w-12 h-12 mb-2" />
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    Object.entries(messageGroups).map(([date, groupMessages]) => (
                        <div key={date}>
                            <div className="flex justify-center mb-4">
                                <span className="text-xs font-medium text-text-muted bg-black/10 px-3 py-1 rounded-full">
                                    {date === new Date().toLocaleDateString() ? 'Today' : date}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {groupMessages.map((msg, idx) => {
                                    const isMe = msg.from_user_id === currentUser.user._id;
                                    const isTemp = msg.isTemp;

                                    return (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}
                                        >
                                            <div
                                                className={`
                                                    max-w-[75%] p-3.5 rounded-2xl shadow-sm text-sm break-words relative group
                                                    ${isMe
                                                        ? 'bg-gradient-primary text-white rounded-tr-none'
                                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}
                                                    ${isTemp ? 'opacity-70' : ''}
                                                `}
                                            >
                                                <p className="leading-relaxed">{msg.content}</p>
                                                <div className={`
                                                    text-[10px] mt-1 flex items-center justify-end gap-1
                                                    ${isMe ? 'text-white/70' : 'text-gray-400'}
                                                `}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMe && (
                                                        isTemp ? <Clock className="w-3 h-3" /> :
                                                            msg.is_read ? <CheckCircle className="w-3 h-3" /> :
                                                                <Check className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/5 backdrop-blur-md border-t border-glass-border">
                <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="input flex-1 bg-white/10 border-white/10 text-text-primary placeholder:text-text-muted focus:bg-white/20"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="btn btn-primary px-4 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
