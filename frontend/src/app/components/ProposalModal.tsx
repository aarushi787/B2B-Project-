import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, CheckCircle2, DollarSign, Calendar, Info, MessageSquare } from 'lucide-react';
import { StatusBadge } from './ui/DesignSystem';

export interface Proposal {
  id: string;
  title?: string;
  notes?: string;
  amount?: number;
  totalAmount?: number;
  status: string;
  createdAt: string;
  buyerId?: string;
  sellerId?: string;
}

interface ProposalModalProps {
  proposal: Proposal | null;
  onClose: () => void;
  isReceived?: boolean;
}

export function ProposalModal({ proposal, onClose, isReceived }: ProposalModalProps) {
  if (!proposal) return null;

  const amount = proposal.amount || proposal.totalAmount || 0;
  const description = proposal.notes || proposal.title || "Standard Service Proposal";
  const partnerId = isReceived ? proposal.sellerId : proposal.buyerId;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Proposal Details</h3>
                <p className="text-xs text-slate-500">ID: #{proposal.id?.slice(0, 8) || "PRP-001"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Status & Highlights */}
            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <div className="mt-1"><StatusBadge status={proposal.status} /></div>
              </div>
              <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bid Amount</p>
                <p className="text-xl font-black text-slate-900 flex items-center"><DollarSign className="w-5 h-5 text-slate-400 mr-1" />{amount.toLocaleString()}</p>
              </div>
              <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Submitted On</p>
                <p className="text-sm font-bold text-slate-700 flex items-center mt-1"><Calendar className="w-4 h-4 text-slate-400 mr-2" />{new Date(proposal.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-slate-400" /> Executive Summary & Notes</h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            </div>

            {/* Deliverables / Milestones (Mocked for visual) */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Proposed Milestones</h4>
              <div className="space-y-3">
                {[
                  { title: "Project Kickoff & Discovery", amount: amount * 0.2, date: "Week 1" },
                  { title: "Core Implementation", amount: amount * 0.5, date: "Week 4" },
                  { title: "Final Review & Handover", amount: amount * 0.3, date: "Week 6" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</div>
                      <span className="text-sm font-semibold text-slate-700">{m.title}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${m.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">{m.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              Close
            </button>
            {isReceived && proposal.status !== 'accepted' && (
              <>
                <button className="px-5 py-2.5 text-sm font-semibold text-blue-600 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Message Bidder
                </button>
                <button className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm shadow-green-600/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Accept Proposal
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
