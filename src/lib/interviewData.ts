export type Language = "en" | "hi";

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
];

export const LANGUAGES: { id: Language; label: string; native: string; speechLang: string }[] = [
  { id: "en", label: "English", native: "English", speechLang: "en-US" },
  { id: "hi", label: "Hindi", native: "हिन्दी", speechLang: "hi-IN" },
];
