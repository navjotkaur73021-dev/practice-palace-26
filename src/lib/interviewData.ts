export type Language = "en" | "hi" | "pa";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionFormat = "open" | "mcq" | "mixed";

export type Role = {
  id: string;
  title: string;
  blurb: string;
  questions?: string[]; // populated at runtime by AI
};

export const ROLES: Role[] = [
  {
    id: "software-developer",
    title: "Software Developer",
    blurb: "Algorithms, system design, debugging mindset.",
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    blurb: "SQL, storytelling with data, business sense.",
  },
  {
    id: "product-manager",
    title: "Product Manager",
    blurb: "Prioritization, user empathy, cross-functional leadership.",
  },
  {
    id: "ux-designer",
    title: "UX Designer",
    blurb: "Research, prototyping, design systems.",
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    blurb: "Statistics, ML modeling, experimentation.",
  },
  {
    id: "python-developer",
    title: "Python Developer",
    blurb: "Pythonic code, APIs, automation, testing.",
  },
  {
    id: "bank-po",
    title: "Bank PO",
    blurb: "Banking awareness, reasoning, quantitative aptitude.",
  },
  {
    id: "school-teacher",
    title: "School Teacher",
    blurb: "Pedagogy, classroom management, subject expertise.",
  },
  {
    id: "hr-manager",
    title: "HR Manager",
    blurb: "People ops, conflict resolution, hiring.",
  },
  {
    id: "civil-engineer",
    title: "Civil Engineer",
    blurb: "Structural design, site management, safety.",
  },
];

export const LANGUAGES: { id: Language; label: string; native: string; speechLang: string }[] = [
  { id: "en", label: "English", native: "English", speechLang: "en-US" },
  { id: "hi", label: "Hindi", native: "हिन्दी", speechLang: "hi-IN" },
  { id: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", speechLang: "pa-IN" },
];

export const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Warm-up, fundamentals" },
  { id: "medium", label: "Medium", hint: "Realistic interview level" },
  { id: "hard", label: "Hard", hint: "Senior / stretch questions" },
];
