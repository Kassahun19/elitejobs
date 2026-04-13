import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Lock, User, Loader2, Briefcase, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const Register = () => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({ email, password, displayName, role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white p-10 md:p-16 rounded-[40px] border border-gray-100 shadow-xl"
      >
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">Join the Elite</h1>
          <p className="text-gray-500 font-medium text-lg">Create your account and start your journey.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="Abebe Kebede"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

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
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                placeholder="Minimum 6 characters"
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
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">I am a...</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('seeker')}
                className={cn(
                  "p-6 rounded-3xl border-2 transition-all text-left group",
                  role === 'seeker' ? "border-black bg-black text-white" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors", role === 'seeker' ? "bg-white/20 text-white" : "bg-white text-gray-400 group-hover:text-black")}>
                  <User className="w-5 h-5" />
                </div>
                <div className="font-bold text-lg">Job Seeker</div>
                <div className={cn("text-xs font-medium mt-1", role === 'seeker' ? "text-gray-300" : "text-gray-400")}>I want to find my dream job.</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('employer')}
                className={cn(
                  "p-6 rounded-3xl border-2 transition-all text-left group",
                  role === 'employer' ? "border-black bg-black text-white" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors", role === 'employer' ? "bg-white/20 text-white" : "bg-white text-gray-400 group-hover:text-black")}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="font-bold text-lg">Employer</div>
                <div className={cn("text-xs font-medium mt-1", role === 'employer' ? "text-gray-300" : "text-gray-400")}>I want to hire top talent.</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-2xl font-bold text-xl hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <span>Create Elite Account</span>
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-sm text-gray-500 font-medium">
          Already have an account? <Link to="/login" className="text-black font-bold hover:underline">Log in here</Link>
        </p>
      </motion.div>
    </div>
  );
};
