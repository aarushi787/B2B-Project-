import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Star, CheckCircle, Globe, ShieldCheck } from 'lucide-react';
import { TrustBadges, type Trust } from './TrustBadges';

interface BusinessProfile {
  id?: string;
  initials: string;
  name: string;
  tagline: string;
  location: string;
  rating: string | number | null;
  tags: string[];
  verified: boolean;
  website?: string | null;
  trust?: Trust;
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
          <div className="relative h-48 bg-gradient-to-r from-[#6921A5] to-[#492F77]">
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
                  <div className="w-full h-full bg-[#F3E8F8] rounded-xl flex items-center justify-center text-3xl font-black text-[#6921A5]">
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
                    {business.rating != null && <span className="flex items-center gap-1.5 text-amber-600"><Star className="w-4 h-4 fill-current" /> {business.rating} Rating</span>}
                  </div>
                  <div className="mt-3"><TrustBadges trust={business.trust} /></div>
                </div>
              </div>
              <div className="mb-2 flex gap-3">
                <button className="px-6 py-2.5 bg-[#6921A5] hover:bg-[#6921A5] text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all">
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
                    {business.tagline || "This business has not added a description yet."}
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


              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                  <h3 className="font-bold text-slate-900">Contact Details</h3>
                  {business.website ? (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <a href={/^https?:\/\//i.test(business.website) ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#6921A5] transition-colors break-all">{business.website}</a>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">This business has not shared contact details. Send a proposal or an enquiry through the platform.</p>
                  )}
                </div>

                {business.verified && (
                  <div className="p-6 bg-[#F3E8F8] border border-[#DBC5E7] rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-[#6921A5] font-bold">
                      <ShieldCheck className="w-5 h-5" />
                      Verified business
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      A platform admin reviewed this business's documents and approved it.
                      {business.trust?.gst === "valid" ? " Its GST number also passes the format and check-digit test." : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
