import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, MapPin, Briefcase, Code, Heart, MessageSquare, Share2, MoreHorizontal, Mail, Clock, Loader } from 'lucide-react';
import api from '../services/api';
import SkillTag from './common/SkillTag';
import ConnectModal from './ConnectModal';

const UserProfile = ({ userId, currentUser, onBack, onNavigateChat }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('none'); // 'none', 'pending', 'connected'

    useEffect(() => {
        if (userId) {
            loadUserProfile();
        }
    }, [userId]);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const userData = await api.getUserById(userId);
            setUser(userData);
            // In a real app, we'd also check connection status here
            // setConnectionStatus(userData.connection_status);
        } catch (err) {
            console.error('Failed to load user profile:', err);
            setError('Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectClick = () => {
        setShowConnectModal(true);
    };

    const handleSendRequest = async (targetUserId, message) => {
        try {
            const matchId = `req_${Date.now()}`;
            await api.sendMessageRequest(targetUserId, matchId, message);
            setConnectionStatus('pending');
            alert('Connection request sent!');
        } catch (error) {
            console.error('Failed to send request:', error);
            alert('Failed to send request. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] p-6 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-[#0f172a] p-6 flex items-center justify-center">
                <div className="glass-card p-8 text-center max-w-md bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
                    <User className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
                    <p className="text-slate-400 mb-6">
                        {error || "The user you're looking for doesn't exist or has been removed."}
                    </p>
                    <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl transition-colors flex items-center gap-2 mx-auto">
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const initials = user.full_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U';

    return (
        <div className="min-h-screen bg-[#0f172a] pb-12 relative overflow-hidden">
            {/* Background Mesh */}
            <div className="absolute inset-0 bg-gradient-mesh opacity-10 pointer-events-none fixed"></div>

            {/* Cover Image / Header Background */}
            <div className="h-64 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/60"></div>

                {/* Navigation */}
                <div className="absolute top-6 left-6 z-10">
                    <button
                        onClick={onBack}
                        className="bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10">
                {/* Profile Card */}
                <div className="bg-slate-800/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-slide-up">
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* Avatar */}
                            <div className="relative -mt-20 md:-mt-24 group">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl p-1 shadow-2xl bg-slate-800 ring-4 ring-slate-800 overflow-hidden">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.full_name}
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-5xl font-bold text-white">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-slate-800 rounded-full"></div>
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0 pt-2 text-white">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-white mb-1">
                                            {user.full_name || user.username}
                                        </h1>
                                        <p className="text-indigo-400 text-lg font-medium">@{user.username}</p>
                                    </div>

                                    {/* Action Buttons */}
                                    {user._id !== currentUser?.user?._id && (
                                        <div className="flex items-center gap-3">
                                            {/* Logic for Connect/Message buttons */}
                                            {connectionStatus === 'connected' ? (
                                                <button
                                                    onClick={() => onNavigateChat(user._id, user.full_name || user.username)}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                    Message
                                                </button>
                                            ) : connectionStatus === 'pending' ? (
                                                <button disabled className="bg-slate-700 text-slate-400 px-6 py-2.5 rounded-xl font-medium cursor-not-allowed flex items-center gap-2 border border-white/5">
                                                    <Clock className="w-5 h-5" />
                                                    Pending
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleConnectClick}
                                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                                                >
                                                    <Mail className="w-5 h-5" />
                                                    Connect
                                                </button>
                                            )}

                                            <button className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {user.bio && (
                                    <p className="text-slate-300 max-w-2xl leading-relaxed mb-6">
                                        {user.bio}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-6 text-sm text-slate-400">
                                    {user.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-400" />
                                            {user.location}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-purple-400" />
                                        Member since {new Date(user.created_at || Date.now()).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats/Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 border-t border-white/5 bg-black/20">
                        {/* Skills Offered */}
                        <div className="p-8 border-b md:border-b-0 md:border-r border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                    <Code className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Can Teach</h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {user.skills_offered?.map((skill, i) => (
                                    <SkillTag key={i} skill={skill} type="offered" />
                                ))}
                                {(!user.skills_offered || user.skills_offered.length === 0) && (
                                    <p className="text-slate-500 italic">No skills listed yet</p>
                                )}
                            </div>
                        </div>

                        {/* Skills Needed */}
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Wants to Learn</h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {user.skills_needed?.map((skill, i) => (
                                    <SkillTag key={i} skill={skill} type="needed" />
                                ))}
                                {(!user.skills_needed || user.skills_needed.length === 0) && (
                                    <p className="text-slate-500 italic">No interests listed yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Connect Modal */}
            {showConnectModal && (
                <ConnectModal
                    user={user}
                    onClose={() => setShowConnectModal(false)}
                    onSend={handleSendRequest}
                />
            )}
        </div>
    );
};

export default UserProfile;

