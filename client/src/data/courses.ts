export interface Course {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  trainer: string;
  duration: string;
  startDate: string;
  mode: "Online" | "Offline";
  category: string;
  tags: string[];
  syllabus: string[];
  benefits: string[];
  seatsLeft: number;
  totalSeats: number;
  popular?: boolean;
  recommended?: boolean;
}

export const availableCourses: Course[] = [
  {
    id: "1",
    title: "Advanced Excel Mastery",
    description: "Master pivot tables, VLOOKUP, macros, and data visualization in Excel.",
    fullDescription: "This comprehensive course covers everything from intermediate to advanced Excel features. You'll learn pivot tables, complex formulas, macros, VBA basics, and professional dashboard creation.",
    trainer: "Rajesh Kumar",
    duration: "6 weeks",
    startDate: "2026-04-01",
    mode: "Online",
    category: "Excel",
    tags: ["Excel", "Data Analysis", "Productivity"],
    syllabus: ["Pivot Tables & Power Query", "VLOOKUP, INDEX-MATCH", "Conditional Formatting", "Macros & VBA Intro", "Dashboard Creation", "Real-world Case Studies"],
    benefits: ["Industry-ready Excel skills", "Certificate of completion", "Hands-on projects", "Lifetime access to resources"],
    seatsLeft: 5,
    totalSeats: 30,
    popular: true,
    recommended: true,
  },
  {
    id: "2",
    title: "Business English Communication",
    description: "Improve professional English for emails, presentations, and interviews.",
    fullDescription: "Designed for scholars who want to communicate confidently in professional settings. Covers email writing, presentation skills, interview preparation, and business vocabulary.",
    trainer: "Priya Mehta",
    duration: "8 weeks",
    startDate: "2026-04-07",
    mode: "Online",
    category: "English",
    tags: ["English", "Communication", "Soft Skills"],
    syllabus: ["Professional Email Writing", "Presentation Skills", "Interview Preparation", "Business Vocabulary", "Group Discussion Techniques", "Public Speaking Basics"],
    benefits: ["Improved confidence", "Professional communication certificate", "Mock interview sessions", "Peer practice groups"],
    seatsLeft: 12,
    totalSeats: 25,
    popular: true,
  },
  {
    id: "3",
    title: "Power BI Fundamentals",
    description: "Learn to create interactive dashboards and data reports using Power BI.",
    fullDescription: "Get hands-on with Microsoft Power BI. Learn to connect data sources, create visualizations, build dashboards, and share insights with stakeholders.",
    trainer: "Amit Singh",
    duration: "4 weeks",
    startDate: "2026-04-14",
    mode: "Online",
    category: "Power BI",
    tags: ["Power BI", "Data Visualization", "Analytics"],
    syllabus: ["Power BI Interface & Setup", "Connecting Data Sources", "DAX Formulas", "Creating Visualizations", "Building Dashboards", "Publishing & Sharing Reports"],
    benefits: ["Data visualization skills", "Portfolio-ready dashboards", "Microsoft certification prep", "Real datasets"],
    seatsLeft: 18,
    totalSeats: 30,
    recommended: true,
  },
  {
    id: "4",
    title: "CV Building & Personal Branding",
    description: "Craft a professional CV and build your personal brand for career success.",
    fullDescription: "Learn to create ATS-friendly CVs, write impactful cover letters, optimize LinkedIn profiles, and build a personal brand that stands out to recruiters.",
    trainer: "Neha Gupta",
    duration: "3 weeks",
    startDate: "2026-04-21",
    mode: "Offline",
    category: "Career",
    tags: ["CV", "Career", "Branding"],
    syllabus: ["ATS-Friendly CV Formats", "Cover Letter Writing", "LinkedIn Optimization", "Personal Branding Strategy", "Portfolio Building", "Networking Tips"],
    benefits: ["Professional CV template", "LinkedIn profile review", "1-on-1 mentoring session", "Career guidance"],
    seatsLeft: 8,
    totalSeats: 20,
  },
  {
    id: "5",
    title: "Python for Beginners",
    description: "Start your programming journey with Python fundamentals and mini projects.",
    fullDescription: "A beginner-friendly introduction to Python programming. Learn syntax, data structures, functions, and build mini projects including a calculator and data analyzer.",
    trainer: "Dr. Vikram Rao",
    duration: "8 weeks",
    startDate: "2026-05-01",
    mode: "Online",
    category: "Programming",
    tags: ["Python", "Programming", "Tech"],
    syllabus: ["Python Basics & Syntax", "Data Types & Structures", "Functions & Modules", "File Handling", "Libraries (NumPy, Pandas)", "Mini Projects"],
    benefits: ["Programming fundamentals", "Project-based learning", "Certificate", "Access to coding community"],
    seatsLeft: 22,
    totalSeats: 40,
    popular: true,
  },
  {
    id: "6",
    title: "Leadership & Teamwork",
    description: "Develop leadership qualities and learn effective team collaboration strategies.",
    fullDescription: "Build essential leadership and teamwork skills through interactive workshops, role-playing exercises, and real-world case studies from successful organizations.",
    trainer: "Sandeep Joshi",
    duration: "4 weeks",
    startDate: "2026-05-05",
    mode: "Offline",
    category: "Soft Skills",
    tags: ["Leadership", "Teamwork", "Soft Skills"],
    syllabus: ["Leadership Styles", "Team Dynamics", "Conflict Resolution", "Decision Making", "Motivating Others", "Case Studies"],
    benefits: ["Leadership certificate", "Team project experience", "Mentorship access", "Networking opportunities"],
    seatsLeft: 15,
    totalSeats: 25,
  },
];

export const upcomingCourses = [
  { id: "u1", title: "Data Science with R", startDate: "2026-06-01", status: "Coming Soon" },
  { id: "u2", title: "Digital Marketing Basics", startDate: "2026-06-15", status: "Coming Soon" },
  { id: "u3", title: "Financial Literacy", startDate: "2026-07-01", status: "Coming Soon" },
  { id: "u4", title: "Public Speaking Mastery", startDate: "2026-07-10", status: "Coming Soon" },
];
