import type {
  Application,
  DashboardStats,
  DraftEmail,
  MatchAnalysis,
  Profile,
  Resume,
  TailorRequest,
  TailorResponse,
} from "./types";

const profile: Profile = {
  id: "me",
  fullName: "John Doe",
  email: "john.doe@example.com",
  headline: "Senior Full-Stack Engineer",
  baseResumeId: "base-1",
  createdAt: "2026-01-10T00:00:00Z",
};

const baseResume: Resume = {
  id: "base-1",
  title: "Base Resume",
  isBase: true,
  content: `John Doe
San Francisco, CA | john.doe@example.com | (555) 123-4567

PROFESSIONAL SUMMARY
Full-stack engineer with 5+ years of experience building scalable web applications in React, TypeScript, and Python.

EXPERIENCE
Senior Software Engineer | Tech Innovations Inc. | 2023-Present
- Led frontend rebuild in Next.js, improving engagement 35%.
- Mentored 4 engineers and drove the team's migration to TypeScript.

Software Engineer | DataFlow Systems | 2021-2023
- Built RESTful APIs with FastAPI serving 10K+ DAU.
- Cut DB query latency 40% through index and query tuning.

EDUCATION
B.S. Computer Science | UC Berkeley | 2020`,
  createdAt: "2026-01-10T00:00:00Z",
};

const resumes: Resume[] = [
  baseResume,
  {
    id: "r-1",
    title: "Senior Frontend Engineer @ Tech Innovations",
    applicationId: "a-1",
    content: baseResume.content,
    createdAt: "2026-04-20T00:00:00Z",
  },
  {
    id: "r-2",
    title: "Full Stack Developer @ DataFlow Systems",
    applicationId: "a-2",
    content: baseResume.content,
    createdAt: "2026-04-18T00:00:00Z",
  },
];

const applications: Application[] = [
  {
    id: "a-1",
    company: "Tech Innovations Inc.",
    position: "Senior Frontend Engineer",
    jobUrl: "https://example.com/jobs/frontend",
    jobDescription:
      "We are seeking a Senior Frontend Engineer with 5+ years of React and TypeScript experience to join our growing team.",
    matchScore: 92,
    status: "interview",
    resumeId: "r-1",
    coverLetter:
      "Dear Hiring Manager,\n\nI am excited to apply for the Senior Frontend Engineer role...",
    gaps: [
      { skill: "GraphQL", severity: "low", note: "Mentioned as a nice-to-have." },
      { skill: "Team leadership", severity: "medium" },
    ],
    createdAt: "2026-04-20T00:00:00Z",
  },
  {
    id: "a-2",
    company: "DataFlow Systems",
    position: "Full Stack Developer",
    jobDescription:
      "Full Stack Developer to build customer-facing tools in Python and React.",
    matchScore: 78,
    status: "applied",
    resumeId: "r-2",
    coverLetter: "Dear DataFlow team,\n\nI'd love to contribute to...",
    gaps: [{ skill: "Kubernetes", severity: "high" }],
    createdAt: "2026-04-18T00:00:00Z",
  },
  {
    id: "a-3",
    company: "CloudFirst Solutions",
    position: "DevOps Engineer",
    jobDescription: "DevOps Engineer with AWS and Terraform expertise.",
    matchScore: 68,
    status: "rejected",
    gaps: [
      { skill: "Terraform", severity: "high" },
      { skill: "AWS ECS", severity: "medium" },
    ],
    createdAt: "2026-04-10T00:00:00Z",
  },
];

const stats: DashboardStats = {
  applications: applications.length,
  interviews: applications.filter((a) => a.status === "interview").length,
  averageMatchScore: Math.round(
    applications.reduce((sum, a) => sum + a.matchScore, 0) / applications.length,
  ),
  resumesGenerated: resumes.filter((r) => !r.isBase).length,
};

async function delay<T>(value: T, ms = 350): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  return value;
}

export const mockApi = {
  async getProfile(): Promise<Profile> {
    return delay(profile);
  },
  async getStats(): Promise<DashboardStats> {
    return delay(stats);
  },
  async listApplications(): Promise<Application[]> {
    return delay(applications);
  },
  async getApplication(id: string): Promise<Application | undefined> {
    return delay(applications.find((a) => a.id === id));
  },
  async listResumes(): Promise<Resume[]> {
    return delay(resumes);
  },
  async getResume(id: string): Promise<Resume | undefined> {
    return delay(resumes.find((r) => r.id === id));
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async tailor(_req: TailorRequest): Promise<TailorResponse> {
    const id = `a-${Date.now()}`;
    const resumeId = `r-${Date.now()}`;

    const analysis: MatchAnalysis = {
      originalScore: 72,
      tailoredScore: 85,
      improvement: 13,
      whatWeImproved: [
        "Rewrote the professional summary to align with the role's emphasis on scalable systems.",
        "Reordered core skills to front-load technologies mentioned in the job description.",
        "Refined experience bullet points to surface specific achievements and cross-functional work.",
      ],
      strengths: [
        "Strong full-stack background with demonstrated delivery of production-grade applications.",
        "Proven track record mentoring engineers and leading technical migrations.",
      ],
      remainingDeficits: [
        "Remote-first and async collaboration experience is not explicitly highlighted.",
        "No concrete examples of bug resolution or automated testing practices.",
      ],
      matchedKeywords: [
        "RESTful API design",
        "databases",
        "deploy and ship software features",
        "technical implementations",
        "collaborate with engineers, PMs, and QA",
        "automated tests",
        "code quality",
      ],
      missingKeywords: [
        "remote-first",
        "async environment",
        "strong communication skills",
        "identify and resolve bugs, bottlenecks, and technical debt",
      ],
      suggestions: [
        "Highlight any experience working in remote or asynchronous environments.",
        "Include examples of identifying and resolving bugs or technical debt.",
        "Emphasise strong communication skills in the professional summary.",
        "Add specific instances of writing automated tests.",
        "Mention any experience with code documentation practices.",
      ],
    };

    const draftEmail: DraftEmail = {
      subject: "Application for Software Developer Position",
      body: `Hi [Hiring Manager's Name],

I came across the Software Developer role at [Company Name] and I'm very excited about the opportunity. With over five years of experience building scalable full-stack applications in Python, FastAPI, and React, I believe I'd be a strong fit for your team.

I've attached my tailored resume for your review. I'd love the chance to learn more about the role and discuss how I can contribute to your platform.

Would you be open to a quick call this week or next?

Best regards,
John Doe
john.doe@example.com | +1 (555) 123-4567
LinkedIn: linkedin.com/in/johndoe`,
    };

    return delay(
      {
        applicationId: id,
        matchScore: analysis.tailoredScore,
        draftEmail,
        resume: {
          id: resumeId,
          title: "Tailored resume",
          applicationId: id,
          content: baseResume.content,
          createdAt: new Date().toISOString(),
        },
        coverLetter: `Dear Hiring Manager,

I am writing to express my interest in the Software Developer position. With over five years of experience designing, developing, and optimizing scalable software solutions, I am confident in my ability to contribute effectively to your fast-growing platform.

In my current role I have successfully designed and built systems that process over a million transactions daily, ensuring high availability and scalability. My experience includes developing and deploying production-grade applications using Python, FastAPI, and React, which aligns well with your requirement for expertise in modern programming languages.

I am adept at translating product requirements into technical implementations. I look forward to the opportunity to bring this experience to your team.

Sincerely,
John Doe`,
        gaps: [
          { skill: "Kubernetes", severity: "medium" },
          { skill: "GraphQL", severity: "low" },
        ],
        analysis,
      },
      900,
    );
  },
};
