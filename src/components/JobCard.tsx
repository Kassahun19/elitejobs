import React from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../types';
import { MapPin, Clock, Briefcase, ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { cn } from '../lib/utils';

interface JobCardProps {
  job: Job;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const { profile, refreshProfile } = useAuth();
  const isSaved = profile?.savedJobs?.includes(job.id);
  const isDeadlinePassed = job.deadline ? new Date(job.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile) return;
    try {
      await api.jobs.save(job.id);
      await refreshProfile();
    } catch (err) {
      console.error("Error saving job:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight group-hover:text-black transition-colors">{job.title}</h3>
            <p className="text-gray-500 text-sm font-medium">{job.company}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1.5">
          <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-100">
            {job.type}
          </span>
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            job.experienceLevel === 'Fresh' 
              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
              : "bg-blue-50 text-blue-600 border-blue-100"
          )}>
            {job.experienceLevel === 'Fresh' ? 'Fresh Job' : 'Experienced'}
          </span>
          {isDeadlinePassed && (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-red-50 text-red-600 border-red-100">
              Expired
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-4 h-4" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Briefcase className="w-4 h-4" />
          <span>{job.category}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-bold text-gray-400">ETB</span>
          <span>{job.salary}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Clock className="w-4 h-4" />
          <span>{formatDistanceToNow(new Date(job.createdAt))} ago</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <Link
          to={`/jobs/${job.id}`}
          className="text-sm font-bold flex items-center space-x-2 text-black hover:translate-x-1 transition-transform"
        >
          <span>View Details</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <button 
          onClick={handleSave}
          className={cn(
            "text-xs font-bold transition-colors flex items-center space-x-1 px-3 py-1.5 rounded-lg",
            isSaved ? "text-emerald-600 bg-emerald-50" : "text-gray-400 hover:text-black hover:bg-gray-50"
          )}
        >
          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          <span>{isSaved ? 'Saved' : 'Save Job'}</span>
        </button>
      </div>
    </motion.div>
  );
};
