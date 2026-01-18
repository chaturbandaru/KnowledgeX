import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Sparkles, ArrowRight, Zap, Globe, Cpu } from 'lucide-react';
import api from '../services/api';

const LandingPage = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState('signin');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden flex items-center justify-center p-4">
      {/* Dynamic Background Elements */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen transition-transform duration-100 ease-out"
        style={{ transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)` }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen transition-transform duration-100 ease-out"
        style={{ transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)` }}
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

      <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left Side Content */}
        <div className="space-y-8 animate-slide-up order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full text-sm font-medium text-indigo-400 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>AI-Powered Knowledge Exchange</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
            Exchange <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x">Knowledge</span>, <br />
            <span className="text-slate-400">Grow Together</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
            Connect with experts, barter your skills, and master new technologies through direct, meaningful conversations.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105 duration-300 group">
              <div className="bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                <Globe className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">Global Network</h3>
              <p className="text-slate-400 text-sm">Connect with learners worldwide.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105 duration-300 group">
              <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:-rotate-6 transition-transform">
                <Cpu className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">AI Matching</h3>
              <p className="text-slate-400 text-sm">Smart algorithms find your perfect mentor.</p>
            </div>
          </div>
        </div>

        {/* Right Side Auth Form */}
        <div className="order-1 lg:order-2">
          <div className="glass-card p-8 md:p-12 space-y-8 animate-scale-in relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/20 bg-slate-900/50 rounded-3xl">
            {/* Decorative Orbs */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20"></div>

            <div className="text-center relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">
                {authMode === 'signin' ? 'Welcome back' : 'Join KnowledgeX'}
              </h2>
              <p className="text-slate-400">
                {authMode === 'signin' ? 'Sign in to continue your journey' : 'Start your learning journey today'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6 relative z-10">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-500 hover:bg-slate-800/70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder-slate-500 hover:bg-slate-800/70"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center relative z-10">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors text-sm"
              >
                {authMode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
