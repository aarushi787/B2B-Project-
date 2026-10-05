// A reusable step-by-step wizard. Give it a list of steps, each with its content and an optional `validate`
// (return a message to block "Next", or null to continue). It shows one step at a time, lets people go back to any
// earlier step, and calls `onSubmit` from the last step.
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export interface FlowStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  /** Return an error message to stop the user moving forward, or null when the step is fine. */
  validate?: () => string | null;
  /** Shown as "Optional" in the step list. Validation still runs if the user filled something in. */
  optional?: boolean;
}

interface Props {
  steps: FlowStep[];
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export function UserFlowStepper({ steps, onSubmit, submitting = false, submitLabel = "Submit", onCancel }: Props) {
  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(0); // furthest step the user has validly arrived at
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const step = steps[active];
  const isLast = active === steps.length - 1;

  // Move keyboard and screen-reader focus to the new step's heading, but not on first render.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [active]);

  const go = (index: number) => { setError(null); setActive(index); };

  const next = () => {
    const problem = step.validate?.() ?? null;
    if (problem) { setError(problem); return; }
    setError(null);
    const to = Math.min(active + 1, steps.length - 1);
    setReached((r) => Math.max(r, to));
    setActive(to);
  };

  const submit = async () => {
    // Re-check every step, so nobody can submit by jumping straight to the review step.
    for (let i = 0; i < steps.length; i++) {
      const problem = steps[i].validate?.() ?? null;
      if (problem) { setActive(i); setError(problem); return; }
    }
    setError(null);
    await onSubmit();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-8">
      <nav aria-label="Progress" className="bg-white border border-slate-200 rounded-2xl p-3 md:p-6 h-fit">
        <ol className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {steps.map((s, i) => {
            const done = i < active || (i <= reached && i !== active);
            const current = i === active;
            const clickable = i <= reached || i < active;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => clickable && go(i)}
                  disabled={!clickable}
                  aria-current={current ? "step" : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${current ? "bg-[#F3E8F8]" : clickable ? "hover:bg-slate-50" : ""} disabled:cursor-default`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${current || done ? "bg-[#6921A5] text-white" : "bg-slate-200 text-slate-500"}`}>
                    {done && !current ? <Check size={14} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="whitespace-nowrap md:whitespace-normal">
                    <span className={`block text-sm ${current ? "font-semibold text-[#6921A5]" : "font-medium text-slate-600"}`}>{s.title}</span>
                    {s.optional && <span className="block text-xs text-slate-400">Optional</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8" aria-labelledby="flow-step-title">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step {active + 1} of {steps.length}</p>
        <h2 id="flow-step-title" ref={heading} tabIndex={-1} className="mt-1 text-xl outline-none text-[#0F1A2E]">{step.title}</h2>
        {step.description && <p className="mt-1 text-sm text-slate-500">{step.description}</p>}

        <div className="mt-6">{step.content}</div>

        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-8 flex items-center gap-3">
          {active > 0 ? (
            <button type="button" onClick={() => go(active - 1)} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
          ) : onCancel ? (
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            {step.optional && !isLast && (
              <button type="button" onClick={next} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Skip</button>
            )}
            {isLast ? (
              <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-[#6921A5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#492F77] disabled:opacity-60">
                {submitting ? "Submitting..." : submitLabel}
              </button>
            ) : (
              <button type="button" onClick={next} className="rounded-lg bg-[#6921A5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#492F77]">Next</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
