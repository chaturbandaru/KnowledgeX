import React from 'react';
import { X, Star, MapPin, MessageCircle } from 'lucide-react';

const MatchedUsersOverlay = ({ users, matchScore, onClose, onConnect }) => {
  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-90vh overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Matched Experts Found! 🎯</h2>
            <p className="text-blue-100 mt-1">
              {users.length} expert{users.length !== 1 ? 's' : ''} ready to help
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Users Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {users.map((user) => (
            <div
              key={user.id}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* User Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {user.full_name || user.username}
                  </h3>
                  <p className="text-gray-600 text-sm">@{user.username}</p>
                </div>
                {matchScore && user.match_score && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star size={14} fill="currentColor" />
                    {(user.match_score * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-gray-700 text-sm mb-4">{user.bio}</p>
              )}

              {/* Location */}
              {user.location && (
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                  <MapPin size={16} />
                  {user.location}
                </div>
              )}

              {/* Skills Offered */}
              {user.skills_offered && user.skills_offered.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Skills Offered:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.skills_offered.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Needed (if available) */}
              {user.skills_needed && user.skills_needed.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Looking to Learn:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.skills_needed.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => onConnect(user.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Connect
                </button>
                <a
                  href={`/profile/${user.id}`}
                  className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition text-center"
                >
                  View Profile
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-sm text-gray-600 text-center">
            Reach out to start learning or teaching today!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchedUsersOverlay;
