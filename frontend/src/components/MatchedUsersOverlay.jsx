import React from 'react';
import { X, Star, MapPin, MessageCircle, ArrowRight } from 'lucide-react';

const MatchedUsersOverlay = ({ users, matchScore, onClose, onConnect }) => {
  if (!users || users.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-primary px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 fill-current text-yellow-300" />
              Matched Experts Found!
            </h2>
            <p className="text-white/80 mt-1">
              {users.length} expert{users.length !== 1 ? 's' : ''} ready to help
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Users Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
          {users.map((user) => (
            <div
              key={user.id}
              className="glass-card card-lift p-6 border border-glass-border"
            >
              {/* User Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-text-primary truncate">
                    {user.full_name || user.username}
                  </h3>
                  <p className="text-text-secondary text-sm truncate">@{user.username}</p>
                </div>
                {matchScore && user.match_score && (
                  <div className="badge badge-success flex items-center gap-1 font-bold">
                    <Star size={12} fill="currentColor" />
                    {(user.match_score * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-text-secondary text-sm mb-4 line-clamp-2">{user.bio}</p>
              )}

              {/* Location */}
              {user.location && (
                <div className="flex items-center gap-2 text-text-muted text-sm mb-4">
                  <MapPin size={16} />
                  {user.location}
                </div>
              )}

              {/* Skills Offered */}
              {user.skills_offered && user.skills_offered.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wider">
                    Skills Offered
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.skills_offered.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="badge badge-primary text-xs"
                      >
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                    {user.skills_offered.length > 4 && (
                      <span className="badge badge-primary text-xs">
                        +{user.skills_offered.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => onConnect(user.id)}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} />
                  Connect
                </button>
                {/* View Profile would ideally navigate, but we are in an overlay. 
                    We can just show connect mainly. Or keep it as link if we had router context.
                    Simplifying to Connect focused for now or simple link.
                */}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-glass-bg border-t border-glass-border px-6 py-4 text-center">
          <p className="text-sm text-text-secondary">
            Reach out to start learning or teaching today!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchedUsersOverlay;
