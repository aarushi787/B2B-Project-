// A cover image made from a name: same name, same picture. No upload, no external service, nothing to go missing.
const PALETTES = [
  ["#6921A5", "#4B99E4"], ["#492F77", "#6921A5"], ["#0F1A2E", "#4B99E4"], ["#6921A5", "#C27BD6"],
  ["#1E3A8A", "#6921A5"], ["#0F766E", "#4B99E4"], ["#7C3AED", "#EC4899"], ["#334155", "#6921A5"],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function CoverArt({ name, height = 160 }: { name?: string; height?: number }) {
  const text = (name || "B2BForCorporates").replace(/^\[[^\]]*\]\s*/, "").trim() || "B2B";
  const h = hash(text.toLowerCase());
  const [a, b] = PALETTES[h % PALETTES.length];
  const initials = text.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const shapes = [0, 1, 2].map((i) => ({ cx: (h >> (i * 5)) % 100, cy: (h >> (i * 7 + 3)) % 100, r: 22 + ((h >> (i * 3)) % 30) }));
  return (
    <svg role="img" aria-label={`Cover for ${text}`} viewBox="0 0 100 50" preserveAspectRatio="xMidYMid slice" style={{ display: "block", width: "100%", height }}>
      <defs><linearGradient id={`g${h}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="100" height="50" fill={`url(#g${h})`} />
      {shapes.map((s, i) => <circle key={i} cx={s.cx} cy={s.cy / 2} r={s.r / 2} fill="#fff" opacity={0.08 + i * 0.03} />)}
      <text x="50" y="30" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="Fraunces, serif">{initials}</text>
    </svg>
  );
}
