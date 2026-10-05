// Terms, Privacy and Help: plain-language public pages that share one layout.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "../SiteFooter";

const SUPPORT_EMAIL = ((import.meta as any).env?.VITE_SUPPORT_EMAIL as string | undefined) || "support@b2bforcorporates.com";
const UPDATED = "5 October 2026";

function Page({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label="B2BForCorporates home"><img src="/logo.png" alt="" className="h-9 w-auto" /></Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded text-[15px] font-semibold text-[#6921A5] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home</Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-[#0F1A2E]" style={{ fontFamily: "Fraunces, serif" }}>{title}</h1>
        {intro && <p className="mt-3 text-lg leading-relaxed text-slate-600">{intro}</p>}
        <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-700">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

const H = ({ children, id }: { children: ReactNode; id?: string }) => <h2 id={id} className="mb-2 scroll-mt-6 text-xl font-bold text-[#0F1A2E]">{children}</h2>;
const Ul = ({ items }: { items: string[] }) => <ul className="list-disc space-y-1.5 pl-6">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
const Mail = () => <a className="font-semibold text-[#6921A5] underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export function Terms() {
  return (
    <Page title="Terms of use" intro={`Last updated ${UPDATED}. These terms explain how B2BForCorporates may be used. By creating an account you agree to them.`}>
      <section><H>1. What B2BForCorporates is</H>
        <p>B2BForCorporates is a marketplace where businesses post requirements, send and compare proposals, negotiate, sign agreements and track milestones. We provide the tools. Each deal is made between the businesses themselves; we are not a party to it.</p></section>
      <section><H>2. Your account</H>
        <Ul items={[
          "Each account represents one company. Give accurate details and keep your password private.",
          "You are responsible for what happens under your account, including actions by people you give access to.",
          "Tell us at once if you think someone else has used your account.",
        ]} /></section>
      <section><H>3. Verification</H>
        <p>A verified badge means we checked something specific, such as an email address, a phone number or a document. It is not a guarantee of a business's quality, finances or conduct. Do your own checks before agreeing a deal.</p></section>
      <section><H>4. Deals, agreements and payments</H>
        <Ul items={[
          "A proposal, an agreement signed in the app and a milestone marked complete are records of what the parties agreed. Whether they are legally binding depends on the law that applies to you.",
          "Where payment through the platform is switched on, funds are held and released as the milestone rules show. Where it is not switched on, payments happen outside the platform and are between you and the other business.",
          "You are responsible for your own taxes, invoices and legal compliance, including GST where it applies.",
        ]} /></section>
      <section><H>5. What you must not do</H>
        <Ul items={[
          "Post false, misleading or illegal content, or pretend to be another business.",
          "Upload malware, scrape the service, or try to access accounts or data that are not yours.",
          "Use the service to harass others or to avoid the rules above.",
        ]} /></section>
      <section><H>6. Suspending accounts</H>
        <p>We may suspend or close an account that breaks these terms or puts others at risk. We will say why where we can. You may close your account at any time.</p></section>
      <section><H>7. Our responsibility</H>
        <p>We work to keep the service running and your data safe, but we cannot promise it will always be available or error-free. To the extent the law allows, we are not liable for losses from deals between businesses or from the service being unavailable.</p></section>
      <section><H>8. Changes and questions</H>
        <p>We may update these terms. If a change matters, we will tell you in the app or by email. Questions: <Mail />.</p></section>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy" intro={`Last updated ${UPDATED}. This explains what we collect, why, and the choices you have.`}>
      <section><H>What we collect</H>
        <Ul items={[
          "Account details: your name, email address, phone number and company details.",
          "Business content you add: requirements, proposals, messages, agreements, milestones and uploaded documents.",
          "Verification information: whether your email and phone are verified, and documents you submit for review.",
          "Technical data: your IP address, browser type and sign-in sessions, used to keep the service secure.",
        ]} /></section>
      <section><H>Why we use it</H>
        <Ul items={[
          "To run the service: sign you in, show your deals and send you notifications.",
          "To keep it safe: detect misuse, limit repeated attempts and keep an audit log of important actions.",
          "To verify businesses so others can trust who they deal with.",
        ]} />
        <p className="mt-2">We do not sell your personal data.</p></section>
      <section><H>Who can see it</H>
        <Ul items={[
          "Other businesses see your public company profile and verified badges, and the content of deals you share with them.",
          "Messages, agreements and documents are visible only to the businesses involved, and to platform administrators when needed to review a verification or resolve a problem.",
          "Service providers that help us run the product, such as email and SMS delivery, receive only what they need to deliver a message.",
        ]} /></section>
      <section><H>Cookies and sessions</H>
        <p>We use secure, httpOnly cookies to keep you signed in and to protect against forged requests. We do not use advertising cookies.</p></section>
      <section><H>How long we keep it</H>
        <p>We keep your data while your account is open. Records of signed agreements and the audit log are kept longer where needed for legal and security reasons.</p></section>
      <section><H>Your choices</H>
        <Ul items={[
          "See and correct your details in Settings.",
          "Switch email notifications on or off in Settings.",
          "Review and sign out of your devices in Settings.",
          "Ask us to export or delete your data using the address below.",
        ]} /></section>
      <section><H>Contact</H>
        <p>Privacy questions or requests: <Mail />.</p></section>
    </Page>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: "How do I get a verified badge?", a: "Open Verification in the menu. Verify your email (we send a link), verify your phone (we text a 6-digit code), then upload your business documents. An admin reviews them and you are notified when it is done." },
  { q: "I did not get the verification email.", a: "Check your spam folder, then use Resend on the Verification page. Links expire after 24 hours." },
  { q: "I did not get the SMS code.", a: "Make sure the number includes the country code, for example +91 98765 43210. You can ask for a new code once a minute. Codes last 10 minutes." },
  { q: "How do I post a requirement?", a: "Choose Post a requirement, describe what you need and your budget, and publish. Businesses can then send you proposals." },
  { q: "How does a deal start?", a: "When you accept a proposal, a deal is created between your company and the sender. Both sides then sign the agreement and track milestones in the deal." },
  { q: "How do milestones work?", a: "The provider marks a milestone as done, then the client confirms it. Each step is recorded so both sides see the same status." },
  { q: "I forgot my password.", a: "Use Forgot password on the sign-in page. We email you a link that works once and expires." },
  { q: "My account was suspended.", a: "Contact us with your company name and we will explain why and what to do next." },
];

export function Help() {
  return (
    <Page title="Help centre" intro="Quick answers to the most common questions. If yours is not here, write to us.">
      <section className="space-y-3" aria-label="Frequently asked questions">
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm">
            <summary className="cursor-pointer list-none text-[17px] font-semibold text-[#0F1A2E] marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]">{f.q}</summary>
            <p className="mt-2 text-base text-slate-600">{f.a}</p>
          </details>
        ))}
      </section>
      <section><H id="contact">Contact us</H>
        <p>Email <Mail />. Include your company name and what you were doing, and a screenshot if you can.</p></section>
    </Page>
  );
}
