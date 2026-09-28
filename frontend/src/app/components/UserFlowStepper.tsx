import React from "react";
import { GitMerge, Upload, DollarSign, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface UserFlowStepperProps {
  currentStep: number;
}

const flowSteps = [
  {
    icon: GitMerge,
    title: "Update Milestones",
    desc: "Track deal progress",
    color: "#0F9D9D",
    bg: "bg-teal-50",
    border: "border-teal-200",
    activeBg: "bg-[#0F9D9D]",
  },
  {
    icon: Upload,
    title: "Upload Contracts",
    desc: "Securely share docs",
    color: "#8B5CF6",
    bg: "bg-purple-50",
    border: "border-purple-200",
    activeBg: "bg-purple-500",
  },
  {
    icon: DollarSign,
    title: "Process Payments",
    desc: "Fund & release escrow",
    color: "#22C55E",
    bg: "bg-green-50",
    border: "border-green-200",
    activeBg: "bg-green-500",
  },
];

export function UserFlowStepper({ currentStep }: UserFlowStepperProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">User Flow</h2>
          <p className="text-[10px] text-slate-400">Standard deal process visualization</p>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
          Step {Math.min(currentStep + 1, 3)}/3
        </span>
      </div>

      <div className="flex items-center gap-0">
        {flowSteps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.title}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="flex-1 flex flex-col items-center"
              >
                {/* Icon Circle */}
                <motion.div
                  whileHover={{ scale: 1.08, y: -2 }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 shadow-sm ${
                    isCompleted
                      ? "bg-green-500 shadow-green-500/20"
                      : isCurrent
                        ? `${step.activeBg} shadow-md`
                        : `${step.bg} ${step.border} border`
                  }`}
                  style={isCurrent ? { boxShadow: `0 4px 14px ${step.color}30` } : undefined}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Icon
                      className="w-5 h-5"
                      style={{ color: isPending ? "#CBD5E1" : "white" }}
                    />
                  )}
                </motion.div>

                {/* Label */}
                <div className="text-center">
                  <p className={`text-xs font-bold ${isPending ? "text-slate-400" : "text-slate-800"}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
                </div>

                {/* Status Badge */}
                <div className="mt-2 h-4 flex items-center justify-center">
                  {isCompleted && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full"
                    >
                      ✓ Done
                    </motion.span>
                  )}
                  {isCurrent && (
                    <motion.span
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: step.color }}
                    >
                      Active
                    </motion.span>
                  )}
                </div>
              </motion.div>

              {/* Connector Arrow */}
              {index < flowSteps.length - 1 && (
                <div className="flex flex-col items-center mx-1 mt-[-8px]">
                  <motion.div
                    animate={{
                      color: index < currentStep ? "#22C55E" : "#E2E8F0",
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                  {/* Connection line */}
                  <div className="w-8 h-0.5 bg-slate-100 mt-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-green-400 rounded-full"
                      animate={{ width: index < currentStep ? "100%" : "0%" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Note */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between"
      >
        <p className="text-[10px] text-slate-400">
          {currentStep === 0 && "Start by updating deal milestones to begin the workflow"}
          {currentStep === 1 && "Upload and sign contracts to move to payment processing"}
          {currentStep >= 2 && "Process escrow payment to complete the deal"}
        </p>
        <div className="flex gap-1">
          {flowSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? "w-4" : "w-2 bg-slate-200"
              }`}
              style={i <= currentStep ? { backgroundColor: flowSteps[i].color, width: 16 } : undefined}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
