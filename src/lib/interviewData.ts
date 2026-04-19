export type Role = {
  id: string;
  title: string;
  blurb: string;
  questions: string[];
};

export const ROLES: Role[] = [
  {
    id: "software-developer",
    title: "Software Developer",
    blurb: "Algorithms, system design, debugging mindset.",
    questions: [
      "Walk me through a recent project you're proud of. What was your specific contribution?",
      "How do you approach debugging a problem you've never seen before?",
      "Explain the difference between SQL and NoSQL databases, and when you'd choose one.",
      "Describe a time you had to refactor messy code. How did you decide what to change first?",
      "How do you stay current with new technologies without getting overwhelmed?",
    ],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    blurb: "SQL, storytelling with data, business sense.",
    questions: [
      "Tell me about a dataset you analyzed that changed a business decision.",
      "How do you handle missing or inconsistent data in a real-world dataset?",
      "Walk me through how you'd measure the success of a new product feature.",
      "What's the difference between correlation and causation? Give an example.",
      "How do you communicate complex findings to non-technical stakeholders?",
    ],
  },
  {
    id: "product-manager",
    title: "Product Manager",
    blurb: "Prioritization, user empathy, cross-functional leadership.",
    questions: [
      "How do you prioritize features when engineering, design, and sales all disagree?",
      "Tell me about a product you launched that didn't perform as expected. What did you learn?",
      "How do you decide what NOT to build?",
      "Walk me through how you'd improve a product you use every day.",
      "How do you align a team around a roadmap when priorities shift mid-quarter?",
    ],
  },
  {
    id: "ux-designer",
    title: "UX Designer",
    blurb: "Research, prototyping, design systems.",
    questions: [
      "Describe your design process from research to handoff.",
      "How do you handle feedback that conflicts with user research findings?",
      "Tell me about a time you had to design with severe constraints.",
      "How do you measure if a design is successful after launch?",
      "What's your approach to designing for accessibility from the start?",
    ],
  },
];

// Lightweight mock scoring — counts words, looks for structure markers, etc.
export function scoreAnswer(answer: string): { score: number; feedback: string } {
  const trimmed = answer.trim();
  if (!trimmed) return { score: 0, feedback: "No response recorded. Try answering aloud or in writing — even a brief framework helps." };

  const words = trimmed.split(/\s+/).length;
  const hasStructure = /\b(first|second|then|finally|because|for example|so that|result)\b/i.test(trimmed);
  const hasMetric = /\b(\d+%|\d+x|\$\d+|users|customers|team)\b/i.test(trimmed);

  let score = 40;
  if (words > 30) score += 15;
  if (words > 80) score += 15;
  if (words > 150) score += 5;
  if (hasStructure) score += 15;
  if (hasMetric) score += 10;
  score = Math.min(100, score);

  const tips: string[] = [];
  if (words < 50) tips.push("Expand with a concrete example — interviewers want specifics, not summaries.");
  if (!hasStructure) tips.push("Try the STAR framework: Situation, Task, Action, Result.");
  if (!hasMetric) tips.push("Quantify your impact when possible — numbers make answers memorable.");
  if (tips.length === 0) tips.push("Strong, structured answer. Tighten the opening for even more impact.");

  return { score, feedback: tips.join(" ") };
}
