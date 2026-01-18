import React, { useState, useEffect } from 'react';
import { Search, Users, Sparkles, MessageSquare, Mail, LogOut, Settings, MessageCircle, Edit } from 'lucide-react';
import api from '../services/api';
import EditProfileModal from './EditProfileModal';

const Dashboard = ({ userData, onNavigateChat, onNavigateRequests, onNavigateMessages, onUpdateUser, onLogout, onViewProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [experts, setExperts] = useState([]); // Can be Matches (with profile) or Users
  const [loading, setLoading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const topics = [
    'JavaScript', 'Python', 'Design', 'Marketing', 'Finance',
    'Machine Learning', 'Writing', 'Data Science', 'React', 'Photography'
  ];

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoadingInitial(true);
      const matches = await api.getMatches(); // Returns MatchResponse[] with profile
      setExperts(matches || []);
    } catch (error) {
      console.error('Failed to load matches:', error);
      setExperts([]);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMatches();
      return;
    }

    setLoading(true);
    try {
      const results = await api.searchExperts(searchQuery); // Returns UserResponse[]
      setExperts(results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setExperts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    try {
      if (!userId) {
        alert('Invalid user ID');
        return;
      }
      await api.createConnection(userId);
      alert('Connection request sent!');
      loadMatches();
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect. Please try again.');
    }
  };

  const handleProfileSave = async (updatedData) => {
    try {
      await api.updateProfile(updatedData);
      setShowEditProfile(false);
      const currentUser = await api.getCurrentUser();
      onUpdateUser(currentUser);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (name) => {
    return (name || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 relative overflow-hidden font-sans">
      {/* Background Mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-20 pointer-events-none"></div>

      {/* Navigation */}
      <nav className="glass-card m-4 px-6 py-4 sticky top-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-2 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">KnowledgeX</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateMessages}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 px-4 py-2 rounded-lg transition-all border border-white/10"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Messages</span>
          </button>

          <button
            onClick={onNavigateRequests}
            className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-200 px-4 py-2 rounded-lg transition-all border border-white/10"
          >
            <Mail className="w-5 h-5" />
            <span className="hidden sm:inline">Requests</span>
          </button>

          <button
            onClick={onNavigateChat}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden sm:inline">AI Chat</span>
          </button>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/10 overflow-hidden"
            >
              {userData?.user?.avatar_url ? (
                <img src={userData.user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials(userData?.user?.full_name)
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 glass-card py-2 z-50 animate-scale-in border border-white/10">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="font-semibold text-white">{userData?.user?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{userData?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onViewProfile(userData?.user?.id || userData?.user?._id);
                  }}
                  className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-white/5 text-slate-300 transition-all text-sm"
                >
                  <Users className="w-4 h-4" />
                  View Profile
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowEditProfile(true);
                  }}
                  className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-white/5 text-slate-300 transition-all text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-red-500/10 text-red-400 border-t border-white/10 mt-1 transition-all text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Discover <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Knowledge</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Connect with experts, barter skills, and grow together in a community of learners.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-50"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-6 h-6 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search topics, skills, or people..."
                className="w-full pl-14 pr-32 py-4 bg-slate-800/80 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xl transition-all"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Topic Tags */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setSearchQuery(topic);
                setTimeout(() => handleSearch(), 0);
              }}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700 border border-white/5 rounded-full text-slate-300 hover:text-white transition-all text-sm font-medium hover:scale-105"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Results */}
        {loadingInitial || loading ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Finding experts...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experts.length > 0 ? (
              experts.map((expertItem) => {
                // Handle both Match objects (from getMyMatches) and User objects (from Search)
                const isMatch = expertItem.matched_user_id || expertItem.profile;
                const profile = isMatch ? expertItem.profile : expertItem;
                const connectionId = isMatch ? expertItem.matched_user_id : (expertItem._id || expertItem.id);
                // If profile is missing in match object, skip or show placeholder
                if (isMatch && !profile) return null;

                const displayName = profile?.full_name || profile?.username || 'Unknown User';
                const displayId = profile?.id || profile?._id || connectionId;

                return (
                  <div
                    key={expertItem._id || expertItem.id}
                    className="glass-card p-6 hover:bg-white/5 transition-all group border border-white/5 hover:border-indigo-500/30"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {getInitials(displayName)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-lg truncate group-hover:text-indigo-400 transition-colors">{displayName}</h3>
                        <p className="text-sm text-slate-400 line-clamp-1">{profile?.location || 'Remote'}</p>
                      </div>
                    </div>

                    {profile?.bio && (
                      <p className="text-slate-400 text-sm mb-6 line-clamp-2 min-h-[2.5rem]">{profile.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-6">
                      {profile?.skills_offered?.slice(0, 3).map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-full border border-indigo-500/20">
                          {skill.name || skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => onViewProfile(displayId)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-sm font-medium transition-colors"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => handleConnect(displayId)}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2 rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/25 transition-all"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-20">
                <Search className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">No experts found</h3>
                <p className="text-slate-400">Try searching for different skills or topics.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          userData={userData}
          onClose={() => setShowEditProfile(false)}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
};

export default Dashboard;

