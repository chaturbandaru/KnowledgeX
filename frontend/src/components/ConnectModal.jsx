import React, { useState } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';

const ConnectModal = ({ user, onClose, onSend }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) return;

        setLoading(true);
        try {
            await onSend(user._id, message);
            onClose();
        } catch (error) {
            console.error('Failed to send connection request:', error);
            // Ideally handle error display here or in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="glass-card w-full max-w-md p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary-light" />
                        Connect with {user.full_name || user.username}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-primary-mid/10 rounded-lg p-4 border border-primary-mid/20">
                        <p className="text-sm text-text-secondary">
                            Include a personalized message to introduce yourself and mention what skills you'd like to exchange.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Your Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`Hi ${user.full_name || user.username}, I'm interested in learning...`}
                            className="input min-h-[120px] resize-none"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="btn btn-secondary flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                            disabled={!message.trim() || loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Request
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectModal;
