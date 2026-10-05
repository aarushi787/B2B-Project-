import { ArrowRight, CheckCircle2, Clock, ShoppingCart, Store, Shield, Eye } from "lucide-react";
import { DealSide, NextStep } from "../../lib/dealRole";

const SIDE_LABEL: Record<DealSide, { text: string; className: string; Icon: typeof Shield }> = {
  buyer:    { text: "You are the buyer",  className: "bg-[#F3E8F8] text-[#6921A5] border-[#7BB8F7]",       Icon: ShoppingCart },
  seller:   { text: "You are the seller", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Store },
  admin:    { text: "Viewing as admin",   className: "bg-[#F3E8F8] text-[#6921A5] border-[#7BB8F7]", Icon: Shield },
  observer: { text: "View only",          className: "bg-slate-50 text-slate-700 border-slate-200",    Icon: Eye },
};

export function DealRoleBadge({ side }: { side: DealSide }) {
  const { text, className, Icon } = SIDE_LABEL[side];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${className}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {text}
    </span>
  );
}

const TONE: Record<NextStep["tone"], { wrap: string; Icon: typeof Clock }> = {
  action:  { wrap: "border-[#7BB8F7] bg-[#F3E8F8]",       Icon: ArrowRight },
  waiting: { wrap: "border-amber-200 bg-amber-50",     Icon: Clock },
  done:    { wrap: "border-emerald-200 bg-emerald-50", Icon: CheckCircle2 },
  closed:  { wrap: "border-slate-200 bg-slate-50",     Icon: CheckCircle2 },
};

export function NextStepCard({ step, onAction }: { step: NextStep; onAction: (action: NonNullable<NextStep["action"]>) => void }) {
  const { wrap, Icon } = TONE[step.tone];
  return (
    <section aria-label="Next step" className={`rounded-2xl border p-4 flex items-center gap-4 ${wrap}`}>
      <Icon className="w-5 h-5 shrink-0 text-slate-700" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-600">Next step</p>
        <h2 className="text-sm font-bold text-slate-900">{step.title}</h2>
        <p className="text-xs text-slate-700 mt-0.5">{step.description}</p>
      </div>
      {step.action && step.actionLabel && (
        <button
          type="button"
          onClick={() => onAction(step.action!)}
          className="shrink-0 bg-[#6921A5] hover:bg-[#6921A5] text-white text-xs font-semibold px-4 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BB8F7] focus-visible:ring-offset-2"
        >
          {step.actionLabel}
        </button>
      )}
    </section>
  );
}
