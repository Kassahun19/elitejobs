import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Check, Zap, Shield, Star, Loader2, ExternalLink, Upload, X, Landmark, Smartphone, User, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Pricing = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null | boolean>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plans = [
    {
      id: 'basic',
      name: 'Basic Access',
      price: '200',
      duration: '1 Month',
      features: [
        'Full access to all job posts',
        'Standard job alerts',
        'Basic profile visibility',
        'Email support',
      ],
      icon: Zap,
      color: 'bg-blue-50 text-blue-600',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      id: 'standard',
      name: 'Standard Access',
      price: '500',
      duration: '3 Months',
      features: [
        'Unlimited applications',
        'Priority job alerts',
        'Featured profile status',
        'Direct employer messaging',
        'Resume review',
      ],
      icon: Shield,
      color: 'bg-emerald-50 text-emerald-600',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      popular: true,
    },
    {
      id: 'lifetime',
      name: 'Lifetime Access',
      price: '1,000',
      duration: 'Lifetime',
      features: [
        'Unlimited applications',
        'Lifetime access',
        'VIP support',
        'Exclusive networking events',
        'Career coaching session',
        'Early access to new roles',
      ],
      icon: Star,
      color: 'bg-black text-white',
      buttonClass: 'bg-black hover:bg-gray-800 text-white',
    },
  ];

  const handlePlanSelect = (plan: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedPlan(plan);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile || !selectedPlan) return;

    setIsUploading(true);
    setSubmitError(null);
    try {
      await api.subscription.submitReceipt({
        packageType: selectedPlan.id,
        receiptUrl: receiptFile,
      });

      setSubmitSuccess(true);
      refreshProfile();
      // Auto-close after 3 seconds
      setTimeout(() => {
        setSelectedPlan(null);
        setSubmitSuccess(false);
        setReceiptFile(null);
        navigate('/dashboard');
      }, 3000);
    } catch (error: any) {
      console.error("Subscription error:", error);
      setSubmitError(error.message || "Failed to submit receipt. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-20">
        <h1 className="text-5xl font-black mb-6 tracking-tight">Invest in Your <span className="text-gray-400 italic">Future.</span></h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Choose a plan that fits your career goals. Unlock premium features and get hired faster by Ethiopia's top companies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
              "relative p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col h-full bg-white",
              plan.popular && "ring-2 ring-emerald-500 ring-offset-4"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", plan.color)}>
                <plan.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
              <div className="flex items-baseline space-x-1">
                <span className="text-4xl font-black">ETB {plan.price}</span>
                <span className="text-gray-400 font-medium">/ {plan.duration}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-12 flex-grow">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start space-x-3 text-gray-500 text-sm font-medium">
                  <span className="text-emerald-500 font-bold">✔️</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePlanSelect(plan)}
              disabled={profile?.subscription.status === 'pending'}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center space-x-2",
                plan.buttonClass,
                profile?.subscription.status === 'pending' && "opacity-50 cursor-not-allowed"
              )}
            >
              {profile?.subscription.status === 'pending' ? (
                <span>Subscription Pending</span>
              ) : (
                <>
                  <span>Choose {plan.name}</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {profile?.subscription.status === 'pending' && (
        <div className="mt-12 p-8 bg-orange-50 border border-orange-100 rounded-[40px] text-center max-w-2xl mx-auto">
          <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-orange-900">Subscription Under Review</h3>
          <p className="text-orange-700 mt-2">
            You have already submitted a receipt for the <span className="font-bold uppercase">{profile.subscription.type}</span> plan. 
            Our admin is reviewing it. You will get access within 24 hours.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-bottom border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-black">Complete Your Subscription</h2>
                  <p className="text-gray-500">Plan: {selectedPlan.name} (ETB {selectedPlan.price})</p>
                </div>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-grow space-y-8">
                {submitSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center space-y-6"
                  >
                    <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center shadow-xl shadow-emerald-200">
                      <Check className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black mb-2">Receipt Sent Successfully!</h3>
                      <p className="text-gray-500 max-w-sm mx-auto">
                        Our admin will review your payment and grant you access within 24 hours. Redirecting you to your dashboard...
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {submitError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600">
                        <X className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-bold">{submitError}</p>
                      </div>
                    )}

                    {/* Step-by-Step Instructions */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-8 space-y-4">
                      <h3 className="text-xl font-black text-emerald-900 flex items-center space-x-2">
                        <Check className="w-6 h-6" />
                        <span>How to Complete Your Subscription</span>
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <p className="text-emerald-800 font-medium leading-relaxed">
                            First, <span className="font-bold underline">deposit</span> the amount for your preferred plan into one of the bank accounts listed below.
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <p className="text-emerald-800 font-medium leading-relaxed">
                            Take a <span className="font-bold underline">screenshot</span> of the successful transaction or download the <span className="font-bold underline">PDF receipt</span>.
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <p className="text-emerald-800 font-medium leading-relaxed">
                            Finally, <span className="font-bold underline">upload</span> your receipt below and click "Send Receipt to Admin" to activate your plan.
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center space-x-2">
                          <Zap className="w-3 h-3" />
                          <span>Activation usually takes less than 24 hours</span>
                        </p>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Bank Accounts</h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <Landmark className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-xs text-gray-400 font-bold">CBE (Commercial Bank)</p>
                              <p className="font-mono font-bold">1000183217198</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <Landmark className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="text-xs text-gray-400 font-bold">BOA (Bank of Abyssinia)</p>
                              <p className="font-mono font-bold">32419186</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <Landmark className="w-5 h-5 text-amber-600" />
                            <div>
                              <p className="text-xs text-gray-400 font-bold">Bunna Bank</p>
                              <p className="font-mono font-bold">3609501002452</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Mobile & Personal</h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <Smartphone className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="text-xs text-gray-400 font-bold">Telebirr / Mobile</p>
                              <p className="font-mono font-bold">0915508167</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <User className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="text-xs text-gray-400 font-bold">Full Name</p>
                              <p className="font-bold">Kassahun Mulatu Kebede</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                            <MapPin className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="text-xs text-gray-400 font-bold">Address</p>
                              <p className="font-bold">Bahir Dar</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upload Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Upload Payment Receipt</h3>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed rounded-[32px] p-8 text-center cursor-pointer transition-all",
                          receiptFile ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-black hover:bg-gray-50"
                        )}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          className="hidden" 
                          accept="image/*"
                        />
                        {receiptFile ? (
                          <div className="space-y-4">
                            <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                              <Check className="w-10 h-10 text-white" />
                            </div>
                            <p className="font-bold text-emerald-600">Receipt Selected!</p>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }}
                              className="text-xs text-red-500 font-bold uppercase tracking-widest hover:underline"
                            >
                              Remove and change
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                              <Upload className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-bold">Click to upload receipt screenshot</p>
                              <p className="text-sm text-gray-400">PNG, JPG or PDF up to 10MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!submitSuccess && (
                <div className="p-8 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={handleSubmitReceipt}
                    disabled={!receiptFile || isUploading}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center space-x-2",
                      receiptFile ? "bg-black text-white hover:bg-gray-800" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Receipt to Admin</span>
                        <ExternalLink className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-center mt-4 text-xs text-gray-400 font-medium">
                    By clicking send, you confirm that you have made the payment to the accounts listed above.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-24 p-12 bg-gray-50 rounded-[40px] border border-gray-100 text-center">
        <h2 className="text-2xl font-bold mb-4">Need a custom plan for your team?</h2>
        <p className="text-gray-500 mb-8">We offer enterprise solutions for large organizations and recruitment agencies.</p>
        <button className="font-bold text-black border-b-2 border-black hover:pb-1 transition-all">
          Contact our sales team
        </button>
      </div>
    </div>
  );
};
