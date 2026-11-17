// All resume content lives here. Components only read from this file.
// Source of truth: LinkedIn resume 2026 (plus intern details from the earlier CV).

export const PROFILE = {
  name: "Jovana Marčeta",
  first: "Jovana",
  initials: "JM",
  role: "Fullstack Software Engineer",
  email: "jmarcetadev@gmail.com",
  phone: "+381 600349140",
  phoneHref: "tel:+381600349140",
  location: "Novi Sad, Serbia",
  github: "https://github.com/jovana-marceta",
  linkedin: "https://www.linkedin.com/in/jovanamarceta",
  resume: "/jovana-marceta-fullstack-engineer.pdf",
  summary:
    "Full-stack Software Engineer with 6+ years of experience delivering large-scale web applications in EdTech and enterprise environments. I build backend services and REST APIs with .NET / C# and Node.js (NestJS), and modern user interfaces in Angular and React. I’ve led Angular version upgrades, refactored legacy modules, and optimized performance in production systems used by 1,000+ users. I care about clean architecture, readable code, and shipping features that work reliably end to end.",
  education:
    "First degree in Web Design from the Higher Education Technical School of Professional Studies in Novi Sad (VTSNS), grade 9.30 / 10.",
  quote:
    "Clean architecture, readable code, and features that work reliably end to end.",
} as const;

export const NAV = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "blog", label: "Blog" },
  { id: "community", label: "Community" },
  { id: "book", label: "Book", long: "Book a call" },
  { id: "contact", label: "Contact" },
] as const;

export const HERO_STATS = [
  { value: "6+", label: "years of experience" },
  { value: "1,000+", label: "users on systems I built" },
  { value: "9.30", label: "degree grade / 10" },
];

export const HERO_CHIPS = [
  { sym: "C#", title: ".NET · C#", sub: "ASP.NET Core · EF Core" },
  { sym: "Ne", title: "NestJS", sub: "Node.js · PostgreSQL" },
  { sym: "Ng", title: "Angular · React", sub: "TypeScript · RxJS" },
];

export const QUICK_FACTS = [
  { label: "Location", value: "Novi Sad, Serbia" },
  { label: "Now", value: "Software Developer · Red Black Tree" },
  { label: "Education", value: "First degree, Web Design — VTSNS, Novi Sad" },
  {
    label: "Languages",
    value:
      "Serbian — native · English — full professional · German — elementary",
  },
];

export const ID_CARD = {
  rows: [
    { label: "Dept.", value: "Full stack" },
    { label: "Based", value: "Novi Sad, RS" },
    { label: "Since", value: "2019" },
  ],
  back: [
    "Fullstack Software Engineer, 6+ years",
    ".NET / C# & NestJS on the back end, Angular & React on the front",
    "Web Design graduate (VTSNS) — 9.30 / 10",
    "Software Developer at Red Black Tree",
    "Conference speaker & WordPress community volunteer",
  ],
};

export type FamilyKey =
  | "lang"
  | "back"
  | "front"
  | "data"
  | "style"
  | "tools"
  | "craft";
export const FAMILIES: Record<FamilyKey, { label: string; c: string }> = {
  lang: { label: "Languages", c: "#8b5cf6" },
  back: { label: "Backend", c: "#5b21b6" },
  front: { label: "Frontend", c: "#7c3aed" },
  data: { label: "Databases", c: "#a21caf" },
  style: { label: "Styling", c: "#c026d3" },
  tools: { label: "Tools & DevOps", c: "#4f46e5" },
  craft: { label: "Practice", c: "#9333ea" },
};

export interface Skill {
  n: number;
  sym: string;
  name: string;
  fam: FamilyKey;
  used: string[];
  core: boolean;
}

/** Highlighted as main technologies in the Skills section */
const CORE = new Set([
  "C#",
  "TypeScript",
  ".NET 8",
  "ASP.NET Core",
  "NestJS",
  "Node.js",
  "Angular",
  "React",
  "MS SQL Server",
  "PostgreSQL",
  "Docker",
  "Microsoft Azure",
  "Tailwind CSS",
  "Clean architecture",
]);

/** Display order of the skill groups */
export const FAMILY_ORDER: FamilyKey[] = [
  "back",
  "front",
  "lang",
  "data",
  "tools",
  "style",
  "craft",
];

const RBT = "Red Black Tree",
  NL = "NovaLite",
  AD = "Adacta",
  PA = "PopArt Studio",
  LF = "LibraFire",
  VG = "Vega IT";

const RAW_SKILLS: [string, string, FamilyKey, string[]][] = [
  ["C#", "C#", "lang", [NL, AD]],
  ["Ts", "TypeScript", "lang", [RBT, NL, AD]],
  ["Js", "JavaScript", "lang", [AD, PA, LF, VG]],
  ["Ht", "HTML5", "lang", [NL, AD, PA, LF, VG]],
  ["Cs", "CSS3 / SCSS", "lang", [RBT, NL, AD, PA, LF, VG]],
  ["Sq", "T-SQL", "lang", [NL, AD]],
  ["Ph", "PHP", "lang", [NL, PA, LF]],
  ["Nt", ".NET 8", "back", [NL]],
  ["As", "ASP.NET Core", "back", [NL, AD]],
  ["Ne", "NestJS", "back", [RBT]],
  ["No", "Node.js", "back", [RBT]],
  ["Ef", "Entity Framework Core", "back", [NL]],
  ["Lq", "LINQ", "back", [NL]],
  ["To", "TypeORM", "back", [RBT]],
  ["Ap", "REST APIs", "back", [RBT, NL, AD]],
  ["Sw", "Swagger", "back", [RBT]],
  ["Jw", "JWT & Passport.js", "back", [RBT, NL]],
  ["Ng", "Angular", "front", [RBT, NL, AD]],
  ["Re", "React", "front", [NL]],
  ["Am", "Angular Material", "front", [NL]],
  ["Nx", "NgRx", "front", [RBT]],
  ["Rx", "RxJS", "front", [RBT, NL]],
  ["Fy", "Formly", "front", [NL]],
  ["Io", "Ionic", "front", [NL]],
  ["Wp", "WordPress", "front", [NL, PA, "WordCamp volunteer"]],
  ["Ms", "MS SQL Server", "data", [NL, AD]],
  ["Pg", "PostgreSQL", "data", [RBT]],
  ["Tw", "Tailwind CSS", "style", [RBT]],
  ["Bs", "Bootstrap", "style", [NL, AD, PA, LF, VG]],
  ["St", "Sass True", "style", [NL]],
  ["Sl", "Stylelint", "style", [NL]],
  ["Li", "Liquid templates", "style", [NL]],
  ["Gt", "Git", "tools", [RBT, AD, VG]],
  ["Dk", "Docker", "tools", [RBT]],
  ["Az", "Microsoft Azure", "tools", [NL]],
  ["Ad", "Azure DevOps CI/CD", "tools", [NL]],
  ["Je", "Jest", "tools", [RBT]],
  ["Ag", "Agile / Scrum", "craft", [RBT, NL, AD]],
  ["Ca", "Clean architecture", "craft", [RBT, NL]],
  ["Rw", "Responsive & accessible UI", "craft", [RBT, NL, AD, PA, LF, VG]],
];
export const SKILLS: Skill[] = RAW_SKILLS.map(([sym, name, fam, used], i) => ({
  n: i + 1,
  sym,
  name,
  fam,
  used,
  core: CORE.has(name),
}));

export interface StopPhoto {
  src: string;
  caption?: string;
}
export interface PathStop {
  kind: string;
  years: string;
  title: string;
  place: string;
  points: string[];
  tech?: string[];
  /** Optional team photos — put the files in public/experience/ */
  photos?: StopPhoto[];
}

// Chronological: education first, then roles.
export const PATH: PathStop[] = [
  {
    kind: "Education",
    years: "2012 — 2016",
    title: "Graphic Design",
    place: "Technical school “Mileva Marić Einstein”, Novi Sad",
    points: [],
  },
  {
    kind: "Education",
    years: "2016 — 2019",
    title: "First degree — Web Design",
    place:
      "Higher Education Technical School of Professional Studies in Novi Sad (VTSNS)",
    points: [
      "Grade: 9.30 / 10",
      "A practice-oriented program combining technical web development with visual design. Gained hands-on experience in building responsive, user-centered websites and web applications from concept to deployment, working with HTML, CSS, JavaScript, PHP, relational databases, and UI/UX principles."
    ],

  },
  {
    kind: "Internship",
    years: "03/2019 — 05/2019",
    title: "Software Developer Intern",
    place: "ComData doo · Novi Sad",
    points: [
      "Completed a 3-month software development internship working on an automotive logistics web application in an Agile/Scrum environment. Gained hands-on full-stack experience building front-end interfaces in Angular (including REST API integration and Identity Server authentication) and developing back-end services using C# (.NET) and SQL, while following OOP principles, best practices, and Git workflows"
    ],
  },
  {
    kind: "Role",
    years: "01/2020 — 07/2020",
    title: "Frontend Developer",
    place: "Vega IT Sourcing · Novi Sad",
     photos: [
      { src: "/experience/vega1.jpg", caption: "" },
    ],
    points: [
      "Creating pixel-perfect front-end pages and components for various web platforms",
      "Optimizing pages for various devices and browsers",
      "Developing web pages with performance and accessibility in mind",
      "Writing clean, consistent, and well-maintainable front-end code",
      "Staying up-to-date with web design and technology trends, researching new technologies and presenting them to the team",
    ],
    tech: [
      "HTML5",
      "CSS3",
      "SASS",
      "Bootstrap",
      "JavaScript",
      "jQuery",
      "npm",
      "Webpack",
      "Gulp",
      "Git",
    ],
  },
  {
    kind: "Internship",
    years: "11/2020 — 01/2021",
    title: "Frontend Developer — Intern",
    place: "LibraFire · Novi Sad",
    points: [
      "Created responsive web applications using Laravel and modern JavaScript frameworks",
      "Optimized application performance and ensured cross-device compatibility",
      "Ensured UI/UX designs were implemented with technical precision",
      "Delivered scalable, user-centric web solutions",
    ],
    tech: [
      "HTML",
      "CSS",
      "SCSS",
      "Bootstrap",
      "JavaScript",
      "jQuery",
      "PHP",
      "Laravel",
    ],
  },
  {
    kind: "Internship",
    years: "09/2021 — 11/2021",
    title: "Frontend Developer — Intern",
    place: "PopArt Studio · Novi Sad",
    points: [
      "Designed WordPress themes with HTML, CSS, PHP, focusing on custom templates and functionalities",
      "Applied PHP to create and manage custom WP queries, post types, and taxonomies",
      "Extended WordPress functionality using the Custom Fields plugin",
      "Produced responsive and user-friendly web designs with optimized code",
      "Ensured consistent performance across all major browsers",
    ],
    tech: ["HTML", "CSS", "SCSS", "Bootstrap", "PHP", "JavaScript"],
  },
  {
    kind: "Role",
    years: "12/2021 — 04/2023",
    title: "Software Developer",
    place: "Adacta · Belgrade",
    points: [
      "Built frontend features in Angular and contributed to backend endpoints in ASP.NET Core Web API (C#)",
      "Worked with MS SQL Server for data queries and debugging",
      "Developed, tested and maintained software, writing clean, careful code to find and fix issues",
      "Managed my own project priorities, deadlines and deliverables",
      "Worked with the team to turn research findings and usability insights into the final product",
      "Applied design thinking methods to generate new ideas and concepts",
      "Reviewed competitive products and market trends",
    ],
    tech: [
      "HTML5",
      "SCSS",
      "JavaScript",
      "TypeScript",
      "Angular",
      "C#",
      "ASP.NET Core",
      "MS SQL Server",
      "Git",
    ],
  },
  {
    kind: "Role",
    years: "05/2023 — 07/2025",
    title: "Software Developer",
    place: "NovaLite · Novi Sad",
    photos: [
      { src: "/experience/novalite1.jpg", caption: "Team day 2024" },
      { src: "/experience/novalite2.jpg", caption: "Sprint demo" },
      { src: "/experience/novalite3.jpg", caption: "Team day 2024" },
      { src: "/experience/novalite4.jpg", caption: "Sprint demo" },
      { src: "/experience/novalite5.jpg", caption: "Team day 2024" },
    ],
    points: [
      "Built full-stack web applications with ASP.NET Core (C#) on the backend and Angular/React on the frontend",
      "Designed and developed RESTful APIs with ASP.NET Core Web API, following clean architecture principles",
      "Implemented data access with Entity Framework Core and LINQ, and optimized T-SQL queries on MS SQL Server",
      "Implemented JWT authentication and role-based authorization",
      "Deployed applications to Microsoft Azure and set up CI/CD pipelines with Azure DevOps",
      "Migrated Angular and Bootstrap projects to newer versions, which improved performance and stability",
      "Built responsive, accessible UIs with HTML5 and SCSS in collaboration with UX/UI designers",
      "Used RxJS for async data handling and Formly for dynamic forms",
      "Developed PDF templates with Liquid and custom-styled email templates",
      "Took part in Agile/Scrum ceremonies, code reviews and sprint planning",
    ],
    tech: [
      "C#",
      ".NET 8",
      "ASP.NET Core",
      "Entity Framework Core",
      "LINQ",
      "MS SQL Server",
      "Microsoft Azure",
      "Angular",
      "Angular Material",
      "TypeScript",
      "SCSS",
      "WordPress",
      "PHP",
      "Bootstrap",
      "Formly",
      "Stylelint",
      "Sass True",
      "Liquid",
      "Ionic",
    ],
  },
  {
    kind: "Now",
    years: "07/2025 — present",
    title: "Software Developer",
    place: "Red Black Tree · Belgrade",
    points: [
      "Led end-to-end project delivery and communicated directly with clients",
      "Built backend services and RESTful APIs with NestJS (Node.js, TypeScript), using a modular architecture with controllers, services and DTOs",
      "Implemented data access with TypeORM and PostgreSQL, including migrations and query optimization",
      "Added request validation with class-validator and documented APIs with Swagger",
      "Developed responsive frontend features in Angular, with a focus on user experience",
      "Improved application performance and resolved server-side issues",
      "Managed code releases and deployments",
      "Coordinated requirements across frontend and backend work, and managed client expectations and timelines",
    ],
    tech: [
      "NestJS",
      "Node.js",
      "TypeScript",
      "PostgreSQL",
      "Passport.js",
      "JWT",
      "Swagger",
      "Jest",
      "Angular",
      "RxJS",
      "SCSS",
      "Git",
      "Docker",
    ],
  },
];

export type MilestoneIcon = "mic" | "hand" | "spark" | "cap" | "users";
export interface Milestone {
  icon: MilestoneIcon;
  label: string;
  title: string;
  detail: string;
  value: number;
  decimals?: number;
  suffix?: string;
  unit?: string;
  /** Years: count from a nearby value and render without thousands separators */
  plain?: boolean;
}

export const COMMUNITY: Milestone[] = [
  {
    icon: "spark",
    label: "Experience",
    title: "Fullstack software engineering",
    detail: ".NET · C# · NestJS · Angular · React",
    value: 6,
    suffix: "+",
    unit: "years",
  },
  {
    icon: "users",
    label: "Production",
    title: "Users on systems I helped optimize",
    detail: "EdTech & enterprise web applications",
    value: 1000,
    suffix: "+",
  },
  {
    icon: "cap",
    label: "Education",
    title: "First degree — Web Design",
    detail: "VTSNS, Novi Sad · 2016 — 2019",
    value: 9.3,
    decimals: 2,
    unit: "/ 10",
  },
  {
    icon: "mic",
    label: "Speaker · 09/2022",
    title: "Fullstack Development Conference",
    detail: "Websites Workshop — work principles & advice for beginners",
    value: 2022,
    plain: true,
  },
  {
    icon: "mic",
    label: "Panel speaker · 11/2023",
    title: "“IT and AI for Beginners in Business”",
    detail: "Novi Sad Youth Forum",
    value: 2023,
    plain: true,
  },
  {
    icon: "hand",
    label: "Volunteer",
    title: "WordCamp Apatin",
    detail: "Apatin",
    value: 2023,
    plain: true,
  },
  {
    icon: "hand",
    label: "Volunteer",
    title: "WordPress Developer Day",
    detail: "Novi Sad",
    value: 2026,
    plain: true,
  },
];

export const BOOKING_TOPICS = [
  "Job opportunity",
  "Freelance project",
  "Collaboration",
  "Speaking / community",
  "Just saying hi",
];
