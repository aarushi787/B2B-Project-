import { Link } from "react-router";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6921A5]";
const link = `rounded text-slate-700 hover:text-[#6921A5] ${focusRing}`;

/** The footer for every public page: where to go, and the legal pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className={`inline-flex items-center gap-3 rounded ${focusRing}`} aria-label="B2BForCorporates home">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <span className="text-base font-bold text-slate-900">B2BForCorporates</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">Find, compare and negotiate with verified business partners, then sign and track the deal in one place.</p>
        </div>
        <nav aria-label="Product" className="text-sm">
          <p className="mb-3 font-bold text-slate-900">Product</p>
          <ul className="space-y-2">
            <li><Link to="/services" className={link}>Services</Link></li>
            <li><Link to="/explore" className={link}>Explore businesses</Link></li>
            <li><Link to="/auth" className={link}>Sign in</Link></li>
          </ul>
        </nav>
        <nav aria-label="Support" className="text-sm">
          <p className="mb-3 font-bold text-slate-900">Support</p>
          <ul className="space-y-2">
            <li><Link to="/help" className={link}>Help centre</Link></li>
            <li><Link to="/help#contact" className={link}>Contact us</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-sm">
          <p className="mb-3 font-bold text-slate-900">Legal</p>
          <ul className="space-y-2">
            <li><Link to="/terms" className={link}>Terms of use</Link></li>
            <li><Link to="/privacy" className={link}>Privacy policy</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} B2BForCorporates. All rights reserved.
      </div>
    </footer>
  );
}
