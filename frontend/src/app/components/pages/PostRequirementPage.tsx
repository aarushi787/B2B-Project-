// Post a requirement, one step at a time. The checks in each step match what the API requires, so a person is told
// what to fix on the step where they can fix it, not by a server error at the end.
import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { requirementsService } from "../../../services/requirementsService";
import { friendlyError } from "../../../lib/useLoad";
import { budgetLabel, parseAmount } from "../../../lib/format";
import { BUDGET_PRESETS, CATEGORIES } from "../marketplace/constants";
import { UserFlowStepper, type FlowStep } from "../UserFlowStepper";

const TIMELINES = ["ASAP", "Within 1 Month", "1-3 Month", "3-6 Month", "1-2 Year", "Flexible"];
const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${selected ? "border-2 border-[#6921A5] bg-[#F3E8F8] text-[#6921A5]" : "border border-slate-300 bg-white text-slate-700 hover:border-[#6921A5]"}`}
    >
      {children}
    </button>
  );
}

export function PostRequirementPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [service, setService] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [budgetPreset, setBudgetPreset] = useState("");
  const [timeline, setTimeline] = useState("");

  const budgetMin = parseAmount(minBudget);
  const budgetMax = parseAmount(maxBudget);

  const steps: FlowStep[] = [
    {
      id: "service",
      title: "Select service",
      description: "Choose the kind of work you need.",
      validate: () => (service ? null : "Choose a service to continue."),
      content: (
        <div className="flex flex-wrap gap-3" role="group" aria-label="Services">
          {CATEGORIES.map((c) => <Choice key={c} selected={service === c} onClick={() => setService(c)}>{c}</Choice>)}
        </div>
      ),
    },
    {
      id: "describe",
      title: "Describe your requirement",
      description: "The clearer you are, the better the proposals you receive.",
      validate: () =>
        title.trim().length < 3 ? "Give your requirement a title of at least 3 characters."
        : description.trim().length < 10 ? "Describe what you need in at least 10 characters."
        : null,
      content: (
        <div className="space-y-5">
          <label className="block text-sm font-semibold text-slate-800">Title *
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder="E.g. Build an e-commerce website" className={`${input} font-normal`} />
          </label>
          <label className="block text-sm font-semibold text-slate-800">Describe your requirement *
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={7} placeholder="What do you need, what does done look like, and anything the provider should know?" className={`${input} font-normal resize-y`} />
            <span className="mt-1 block text-xs font-normal text-slate-400">{description.trim().length} / 5000</span>
          </label>
        </div>
      ),
    },
    {
      id: "budget",
      title: "Budget",
      description: "Optional. A range helps providers send realistic offers.",
      optional: true,
      validate: () =>
        minBudget.trim() && budgetMin === undefined ? "Enter the minimum budget as a number, for example 10000 or 1.5L."
        : maxBudget.trim() && budgetMax === undefined ? "Enter the maximum budget as a number, for example 30000 or 2L."
        : budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax ? "The minimum budget cannot be higher than the maximum."
        : null,
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-800">Minimum
              <input value={minBudget} onChange={(e) => { setMinBudget(e.target.value); setBudgetPreset(""); }} placeholder="₹ 10,000" inputMode="decimal" className={`${input} font-normal`} />
            </label>
            <label className="text-sm font-semibold text-slate-800">Maximum
              <input value={maxBudget} onChange={(e) => { setMaxBudget(e.target.value); setBudgetPreset(""); }} placeholder="₹ 30,000" inputMode="decimal" className={`${input} font-normal`} />
            </label>
            <label className="text-sm font-semibold text-slate-800">Currency
              <input disabled value="INR" className={`${input} bg-slate-50 font-normal`} />
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Quick range</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {Object.keys(BUDGET_PRESETS).map((r) => (
                <Choice key={r} selected={budgetPreset === r} onClick={() => { setBudgetPreset(r); setMinBudget(String(BUDGET_PRESETS[r][0])); setMaxBudget(String(BUDGET_PRESETS[r][1])); }}>{r}</Choice>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "timeline",
      title: "Timeline",
      description: "Optional. When do you need the work done?",
      optional: true,
      content: (
        <div className="flex flex-wrap gap-3" role="group" aria-label="Timeline">
          {TIMELINES.map((t) => <Choice key={t} selected={timeline === t} onClick={() => setTimeline(timeline === t ? "" : t)}>{t}</Choice>)}
        </div>
      ),
    },
    {
      id: "review",
      title: "Review and submit",
      description: "Check everything before you post. You can go back to change anything.",
      content: (
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {[
            ["Service", service || "Not chosen"],
            ["Title", title.trim() || "Not set"],
            ["Description", description.trim() || "Not set"],
            ["Budget", budgetMin !== undefined || budgetMax !== undefined ? budgetLabel(budgetMin ?? null, budgetMax ?? null) : "Open budget"],
            ["Timeline", timeline || "Not specified"],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
              <dt className="text-sm font-semibold text-slate-500">{k}</dt>
              <dd className="text-sm text-slate-800 whitespace-pre-wrap break-words">{v}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ];

  const submit = async () => {
    setSubmitting(true);
    try {
      await requirementsService.create({
        title: title.trim(),
        description: description.trim(),
        category: service,
        budgetMin,
        budgetMax,
        timeline: timeline || undefined,
      });
      toast.success("Requirement posted successfully!");
      navigate("/app/requirements/active");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl text-[#0F1A2E]">Post a requirement</h1>
          <p className="mt-2 text-base text-slate-600">Tell us what you need and we will connect you with relevant businesses.</p>
        </div>
        <UserFlowStepper steps={steps} onSubmit={submit} submitting={submitting} submitLabel="Post requirement" onCancel={() => navigate(-1)} />
      </div>
    </div>
  );
}
