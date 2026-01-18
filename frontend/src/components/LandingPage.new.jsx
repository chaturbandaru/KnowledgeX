import React, { useState } from 'react';
import { BookOpen, Users, Sparkles, ArrowRight, Zap, Target, Heart } from 'lucide-react';
import api from '../services/api';

const LandingPage = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('signin');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (authMode === 'signup') {
        response = await api.signUp(formData.email, formData.password);
      } else {
        response = await api.signIn(formData.email, formData.password);
      }

      onAuthSuccess({
        email: formData.email,
        user: response.user,
        token: response.token
      });
    } catch (error) {
      console.error('Auth failed:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side Content */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-10">
            <div className="inline-flex items-center gap-2 bg-blue-100/60 border border-blue-300/40 px-4 py-2 rounded-full text-sm font-semibold text-blue-700 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Knowledge Exchange Platform</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-black leading-tight text-gray-900">
              Exchange <br />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Knowledge</span>,<br />
              Grow Together
            </h1>

            <p className="text-xl text-gray-600 max-w-lg leading-relaxed font-medium">
              Connect with experts, share your skills, and learn from a community of passionate individuals worldwide.
            </p>

            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-4 p-5 rounded-xl bg-white/60 hover:bg-white/80 border border-blue-100/50 hover:border-blue-300/50 transition-all hover:shadow-lg backdrop-blur-sm group hover:scale-105 transform">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-3 shadow-lg group-hover:shadow-xl transition-all flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Share Your Expertise</h3>
                  <p className="text-gray-600">Help others learn what you know best</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-xl bg-white/60 hover:bg-white/80 border border-purple-100/50 hover:border-purple-300/50 transition-all hover:shadow-lg backdrop-blur-sm group hover:scale-105 transform">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 shadow-lg group-hover:shadow-xl transition-all flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Find Mentors & Peers</h3>
                  <p className="text-gray-600">Connect with inspiring people worldwide</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-xl bg-white/60 hover:bg-white/80 border border-pink-100/50 hover:border-pink-300/50 transition-all hover:shadow-lg backdrop-blur-sm group hover:scale-105 transform">
                <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-lg p-3 shadow-lg group-hover:shadow-xl transition-all flex-shrink-0">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Build Relationships</h3>
                  <p className="text-gray-600">Create meaningful learning connections</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <Target className="w-5 h-5 text-blue-600" />
                <span>Trusted by thousands</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span>100% Free</span>
              </div>
            </div>
          </div>

          {/* Right Side Auth Form */}
          <div className="animate-in fade-in slide-in-from-right-10 animation-delay-200">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-100/50 p-8 md:p-10 space-y-6 hover:shadow-3xl transition-shadow">
              {/* Form Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mt-4">
                  {authMode === 'signin' ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-gray-600 text-sm font-medium">
                  {authMode === 'signin' ? 'Sign in to your account and continue learning' : 'Create your account and start connecting'}
                </p>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleAuth} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium text-center animate-in shake">
                    ⚠️ {error}
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium bg-blue-50/50"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-500 font-medium bg-blue-50/50"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 transform flex items-center justify-center gap-2 text-lg mt-6"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Auth Mode */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-sm font-medium">
                  {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => {
                      setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      setError(null);
                    }}
                    className="text-blue-600 hover:text-cyan-600 font-bold transition-colors underline"
                  >
                    {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>

              {/* Footer Note */}
              <div className="text-center text-xs text-gray-500 font-medium pt-2">
                🔒 Your data is secure and encrypted
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative footer */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-50 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default LandingPage;
