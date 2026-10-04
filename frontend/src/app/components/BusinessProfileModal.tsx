import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Star, CheckCircle, Mail, Globe, Phone, ShieldCheck } from 'lucide-react';

interface BusinessProfile {
  id?: string;
  initials: string;
  name: string;
  tagline: string;
  location: string;
  rating: string;
  tags: string[];
  verified: boolean;
}

interface BusinessProfileModalProps {
  business: BusinessProfile | null;
  onClose: () => void;
}

export function BusinessProfileModal({ business, onClose }: BusinessProfileModalProps) {
  if (!business) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Header Cover Image */}
          <div className="relative h-48 bg-gradient-to-r from-blue-600 to-blue-900">
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-8 pb-8 relative flex-1 overflow-y-auto">
            {/* Avatar & Basic Info */}
            <div className="flex justify-between items-end -mt-16 mb-6">
              <div className="flex items-end gap-6">
                <div className="w-32 h-32 rounded-2xl bg-white p-2 shadow-lg relative">
                  <div className="w-full h-full bg-blue-50 rounded-xl flex items-center justify-center text-3xl font-black text-blue-600">
                    {business.initials}
                  </div>
                  {business.verified && (
                    <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-sm">
                      <div className="bg-green-500 rounded-full p-1">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{business.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {business.location}</span>
                    <span className="flex items-center gap-1.5 text-amber-600"><Star className="w-4 h-4 fill-current" /> {business.rating} Rating</span>
                  </div>
                </div>
              </div>
              <div className="mb-2 flex gap-3">
                <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all">
                  Contact Provider
                </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-3 gap-8">
              
              {/* Main Column */}
              <div className="col-span-2 space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">About Us</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {business.tagline}. We specialize in delivering high-quality B2B services tailored to your corporate needs. Our team consists of industry veterans dedicated to ensuring the success of your projects through innovative solutions and reliable execution.
                  </p>
                </section>
                
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Services & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {business.tags.map((tag, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Portfolio Highlights</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-40 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-slate-400 mb-2">📸</div>
                      <p className="text-sm font-semibold text-slate-600">Project Alpha</p>
                    </div>
                    <div className="h-40 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-slate-400 mb-2">📸</div>
                      <p className="text-sm font-semibold text-slate-600">Project Beta</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="font-bold text-slate-900">Contact Details</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <a href="#" className="hover:text-blue-600 transition-colors">www.{business.name.replace(/\s+/g, '').toLowerCase()}.com</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>hello@{business.name.replace(/\s+/g, '').toLowerCase()}.com</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>+91 98765 43210</span>
                  </div>
                </div>

                <div className="p-6 bg-green-50 border border-green-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-green-700 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                    Verified Partner
                  </div>
                  <p className="text-xs text-green-800/80 leading-relaxed">
                    This business has completed our rigorous KYC and background verification process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
