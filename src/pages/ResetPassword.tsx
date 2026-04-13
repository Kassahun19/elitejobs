import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new one.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.auth.resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Reset Password</h1>
          <p className="text-gray-500 font-medium">Create a new secure password.</p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-emerald-900 mb-2">Password Reset Successful</h3>
              <p className="text-emerald-700 text-sm font-medium leading-relaxed">
                Your password has been updated. Redirecting to login...
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-black font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to login</span>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 text-gray-500 font-bold hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to login</span>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
