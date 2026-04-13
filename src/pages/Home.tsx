import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Briefcase, Search, TrendingUp, Users, ShieldCheck, ArrowRight, Globe, Zap } from 'lucide-react';
import { JobCard } from '../components/JobCard';
import { Job } from '../types';

export const Home = () => {
  // Mock featured jobs
  const featuredJobs: Job[] = [
    {
      id: '1',
      employerUid: 'e1',
      title: 'Senior Software Engineer',
      company: 'EthioTech Solutions',
      location: 'Addis Ababa',
      category: 'Technology Jobs',
      type: 'Full-time',
      description: 'Join our elite engineering team...',
      salary: 'ETB 45k - 60k',
      status: 'active',
      experienceLevel: 'Experienced',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      employerUid: 'e2',
      title: 'Product Designer',
      company: 'Creative Hub',
      location: 'Remote',
      category: 'Technology Jobs',
      type: 'Contract',
      description: 'We are looking for a visionary designer...',
      salary: 'ETB 30k - 40k',
      status: 'active',
      experienceLevel: 'Experienced',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      employerUid: 'e3',
      title: 'Marketing Manager',
      company: 'Global Brands',
      location: 'Addis Ababa',
      category: 'Other Jobs',
      type: 'Full-time',
      description: 'Drive our brand presence in East Africa...',
      salary: 'ETB 35k - 50k',
      status: 'active',
      experienceLevel: 'Experienced',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const stats = [
    { label: 'Active Jobs', value: '1,200+', icon: Briefcase },
    { label: 'Top Companies', value: '450+', icon: Globe },
    { label: 'Job Seekers', value: '15,000+', icon: Users },
    { label: 'Hired Monthly', value: '300+', icon: Zap },
  ];

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gray-50/50 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm mb-8"
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">The #1 Job Board in Ethiopia</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]"
          >
            Find Your Next <br />
            <span className="text-gray-400 italic">Elite Career</span> Move.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-gray-500 mb-12"
          >
            EliteJobs Ethiopia connects the most ambitious professionals with the country's leading companies. Your dream job is just a click away.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
          >
            <Link
              to="/jobs"
              className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors"
            >
              <Search className="w-5 h-5" />
              <span>Browse Jobs</span>
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto bg-white text-black border border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-colors"
            >
              Post a Job
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <stat.icon className="w-6 h-6 text-gray-400" />
              </div>
              <div className="text-3xl font-black mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-black mb-4 tracking-tight">Featured Opportunities</h2>
            <p className="text-gray-500">Hand-picked roles from our most trusted partners.</p>
          </div>
          <Link to="/jobs" className="hidden md:flex items-center space-x-2 text-sm font-bold hover:translate-x-1 transition-transform">
            <span>View All Jobs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-black text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight tracking-tight">
                Why EliteJobs <br />
                <span className="text-gray-500 italic">is different.</span>
              </h2>
              <div className="space-y-12">
                {[
                  { title: 'Verified Employers', desc: 'We manually vet every company to ensure you only apply to legitimate, high-quality opportunities.', icon: ShieldCheck },
                  { title: 'Premium Network', desc: 'Gain access to exclusive roles that aren\'t posted on any other platform in Ethiopia.', icon: TrendingUp },
                  { title: 'Career Growth', desc: 'Our platform is designed to help you level up, not just find another job.', icon: Zap },
                ].map((item) => (
                  <div key={item.title} className="flex space-x-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-white/5 rounded-[40px] overflow-hidden border border-white/10 relative">
                <img 
                  src="https://picsum.photos/seed/ethiopia/800/800" 
                  alt="Professional" 
                  className="object-cover w-full h-full opacity-60 grayscale"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                  <p className="text-2xl font-medium italic mb-6">"EliteJobs helped me find a role that perfectly matches my skills and ambition. The premium experience is worth every penny."</p>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full" />
                    <div>
                      <p className="font-bold">Abebe Kebede</p>
                      <p className="text-sm text-gray-500 uppercase tracking-widest">Senior Developer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
