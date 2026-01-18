import React, { useState } from 'react';
import { Users, BookOpen, ArrowRight, X } from 'lucide-react';
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
      await api.updateProfile(formData);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all ${
                profileStep >= step 
                  ? 'bg-orange-500 text-white scale-110' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 2 && (
                <div className={`w-24 h-1 mx-2 transition-all ${
                  profileStep > step ? 'bg-orange-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="text-center text-gray-600 mb-8">Step {profileStep} of 2</p>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {profileStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-orange-100 rounded-full p-4">
                  <Users className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Tell us about yourself</h2>
                  <p className="text-gray-600">Update your profile information</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio (optional)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none resize-none"
                />
              </div>

              <button
                onClick={() => setProfileStep(2)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {profileStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-orange-100 rounded-full p-4">
                  <BookOpen className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Skills & Interests</h2>
                  <p className="text-gray-600">What can you teach? What do you want to learn?</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 font-semibold">
                  Skills You Can Teach
                </label>
                <div>
                  <input
                    type="text"
                    placeholder="Add a skill you can teach..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addTopic('expertise', e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.expertise.map((topic) => (
                    <span
                      key={topic}
                      className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 animate-scaleIn"
                    >
                      {topic}
                      <button 
                        onClick={() => removeTopic('expertise', topic)}
                        className="hover:bg-orange-600 p-1 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mt-4 mb-2">Popular skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.filter(t => !formData.expertise.includes(t)).slice(0, 8).map((topic) => (
                      <button
                        key={topic}
                        onClick={() => addTopic('expertise', topic)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-full hover:border-orange-500 hover:text-orange-500 transition-all hover:bg-orange-50"
                      >
                        + {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3 font-semibold">
                  Skills You Want to Learn
                </label>
                <div>
                  <input
                    type="text"
                    placeholder="Add a skill you want to learn..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addTopic('interests', e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.interests.map((topic) => (
                    <span
                      key={topic}
                      className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 animate-scaleIn"
                    >
                      {topic}
                      <button 
                        onClick={() => removeTopic('interests', topic)}
                        className="hover:bg-slate-800 p-1 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mt-4 mb-2">Popular interests:</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.filter(t => !formData.interests.includes(t)).slice(0, 8).map((topic) => (
                      <button
                        key={topic}
                        onClick={() => addTopic('interests', topic)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-full hover:border-orange-500 hover:text-orange-500 transition-all hover:bg-orange-50"
                      >
                        + {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-slideDown">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-green-800 font-medium">Profile updated successfully!</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setProfileStep(1)}
                  disabled={loading}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading || !formData.displayName.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProfileSetup;
