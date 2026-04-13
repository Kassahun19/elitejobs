import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Job, Application } from '../types';
import { useAuth } from '../AuthContext';
import { MapPin, Clock, Briefcase, ArrowLeft, ShieldAlert, CheckCircle2, Loader2, Send, X, Zap, Shield, Star, Check, ArrowRight, Bookmark, BookmarkCheck, Globe, Mail, Phone, MessageSquare, Map, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '../lib/utils';

export const JobDetails = () => {
  const { id } = useParams();
  const { user, profile, isAuthReady, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApplyDetails, setShowApplyDetails] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const isSaved = profile?.savedJobs?.includes(id || '');

  const handleSave = async () => {
    if (!profile || !id) return;
    try {
      await api.jobs.save(id);
      await refreshProfile();
    } catch (err) {
      console.error("Error saving job:", err);
    }
  };

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const jobData = await api.jobs.get(id);
        setJob(jobData);
      } catch (err: any) {
        console.error("Error fetching job:", err);
        setError(err.message || "Failed to load job details");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!profile || profile.subscription.status !== 'approved') {
      navigate('/pricing');
      return;
    }

    setApplying(true);
    try {
      await api.applications.create({
        jobId: id,
      });
      setApplied(true);
    } catch (err: any) {
      console.error("Error applying:", err);
      alert(err.message || "Failed to apply. Please check your subscription.");
    } finally {
      setApplying(false);
    }
  };

  if (loading || !isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
        <p className="text-gray-500 font-medium">Loading job details...</p>
      </div>
    );
  }

  if (error?.includes('limit reached')) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-4xl font-black mb-4 tracking-tight">Free Limit Reached</h2>
        <p className="text-gray-500 mb-12 max-w-xl mx-auto text-lg">
          You've used up your 5 free job views. Upgrade to a premium package to unlock unlimited job details and start applying to elite roles.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/pricing" className="bg-black text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-all">
            View Premium Packages
          </Link>
          <Link to="/jobs" className="text-gray-400 font-bold hover:text-black transition-colors">
            Back to Listings
          </Link>
        </div>
      </div>
    );
  }

  if (!job || error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">{error || "Job not found"}</h2>
        <Link to="/jobs" className="text-black font-bold hover:underline">Back to listings</Link>
      </div>
    );
  }

  const isPremium = profile?.role === 'admin' || 
    (profile?.subscription?.status === 'approved' && 
      (profile.subscription.type === 'lifetime' || 
       (profile.subscription.expiresAt && new Date(profile.subscription.expiresAt) > new Date())));
  const isDeadlinePassed = job?.deadline ? new Date(job.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/jobs" className="inline-flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-black mb-12 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Jobs</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <header>
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                <Briefcase className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight mb-1">{job.title}</h1>
                <p className="text-xl text-gray-500 font-medium">{job.company}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <span>{job.category}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-400">ETB</span>
                <span>{job.salary}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>Posted {formatDistanceToNow(new Date(job.createdAt))} ago</span>
              </div>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                job.experienceLevel === 'Fresh' 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                  : "bg-blue-50 text-blue-600 border-blue-100"
              )}>
                {job.experienceLevel === 'Fresh' ? 'Fresh Job' : 'Experienced Job'}
              </div>
              {isDeadlinePassed && (
                <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-red-50 text-red-600 border-red-100">
                  Expired
                </div>
              )}
            </div>
          </header>

          <section className="prose prose-lg max-w-none">
            <h3 className="text-2xl font-bold mb-6">About the Role</h3>
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap mb-12">
              {job.description}
            </div>

            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="mb-12">
                <h4 className="text-xl font-bold mb-4">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill, index) => (
                    <span key={index} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.deadline && (
              <div className={cn(
                "mb-12 p-6 rounded-3xl border flex items-center space-x-4",
                isDeadlinePassed ? "bg-red-50 border-red-100" : "bg-orange-50 border-orange-100"
              )}>
                <Clock className={cn("w-6 h-6", isDeadlinePassed ? "text-red-500" : "text-orange-500")} />
                <div>
                  <p className={cn("text-sm font-bold", isDeadlinePassed ? "text-red-900" : "text-orange-900")}>
                    {isDeadlinePassed ? 'Application Expired' : 'Application Deadline'}
                  </p>
                  <p className={cn("text-sm", isDeadlinePassed ? "text-red-700" : "text-orange-700")}>
                    {format(new Date(job.deadline), 'PPP')}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl sticky top-24">
            <h4 className="text-xl font-bold mb-6">How to Apply</h4>
            
            {!isPremium && !isDeadlinePassed && (
              <div className="mb-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start space-x-4">
                <ShieldAlert className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-bold text-blue-900 mb-1">Premium Feature</p>
                  <p className="text-xs text-blue-700 leading-relaxed">You need an active subscription to view the application process and apply for this job.</p>
                  <Link to="/pricing" className="inline-block mt-3 text-xs font-black text-blue-600 border-b border-blue-600">View Pricing</Link>
                </div>
              </div>
            )}

            {isDeadlinePassed ? (
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100 text-center">
                <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-red-900 mb-1">Deadline Passed</p>
                <p className="text-xs text-red-700 leading-relaxed">This job application is no longer accepting submissions as the deadline has passed.</p>
              </div>
            ) : showApplyDetails && job.applicationProcess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Application Method</p>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                      {job.applicationProcess.type === 'link' && <Globe className="text-white w-6 h-6" />}
                      {job.applicationProcess.type === 'email' && <Mail className="text-white w-6 h-6" />}
                      {job.applicationProcess.type === 'phone' && <Phone className="text-white w-6 h-6" />}
                      {job.applicationProcess.type === 'telegram' && <MessageSquare className="text-white w-6 h-6" />}
                      {job.applicationProcess.type === 'in-person' && <Map className="text-white w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Apply via {job.applicationProcess.type}</p>
                      <p className="font-bold text-lg break-all">{job.applicationProcess.value}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    {job.applicationProcess.type === 'link' && (
                      <a 
                        href={job.applicationProcess.value.startsWith('http') ? job.applicationProcess.value : `https://${job.applicationProcess.value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-emerald-600 transition-all"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>Open Application Link</span>
                      </a>
                    )}
                    {job.applicationProcess.type === 'email' && (
                      <a 
                        href={`mailto:${job.applicationProcess.value}`}
                        className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-600 transition-all"
                      >
                        <Mail className="w-5 h-5" />
                        <span>Send Email</span>
                      </a>
                    )}
                    {job.applicationProcess.type === 'phone' && (
                      <a 
                        href={`tel:${job.applicationProcess.value}`}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-emerald-600 transition-all"
                      >
                        <Phone className="w-5 h-5" />
                        <span>Call Now</span>
                      </a>
                    )}
                    {job.applicationProcess.type === 'telegram' && (
                      <a 
                        href={`https://t.me/${job.applicationProcess.value.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-[#229ED9] text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:opacity-90 transition-all"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>Open Telegram</span>
                      </a>
                    )}
                  </div>
                  {job.applicationProcess.instructions && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Instructions</p>
                      <div className="space-y-2">
                        {job.applicationProcess.instructions.split('\n').map((line, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <p className="text-sm text-gray-600 leading-relaxed">{line}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleApply}
                  disabled={applying || applied}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center space-x-2",
                    applied ? "bg-emerald-500 text-white" : "bg-black text-white hover:bg-gray-800"
                  )}
                >
                  {applying ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      {applied ? <CheckCircle2 className="w-6 h-6" /> : <Send className="w-5 h-5" />}
                      <span>{applied ? 'Applied Successfully' : 'Confirm Application'}</span>
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => isPremium ? setShowApplyDetails(true) : setShowUpgradePrompt(true)}
                className={cn(
                  "w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center space-x-2",
                  "bg-black text-white hover:bg-gray-800"
                )}
              >
                <Send className="w-5 h-5" />
                <span>Proceed to Apply</span>
              </button>
            )}

            <button 
              onClick={handleSave}
              className={cn(
                "w-full mt-4 py-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 border",
                isSaved 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                  : "border-gray-100 hover:bg-gray-50 text-black"
              )}
            >
              {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              <span>{isSaved ? 'Saved' : 'Save for Later'}</span>
            </button>

            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-xs text-center text-gray-400 font-medium">
                By applying, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Upgrade to <span className="text-emerald-600 italic">Premium</span></h2>
                  <p className="text-gray-500 font-medium">Get instant access to application details and start your elite career.</p>
                </div>
                <button 
                  onClick={() => setShowUpgradePrompt(false)}
                  className="p-3 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      id: 'basic',
                      name: 'Basic Access',
                      price: '200',
                      duration: '1 Month',
                      icon: Zap,
                      color: 'bg-blue-50 text-blue-600',
                      features: ['Full access to all job posts', 'Standard job alerts']
                    },
                    {
                      id: 'standard',
                      name: 'Standard Access',
                      price: '500',
                      duration: '3 Months',
                      icon: Shield,
                      color: 'bg-emerald-50 text-emerald-600',
                      features: ['Unlimited applications', 'Priority job alerts'],
                      popular: true
                    },
                    {
                      id: 'lifetime',
                      name: 'Lifetime Access',
                      price: '1,000',
                      duration: 'Lifetime',
                      icon: Star,
                      color: 'bg-black text-white',
                      features: ['Unlimited applications', 'VIP support']
                    }
                  ].map((plan) => (
                    <div key={plan.id} className={cn(
                      "p-6 rounded-3xl border border-gray-100 flex flex-col h-full relative",
                      plan.popular && "ring-2 ring-emerald-500 ring-offset-2"
                    )}>
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          Most Popular
                        </span>
                      )}
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", plan.color)}>
                        <plan.icon className="w-6 h-6" />
                      </div>
                      <h4 className="font-black text-lg mb-1">{plan.name}</h4>
                      <div className="flex items-baseline space-x-1 mb-4">
                        <span className="text-xl font-black">ETB {plan.price}</span>
                        <span className="text-gray-400 text-xs font-medium">/ {plan.duration}</span>
                      </div>
                      <ul className="space-y-2 mb-6 flex-grow">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="text-emerald-500 font-bold">✔️</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Link 
                        to="/pricing" 
                        className={cn(
                          "w-full py-3 rounded-xl text-center font-bold text-sm transition-all",
                          plan.id === 'lifetime' ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
                        )}
                      >
                        Select Plan
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <ShieldAlert className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Secure Payment</p>
                    <p className="text-xs text-gray-400">Your data is always protected.</p>
                  </div>
                </div>
                <Link 
                  to="/pricing" 
                  className="flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all"
                >
                  <span>Go to Pricing Page</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
