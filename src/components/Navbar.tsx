import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Briefcase, User, LogOut, Menu, X, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Browse Jobs', href: '/jobs' },
    { name: 'Pricing', href: '/pricing' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">EliteJobs <span className="text-gray-400">Ethiopia</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
              >
                {link.name}
              </Link>
            ))}
            
            {profile?.role === 'employer' && (
              <Link
                to="/post-job"
                className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post a Job</span>
              </Link>
            )}
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-black">
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-medium text-gray-600"
                >
                  {link.name}
                </Link>
              ))}
              
              {profile?.role === 'employer' && (
                <Link
                  to="/post-job"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 bg-black text-white px-4 py-3 rounded-xl font-bold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Post a Job</span>
                </Link>
              )}

              <div className="pt-4 border-t border-gray-100">
                {user ? (
                  <div className="space-y-4">
                    <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Dashboard</Link>
                    <button onClick={handleLogout} className="text-lg font-medium text-red-500">Logout</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Link to="/login" onClick={() => setIsOpen(false)} className="block text-lg font-medium">Login</Link>
                    <Link to="/register" onClick={() => setIsOpen(false)} className="block text-lg font-medium text-black">Register</Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
