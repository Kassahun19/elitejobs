import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Invalid or missing verification token.');
        setLoading(false);
        return;
      }

      try {
        await api.auth.verifyEmail(token);
        setSuccess(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

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
          <h1 className="text-3xl font-black tracking-tight mb-2">Email Verification</h1>
          <p className="text-gray-500 font-medium">Verifying your elite account.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="w-12 h-12 text-black animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse">Verifying...</p>
          </div>
        ) : success ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-emerald-900 mb-2">Verification Successful</h3>
              <p className="text-emerald-700 text-sm font-medium leading-relaxed">
                Your email has been verified. You can now access all elite features.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all"
            >
              <span>Go to Login</span>
            </Link>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="p-6 bg-red-50 rounded-[32px] border border-red-100">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-900 mb-2">Verification Failed</h3>
              <p className="text-red-700 text-sm font-medium leading-relaxed">
                {error || 'Something went wrong during verification.'}
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
        )}
      </motion.div>
    </div>
  );
};
