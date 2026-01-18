import React, { useState } from 'react';
import { Users, BookOpen, ArrowRight, X, Sparkles } from 'lucide-react';
import api from '../services/api';

const ProfileSetup = ({ userData, onComplete }) => {
  const [profileStep, setProfileStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: userData?.user?.full_name || '',
    bio: userData?.user?.bio || '',
    expertise: userData?.user?.skills_offered?.map(s => s.name) || [],
    interests: userData?.user?.skills_needed?.map(s => s.name) || []
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const topics = [
    'JavaScript', 'Python', 'Design', 'Marketing', 'Finance',
    'Machine Learning', 'Writing', 'Data Science', 'React', 'Photography',
    'UI/UX', 'Web Development', 'Mobile Development', 'DevOps', 'Cloud Computing'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTopic = (field, topic) => {
    if (!formData[field].includes(topic)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], topic]
      }));
    }
  };

  const removeTopic = (field, topic) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(t => t !== topic)
    }));
  };

  const handleComplete = async () => {
    if (!formData.displayName.trim()) {
      alert('Please enter your display name');
      return;
    }

    setLoading(true);

    try {
      // Logic same as original, just UI change
      // Converting simple strings back to full objects if API expects it
      // But updateProfile likely handles strings or objects based on other components
      // Let's assume API is robust or use the same structure as EditProfileModal

      await api.updateProfile({
        full_name: formData.displayName,
        bio: formData.bio,
        skills_offered: formData.expertise.map(name => ({ name, proficiency_level: 'intermediate' })),
        skills_needed: formData.interests.map(name => ({ name, proficiency_level: 'beginner' }))
      });

      setShowSuccess(true);

      setTimeout(() => {
        onComplete(formData);
      }, 1500);
    } catch (error) {
      console.error('Profile update failed:', error);
      alert('Failed to update profile. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh py-12 px-4 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-1 bg-glass-border -z-10 rounded-full"></div>
          <div className="flex justify-between w-48 relative z-10">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all duration-300 ${profileStep >= step
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'bg-glass-bg border border-glass-border text-text-muted'
                  }`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2">
            {profileStep === 1 ? 'Create Your Profile' : 'Skills & Interests'}
          </h2>
          <p className="text-text-secondary">
            {profileStep === 1 ? 'Tell us a bit about yourself' : 'What are you looking for?'}
          </p>
        </div>

        <div className="glass-card p-8 md:p-10 animate-scale-in">
          {profileStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-primary-mid/20 rounded-full p-4 border border-primary-mid/30">
                  <Users className="w-8 h-8 text-primary-light" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Basic Information</h3>
                  <p className="text-text-secondary text-sm">Let others get to know you</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Bio (optional)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="I'm a software engineer passionate about..."
                  rows="4"
                  className="input resize-none"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setProfileStep(2)}
                  className="btn btn-primary w-full group"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {profileStep === 2 && (
            <div className="space-y-8">
              {/* Skills Offered */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-accent-cyan" />
                  <label className="text-lg font-semibold text-text-primary">
                    Skills You Can Teach
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type a skill and press Enter..."
                    className="input bg-black/20"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addTopic('expertise', e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                    Press Enter
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.expertise.map((topic) => (
                    <span
                      key={topic}
                      className="badge badge-primary px-3 py-1.5 flex items-center gap-2 animate-scale-in"
                    >
                      {topic}
                      <button
                        onClick={() => removeTopic('expertise', topic)}
                        className="hover:text-accent-rose transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.expertise.length === 0 && (
                    <p className="text-sm text-text-muted italic">No skills added yet</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.filter(t => !formData.expertise.includes(t)).slice(0, 6).map((topic) => (
                      <button
                        key={topic}
                        onClick={() => addTopic('expertise', topic)}
                        className="px-3 py-1 text-xs border border-glass-border rounded-full hover:bg-white/5 hover:border-primary-light/50 transition-colors text-text-secondary"
                      >
                        + {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-glass-border" />

              {/* Skills Needed */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-accent-pink" />
                  <label className="text-lg font-semibold text-text-primary">
                    Skills You Want to Learn
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type a skill and press Enter..."
                    className="input bg-black/20"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addTopic('interests', e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((topic) => (
                    <span
                      key={topic}
                      className="badge badge-pink px-3 py-1.5 flex items-center gap-2 animate-scale-in"
                    >
                      {topic}
                      <button
                        onClick={() => removeTopic('interests', topic)}
                        className="hover:text-accent-rose transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {formData.interests.length === 0 && (
                    <p className="text-sm text-text-muted italic">No interests added yet</p>
                  )}
                </div>
              </div>

              {showSuccess && (
                <div className="bg-accent-emerald/10 border border-accent-emerald/20 rounded-lg p-4 flex items-center gap-3 animate-slide-up">
                  <div className="w-6 h-6 bg-accent-emerald rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <p className="text-accent-emerald font-medium">Profile updated successfully!</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setProfileStep(1)}
                  disabled={loading}
                  className="flex-1 btn btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading || !formData.displayName.trim()}
                  className="flex-1 btn btn-primary"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
