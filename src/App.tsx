import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldAlert, RefreshCcw } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { JobListings } from './pages/JobListings';
import { JobDetails } from './pages/JobDetails';
import { Pricing } from './pages/Pricing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Dashboard } from './pages/Dashboard';
import { PostJob } from './pages/PostJob';
import { AIGuide } from './components/AIGuide';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMessage = "You don't have permission to perform this action. Please check your subscription or role.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
              <span>Refresh Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-black selection:text-white">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/jobs" element={<JobListings />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/post-job" 
                  element={
                    <ProtectedRoute>
                      <PostJob />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/edit-job/:id" 
                  element={
                    <ProtectedRoute>
                      <PostJob />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Footer />
            <AIGuide />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
