import React, { useState, useEffect } from 'react';
import { Search, Users, Sparkles, MessageSquare, Mail, LogOut, Settings, MessageCircle, Edit } from 'lucide-react';
import api from '../services/api';
import EditProfileModal from './EditProfileModal';

const Dashboard = ({ userData, onNavigateChat, onNavigateRequests, onNavigateMessages, onUpdateUser, onLogout, onViewProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [experts, setExperts] = useState([]);
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
      const matches = await api.getMatches();
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
      const results = await api.searchExperts(searchQuery);
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
      await api.createConnection(userId);
      alert('Connection request sent!');
      loadMatches();
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect. Please try again.');
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

  const getInitials = (name) => {
    return (name || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-blue-200/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2 shadow-lg hover:shadow-xl transition-all">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">KnowledgeX</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateMessages}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 transform"
            >
              <MessageCircle className="w-5 h-5" />
              Messages
            </button>
            
            <button
              onClick={onNavigateRequests}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 transform"
            >
              <Mail className="w-5 h-5" />
              Requests
            </button>
            
            <button
              onClick={onNavigateChat}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 transform"
            >
              <MessageSquare className="w-5 h-5" />
              AI Chat
            </button>
            
            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-110 transform"
                title={userData?.user?.full_name || userData?.email}
              >
                {getInitials(userData?.user?.full_name)}
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-blue-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                  <div className="px-4 py-2 border-b border-blue-100">
                    <p className="text-sm font-semibold text-gray-900">{userData?.user?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-500">{userData?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onViewProfile(userData?.user?._id);
                    }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700"
                  >
                    <Users className="w-4 h-4" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowEditProfile(true);
                    }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-red-50 transition-all text-red-600 border-t border-blue-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Discover <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Knowledge</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Search for topics, skills, or experts. Connect with people who can help you learn and grow.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-blue-400 group-focus-within:text-blue-600 transition-all" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for topics, skills, or people..."
                className="w-full pl-14 pr-4 py-4 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-lg shadow-lg focus:shadow-xl text-gray-900 placeholder-gray-500 font-medium"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 transform font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Topic Tags */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setSearchQuery(topic);
                setTimeout(() => handleSearch(), 0);
              }}
              className="px-6 py-3 bg-white border-2 border-blue-200 rounded-full hover:border-blue-500 hover:text-blue-600 hover:shadow-md hover:bg-blue-50 transition-all font-medium text-gray-700 active:scale-95 transform"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Results */}
        {loadingInitial || loading ? (
          <div className="text-center py-12">
            <div className="inline-flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Loading experts...</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {experts.length > 0 ? (
              experts.map((expert) => (
                <div
                  key={expert._id || expert.id}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-blue-100 hover:border-blue-300 group overflow-hidden hover:scale-105 transform"
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                      {getInitials(expert.full_name || expert.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">{expert.full_name || expert.username}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{expert.location || 'Location not specified'}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {expert.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{expert.bio}</p>
                  )}

                  {/* Skills Offered */}
                  {expert.skills_offered && expert.skills_offered.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Offers</p>
                      <div className="flex flex-wrap gap-2">
                        {expert.skills_offered.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                          >
                            {skill.name || skill}
                          </span>
                        ))}
                        {expert.skills_offered.length > 3 && (
                          <span className="px-3 py-1 text-gray-500 text-xs">+{expert.skills_offered.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills Needed */}
                  {expert.skills_needed && expert.skills_needed.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Seeks</p>
                      <div className="flex flex-wrap gap-2">
                        {expert.skills_needed.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                          >
                            {skill.name || skill}
                          </span>
                        ))}
                        {expert.skills_needed.length > 3 && (
                          <span className="px-3 py-1 text-gray-500 text-xs">+{expert.skills_needed.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-blue-100">
                    <button
                      onClick={() => onViewProfile(expert._id || expert.id)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg transition-all active:scale-95"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => handleConnect(expert._id || expert.id)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-2 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <div className="mb-4">
                  <Search className="w-16 h-16 text-gray-300 mx-auto" />
                </div>
                <p className="text-gray-600 text-lg font-medium">No experts found</p>
                <p className="text-gray-500">Try searching for a topic or skill you're interested in.</p>
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
