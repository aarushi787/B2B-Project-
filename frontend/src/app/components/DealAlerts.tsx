import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, X, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DealAlertsProps {
  alerts: string[];
}

function Countdown({ targetHours = 48 }: { targetHours?: number }) {
  const [timeLeft, setTimeLeft] = useState({ hours: targetHours, minutes: 0, seconds: 0 });

  useEffect(() => {
    const totalSeconds = targetHours * 3600;
    let remaining = totalSeconds;

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        return;
      }
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetHours]);

  const urgency = timeLeft.hours < 12;

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${urgency ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className={`p-2 rounded-lg ${urgency ? "bg-red-100" : "bg-amber-100"}`}>
        <Clock className={`w-4 h-4 ${urgency ? "text-red-500" : "text-amber-600"}`} />
      </div>
      <div className="flex-1">
        <p className={`text-xs font-semibold ${urgency ? "text-red-700" : "text-amber-700"}`}>Deal Deadline</p>
        <p className={`text-[10px] ${urgency ? "text-red-500" : "text-amber-500"}`}>Time remaining to complete</p>
      </div>
      <div className="flex items-center gap-1.5">
        {[
          { label: "HR", value: String(timeLeft.hours).padStart(2, "0") },
          { label: "MIN", value: String(timeLeft.minutes).padStart(2, "0") },
          { label: "SEC", value: String(timeLeft.seconds).padStart(2, "0") },
        ].map((unit, i) => (
          <React.Fragment key={unit.label}>
            {i > 0 && <span className={`text-xs font-bold ${urgency ? "text-red-400" : "text-amber-400"}`}>:</span>}
            <div className="text-center">
              <div className={`text-sm font-black px-1.5 py-0.5 rounded-md min-w-[32px] text-center ${urgency ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {unit.value}
              </div>
              <p className={`text-[8px] font-bold mt-0.5 ${urgency ? "text-red-400" : "text-amber-400"}`}>{unit.label}</p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function DealAlerts({ alerts }: DealAlertsProps) {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const visible = alerts.filter((_, i) => !dismissed.includes(i));

  return (
    <div className="space-y-3">
      {/* Countdown Timer */}
      <Countdown targetHours={48} />

      {/* Alert Banner */}
      {visible.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                {visible.length} Smart Alert{visible.length > 1 ? "s" : ""} Require Attention
              </span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {visible.length}
              </span>
            </div>
            {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 space-y-2">
                  {alerts.map((alert, i) => {
                    if (dismissed.includes(i)) return null;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 font-medium flex-1">{alert}</p>
                        <button
                          onClick={() => setDismissed(d => [...d, i])}
                          className="p-0.5 text-amber-400 hover:text-amber-600 transition-colors rounded shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
