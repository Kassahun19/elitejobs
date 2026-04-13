import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
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
            <Mail className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Forgot Password?</h1>
          <p className="text-gray-500 font-medium">No worries, we'll send you reset instructions.</p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-emerald-900 mb-2">Check your email</h3>
              <p className="text-emerald-700 text-sm font-medium leading-relaxed">
                We've sent a password reset link to <span className="font-black">{email}</span>.
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
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <span>Send Reset Link</span>
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
