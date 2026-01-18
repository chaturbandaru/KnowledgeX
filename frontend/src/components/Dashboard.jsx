import React, { useState, useEffect } from 'react';
import { Search, Users, Sparkles } from 'lucide-react';
import api from '../services/api';

const Dashboard = ({ userData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);

  const topics = [
    'JavaScript', 'Python', 'Design', 'Marketing', 'Finance', 
    'Machine Learning', 'Writing', 'Data Science', 'React', 'Photography'
  ];

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const matches = await api.getMatches();
      setExperts(matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await api.searchExperts(searchQuery);
      setExperts(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    try {
      await api.createConnection(userId);
      alert('Connection request sent!');
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 rounded-lg p-2">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">KnowledgeX</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
              <Users className="w-6 h-6 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Discover <span className="text-orange-500">Knowledge</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Search for topics you want to learn and connect with experts who can teach you.
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for topics, skills, or people..."
                className="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-lg shadow-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                setSearchQuery(topic);
                handleSearch();
              }}
              className="px-6 py-3 bg-white border border-gray-200 rounded-full hover:border-orange-500 hover:text-orange-500 hover:shadow-md transition-all font-medium"
            >
              {topic}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-4">Searching...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {experts.length > 0 ? (
              experts.map((expert) => (
                <div key={expert.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-orange-500">
                        {expert.displayName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{expert.displayName}</h3>
                      <p className="text-sm text-gray-500">
                        {expert.expertise?.join(', ') || 'No expertise listed'}
                      </p>
                    </div>
                  </div>
                  {expert.bio && (
                    <p className="text-gray-600 text-sm mb-4">{expert.bio}</p>
                  )}
                  <button
                    onClick={() => handleConnect(expert.id)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-all"
                  >
                    Connect
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No experts found. Try searching for a topic!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;