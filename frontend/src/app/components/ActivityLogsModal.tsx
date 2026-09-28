import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Filter, Search, Calendar } from 'lucide-react';
import { Card } from './ui/DesignSystem';

interface ActivityItem {
  icon: any;
  title: string;
  source: string;
  time: string;
  date?: string;
  type?: string;
}

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityItem[];
}

export function ActivityLogsModal({ isOpen, onClose, activities }: ActivityLogsModalProps) {
  if (!isOpen) return null;

  // Generate some extended mock data to make it look full
  const fullActivities = [
    ...activities,
    { icon: Activity, title: "System login from new IP", source: "Security System", time: "5 hours ago", type: "system" },
    { icon: Activity, title: "Password changed successfully", source: "User Settings", time: "1 day ago", type: "system" },
    { icon: Activity, title: "Contract #492 signed", source: "Contracts", time: "2 days ago", type: "business" },
    { icon: Activity, title: "Invoice #901 paid", source: "Billing", time: "2 days ago", type: "finance" },
    { icon: Activity, title: "Escrow funded for Project Omega", source: "Escrow", time: "3 days ago", type: "finance" },
    { icon: Activity, title: "New user invited to workspace", source: "Team Management", time: "5 days ago", type: "system" }
  ];

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Full Activity Logs</h3>
                <p className="text-xs text-slate-500">Track all events across your workspace</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <Filter className="w-4 h-4" /> Filter
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <Calendar className="w-4 h-4" /> Date Range
                </button>
              </div>
            </div>

            {/* Timeline */}
            <Card className="p-6">
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                {fullActivities.map((a, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center shadow-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    </div>
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{a.title}</p>
                          <p className="text-xs font-medium text-purple-600 mt-1">{a.source}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{a.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-white flex justify-end shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              Close Logs
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
