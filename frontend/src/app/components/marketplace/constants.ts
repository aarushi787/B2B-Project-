export const CATEGORIES = [
  "Web Development", "App Development", "Software Development", "Cybersecurity", "Graphic Design",
  "UI/UX Design", "Digital Marketing", "Video & Animation", "Cloud & DevOps", "IT Consulting",
  "Data & AI", "Business Consulting", "Accounting & Finance", "Legal Services",
];

/** Budget presets on the "post a requirement" form: label -> [min, max] in rupees. */
export const BUDGET_PRESETS: Record<string, [number, number]> = {
  "Under 50k": [0, 50_000],
  "50K-1L": [50_000, 100_000],
  "1L-2L": [100_000, 200_000],
  "2L-5L": [200_000, 500_000],
};
