import { ResumeData } from "@/types/resume";

export const sampleResume: ResumeData = {
  personal: {
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    phone: "+49 000 0000000",
    location: "Berlin, Germany",
    linkedin: "linkedin.com/in/alex-morgan",
    website: "alex-morgan.dev",
    github: "https://github.com/alex-morgan",
    photoUrl: ""
  },
  profile:
    "Full-stack developer with experience building reliable web applications, internal tools, and automation workflows. Strong in TypeScript, React, API integrations, and structured problem solving; comfortable turning ambiguous requirements into shipped software.",
  skills: {
    Programming: [
      "TypeScript (Advanced)",
      "JavaScript (Advanced)",
      "Python (Intermediate)",
      "SQL (Intermediate)",
      "Node.js (Intermediate)",
      "React (Advanced)",
      "Java (Basic)"
    ],
    Frontend: [
      "React (Advanced)",
      "Next.js (Intermediate)",
      "Tailwind CSS (Intermediate)",
      "Responsive UI (Intermediate)"
    ],
    Backend: [
      "REST APIs (Intermediate)",
      "PostgreSQL (Intermediate)",
      "Authentication (Basic)",
      "Cloud deployment (Basic)"
    ],
    Tools: [
      "Git & GitHub (Advanced)",
      "CI/CD basics (Intermediate)",
      "Linux (Intermediate)",
      "Docker (Basic)"
    ],
    "Soft Skills": [
      "Analytical thinking",
      "Clear communication",
      "Ownership",
      "Structured execution",
      "Collaboration"
    ]
  },
  languages: [
    { name: "English", level: "Fluent" },
    { name: "German", level: "B1" }
  ],
  education: [
    {
      degree: "M.Sc. Computer Science",
      institution: "Example University",
      location: "Berlin, Germany",
      dates: "2024 - Present",
      details: ["Focus: Software engineering and applied AI"]
    },
    {
      degree: "B.Sc. Computer Science",
      institution: "Example Institute of Technology",
      location: "Mumbai, India",
      dates: "2020 - 2024",
      details: ["Graduated with distinction"]
    }
  ],
  awards: [
    {
      title: "3rd Place — Applied AI Hackathon",
      event: "Student software engineering challenge",
      organizer: "Example AI Lab",
      date: "2026",
      description:
        "Built a working prototype with data parsing, simulation, and concise operator briefings."
    }
  ],
  experience: [
    {
      role: "Full-Stack Developer",
      company: "Example Labs",
      location: "Remote",
      dates: "2024 - Present",
      bullets: [
        "Built reusable React components and API integrations for an internal operations dashboard.",
        "Improved application reliability with typed data models, validation, and clearer error states.",
        "Collaborated with product stakeholders to translate workflow pain points into practical features."
      ]
    },
    {
      role: "Software Engineering Intern",
      company: "Sample Systems",
      location: "Berlin, Germany",
      dates: "2023 - 2024",
      bullets: [
        "Implemented REST endpoints and frontend screens for a customer support workflow.",
        "Wrote documentation and test cases to make onboarding and maintenance easier."
      ]
    }
  ],
  projects: [
    {
      name: "Application Tracker",
      tech: "Next.js, TypeScript, PostgreSQL",
      bullets: [
        "Created a dashboard to track job applications, interview stages, notes, and follow-up tasks."
      ]
    },
    {
      name: "Study Notes Generator",
      tech: "React, Node.js, AI APIs",
      bullets: [
        "Built a tool that turns long-form study material into structured notes and quiz prompts."
      ]
    }
  ]
};
