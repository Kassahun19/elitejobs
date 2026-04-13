import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Lock, Loader2, Briefcase, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState(localStorage.getItem('rememberedPassword') || '');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Google login is disabled in this custom auth demo. Please use email/password.");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Welcome Back</h1>
          <p className="text-gray-500 font-medium">Log in to your elite account.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="name@company.com or 'admin'"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex items-center justify-between px-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black transition-all cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-xs font-bold text-gray-400 group-hover:text-black transition-colors uppercase tracking-widest">
                  Remember Me
                </span>
              </label>
              <Link to="/forgot-password" title="Forgot Password" className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <span>Log In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="bg-white px-4 text-gray-400">Or continue with</span></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="mt-8 w-full bg-white border border-gray-200 text-black py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-gray-50 transition-all"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span>Google Account</span>
        </button>

        <p className="mt-10 text-center text-sm text-gray-500 font-medium">
          Don't have an account? <Link to="/register" className="text-black font-bold hover:underline">Sign up for free</Link>
        </p>
      </motion.div>
    </div>
  );
};
