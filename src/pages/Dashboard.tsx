import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Job, Application } from '../types';
import { Briefcase, FileText, Settings, User, CreditCard, Plus, UserPlus, X, Loader2, ChevronRight, Clock, CheckCircle, XCircle, Bookmark, Bell, Users, BarChart, Building, Globe, Phone, Mail, Save, Trash2, ExternalLink, Edit, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JobCard } from '../components/JobCard';

export const Dashboard = () => {
  const { user, profile, refreshProfile, isAuthReady } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [adminReceipts, setAdminReceipts] = useState<any[]>([]);
  const [myReceipts, setMyReceipts] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    freeJobViewLimit: 5,
    platformCommission: 10,
    maintenanceMode: 'off'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [botTokenInput, setBotTokenInput] = useState('');
  const [botTestChatId, setBotTestChatId] = useState('');
  const [botTestMessage, setBotTestMessage] = useState('Hello from EliteJobs Ethiopia! Your bot is now active.');
  const [isBotActionLoading, setIsBotActionLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Profile Edit State
  const [editProfile, setEditProfile] = useState({
    name: '',
    email: '',
    displayName: '',
    bio: '',
    skills: '',
    phoneNumber: '',
    companyName: '',
    companyLogo: '',
    resumeUrl: '',
    website: '',
    linkedin: '',
    twitter: '',
    github: ''
  });

  useEffect(() => {
    if (profile) {
      setEditProfile({
        name: profile.name || profile.displayName || '',
        email: profile.email || '',
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        skills: profile.skills?.join(', ') || '',
        phoneNumber: profile.phoneNumber || '',
        companyName: profile.companyName || '',
        companyLogo: profile.companyLogo || '',
        resumeUrl: profile.resumeUrl || '',
        website: profile.socialLinks?.website || '',
        linkedin: profile.socialLinks?.linkedin || '',
        twitter: profile.socialLinks?.twitter || '',
        github: profile.socialLinks?.github || ''
      });
    }
  }, [profile]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'seeker'
  });
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'seeker'
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthReady) return;
      if (!user || !profile) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        if (profile.role === 'seeker') {
          const [apps, recs, saved, notes] = await Promise.all([
            api.applications.myApplications(),
            api.subscription.myReceipts(),
            api.jobs.savedJobs(),
            api.notifications.list()
          ]);
          setApplications(apps);
          setMyReceipts(recs);
          setSavedJobs(saved);
          setNotifications(notes);
        } else if (profile.role === 'employer') {
          const [jobs, apps, recs, notes] = await Promise.all([
            api.jobs.myJobs(),
            api.employer.listApplicants(),
            api.subscription.myReceipts(),
            api.notifications.list()
          ]);
          setMyJobs(jobs);
          setApplicants(apps);
          setMyReceipts(recs);
          setNotifications(notes);
        } else if (profile.role === 'admin') {
          const [allJobs, allRecs, users, stats, notes, adminNotes, settings] = await Promise.all([
            api.jobs.list(),
            api.admin.listReceipts(),
            api.admin.listUsers(),
            api.admin.getAnalytics(),
            api.notifications.list(),
            api.admin.listNotifications(),
            api.admin.getSystemSettings()
          ]);
          setMyJobs(allJobs);
          setAdminReceipts(allRecs);
          setAllUsers(users);
          setAnalytics(stats);
          setNotifications([...notes, ...adminNotes]);
          if (settings) setSystemSettings(settings);
          
          // Fetch Bot Status
          try {
            const botRes = await fetch('/api/bot-status');
            if (botRes.ok) {
              const botData = await botRes.json();
              setBotStatus(botData);
            }
          } catch (e) {
            console.error("Failed to fetch bot status", e);
          }
        }
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, profile, isAuthReady]);

  const handleApprove = async (id: string) => {
    const receipt = adminReceipts.find(r => r.id === id);
    if (receipt && receipt.status !== 'pending') {
      alert(`This receipt has already been ${receipt.status}.`);
      return;
    }
    try {
      await api.admin.approveReceipt(id);
      setAdminReceipts(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      alert("Receipt approved! User now has access.");
      refreshProfile();
    } catch (error) {
      console.error("Error approving receipt:", error);
    }
  };

  const handleReject = async (id: string) => {
    const receipt = adminReceipts.find(r => r.id === id);
    if (receipt && receipt.status !== 'pending') {
      alert(`This receipt has already been ${receipt.status}.`);
      return;
    }
    try {
      await api.admin.rejectReceipt(id);
      setAdminReceipts(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
      alert("Receipt rejected.");
      refreshProfile();
    } catch (error) {
      console.error("Error rejecting receipt:", error);
    }
  };

  const handleUpdateSettings = async () => {
    setIsSaving(true);
    try {
      await api.admin.updateSystemSettings(systemSettings);
      alert("System settings updated successfully!");
    } catch (err: any) {
      alert("Failed to update settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/admin/export-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elite-jobs-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Failed to export data: " + err.message);
    }
  };

  const handleGenerateResume = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(profile?.name || profile?.displayName || 'Resume', 20, 20);
    doc.setFontSize(12);
    doc.text(profile?.email || '', 20, 30);
    doc.text(profile?.phoneNumber || '', 20, 35);
    
    doc.line(20, 40, 190, 40);
    
    doc.setFontSize(16);
    doc.text('Professional Summary', 20, 50);
    doc.setFontSize(12);
    const splitBio = doc.splitTextToSize(profile?.bio || 'No bio provided.', 170);
    doc.text(splitBio, 20, 60);
    
    doc.setFontSize(16);
    doc.text('Skills', 20, 90);
    doc.setFontSize(12);
    doc.text(profile?.skills?.join(', ') || 'No skills listed.', 20, 100);
    
    doc.save(`${profile?.name || 'resume'}.pdf`);
  };

  const handleJobModeration = async (jobId: string, approve: boolean) => {
    try {
      if (approve) {
        await api.admin.approveJob(jobId);
      } else {
        await api.admin.rejectJob(jobId);
      }
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, isApproved: approve } : j));
      alert(approve ? "Job approved!" : "Job rejected.");
    } catch (error) {
      console.error("Error moderating job:", error);
      alert("Failed to moderate job. Please try again.");
    }
  };

  const handleUserStatus = async (userId: string, ban: boolean) => {
    try {
      await api.admin.updateUserStatus(userId, ban);
      setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, isBanned: ban } : u));
      alert(ban ? "User banned." : "User unbanned.");
    } catch (error: any) {
      console.error("Error updating user status:", error);
      alert(error.message || "Failed to update user status");
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserForm({
      email: user.email,
      password: '',
      displayName: user.name || user.displayName || '',
      role: user.role
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      const updatedUser = await api.admin.updateUser(selectedUser.uid, editUserForm);
      setAllUsers(prev => prev.map(u => u.uid === selectedUser.uid ? { ...u, ...updatedUser } : u));
      if (selectedUser.uid === user?.uid) {
        await refreshProfile();
      }
      setIsEditUserModalOpen(false);
      alert("User updated successfully!");
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert(error.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    try {
      await api.admin.deleteUser(userId);
      setAllUsers(prev => prev.filter(u => u.uid !== userId));
      alert("User deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert(error.message || "Failed to delete user");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdUser = await api.admin.createUser(newUserForm);
      setAllUsers(prev => [...prev, createdUser]);
      setIsAddUserModalOpen(false);
      setNewUserForm({ email: '', password: '', displayName: '', role: 'seeker' });
      alert("User created successfully!");
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(error.message || "Failed to create user");
    }
  };

  const handleUpdateSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // In a real app, this would call an API
      setTimeout(() => {
        setIsSaving(false);
        alert("System settings updated successfully!");
      }, 1000);
    } catch (err) {
      setIsSaving(false);
      alert("Failed to update system settings");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.admin.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
      await api.admin.clearAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      await api.auth.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const skillsArray = editProfile.skills.split(',').map(s => s.trim()).filter(s => s !== '');
      await api.auth.updateProfile({
        ...editProfile,
        skills: skillsArray,
        socialLinks: {
          website: editProfile.website,
          linkedin: editProfile.linkedin,
          twitter: editProfile.twitter,
          github: editProfile.github
        }
      });
      await refreshProfile();
      alert("Profile updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleUpdateApplicationStatus = async (id: string, status: string) => {
    try {
      await api.applications.updateStatus(id, status);
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      alert(`Application marked as ${status}`);
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  const downloadReceiptsPDF = () => {
    const doc = new jsPDF();
    
    // Sort receipts by date (oldest first)
    const sortedReceipts = [...adminReceipts].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Add Title
    doc.setFontSize(20);
    doc.text('Elite Jobs Ethiopia - Payment Receipts Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 30);
    doc.text(`Total Receipts: ${sortedReceipts.length}`, 14, 36);

    // Create Table
    const tableData = sortedReceipts.map(r => [
      r.seekerEmail,
      r.packageType.toUpperCase(),
      r.status.toUpperCase(),
      format(new Date(r.createdAt), 'MMM d, yyyy HH:mm'),
      r.id
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['User Email', 'Package', 'Status', 'Pay Date', 'Receipt ID']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 45 },
    });

    // Save PDF
    doc.save(`EliteJobs_Receipts_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading || !isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
        <p className="text-gray-500 font-medium">Preparing your elite dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-500">{error}</h2>
        <button 
          onClick={() => window.location.reload()} 
          className="text-black font-bold hover:underline"
        >
          Try refreshing the page
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Hello, {profile?.displayName}</h1>
          <p className="text-gray-500 font-medium capitalize">{profile?.role} Dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              profile?.subscription.status === 'approved' ? "bg-emerald-50 text-emerald-500" : 
              profile?.subscription.status === 'expired' ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
            )}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Subscription</p>
              <div className="flex flex-col">
                <p className="text-sm font-bold capitalize">{profile?.subscription.type} ({profile?.subscription.status})</p>
                {profile?.subscription.status === 'approved' && (
                  profile?.subscription.type === 'lifetime' ? (
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Lifetime Access</p>
                  ) : profile?.subscription.expiresAt && (
                    <p className="text-[10px] text-gray-500 font-medium">Expires: {format(new Date(profile.subscription.expiresAt), 'MMM d, yyyy')}</p>
                  )
                )}
              </div>
            </div>
          </div>
          {profile?.role === 'admin' && botStatus && (
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                botStatus.status === 'Running' ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
              )}>
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Bot Status</p>
                <p className="text-sm font-bold">{botStatus.status}</p>
              </div>
            </div>
          )}
          {profile?.role === 'employer' && (
            <Link to="/post-job" className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-colors">
              <Plus className="w-5 h-5" />
              <span>Post Job</span>
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
              activeTab === 'overview' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
            )}
          >
            <BarChart className="w-5 h-5" />
            <span>Overview</span>
          </button>

          {/* Seeker Tabs */}
          {profile?.role === 'seeker' && (
            <>
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'profile' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <User className="w-5 h-5" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'applications' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <FileText className="w-5 h-5" />
                <span>Applications</span>
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'saved' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Bookmark className="w-5 h-5" />
                <span>Saved Jobs</span>
              </button>
              <button
                onClick={() => setActiveTab('resume-builder')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'resume-builder' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <FileText className="w-5 h-5" />
                <span>Resume Builder</span>
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'preferences' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Globe className="w-5 h-5" />
                <span>Job Preferences</span>
              </button>
              {profile && !profile.isVerified && (
                <button
                  onClick={() => setActiveTab('verify-email')}
                  className={cn(
                    "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                    activeTab === 'verify-email' ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-orange-600 hover:bg-orange-50"
                  )}
                >
                  <Bell className="w-5 h-5" />
                  <span>Verify Email</span>
                </button>
              )}
            </>
          )}

          {/* Employer Tabs */}
          {profile?.role === 'employer' && (
            <>
              <button
                onClick={() => setActiveTab('company')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'company' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Building className="w-5 h-5" />
                <span>Company Profile</span>
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'jobs' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Briefcase className="w-5 h-5" />
                <span>My Jobs</span>
              </button>
              <button
                onClick={() => setActiveTab('applicants')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'applicants' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Users className="w-5 h-5" />
                <span>Applicants</span>
              </button>
              <button
                onClick={() => setActiveTab('branding')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'branding' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Globe className="w-5 h-5" />
                <span>Branding</span>
              </button>
              {profile && !profile.isVerified && (
                <button
                  onClick={() => setActiveTab('verify-email')}
                  className={cn(
                    "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                    activeTab === 'verify-email' ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-orange-600 hover:bg-orange-50"
                  )}
                >
                  <Bell className="w-5 h-5" />
                  <span>Verify Email</span>
                </button>
              )}
            </>
          )}

          {/* Admin Tabs */}
          {profile?.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('analytics')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'analytics' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <BarChart className="w-5 h-5" />
                <span>Platform Stats</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'users' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Users className="w-5 h-5" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => setActiveTab('system-settings')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'system-settings' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Settings className="w-5 h-5" />
                <span>System Configuration</span>
              </button>
              <button
                onClick={() => setActiveTab('bot')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'bot' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Globe className="w-5 h-5" />
                <span>Telegram Bot</span>
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'jobs' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Briefcase className="w-5 h-5" />
                <span>All Jobs</span>
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'receipts' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <FileText className="w-5 h-5" />
                <span>Receipt Approvals</span>
              </button>
              <button
                onClick={() => setActiveTab('notification-log')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'notification-log' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Bell className="w-5 h-5" />
                <span>Notification Log</span>
              </button>
              <button
                onClick={() => setActiveTab('system-settings')}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                  activeTab === 'system-settings' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )}
              >
                <Settings className="w-5 h-5" />
                <span>System Settings</span>
              </button>
            </>
          )}

          {/* Common Tabs */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all",
              activeTab === 'notifications' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
            )}
          >
            <div className="flex items-center space-x-4">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </div>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          {profile?.role !== 'admin' && (
            <button
              onClick={() => setActiveTab('receipts')}
              className={cn(
                "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                activeTab === 'receipts' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
              )}
            >
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
              activeTab === 'settings' ? "bg-black text-white shadow-lg shadow-black/10" : "text-gray-500 hover:bg-gray-50 hover:text-black"
            )}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Subscription</h3>
                <p className="text-2xl font-black capitalize">{profile?.subscription.type}</p>
                <div className="flex flex-col mt-2">
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit",
                    profile?.subscription.status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                    profile?.subscription.status === 'expired' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {profile?.subscription.status}
                  </span>
                  {profile?.subscription.status === 'approved' && (
                    profile?.subscription.type === 'lifetime' ? (
                      <p className="text-[10px] text-emerald-600 mt-2 font-black uppercase tracking-widest">Lifetime Access</p>
                    ) : profile?.subscription.expiresAt && (
                      <p className="text-[10px] text-gray-500 mt-2 font-medium">Valid until {format(new Date(profile.subscription.expiresAt), 'PPP')}</p>
                    )
                  )}
                </div>
              </div>
              {profile?.role === 'seeker' && (
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Free Credits</h3>
                  <p className="text-2xl font-black">{Math.max(0, 5 - (profile?.viewedJobsCount || 0))} Left</p>
                </div>
              )}
              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {profile?.role === 'seeker' ? 'Applications' : 'Jobs'}
                </h3>
                <p className="text-2xl font-black">
                  {profile?.role === 'seeker' ? applications.length : myJobs.length}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'profile' && profile?.role === 'seeker' && (
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center overflow-hidden">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black">{profile.name}</h2>
                  <p className="text-gray-500 font-medium">{profile.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Bio</span>
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{profile.bio || "No bio added yet."}</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Skills</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.length ? profile.skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium border border-gray-100">
                        {skill}
                      </span>
                    )) : <p className="text-gray-400 text-sm">No skills added yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resume-builder' && profile?.role === 'seeker' && (
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-12 space-y-12 text-center">
              <div className="w-24 h-24 bg-purple-50 rounded-[40px] flex items-center justify-center mx-auto mb-8">
                <FileText className="w-12 h-12 text-purple-600" />
              </div>
              <div className="max-w-xl mx-auto space-y-4">
                <h2 className="text-4xl font-black">Resume Builder</h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Generate a professional PDF resume instantly using your profile information. 
                  Make sure your bio, skills, and contact details are up to date in settings.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto text-left">
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <h3 className="font-bold mb-2 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Profile Data</span>
                  </h3>
                  <p className="text-sm text-gray-500">Automatically pulls your bio, skills, and contact info.</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <h3 className="font-bold mb-2 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Instant PDF</span>
                  </h3>
                  <p className="text-sm text-gray-500">Download a clean, professional PDF in one click.</p>
                </div>
              </div>

              <button
                onClick={handleGenerateResume}
                className="bg-black text-white px-12 py-5 rounded-[32px] font-black text-lg hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center space-x-4 mx-auto"
              >
                <Save className="w-6 h-6" />
                <span>Generate & Download PDF</span>
              </button>
            </div>
          )}

          {activeTab === 'company' && profile?.role === 'employer' && (
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center overflow-hidden">
                  {profile.companyLogo ? (
                    <img src={profile.companyLogo} alt={profile.companyName} className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black">{profile.companyName || profile.name}</h2>
                  <p className="text-gray-500 font-medium">{profile.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Company Bio</h3>
                  <p className="text-gray-600 leading-relaxed">{profile.bio || "No company bio added yet."}</p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Contact Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-600 flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phoneNumber || "Not provided"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && profile?.role === 'employer' && (
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Company Branding</h2>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  Edit in Settings
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                  <div className="w-full aspect-square bg-gray-50 rounded-[40px] border border-gray-100 flex items-center justify-center overflow-hidden">
                    {profile.companyLogo ? (
                      <img src={profile.companyLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-16 h-16 text-gray-200" />
                    )}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Social Presence</h3>
                    <div className="space-y-2">
                      {profile.socialLinks?.website && (
                        <a href={profile.socialLinks.website} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors">
                          <Globe className="w-4 h-4" />
                          <span className="text-sm font-medium">Website</span>
                        </a>
                      )}
                      {profile.socialLinks?.linkedin && (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors">
                          <ExternalLink className="w-4 h-4" />
                          <span className="text-sm font-medium">LinkedIn</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xl font-black">About {profile.companyName || 'the Company'}</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      {profile.bio || "No company description provided yet. Head over to settings to add one."}
                    </p>
                  </div>
                  
                  <div className="p-8 bg-blue-50 rounded-[32px] border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-2">Why Branding Matters?</h4>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Companies with complete profiles and clear branding receive up to 40% more applications. 
                      Make sure to include your logo, a compelling bio, and links to your website and social media.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && profile?.role === 'seeker' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-black">Job Preferences</h2>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Preferred Categories</label>
                    <div className="flex flex-wrap gap-3">
                      {['NGO Jobs', 'Banking & Finance Jobs', 'Technology Jobs', 'Teaching Jobs', 'Freelance Jobs', 'Other Jobs'].map(cat => (
                        <button 
                          key={cat}
                          className="px-4 py-2 bg-gray-50 hover:bg-black hover:text-white rounded-xl text-sm font-bold transition-all border border-gray-100"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Preferred Locations</label>
                    <div className="flex flex-wrap gap-3">
                      {['Addis Ababa', 'Bahir Dar', 'Hawasa', 'Dessie', 'Mekelle', 'Gondar', 'Remote'].map(loc => (
                        <button 
                          key={loc}
                          className="px-4 py-2 bg-gray-50 hover:bg-black hover:text-white rounded-xl text-sm font-bold transition-all border border-gray-100"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                  <p className="text-sm text-gray-500 font-medium">We'll use these to personalize your job feed and notifications.</p>
                  <button className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all">Save Preferences</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system-settings' && profile?.role === 'admin' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-black">System Configuration</h2>
              <form onSubmit={handleUpdateSystemSettings} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Free Job View Limit</label>
                    <input
                      type="number"
                      defaultValue={5}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Platform Commission (%)</label>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Maintenance Mode</label>
                    <select className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium">
                      <option value="off">Off</option>
                      <option value="on">On</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-black text-white px-12 py-4 rounded-2xl font-black hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save System Config'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Notifications</h2>
                <button 
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  className="text-sm font-bold text-gray-400 hover:text-black"
                >
                  Mark all as read
                </button>
              </div>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {notifications.length > 0 ? notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "p-6 flex items-start space-x-4 transition-colors",
                      !notification.read ? "bg-blue-50/30" : "hover:bg-gray-50"
                    )}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      notification.type === 'application_status' ? "bg-emerald-50 text-emerald-600" : 
                      notification.type === 'new_job' ? "bg-purple-50 text-purple-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {notification.type === 'new_job' ? <Briefcase className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{notification.title}</p>
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                        {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    )}
                  </div>
                )) : (
                  <div className="p-24 text-center">
                    <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">No notifications yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'applicants' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black">Applicants</h2>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Candidate</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Job Title</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {applicants.length > 0 ? applicants.map(app => (
                        <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="font-bold">{app.seekerName}</div>
                            <div className="text-xs text-gray-400">{app.seekerEmail}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-medium">{app.jobTitle}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              app.status === 'accepted' ? "bg-emerald-50 text-emerald-600" :
                              app.status === 'rejected' ? "bg-red-50 text-red-600" : 
                              app.status === 'reviewed' ? "bg-amber-50 text-amber-600" :
                              "bg-blue-50 text-blue-600"
                            )}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2">
                              {(app.status === 'pending' || app.status === 'reviewed') && (
                                <>
                                  {app.status === 'pending' && (
                                    <button 
                                      onClick={() => handleUpdateApplicationStatus(app.id, 'reviewed')}
                                      title="Mark as Reviewed"
                                      className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleUpdateApplicationStatus(app.id, 'accepted')}
                                    title="Accept Application"
                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateApplicationStatus(app.id, 'rejected')}
                                    title="Reject Application"
                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedApplicant(app);
                                  setIsApplicantModalOpen(true);
                                }}
                                className="text-xs font-bold text-gray-400 hover:text-black"
                              >
                                View Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-24 text-center">
                            <p className="text-gray-400 font-medium">No applicants found.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin-notifications' && profile?.role === 'admin' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Notification Log</h2>
                <button 
                  onClick={handleClearAllNotifications}
                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All Logs</span>
                </button>
              </div>
              
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {notifications.filter(n => n.type === 'payment').length > 0 ? (
                    notifications.filter(n => n.type === 'payment').map((note) => (
                      <div key={note.id} className="px-8 py-6 flex items-start justify-between hover:bg-gray-50 transition-colors group">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-lg">{note.userName}</span>
                              <span className="text-xs text-gray-400 font-medium">• {note.userEmail}</span>
                            </div>
                            <p className="text-gray-600 leading-relaxed">{note.message}</p>
                            <div className="flex items-center space-x-4 pt-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(note.createdAt), 'MMM d, yyyy • h:mm a')}</span>
                              </span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                {note.packageType}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteNotification(note.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-24 text-center">
                      <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-medium">No payment notifications yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bot' && profile?.role === 'admin' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Telegram Bot Status</h2>
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/bot-status');
                      if (res.ok) setBotStatus(await res.json());
                    } catch (e) {}
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                >
                  <Clock className="w-4 h-4" />
                  <span>Refresh Status</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Current Status</h3>
                  <p className={cn(
                    "text-2xl font-black",
                    botStatus?.status === 'Running' ? "text-emerald-600" : "text-red-600"
                  )}>
                    {botStatus?.status || 'Unknown'}
                  </p>
                  {botStatus?.lastError && (
                    <p className="text-xs text-red-500 mt-2 font-medium">{botStatus.lastError}</p>
                  )}
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Mode</h3>
                  <p className="text-2xl font-black">
                    {botStatus?.hasWebhook ? 'Webhook' : botStatus?.isPolling ? 'Polling' : 'Inactive'}
                  </p>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Token</h3>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded-lg mt-2">
                    {botStatus?.tokenPreview || 'Not Set'}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-6">
                <h3 className="text-xl font-bold">Diagnostic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">App URL</p>
                      <p className="font-medium">{botStatus?.appUrl}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Node Environment</p>
                      <p className="font-medium">{botStatus?.nodeEnv}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Check</p>
                      <p className="font-medium">{botStatus?.timestamp ? format(new Date(botStatus.timestamp), 'PPpp') : 'Never'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-2">Troubleshooting</h4>
                  <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside mb-4">
                    <li>Ensure <b>TELEGRAM_BOT_TOKEN</b> is correctly set in environment variables.</li>
                    <li>If using Webhooks, <b>APP_URL</b> must be a public HTTPS URL.</li>
                    <li>Check server logs for "409 Conflict" if polling fails.</li>
                    <li>The bot runs as part of the server process. If the server stops, the bot stops.</li>
                  </ul>
                  <button 
                    onClick={async () => {
                      if (!window.confirm("This will attempt to set the Telegram webhook to the current App URL. Proceed?")) return;
                      try {
                        const res = await api.admin.setupBotWebhook({ url: window.location.origin });
                        if (res.ok) {
                          alert("Webhook setup triggered successfully!");
                          const botRes = await fetch('/api/bot-status');
                          if (botRes.ok) setBotStatus(await botRes.json());
                        } else {
                          const err = await res.json();
                          alert("Failed: " + (err.error || "Unknown error"));
                        }
                      } catch (e: any) {
                        alert("Error: " + e.message);
                      }
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all text-sm"
                  >
                    Force Webhook Setup
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-6">
                    <h3 className="text-xl font-bold">Re-initialize Bot</h3>
                    <p className="text-sm text-gray-500">If the bot is not responding, you can manually provide a token to re-initialize it. This will restart the bot process with the new token.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Bot Token</label>
                        <input 
                          type="text" 
                          value={botTokenInput}
                          onChange={(e) => setBotTokenInput(e.target.value)}
                          placeholder="Enter Telegram Bot Token"
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-2 focus:ring-black transition-all"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                          if (!botTokenInput) return alert("Please enter a token");
                          setIsBotActionLoading(true);
                          try {
                            await api.admin.reinitializeBot(botTokenInput);
                            alert("Bot re-initialization triggered! Please wait a few seconds and refresh status.");
                            setBotTokenInput('');
                          } catch (err: any) {
                            alert(err.message);
                          } finally {
                            setIsBotActionLoading(false);
                          }
                        }}
                        disabled={isBotActionLoading}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                      >
                        {isBotActionLoading ? "Processing..." : "Re-initialize Bot"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-6">
                    <h3 className="text-xl font-bold">Send Test Message</h3>
                    <p className="text-sm text-gray-500">Verify the bot's connectivity by sending a test message to a specific Chat ID.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Chat ID</label>
                        <input 
                          type="text" 
                          value={botTestChatId}
                          onChange={(e) => setBotTestChatId(e.target.value)}
                          placeholder="Enter Telegram Chat ID"
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-2 focus:ring-black transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Message</label>
                        <textarea 
                          value={botTestMessage}
                          onChange={(e) => setBotTestMessage(e.target.value)}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-medium focus:ring-2 focus:ring-black transition-all h-24 resize-none"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                          if (!botTestChatId || !botTestMessage) return alert("Please enter Chat ID and message");
                          setIsBotActionLoading(true);
                          try {
                            await api.admin.sendBotTest(botTestChatId, botTestMessage);
                            alert("Test message sent successfully!");
                          } catch (err: any) {
                            alert(err.message);
                          } finally {
                            setIsBotActionLoading(false);
                          }
                        }}
                        disabled={isBotActionLoading}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {isBotActionLoading ? "Sending..." : "Send Test Message"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && profile?.role === 'admin' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-black">Platform Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Users</p>
                  <p className="text-3xl font-black">{analytics?.totalUsers || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Jobs</p>
                  <p className="text-3xl font-black">{analytics?.totalJobs || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Applications</p>
                  <p className="text-3xl font-black">{analytics?.totalApplications || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue</p>
                  <p className="text-3xl font-black">{analytics?.revenue || 0} ETB</p>
                </div>
              </div>
              
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
                <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {analytics?.recentReceipts.map(receipt => (
                    <div key={receipt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-bold">{receipt.seekerEmail}</p>
                          <p className="text-xs text-gray-400">{receipt.packageType} Package</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black">{receipt.packageType === 'basic' ? 200 : receipt.packageType === 'standard' ? 500 : 1000} ETB</p>
                        <p className="text-[10px] font-bold uppercase text-gray-400">{format(new Date(receipt.createdAt), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && profile?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">User Management</h2>
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="bg-black text-white px-6 py-2 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              </div>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">User Name</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">User Email</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Role</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Subscription</th>
                        <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="font-bold">{user.name || user.displayName}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                              user.role === 'admin' ? "bg-purple-50 text-purple-600" :
                              user.role === 'employer' ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-bold capitalize">{user.subscription.type}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">{user.subscription.status}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="text-xs font-bold text-gray-400 hover:text-black"
                              >
                                Edit User
                              </button>
                              <button 
                                onClick={() => handleUserStatus(user.uid, !user.isBanned)}
                                className={cn(
                                  "text-xs font-bold px-3 py-1 rounded-lg transition-colors",
                                  user.isBanned ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                                )}
                              >
                                {user.isBanned ? 'Unban' : 'Ban'}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.uid)}
                                className="text-xs font-bold px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Saved Jobs</h2>
                <p className="text-sm text-gray-500 font-medium">{savedJobs.length} opportunities</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {savedJobs.length === 0 && (
                <div className="py-24 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                  <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No saved jobs yet</h3>
                  <p className="text-gray-500">Jobs you save will appear here for quick access.</p>
                  <Link to="/jobs" className="inline-block mt-6 text-black font-bold hover:underline">Browse Jobs</Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'receipts' && profile?.role === 'seeker' && (
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50">
                <h3 className="text-xl font-bold">My Receipt History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Package</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Submitted Date</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {myReceipts.length > 0 ? myReceipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="capitalize font-bold">{receipt.packageType}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-medium text-gray-500">{format(new Date(receipt.createdAt), 'MMM d, yyyy')}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            receipt.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                            receipt.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {receipt.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <button
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setIsReceiptModalOpen(true);
                            }}
                            className="text-xs font-bold text-gray-400 hover:text-black"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-24 text-center">
                          <p className="text-gray-400 font-medium">No receipt history found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'receipts' && profile?.role === 'admin' && (
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xl font-bold">Payment Receipts for Approval</h3>
                <button
                  onClick={downloadReceiptsPDF}
                  className="bg-black text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF Report</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">User</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Package</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {adminReceipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-bold">{receipt.seekerEmail}</div>
                          <div className="text-xs text-gray-400">{format(new Date(receipt.createdAt), 'MMM d, yyyy')}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="capitalize font-medium">{receipt.packageType}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            receipt.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                            receipt.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {receipt.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-3">
                            {receipt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(receipt.id)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleReject(receipt.id)}
                                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setSelectedReceipt(receipt);
                                setIsReceiptModalOpen(true);
                              }}
                              className="text-xs font-bold text-gray-400 hover:text-black"
                            >
                              View Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'system-settings' && profile?.role === 'admin' && (
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50">
                <h3 className="text-xl font-bold">System Configuration</h3>
                <p className="text-sm text-gray-400 mt-1">Manage platform-wide settings and limits.</p>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Free Job View Limit</span>
                      <input
                        type="number"
                        value={systemSettings.freeJobViewLimit}
                        onChange={(e) => setSystemSettings({ ...systemSettings, freeJobViewLimit: parseInt(e.target.value) })}
                        className="mt-2 w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                      />
                      <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">Number of jobs a free user can view before being prompted to upgrade.</p>
                    </label>
                  </div>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Platform Commission (%)</span>
                      <input
                        type="number"
                        value={systemSettings.platformCommission}
                        onChange={(e) => setSystemSettings({ ...systemSettings, platformCommission: parseInt(e.target.value) })}
                        className="mt-2 w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                      />
                      <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">The percentage taken from employer payments (informational for now).</p>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Maintenance Mode</span>
                  <div className="flex items-center space-x-4 mt-2">
                    <button
                      onClick={() => setSystemSettings({ ...systemSettings, maintenanceMode: 'off' })}
                      className={cn(
                        "px-6 py-3 rounded-xl font-bold text-sm transition-all",
                        systemSettings.maintenanceMode === 'off' ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      Off (Live)
                    </button>
                    <button
                      onClick={() => setSystemSettings({ ...systemSettings, maintenanceMode: 'on' })}
                      className={cn(
                        "px-6 py-3 rounded-xl font-bold text-sm transition-all",
                        systemSettings.maintenanceMode === 'on' ? "bg-red-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      )}
                    >
                      On (Maintenance)
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <button
                    onClick={handleUpdateSettings}
                    disabled={isSaving}
                    className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Save Configuration</span>
                  </button>

                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex-grow md:max-w-md">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <Save className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Permanent Data Backup</h4>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Download a full JSON backup of all accounts, payments, and messages.</p>
                        <button
                          onClick={handleExportData}
                          className="mt-4 text-xs font-bold text-black flex items-center space-x-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Download Backup (.json)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'applications' && (
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50">
                <h3 className="text-xl font-bold">My Applications</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {applications.length > 0 ? applications.map((app) => (
                  <div key={app.id} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{app.jobTitle || `Job Application #${app.id.slice(-4)}`}</h4>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 font-medium">
                          <span className="flex items-center space-x-1"><Building className="w-3 h-3" /> <span>{app.company || 'Unknown Company'}</span></span>
                          <span className="flex items-center space-x-1"><Clock className="w-3 h-3" /> <span>{format(new Date(app.createdAt), 'MMM d, yyyy')}</span></span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full uppercase tracking-widest text-[10px] font-bold flex items-center space-x-1",
                            app.status === 'pending' ? "bg-blue-50 text-blue-600" :
                            app.status === 'accepted' ? "bg-emerald-50 text-emerald-600" :
                            app.status === 'rejected' ? "bg-red-50 text-red-600" :
                            app.status === 'reviewed' ? "bg-amber-50 text-amber-600" :
                            "bg-gray-100 text-gray-600"
                          )}>
                            {app.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                            {app.status === 'accepted' && <CheckCircle className="w-2.5 h-2.5" />}
                            {app.status === 'rejected' && <XCircle className="w-2.5 h-2.5" />}
                            {app.status === 'reviewed' && <Eye className="w-2.5 h-2.5" />}
                            <span>{app.status}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                  </div>
                )) : (
                  <div className="px-8 py-24 text-center">
                    <p className="text-gray-400 font-medium mb-4">No applications yet.</p>
                    <Link to="/jobs" className="bg-black text-white px-8 py-3 rounded-2xl font-bold inline-block">Find Jobs</Link>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'jobs' && (
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-xl font-bold">{profile?.role === 'admin' ? 'All Job Postings' : 'My Job Postings'}</h3>
                {profile?.role === 'employer' && <Link to="/post-job" className="text-sm font-bold text-gray-400 hover:text-black">Post New</Link>}
              </div>
              <div className="divide-y divide-gray-50">
                {myJobs.length > 0 ? myJobs.map((job) => (
                  <div key={job.id} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                        <Briefcase className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{job.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                          <span className="flex items-center space-x-1"><Clock className="w-3 h-3" /> <span>{format(new Date(job.createdAt), 'MMM d, yyyy')}</span></span>
                          <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-widest text-[10px]">{job.category}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full uppercase tracking-widest text-[10px]",
                            job.experienceLevel === 'Fresh' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {job.experienceLevel || 'Experienced'}
                          </span>
                          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest text-[10px]">{job.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {profile?.role === 'admin' && (
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleJobModeration(job.id, true)}
                            className={cn(
                              "p-2 rounded-xl transition-colors",
                              job.isApproved ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                            )}
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleJobModeration(job.id, false)}
                            className={cn(
                              "p-2 rounded-xl transition-colors",
                              !job.isApproved ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            )}
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        {(profile?.role === 'employer' || profile?.role === 'admin') && (
                          <Link 
                            to={`/edit-job/${job.id}`} 
                            className="p-2 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                            title="Edit Job"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                        )}
                        <Link to={`/jobs/${job.id}`} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="px-8 py-24 text-center">
                    <p className="text-gray-400 font-medium mb-4">No jobs posted yet.</p>
                    {profile?.role === 'employer' && <Link to="/post-job" className="bg-black text-white px-8 py-3 rounded-2xl font-bold inline-block">Post a Job</Link>}
                  </div>
                )}
              </div>
            </section>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-black">Account Settings</h2>
              
              <form onSubmit={handleUpdateProfile} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                    <input
                      type="text"
                      value={editProfile.name}
                      onChange={e => setEditProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                    <input
                      type="email"
                      value={editProfile.email}
                      disabled
                      className="w-full px-6 py-4 bg-gray-100 rounded-2xl border-none font-medium text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  
                  {profile?.role === 'employer' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Company Name</label>
                        <input
                          type="text"
                          value={editProfile.companyName}
                          onChange={e => setEditProfile(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Company Logo URL</label>
                        <input
                          type="text"
                          value={editProfile.companyLogo}
                          onChange={e => setEditProfile(prev => ({ ...prev, companyLogo: e.target.value }))}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <input
                      type="tel"
                      value={editProfile.phoneNumber}
                      onChange={e => setEditProfile(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                      placeholder="+1 234 567 890"
                    />
                  </div>

                  {profile?.role === 'seeker' && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Skills (comma separated)</label>
                      <input
                        type="text"
                        value={editProfile.skills}
                        onChange={e => setEditProfile(prev => ({ ...prev, skills: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="React, TypeScript, Node.js"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Bio / Description</label>
                    <textarea
                      value={editProfile.bio}
                      onChange={e => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium min-h-[150px]"
                      placeholder={profile?.role === 'employer' ? "Tell us about your company..." : "Tell us about yourself..."}
                    />
                  </div>

                  {profile?.role === 'seeker' && (
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Resume URL</label>
                      <input
                        type="text"
                        value={editProfile.resumeUrl}
                        onChange={e => setEditProfile(prev => ({ ...prev, resumeUrl: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="https://example.com/resume.pdf"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Website</label>
                      <input
                        type="url"
                        value={editProfile.website}
                        onChange={e => setEditProfile(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">LinkedIn</label>
                      <input
                        type="url"
                        value={editProfile.linkedin}
                        onChange={e => setEditProfile(prev => ({ ...prev, linkedin: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Twitter / X</label>
                      <input
                        type="url"
                        value={editProfile.twitter}
                        onChange={e => setEditProfile(prev => ({ ...prev, twitter: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">GitHub</label>
                      <input
                        type="url"
                        value={editProfile.github}
                        onChange={e => setEditProfile(prev => ({ ...prev, github: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-black text-white px-12 py-4 rounded-2xl font-black hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-8">
                <h3 className="text-xl font-bold">Change Password</h3>
                {passwordError && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-4 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-2xl border border-emerald-100">
                    {passwordSuccess}
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Current Password</label>
                      <input
                        type="password"
                        required
                        value={passwordData.oldPassword}
                        onChange={e => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                      <input
                        type="password"
                        required
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-black font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-red-50 rounded-[40px] p-8 border border-red-100">
                <h3 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h3>
                <p className="text-red-500/70 font-medium mb-6 text-sm">Once you delete your account, there is no going back. Please be certain.</p>
                <button className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all">Delete Account</button>
              </div>
            </div>
          )}

          {activeTab === 'verify-email' && profile && !profile.isVerified && (
            <div className="bg-white p-12 rounded-[40px] border border-gray-100 shadow-sm text-center space-y-8">
              <div className="w-24 h-24 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto text-orange-600">
                <Mail className="w-12 h-12" />
              </div>
              <div className="max-w-md mx-auto space-y-4">
                <h2 className="text-3xl font-black">Verify your email address</h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Please verify your email to access all features of the platform.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={async () => {
                    try {
                      await api.auth.resendVerification();
                      alert("Verification email sent!");
                    } catch (err: any) {
                      alert(err.message || "Failed to resend verification email");
                    }
                  }}
                  className="bg-orange-600 text-white px-12 py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20"
                >
                  Resend Email
                </button>
              </div>
              <p className="text-xs text-gray-400 font-medium">
                Didn't receive the email? Check your spam folder or click the button above to try again.
              </p>
            </div>
          )}

          {/* Receipt Viewing Modal */}
          <AnimatePresence>
            {isReceiptModalOpen && selectedReceipt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black">Payment Receipt</h3>
                      <p className="text-gray-500 text-sm">Submitted by {selectedReceipt.seekerEmail}</p>
                    </div>
                    <button 
                      onClick={() => setIsReceiptModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex items-center justify-center min-h-[400px]">
                    {selectedReceipt.receiptUrl.startsWith('data:image') || selectedReceipt.receiptUrl.includes('.png') || selectedReceipt.receiptUrl.includes('.jpg') || selectedReceipt.receiptUrl.includes('.jpeg') || (!selectedReceipt.receiptUrl.startsWith('http') && !selectedReceipt.receiptUrl.startsWith('data:')) ? (
                      <img 
                        src={selectedReceipt.receiptUrl.startsWith('data:') || selectedReceipt.receiptUrl.startsWith('http') ? selectedReceipt.receiptUrl : `/api/telegram-file/${selectedReceipt.receiptUrl}`} 
                        alt="Receipt" 
                        className="max-w-full h-auto rounded-2xl shadow-lg border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-6 font-bold">This receipt is a document file.</p>
                        <a 
                          href={selectedReceipt.receiptUrl.startsWith('data:') || selectedReceipt.receiptUrl.startsWith('http') ? selectedReceipt.receiptUrl : `/api/telegram-file/${selectedReceipt.receiptUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all"
                        >
                          Open in New Tab
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="p-8 border-t border-gray-100 bg-white flex justify-end space-x-4">
                    {profile?.role === 'admin' && selectedReceipt.status === 'pending' && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await handleReject(selectedReceipt.id);
                              setIsReceiptModalOpen(false);
                            } catch (err) {
                              alert("Failed to reject receipt");
                            }
                          }}
                          className="px-8 py-4 border border-gray-200 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await handleApprove(selectedReceipt.id);
                              setIsReceiptModalOpen(false);
                            } catch (err) {
                              alert("Failed to approve receipt");
                            }
                          }}
                          className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                        >
                          Approve Payment
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setIsReceiptModalOpen(false)}
                      className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
      {/* Applicant Profile Modal */}
      <AnimatePresence>
        {isApplicantModalOpen && selectedApplicant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsApplicantModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 sm:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">{selectedApplicant.seekerName}</h3>
                      <p className="text-gray-400 font-medium">{selectedApplicant.seekerEmail}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsApplicantModalOpen(false)}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Professional Bio</h4>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedApplicant.seekerBio || 'No bio provided.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplicant.seekerSkills && selectedApplicant.seekerSkills.length > 0 ? (
                        selectedApplicant.seekerSkills.map((skill: string, idx: number) => (
                          <span key={`${skill}-${idx}`} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No skills listed.</span>
                      )}
                    </div>
                  </div>

                  {selectedApplicant.seekerResume && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resume</h4>
                      <a
                        href={selectedApplicant.seekerResume}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-600 font-bold hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Resume Attachment</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-gray-50 flex space-x-4">
                    <button
                      onClick={() => {
                        handleUpdateApplicationStatus(selectedApplicant.id, 'accepted');
                        setIsApplicantModalOpen(false);
                      }}
                      className="flex-1 bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Accept Candidate</span>
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateApplicationStatus(selectedApplicant.id, 'rejected');
                        setIsApplicantModalOpen(false);
                      }}
                      className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Reject Application</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black">Add New User</h3>
                </div>
                <button
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddUser} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.displayName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                    placeholder="Enter password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">User Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium appearance-none"
                  >
                    <option value="seeker">Job Seeker</option>
                    <option value="employer">Employer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-black text-white py-5 rounded-2xl font-black text-lg hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-[0.98]"
                  >
                    Create User Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditUserModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white">
                    <Edit className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black">Edit User</h3>
                </div>
                <button
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editUserForm.displayName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                    placeholder="Enter email address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">New Password (Optional)</label>
                  <input
                    type="password"
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium"
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">User Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium appearance-none"
                  >
                    <option value="seeker">Job Seeker</option>
                    <option value="employer">Employer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-black text-white py-5 rounded-2xl font-black hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-[0.98]"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
