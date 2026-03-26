export interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  trainer: string;
  category: string;
  progress: number; // 0-100
  nextClass?: string;
  deadline?: string;
  attendance: number; // percentage
  status: "ongoing" | "completed";
  completionDate?: string;
  grade?: string;
  certificateAvailable?: boolean;
  lastAccessed?: string;
  pendingAssignments?: number;
  tags: string[];
}

export const enrolledCourses: EnrolledCourse[] = [
  {
    id: "1",
    title: "Advanced Excel Mastery",
    description: "Master pivot tables, VLOOKUP, macros, and data visualization in Excel.",
    trainer: "Rajesh Kumar",
    category: "Excel",
    progress: 72,
    nextClass: "2026-03-20",
    deadline: "2026-04-15",
    attendance: 88,
    status: "ongoing",
    lastAccessed: "2026-03-17",
    pendingAssignments: 2,
    tags: ["Excel", "Data Analysis"],
  },
  {
    id: "2",
    title: "Business English Communication",
    description: "Improve professional English for emails, presentations, and interviews.",
    trainer: "Priya Mehta",
    category: "English",
    progress: 45,
    nextClass: "2026-03-21",
    deadline: "2026-05-01",
    attendance: 92,
    status: "ongoing",
    lastAccessed: "2026-03-16",
    pendingAssignments: 1,
    tags: ["English", "Communication"],
  },
  {
    id: "7",
    title: "Python for Beginners",
    description: "Start your programming journey with Python fundamentals and mini projects.",
    trainer: "Dr. Vikram Rao",
    category: "Programming",
    progress: 20,
    nextClass: "2026-03-22",
    deadline: "2026-06-01",
    attendance: 80,
    status: "ongoing",
    lastAccessed: "2026-03-15",
    pendingAssignments: 3,
    tags: ["Python", "Programming"],
  },
  {
    id: "10",
    title: "Digital Literacy Essentials",
    description: "Learn fundamental digital tools including Google Workspace and cloud basics.",
    trainer: "Anita Sharma",
    category: "Digital Skills",
    progress: 100,
    attendance: 95,
    status: "completed",
    completionDate: "2026-02-28",
    grade: "A",
    certificateAvailable: true,
    tags: ["Digital Skills", "Productivity"],
  },
  {
    id: "11",
    title: "Presentation Skills Workshop",
    description: "Create compelling presentations and deliver with confidence.",
    trainer: "Sandeep Joshi",
    category: "Soft Skills",
    progress: 100,
    attendance: 90,
    status: "completed",
    completionDate: "2026-01-15",
    grade: "A+",
    certificateAvailable: true,
    tags: ["Presentation", "Soft Skills"],
  },
  {
    id: "12",
    title: "Basic Accounting & Finance",
    description: "Understand financial statements, budgeting, and basic accounting principles.",
    trainer: "Meera Patel",
    category: "Finance",
    progress: 100,
    attendance: 85,
    status: "completed",
    completionDate: "2025-12-10",
    grade: "B+",
    certificateAvailable: true,
    tags: ["Finance", "Accounting"],
  },
];
