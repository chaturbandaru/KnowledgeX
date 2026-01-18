import React, { useState } from 'react';
import { BookOpen, Users, Sparkles, ArrowRight } from 'lucide-react';
import api from '../services/api';

const LandingPage = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('signin');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAuth = async () => {
  try {
    let response;
    if (authMode === 'signup') {
      response = await api.signUp(formData.email, formData.password);
    } else {
      response = await api.signIn(formData.email, formData.password);
    }
    
    console.log('Auth success:', response);
    
    onAuthSuccess({ 
      email: formData.email,
      user: response.user,
      token: response.token
    });
  } catch (error) {
    console.error('Auth failed:', error);
    alert('Authentication failed: ' + error.message);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Knowledge Exchange Platform
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            Exchange <span className="text-orange-500">Knowledge</span>, Grow Together
          </h1>
          
          <p className="text-xl text-gray-600">
            Connect with experts, share your skills, and learn from a community of passionate individuals.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-4">
              <div className="bg-orange-500 rounded-lg p-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Share Your Expertise</h3>
                <p className="text-gray-600">Help others learn what you know</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-orange-500 rounded-lg p-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Find Mentors</h3>
                <p className="text-gray-600">Connect with people who inspire you</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-orange-500 rounded-lg p-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Grow Together</h3>
                <p className="text-gray-600">Build meaningful learning relationships</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {authMode === 'signin' ? 'Welcome back' : 'Get Started'}
            </h2>
            <p className="text-gray-600 mt-2">
              {authMode === 'signin' ? 'Sign in to continue learning' : 'Create your account today'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <button
              onClick={handleAuth}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              {authMode === 'signin' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;