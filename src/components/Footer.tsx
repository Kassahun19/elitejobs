import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Mail, Phone, MapPin, Github, Twitter, Linkedin, Instagram, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const Footer = () => {
  return (
    <footer className="bg-[#0A0A0A] text-white pt-24 pb-12 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
          {/* Brand Section */}
          <div className="lg:col-span-4 space-y-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-xl shadow-white/5">
                <Briefcase className="text-black w-6 h-6" />
              </div>
              <span className="text-2xl font-black tracking-tighter">EliteJobs<span className="text-emerald-500">.</span></span>
            </Link>
            <p className="text-gray-400 text-lg leading-relaxed font-medium max-w-sm">
              The premier destination for high-impact careers in Ethiopia. Connecting visionary companies with exceptional talent.
            </p>
            <div className="flex items-center space-x-4">
              {[
                { icon: Twitter, href: '#' },
                { icon: Linkedin, href: '#' },
                { icon: Github, href: '#' },
                { icon: Instagram, href: '#' }
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href} 
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Platform</h4>
              <ul className="space-y-4">
                {['Browse Jobs', 'Pricing', 'Companies', 'Success Stories'].map((item) => (
                  <li key={item}>
                    <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors font-medium flex items-center group">
                      <span className="w-0 group-hover:w-4 h-px bg-emerald-500 mr-0 group-hover:mr-2 transition-all duration-300" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Support</h4>
              <ul className="space-y-4">
                {['Help Center', 'Terms of Service', 'Privacy Policy', 'Contact Us'].map((item) => (
                  <li key={item}>
                    <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors font-medium flex items-center group">
                      <span className="w-0 group-hover:w-4 h-px bg-emerald-500 mr-0 group-hover:mr-2 transition-all duration-300" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact/Newsletter Section */}
          <div className="lg:col-span-4">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] space-y-6 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-emerald-500">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Stay Updated</span>
              </div>
              <h4 className="text-xl font-bold">Get the latest elite job alerts directly in your inbox.</h4>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="your@email.com" 
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-400 transition-colors">
                  <ArrowRight className="w-5 h-5 text-black" />
                </button>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span>support@elitejobs.et</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>+251 915 508 167</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-sm font-medium">
            © {new Date().getFullYear()} EliteJobs Ethiopia. Crafted for the ambitious.
          </p>
          <div className="flex items-center space-x-8 text-sm font-bold text-gray-500">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
