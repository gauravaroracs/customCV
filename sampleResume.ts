import { ResumeData } from "@/types/resume";

export const sampleResume: ResumeData = {
  personal: {
    name: "Gaurav Arora",
    email: "gaurav.arora@stud.tu-darmstadt.de",
    phone: "+49 15212960879",
    location: "Darmstadt, Germany",
    linkedin: "linkedin.com/in/gauravaroracs",
    website: "gaurav-arora-cs.vercel.app",
    github: "https://github.com/gauravaroracs",
    photoUrl: ""
  },
  profile:
    "M.Sc. Computer Science student at TU Darmstadt with 3+ years of startup experience delivering reliable backend systems, multi-step data services, and internal tools. Strong in SQL, orchestration, structured logging, and secure integrations; a systematic debugger who takes full ownership from logs to fixes. Currently upskilling into ML, SQL and LLM pipeline orchestration; quick to adopt new tools and ship impact.",
  skills: {
    Programming: [
      "Java (Advanced)",
      "SQL/MySQL (Advanced)",
      "MongoDB (Advanced)",
      "Python (Advanced)",
      "TypeScript (Advanced)",
      "React (Intermediate)",
      "Redis (Intermediate)"
    ],
    Data: [
      "MySQL (Advanced)",
      "MongoDB/Redis (Advanced)",
      "PostgreSQL (Intermediate)"
    ],
    Tools: [
      "Git & PR workflows (Advanced)",
      "CI/CD Jenkins (Intermediate)",
      "Linux (Intermediate)",
      "Docker (Basic)",
      "Kubernetes (Basic)",
      "AWS EC2/S3/ES (Basic)"
    ],
    "Soft Skills": [
      "Analytical thinking",
      "Problem-solving",
      "Initiative & ownership",
      "Structured & independent work",
      "Intercultural collaboration"
    ]
  },
  languages: [
    { name: "English", level: "Fluent" },
    { name: "German", level: "B1 learning" },
    { name: "Hindi", level: "Native" }
  ],
  education: [
    {
      degree: "M.Sc. Computer Science",
      institution: "Technische Universität Darmstadt",
      location: "Darmstadt, Germany",
      dates: "08/2025 – Present",
      details: ["Specialization: Data Science & Engineering"]
    },
    {
      degree: "B.Tech. Computer Science and Engineering",
      institution: "Walchand College of Engineering",
      location: "Maharashtra, India",
      dates: "08/2018 – 07/2022",
      details: ["Grade: 8.1/10 ≈ 1.9 on German scale"]
    }
  ],
  experience: [
    {
      role: "Software Engineer",
      company: "Turtlemint",
      location: "Pune, India",
      dates: "07/2022 – 07/2025",
      bullets: [
        "Owned Java/Spring Boot loan APIs end-to-end; p99 820→510 ms (-38%) and 5xx 1.8%→1.0% (-44%); sustained ~270 QPS with idempotency, OAuth2/JWT, and full observability.",
        "Built a configuration-driven adapter framework for lender/KYC/credit-bureau APIs; onboarded 10+ providers; reduced time-to-integrate from weeks to days.",
        "Hardened reporting and Kafka data sync; reduced per-report Mongo queries 100+ → <10, lowering CPU and improving dashboard load time.",
        "Frontend collaboration: built server-driven React + TypeScript UI config so product could change fields/copy/rules without redeploys."
      ]
    },
    {
      role: "Tech Intern",
      company: "Turtlemint",
      location: "Pune, India",
      dates: "01/2022 – 06/2022",
      bullets: [
        "Reverse-engineered insurer APIs via Chrome DevTools and built lightweight JavaScript mocks and OpenAPI/Swagger specs.",
        "Created Postman collections and integration notes to standardize contracts and speed up backend integrations."
      ]
    }
  ],
  projects: [
    {
      name: "Expense Management Automation Bot",
      tech: "n8n, Telegram, Google Sheets, AI agents",
      bullets: [
        "Built a self-hosted automation bot to categorize expenses, route data, and generate structured reports."
      ]
    }
  ]
};
