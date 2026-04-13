import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Job } from '../types';
import { JobCard } from '../components/JobCard';
import { Search, MapPin, Filter, Loader2, ArrowRight, Briefcase } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';

export const JobListings = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const { profile, isAuthReady } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const cities = [
    'Addis Ababa', 'Bahir Dar', 'Hawasa', 'Dessie', 'Mekelle', 'Gondar', 'Remote'
  ];

  const categories = [
    'NGO Jobs', 'Banking & Finance Jobs', 'Technology Jobs', 'Teaching Jobs', 'Freelance Jobs', 'Other Jobs'
  ];

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const jobsData = await api.jobs.list();
        setJobs(jobsData);
      } catch (err: any) {
        console.error("Error fetching jobs:", err);
        setError(err.message || "Failed to load opportunities");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(job => 
    locationFilter === '' || job.location === locationFilter
  ).filter(job =>
    categoryFilter === '' || job.category === categoryFilter
  ).filter(job =>
    experienceFilter === '' || job.experienceLevel === experienceFilter
  );

  const isPremium = profile?.role === 'admin' || 
    (profile?.subscription?.status === 'approved' && 
      (profile.subscription.type === 'lifetime' || 
       (profile.subscription.expiresAt && new Date(profile.subscription.expiresAt) > new Date())));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-4 tracking-tight">Explore <span className="text-gray-400 italic">Elite</span> Opportunities</h1>
        <p className="text-gray-500">Browse through premium job openings in Ethiopia's top companies.</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by job title or company..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">All Locations</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value)}
          >
            <option value="">All Experience</option>
            <option value="Fresh">Fresh Jobs</option>
            <option value="Experienced">Experienced Jobs</option>
          </select>
        </div>
      </div>

      {loading || !isAuthReady ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-12 h-12 text-black animate-spin" />
          <p className="text-gray-500 font-medium">Loading elite opportunities...</p>
        </div>
      ) : error ? (
        <div className="py-24 text-center">
          <h3 className="text-xl font-bold mb-2 text-red-500">{error}</h3>
          <button 
            onClick={() => window.location.reload()} 
            className="text-black font-bold hover:underline"
          >
            Try refreshing the page
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))
            ) : (
              <div className="col-span-full py-24 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Filter className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">No jobs found</h3>
                <p className="text-gray-500">Try adjusting your search or filters to find more results.</p>
              </div>
            )}
          </div>

          {!isPremium && jobs.length >= 5 && (
            <div className="mt-16 p-12 bg-gray-50 rounded-[40px] border border-gray-100 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/80 pointer-events-none" />
              <h2 className="text-3xl font-black mb-4">Unlock <span className="text-emerald-600 italic">Unlimited</span> Access</h2>
              <p className="text-gray-500 mb-8 max-w-xl mx-auto">
                You've reached the limit of free job listings. Upgrade to a premium package to see all available opportunities and start applying today.
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center space-x-2 bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
              >
                <span>View Premium Packages</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};
