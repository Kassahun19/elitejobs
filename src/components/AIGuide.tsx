import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const SYSTEM_INSTRUCTION = `You are the AI Guide for Elite Jobs Ethiopia, a premier job platform in Ethiopia. 
Your goal is to help users navigate the platform and answer questions about how it works.

Key Platform Features:
1. Job Search: Users can browse jobs by category (Technology, Other) and location.
2. Job Posting: Employers can post jobs.
3. Subscription: Job seekers need a premium subscription to view more than 5 jobs and apply.

Subscription Packages:
A. Basic (3 months): ETB 100
B. Partial (6 months): ETB 500
C. Full (Lifetime): ETB 1,000

Payment Methods:
i. CBE (Commercial Bank): 1000183217198
ii. BOA (Bank of Abyssinia): 32419186
iii. Bunna Bank: 3609501002452
iv. Telebirr / Mobile: 0915508167
v. Account Name: Kassahun Mulatu Kebede

How to Subscribe:
1. Deposit the amount for your preferred plan into one of the bank accounts listed above.
2. Take a screenshot of the successful transaction or download the PDF receipt.
3. Upload your receipt in the "Upgrade" section of your dashboard.
4. Admin manually approves receipts within 24 hours.

Profile Settings:
1. Users can update their display name in the Settings tab of the dashboard.

Contact Information:
1. Email: kmulatu21@gmail.com or support@elitejobs.et
2. Mobile: 0915508167
3. Address: Bahir Dar, Ethiopia

Formatting Guidelines:
👉 EVERY SINGLE LIST ITEM OR PIECE OF INFORMATION MUST START ON A COMPLETELY NEW LINE.
👉 DO NOT GROUP LIST ITEMS ON THE SAME LINE.
👉 DO NOT USE symbols like "-", "###", "**", "🔍", "---", "💳", or any other markdown symbols.
👉 Use symbols like "👉", "✔️", numerals (1, 2, 3...), Roman numerals (I, II, III... or i, ii, iii...), dots (.), or letters (A, B, C... or a, b, c...) ONLY for lists.
👉 DO NOT use symbols for instructions, paragraphs, or general notes.
👉 Keep the response clean, professional, and easy to read.
👉 If a user asks something unrelated to the platform, politely redirect them to platform-related topics.`;

export const AIGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: "Hello! I'm your Elite Jobs AI assistant. How can I help you navigate the platform today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input.trim();
    if (!messageToSend || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: messageToSend }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: messageToSend }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error("AI Guide Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="bg-black p-6 flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm">Elite AI Guide</h4>
                  <p className="text-[10px] text-gray-400">Always online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] p-4 rounded-2xl text-sm whitespace-pre-wrap",
                      msg.role === 'user' 
                        ? "bg-black text-white rounded-tr-none shadow-lg shadow-black/5" 
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}
              {!loading && messages.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    onClick={() => handleSend("Browse Packages")}
                    className="text-[10px] font-bold px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:border-black transition-all"
                  >
                    📦 Browse Packages
                  </button>
                  <button 
                    onClick={() => handleSend("Bank Account Details")}
                    className="text-[10px] font-bold px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:border-black transition-all"
                  >
                    🏦 Bank Details
                  </button>
                  <button 
                    onClick={() => handleSend("How to upgrade?")}
                    className="text-[10px] font-bold px-3 py-1.5 bg-white border border-gray-100 rounded-full hover:border-black transition-all"
                  >
                    ✨ How to Upgrade
                  </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  className="w-full pl-6 pr-14 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none text-sm"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
          isOpen ? "bg-white text-black rotate-90" : "bg-black text-white"
        )}
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white animate-pulse" />
        )}
      </motion.button>
    </div>
  );
};
