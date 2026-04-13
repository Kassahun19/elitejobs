export type UserRole = 'seeker' | 'employer' | 'admin';
export type SubscriptionTier = 'none' | 'basic' | 'standard' | 'lifetime';
export type SubscriptionStatus = 'pending' | 'approved' | 'rejected' | 'none' | 'expired';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoUrl?: string;
  role: UserRole;
  subscription: {
    type: SubscriptionTier;
    status: SubscriptionStatus;
    expiresAt: string;
  };
  viewedJobsCount: number;
  savedJobs: string[];
  bio?: string;
  skills?: string[];
  resumeUrl?: string;
  companyName?: string;
  companyLogo?: string;
  phoneNumber?: string;
  isVerified: boolean;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface Receipt {
  id: string;
  seekerUid: string;
  seekerEmail: string;
  packageType: SubscriptionTier;
  receiptUrl: string; // base64 or simulated URL
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Job {
  id: string;
  employerUid: string;
  title: string;
  company: string;
  location: 'Addis Ababa' | 'Bahir Dar' | 'Hawasa' | 'Dessie' | 'Mekelle' | 'Gondar' | 'Remote';
  category: 'NGO Jobs' | 'Banking & Finance Jobs' | 'Technology Jobs' | 'Teaching Jobs' | 'Freelance Jobs' | 'Other Jobs';
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  description: string;
  salary: string;
  status: 'active' | 'closed';
  isApproved?: boolean;
  applicationProcess?: {
    type: 'link' | 'email' | 'phone' | 'telegram' | 'in-person';
    value: string;
    instructions?: string;
  };
  experienceLevel: 'Fresh' | 'Experienced';
  deadline?: string;
  requiredSkills?: string[];
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  company?: string;
  seekerUid: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
}
