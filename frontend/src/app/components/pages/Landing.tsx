import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, BadgeCheck, FileSignature, GitCompareArrows, Handshake, Landmark, Lock, MessagesSquare,
  Receipt, ShieldCheck, Workflow, Menu, X,
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
    icon: BadgeCheck,
    title: "Verified business badges",
    desc: "Admin-reviewed businesses carry a Verified badge, and every profile shows whether its GST number passes the format and check-digit test.",
  },
  {
    icon: FileSignature,
    title: "E-signed agreements",
    desc: "Generate an agreement from the terms you both accepted, and each company signs it in the deal. Every signature records the time and a fingerprint of the exact text.",
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
];

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6921A5] focus-visible:ring-offset-2";

const navLinks = [
  { to: "/services", label: "Services" },
  { to: "/explore", label: "Explore businesses" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b bg-[#F8F9FB]/85 backdrop-blur-md transition-shadow ${scrolled ? "border-[#E2E8F0] shadow-[0_1px_24px_rgba(105,33,165,0.06)]" : "border-transparent"}`}>
      <nav aria-label="Main" className="mx-auto flex h-20 max-w-6xl items-center gap-10 px-4 sm:px-6">
        <Link to="/landing" className={`flex items-center gap-3 rounded-sm ${focusRing}`} aria-label="B2BForCorporates home">
          <img src="/logo.png" alt="" className="h-10 w-auto" />
          <span className="hidden font-[Fraunces] text-xl tracking-tight text-[#6921A5] sm:block">B2BForCorporates</span>
        </Link>
        <div className="hidden flex-1 items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`group relative rounded-sm py-1 text-[15px] font-medium text-[#0F1A2E]/75 transition-colors hover:text-[#6921A5] ${focusRing}`}
            >
              {l.label}
              <span aria-hidden="true" className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[#7BB8F7] transition-transform group-hover:scale-x-100" />
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <Link to="/auth" className={`hidden rounded-sm px-3 py-2 text-[15px] font-medium text-[#0F1A2E] hover:text-[#4B99E4] sm:block ${focusRing}`}>Sign in</Link>
          <Link
            to="/auth"
            className={`inline-flex items-center gap-1.5 rounded-sm bg-[#6921A5] px-5 py-2.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-[#492F77] ${focusRing}`}
          >
            Get started <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`rounded-sm p-2 text-[#6921A5] md:hidden ${focusRing}`}
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-[#E2E8F0] bg-[#F8F9FB] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6">
            {[...navLinks, { to: "/auth", label: "Sign in" }].map((l) => (
              <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className={`rounded-sm py-3 text-base font-medium text-[#0F1A2E] ${focusRing}`}>{l.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

/** A decorative illustration of the comparison screen. The figures are made up and labelled as such. */
function ComparisonIllustration({ className = "" }: { className?: string }) {
  const rows = [
    { name: "Company A", price: "₹52,000", time: "4 weeks", status: "Submitted", tone: "bg-[#F3E8F8] text-[#4B99E4]" },
    { name: "Company B", price: "₹47,000", time: "5 weeks", status: "Shortlisted", tone: "bg-[#F3E8F8] text-[#4B99E4]", lowest: true },
    { name: "Company C", price: "₹58,500", time: "3 weeks", status: "Submitted", tone: "bg-[#F3E8F8] text-[#4B99E4]" },
  ];
  return (
    <figure className={`relative ${className}`}>
      <div aria-hidden="true" className="rounded-sm border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirement</p>
            <p className="text-sm font-bold text-slate-900">Cloud migration to AWS</p>
          </div>
          <span className="rounded-full bg-[#F3E8F8] px-3 py-1 text-xs font-semibold text-[#6921A5]">Open</span>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3 rounded-sm border border-slate-100 bg-[#F3E8F8] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">{r.time}</p>
              </div>
              <p className="text-sm font-bold text-slate-900">{r.price}</p>
              {r.lowest && <span className="rounded-full bg-[#F3E8F8] px-2 py-0.5 text-[12px] font-bold text-[#6921A5]">Lowest</span>}
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${r.tone}`}>{r.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-sm bg-[#F3E8F8] px-4 py-3">
          <p className="text-xs font-medium text-[#6921A5]">Your turn: accept the offer or send a counter-offer.</p>
          <span className="rounded-sm bg-[#6921A5] px-3 py-1.5 text-xs font-semibold text-white">Counter offer</span>
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
    <div className="min-h-screen bg-[#F8F9FB] font-sans text-[#0F1A2E]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow"
      >
        Skip to content
      </a>
      <Navbar />

      <main id="main">
        {/* Hero */}
        <section className="bg-[#F8F9FB]">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-10 sm:px-6 md:pb-28 md:pt-16 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#4B99E4]">
                <span aria-hidden="true" className="h-px w-8 bg-[#7BB8F7]" /> For businesses that buy and sell services
              </p>
              <h1 className="text-5xl font-medium leading-[1.05] tracking-tight text-[#6921A5] sm:text-6xl lg:text-[4.25rem]">
                Find the right partner. <span className="italic text-[#4B99E4]">Agree the terms</span> in one place.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#0F1A2E]/70">
                Post what you need, compare proposals side by side, negotiate openly and start a deal. Every offer and
                counter-offer is on record, so nothing gets lost in email threads.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className={`inline-flex items-center gap-2 rounded-sm bg-[#6921A5] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#492F77] ${focusRing}`}
                >
                  Post a requirement <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link
                  to="/explore"
                  className={`inline-flex items-center rounded-sm border border-[#6921A5]/25 px-7 py-3.5 text-base font-semibold text-[#6921A5] transition-colors hover:border-[#6921A5] hover:bg-white ${focusRing}`}
                >
                  Explore businesses
                </Link>
              </div>
              <ul className="mt-12 grid max-w-xl gap-x-8 gap-y-3 border-t border-[#E2E8F0] pt-6 text-sm text-[#0F1A2E]/75 sm:grid-cols-3">
                {["Compare side by side", "Negotiate on record", "One workspace per deal"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <BadgeCheck size={16} className="shrink-0 text-[#4B99E4]" aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 text-sm text-[#0F1A2E]/60">
                <Lock size={14} aria-hidden="true" /> One login. Any business can both ask for work and offer it.
              </p>
            </div>

            <div className="relative lg:pb-14 lg:pl-6">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80"
                alt="A team of colleagues reviewing a proposal around a table"
                className="aspect-[4/5] w-full rounded-sm object-cover shadow-[0_30px_80px_-30px_rgba(105,33,165,0.45)] sm:aspect-[5/4] lg:aspect-[4/5]"
                loading="eager"
              />
              <ComparisonIllustration className="mt-6 lg:absolute lg:-bottom-2 lg:-left-6 lg:mt-0 lg:w-[78%]" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B99E4]">How it works</p>
          <h2 id="how-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">From requirement to deal in four steps</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-sm border border-slate-200 bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6921A5] text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="bg-[#F3E8F8]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B99E4]">What you get</p>
            <h2 id="features-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Built to make the decision easy</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f.title} className="flex gap-4 rounded-sm border border-slate-200 bg-white p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#F3E8F8] text-[#4B99E4]">
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B99E4]">Categories</p>
          <h2 id="cat-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Ask for the work you need</h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  to="/services"
                  className={`inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-[#6921A5] hover:text-[#4B99E4] ${focusRing}`}
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Coming soon */}
        <section aria-labelledby="soon-heading" className="bg-[#492F77]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#7BB8F7]">
              <Workflow size={14} aria-hidden="true" /> In development
            </p>
            <h2 id="soon-heading" className="mt-2 text-3xl font-bold tracking-tight text-white">Coming next</h2>
            <p className="mt-3 max-w-2xl text-slate-300">These are not available yet. We will announce them when they are.</p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {comingSoon.map((c) => (
                <li key={c.title} className="rounded-sm border border-slate-700 bg-white/5 p-6">
                  <c.icon size={22} className="text-[#7BB8F7]" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-bold text-white">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{c.desc}</p>
                  <span className="mt-4 inline-block rounded-full border border-slate-600 px-2.5 py-1 text-[12px] font-semibold text-slate-200">Coming soon</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-hidden="true" className="relative h-72 md:h-96">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80" alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-[#6921A5]/50" />
          <p className="relative mx-auto flex h-full max-w-6xl items-end px-4 pb-10 font-[Fraunces] text-3xl text-white sm:px-6 md:text-5xl">Good deals start with clear terms.</p>
        </section>

        {/* Call to action */}
        <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="rounded-sm bg-[#6921A5] px-6 py-12 text-center sm:px-12">
            <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-white">Ready to post your first requirement?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">Create an account, describe what you need, and let businesses come to you with proposals.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className={`inline-flex items-center gap-2 rounded-sm bg-white px-6 py-3 text-base font-semibold text-[#4B99E4] hover:bg-[#F3E8F8] ${focusRing}`}
              >
                Create account <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                to="/auth"
                className={`inline-flex items-center rounded-sm border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 ${focusRing}`}
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
            <Link to="/services" className={`rounded text-slate-700 hover:text-[#4B99E4] ${focusRing}`}>Services</Link>
            <Link to="/explore" className={`rounded text-slate-700 hover:text-[#4B99E4] ${focusRing}`}>Explore businesses</Link>
            <Link to="/auth" className={`rounded text-slate-700 hover:text-[#4B99E4] ${focusRing}`}>Sign in</Link>
          </nav>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} B2BForCorporates. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
