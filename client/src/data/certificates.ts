export interface Certificate {
  id: string;
  courseName: string;
  completionDate: string;
  certificateId?: string;
  status: "claimable" | "claimed";
  claimedDate?: string;
  scholarName: string;
  trainerName: string;
  grade: string;
  isNew?: boolean;
}

export const certificatesData: Certificate[] = [
  {
    id: "cert-1",
    courseName: "Digital Literacy Essentials",
    completionDate: "2026-02-28",
    certificateId: "VAH-DLE-2026-0412",
    status: "claimed",
    claimedDate: "2026-03-01",
    scholarName: "Aryan Sharma",
    trainerName: "Anita Sharma",
    grade: "A",
  },
  {
    id: "cert-2",
    courseName: "Presentation Skills Workshop",
    completionDate: "2026-01-15",
    certificateId: "VAH-PSW-2026-0298",
    status: "claimed",
    claimedDate: "2026-01-16",
    scholarName: "Aryan Sharma",
    trainerName: "Sandeep Joshi",
    grade: "A+",
  },
  {
    id: "cert-3",
    courseName: "Basic Accounting & Finance",
    completionDate: "2025-12-10",
    status: "claimable",
    scholarName: "Aryan Sharma",
    trainerName: "Meera Patel",
    grade: "B+",
    isNew: true,
  },
];
