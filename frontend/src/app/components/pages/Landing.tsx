import { useEffect } from "react";
import { Link } from "react-router";
import {
  ArrowRight, BadgeCheck, FileSignature, GitCompareArrows, Handshake, Landmark, Lock, MessagesSquare,
  Receipt, ShieldCheck, Workflow,
} from "lucide-react";
import { CATEGORIES } from "../marketplace/constants";

// Everything on this page describes what the product does today, or is clearly labelled as coming soon.
// Do not add numbers (customers, savings, ratings), customer logos or testimonials until they are real.

const steps = [
  { title: "Post a requirement", desc: "Describe the work, your budget range and the timeline you need." },
  { title: "Receive proposals", desc: "Other businesses reply with their price, timeline, approach and deliverables." },
  { title: "Compare and negotiate", desc: "See every offer side by side, then counter-offer. Each round is kept on record." },
  { title: "Accept and start the deal", desc: "Accept the offer you prefer. A deal is created, and competing proposals close." },
];

const features = [
  {
    icon: GitCompareArrows,
    title: "Side-by-side comparison",
    desc: "Price, timeline and status for every proposal in one table, sortable by what matters to you.",
  },
  {
    icon: MessagesSquare,
    title: "Negotiation with a paper trail",
    desc: "Offers and counter-offers take turns, and the full history is saved, so everyone knows exactly what was agreed.",
  },
  {
    icon: Handshake,
    title: "One workspace per deal",
    desc: "Each deal shows which side you are on and what the next step is, so nothing waits on a forgotten email.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by design",
    desc: "Sessions are kept out of reach of page scripts, state-changing requests are checked against forgery, and admin tools are restricted to platform admins.",
  },
];

const comingSoon = [
  { icon: Landmark, title: "Escrow for milestone payments", desc: "Hold the payment safely and release it as milestones are delivered." },
  { icon: Receipt, title: "GST-ready invoicing", desc: "Tax invoices generated from the agreed deal." },
  { icon: BadgeCheck, title: "Verified business badges", desc: "GST and company checks shown on every profile." },
  { icon: FileSignature, title: "E-signed contracts", desc: "Sign the agreement in the platform." },
];

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/landing" className={`flex items-center rounded ${focusRing}`} aria-label="B2BForCorporates home">
          <img src="/logo.png" alt="" className="h-9 w-auto" />
        </Link>
        <div className="hidden flex-1 items-center gap-6 md:flex">
          <Link to="/services" className={`rounded text-sm font-medium text-slate-700 hover:text-blue-700 ${focusRing}`}>Services</Link>
          <Link to="/explore" className={`rounded text-sm font-medium text-slate-700 hover:text-blue-700 ${focusRing}`}>Explore businesses</Link>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-0">
          <Link to="/auth" className={`rounded px-2 py-1 text-sm font-medium text-slate-800 hover:text-blue-700 ${focusRing}`}>Sign in</Link>
          <Link
            to="/auth"
            className={`inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${focusRing}`}
          >
            Create account
          </Link>
        </div>
      </nav>
    </header>
  );
}

/** A decorative illustration of the comparison screen. The figures are made up and labelled as such. */
function ComparisonIllustration() {
  const rows = [
    { name: "Company A", price: "₹52,000", time: "4 weeks", status: "Submitted", tone: "bg-blue-50 text-blue-700" },
    { name: "Company B", price: "₹47,000", time: "5 weeks", status: "Shortlisted", tone: "bg-violet-50 text-violet-700", lowest: true },
    { name: "Company C", price: "₹58,500", time: "3 weeks", status: "Submitted", tone: "bg-blue-50 text-blue-700" },
  ];
  return (
    <figure className="relative">
      <div aria-hidden="true" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirement</p>
            <p className="text-sm font-bold text-slate-900">Cloud migration to AWS</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Open</span>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">{r.time}</p>
              </div>
              <p className="text-sm font-bold text-slate-900">{r.price}</p>
              {r.lowest && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">Lowest</span>}
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.tone}`}>{r.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-900">Your turn: accept the offer or send a counter-offer.</p>
          <span className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Counter offer</span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-500">Illustration with example data</figcaption>
    </figure>
  );
}

export function Landing() {
  useEffect(() => {
    document.title = "B2BForCorporates · Find, compare and negotiate with business partners";
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow"
      >
        Skip to content
      </a>
      <Navbar />

      <main id="main">
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50/70 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">For businesses that buy and sell services</p>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Find the right partner. Agree the terms in one place.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Post what you need, compare proposals side by side, negotiate openly and start a deal. Every offer and
                counter-offer is on record, so nothing gets lost in email threads.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 ${focusRing}`}
                >
                  Post a requirement <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link
                  to="/explore"
                  className={`inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 ${focusRing}`}
                >
                  Explore businesses
                </Link>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-slate-600">
                <Lock size={15} aria-hidden="true" /> Your account is one login. Any business can both ask for work and offer it.
              </p>
            </div>
            <ComparisonIllustration />
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">How it works</p>
          <h2 id="how-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">From requirement to deal in four steps</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">What you get</p>
            <h2 id="features-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Built to make the decision easy</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <f.icon size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Categories */}
        <section aria-labelledby="cat-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Categories</p>
          <h2 id="cat-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Ask for the work you need</h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  to="/services"
                  className={`inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-blue-600 hover:text-blue-700 ${focusRing}`}
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Coming soon */}
        <section aria-labelledby="soon-heading" className="bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-300">
              <Workflow size={14} aria-hidden="true" /> In development
            </p>
            <h2 id="soon-heading" className="mt-2 text-3xl font-bold tracking-tight text-white">Coming next</h2>
            <p className="mt-3 max-w-2xl text-slate-300">These are not available yet. We will announce them when they are.</p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {comingSoon.map((c) => (
                <li key={c.title} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
                  <c.icon size={22} className="text-blue-300" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-bold text-white">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{c.desc}</p>
                  <span className="mt-4 inline-block rounded-full border border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-200">Coming soon</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Call to action */}
        <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="rounded-3xl bg-blue-600 px-6 py-12 text-center sm:px-12">
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white">Ready to post your first requirement?</h2>
            <p className="mx-auto mt-3 max-w-xl text-blue-100">Create an account, describe what you need, and let businesses come to you with proposals.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className={`inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-blue-700 hover:bg-blue-50 ${focusRing}`}
              >
                Create account <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                to="/auth"
                className={`inline-flex items-center rounded-lg border border-blue-300 px-6 py-3 text-base font-semibold text-white hover:bg-blue-500 ${focusRing}`}
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <p className="text-sm text-slate-600">B2BForCorporates · Find, compare and negotiate with business partners.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/services" className={`rounded text-slate-700 hover:text-blue-700 ${focusRing}`}>Services</Link>
            <Link to="/explore" className={`rounded text-slate-700 hover:text-blue-700 ${focusRing}`}>Explore businesses</Link>
            <Link to="/auth" className={`rounded text-slate-700 hover:text-blue-700 ${focusRing}`}>Sign in</Link>
          </nav>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} B2BForCorporates. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
