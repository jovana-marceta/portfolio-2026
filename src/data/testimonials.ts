// Recommendations from colleagues (from LinkedIn).
// `highlight` is a phrase from the text that gets emphasised; leave it out if you don't want one.

export interface Testimonial {
  name: string;
  role: string;
  /** How you worked together, as LinkedIn shows it */
  relation: string;
  date: string;
  paragraphs: string[];
  highlight?: string;
}

export const RECOMMENDATIONS_URL = "https://www.linkedin.com/in/jovanamarceta/details/recommendations/";

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Saša Jevremović",
    role: "Software Engineer @ Arcadis",
    relation: "Worked with Jovana on the same team",
    date: "April 2025",
    highlight: "a sharp eye for UI design and a deep understanding of CSS",
    paragraphs: [
      "I've had the pleasure of working with Jovana, and I can confidently say she has a sharp eye for UI design and a deep understanding of CSS. Her ability to turn design concepts into clean, responsive interfaces is unmatched. Whether it's fine-tuning visual details or ensuring seamless user experiences, Jovana consistently delivers high-quality work with speed and precision. She's a true asset to any front-end team.",
    ],
  },
  {
    name: "Katarina Marković",
    role: "Senior Full Stack .NET Developer",
    relation: "Senior to Jovana, didn't manage her directly",
    date: "December 2024",
    highlight: "rapid development and maturing as a professional and a team player",
    paragraphs: [
      "Working with Jovana on several different projects, I had witnessed her rapid development and maturing as a professional and a team player.",
      "Well organized, disciplined and with strong attention to detail is what makes her a perfect fit for any team in need of a competent FE developer.",
      "What also makes me respect her as a colleague is her relentless drive for self improvement.",
      "I hope I will have a chance of working with Jovana again on some future awesome project.",
    ],
  },
];
