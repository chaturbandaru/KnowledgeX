import React, { useState } from 'react';
import { Users, BookOpen, Sparkles, ArrowRight, X } from 'lucide-react';
import api from '../services/api';

const ProfileSetup = ({ userData, onComplete }) => {
  const [profileStep, setProfileStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    expertise: [],
    interests: []
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const topics = [
    'JavaScript', 'Python', 'Design', 'Marketing', 'Finance', 
    'Machine Learning', 'Writing', 'Data Science', 'React', 'Photography'
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
    setLoading(true);
    
    try {
      await api.updateProfile(formData);
      setShowSuccess(true);
      
      setTimeout(() => {
        onComplete(formData);
      }, 2000);
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
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all ${
                profileStep >= step 
                  ? 'bg-orange-500 text-white scale-110' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-24 h-1 mx-2 transition-all ${
                  profileStep > step ? 'bg-orange-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <p className="text-center text-gray-600 mb-8">Step {profileStep} of 3</p>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {profileStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-orange-100 rounded-full p-4">
                  <Users className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Tell us about yourself</h2>
                  <p className="text-gray-600">Let others know who you are</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
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

              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-green-800 font-medium">Account created! Let's set up your profile.</p>
                </div>
              )}

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
                  <h2 className="text-2xl font-bold text-gray-900">What do you know?</h2>
                  <p className="text-gray-600">Add topics you can teach others</p>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Add your expertise..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      addTopic('expertise', e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.expertise.map((topic) => (
                  <span
                    key={topic}
                    className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    {topic}
                    <button onClick={() => removeTopic('expertise', topic)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => addTopic('expertise', topic)}
                      className="px-4 py-2 border border-gray-300 rounded-full text-sm hover:border-orange-500 hover:text-orange-500 transition-all"
                    >
                      + {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setProfileStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setProfileStep(3)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {profileStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-orange-100 rounded-full p-4">
                  <Sparkles className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">What do you want to learn?</h2>
                  <p className="text-gray-600">Add topics you're curious about</p>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Add your interests..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      addTopic('interests', e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.interests.map((topic) => (
                  <span
                    key={topic}
                    className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    {topic}
                    <button onClick={() => removeTopic('interests', topic)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => addTopic('interests', topic)}
                      className="px-4 py-2 border border-gray-300 rounded-full text-sm hover:border-orange-500 hover:text-orange-500 transition-all"
                    >
                      + {topic}
                    </button>
                  ))}
                </div>
              </div>

              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <p className="text-green-800 font-medium">Profile created successfully!</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setProfileStep(2)}
                  disabled={loading}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
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