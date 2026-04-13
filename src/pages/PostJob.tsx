import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { Briefcase, MapPin, Loader2, Send, ArrowLeft, Save } from 'lucide-react';
import { motion } from 'motion/react';

export const PostJob = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    category: 'Technology Jobs',
    type: 'Full-time',
    salary: '',
    description: '',
    experienceLevel: 'Fresh' as 'Fresh' | 'Experienced',
    deadline: '',
    requiredSkills: '',
    applicationProcess: {
      type: 'link' as 'link' | 'email' | 'phone' | 'telegram' | 'in-person' | 'google-form' | 'linkedin',
      value: '',
      instructions: ''
    }
  });

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      try {
        const job = await api.jobs.get(id);
        setFormData({
          title: job.title,
          company: job.company,
          location: job.location,
          category: job.category,
          type: job.type as any,
          salary: job.salary,
          description: job.description,
          experienceLevel: job.experienceLevel as any,
          deadline: job.deadline ? job.deadline.split('T')[0] : '',
          requiredSkills: job.requiredSkills.join(', '),
          applicationProcess: {
            type: job.applicationProcess.type as any,
            value: job.applicationProcess.value,
            instructions: job.applicationProcess.instructions || ''
          }
        });
      } catch (error) {
        console.error("Error fetching job for edit:", error);
        alert("Failed to load job details.");
        navigate('/dashboard');
      } finally {
        setInitialLoading(false);
      }
    };

    if (isEdit) {
      fetchJob();
    }
  }, [id, isEdit, navigate]);

  const cities = [
    'Addis Ababa', 'Bahir Dar', 'Hawasa', 'Dessie', 'Mekelle', 'Gondar', 'Remote'
  ];

  const categories = [
    'NGO Jobs', 'Banking & Finance Jobs', 'Technology Jobs', 'Teaching Jobs', 'Freelance Jobs', 'Other Jobs'
  ];

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (profile?.role !== 'employer' && profile?.role !== 'admin')) return;

    setError(null);
    const deadlineDate = new Date(formData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadlineDate < today && !isEdit) {
      setError("The deadline cannot be in the past.");
      return;
    }

    setLoading(true);
    try {
      const formattedData = {
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()).filter(s => s !== '')
      };
      
      if (isEdit && id) {
        await api.jobs.update(id, formattedData);
        alert("Job updated successfully!");
      } else {
        await api.jobs.create(formattedData);
        alert("Job posted successfully!");
      }
      navigate('/dashboard');
    } catch (error) {
      console.error("Error saving job:", error);
      alert("Failed to save job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
        <p className="text-gray-500 font-medium">Loading job details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-black mb-12 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white p-10 md:p-16 rounded-[40px] border border-gray-100 shadow-xl">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-4">{isEdit ? 'Edit Job Posting' : 'Post a New Role'}</h1>
          <p className="text-gray-500 font-medium">{isEdit ? 'Update the details of your job posting.' : 'Find the perfect candidate for your elite team.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold">
              {error}
            </div>
          )}
          <section className="space-y-8">
            <h3 className="text-xl font-bold border-b border-gray-100 pb-4">Basic Information</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Job Title</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="e.g. Senior Product Designer"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Company Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="Elite Solutions"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  >
                    <option value="">Select Location</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Job Category</label>
                <select
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Job Type</label>
                <select
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Remote</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Experience Level</label>
                <select
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as any })}
                >
                  <option value="Fresh">Fresh Job (0-1 years)</option>
                  <option value="Experienced">Experienced Job (1+ years)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Salary Range</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">ETB</span>
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="e.g. ETB 40k - 50k"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <h3 className="text-xl font-bold border-b border-gray-100 pb-4">Role Details</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Job Description</label>
              <textarea
                required
                rows={8}
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-3xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none resize-none"
                placeholder="Describe the role, requirements, and benefits..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </section>

          <section className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold">Application Details</h3>
              <p className="text-sm text-gray-400 font-medium">This information will only be visible to job seekers with an active premium subscription.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Application Deadline</label>
                <input
                  type="date"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="React, TypeScript, Node.js"
                  value={formData.requiredSkills}
                  onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Primary Application Method</label>
                <select
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none appearance-none"
                  value={formData.applicationProcess.type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    applicationProcess: { ...formData.applicationProcess, type: e.target.value as any } 
                  })}
                >
                  <option value="link">Website Application Link</option>
                  <option value="email">Email Address</option>
                  <option value="phone">Phone Number / WhatsApp</option>
                  <option value="telegram">Telegram Username</option>
                  <option value="google-form">Google Form Link</option>
                  <option value="linkedin">LinkedIn Job Post</option>
                  <option value="in-person">In-Person Address</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">
                  {formData.applicationProcess.type === 'link' && 'Website URL'}
                  {formData.applicationProcess.type === 'email' && 'Email Address'}
                  {formData.applicationProcess.type === 'phone' && 'Phone Number'}
                  {formData.applicationProcess.type === 'telegram' && 'Telegram Username'}
                  {formData.applicationProcess.type === 'google-form' && 'Google Form URL'}
                  {formData.applicationProcess.type === 'linkedin' && 'LinkedIn URL'}
                  {formData.applicationProcess.type === 'in-person' && 'Office Address'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder={
                    formData.applicationProcess.type === 'link' ? "https://..." :
                    formData.applicationProcess.type === 'email' ? "hr@company.com" :
                    formData.applicationProcess.type === 'phone' ? "+251..." :
                    formData.applicationProcess.type === 'telegram' ? "@username" :
                    formData.applicationProcess.type === 'google-form' ? "https://forms.gle/..." :
                    formData.applicationProcess.type === 'linkedin' ? "https://linkedin.com/jobs/..." : "Office location..."
                  }
                  value={formData.applicationProcess.value}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    applicationProcess: { ...formData.applicationProcess, value: e.target.value } 
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-4">Special Instructions (Optional)</label>
              <textarea
                rows={3}
                className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-3xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none resize-none"
                placeholder="e.g. Please mention 'EliteJobs' in your application..."
                value={formData.applicationProcess.instructions}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  applicationProcess: { ...formData.applicationProcess, instructions: e.target.value } 
                })}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-2xl font-bold text-xl hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                {isEdit ? <Save className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                <span>{isEdit ? 'Update Job' : 'Publish Job'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
