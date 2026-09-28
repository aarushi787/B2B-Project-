import React from "react";
import { CheckCircle2, FileText, PenLine, Wallet, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface MilestoneTimelineProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const steps = [
  {
    title: "Initiated",
    desc: "Deal terms agreed",
    icon: FileText,
    date: "Apr 10, 2024",
    color: "#8B5CF6",
  },
  {
    title: "Contract Signed",
    desc: "All parties signed",
    icon: PenLine,
    date: "Apr 14, 2024",
    color: "#8B5CF6",
  },
  {
    title: "Payment",
    desc: "Escrow funded",
    icon: Wallet,
    date: "Apr 18, 2024",
    color: "#F59E0B",
  },
  {
    title: "Completed",
    desc: "Funds released",
    icon: Trophy,
    date: "Apr 22, 2024",
    color: "#22C55E",
  },
];

export function MilestoneTimeline({ currentStep, onStepClick }: MilestoneTimelineProps) {
  const progress = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Overall Progress</span>
          <span className="text-xs font-bold text-[#8B5CF6]">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#8B5CF6] via-purple-400 to-green-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Connector Line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-100 z-0">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#8B5CF6] to-green-400"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>

        <div className="relative flex justify-between z-10">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;
            const StepIcon = step.icon;

            return (
              <motion.div
                key={step.title}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => onStepClick(index)}
                whileHover={{ scale: 1.05 }}
              >
                {/* Icon Circle */}
                <div className="relative mb-3">
                  {/* Glow for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: step.color, opacity: 0.2, scale: 1.6 }}
                      animate={{ scale: [1.5, 1.8, 1.5], opacity: [0.2, 0.1, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted ? step.color : isCurrent ? "white" : "#F8FAFC",
                      borderColor: isPending ? "#E2E8F0" : step.color,
                      scale: isCurrent ? 1.15 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm relative z-10"
                    style={{
                      boxShadow: isCurrent ? `0 0 0 4px ${step.color}20, 0 4px 12px ${step.color}30` : undefined
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <StepIcon
                        className="w-5 h-5"
                        style={{ color: isPending ? "#CBD5E1" : step.color }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Labels */}
                <div className="text-center max-w-[90px]">
                  <motion.p
                    animate={{ color: isPending ? "#94A3B8" : "#0F172A" }}
                    className="text-xs font-bold leading-tight"
                  >
                    {step.title}
                  </motion.p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{step.desc}</p>
                  <p
                    className="text-[10px] mt-1 font-semibold"
                    style={{ color: isPending ? "#CBD5E1" : step.color }}
                  >
                    {step.date}
                  </p>
                  {isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: step.color }}
                    >
                      IN PROGRESS
                    </motion.div>
                  )}
                  {isCompleted && (
                    <div className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-green-600 bg-green-50">
                      ✓ DONE
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Milestone Notes */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-3"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${steps[currentStep].color}15` }}
        >
          {React.createElement(steps[currentStep].icon, {
            className: "w-4 h-4",
            style: { color: steps[currentStep].color }
          })}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">
            Current: <span style={{ color: steps[currentStep].color }}>{steps[currentStep].title}</span>
          </p>
          <p className="text-[10px] text-slate-400">{steps[currentStep].desc} · Click any step to update</p>
        </div>
      </motion.div>
    </div>
  );
}
