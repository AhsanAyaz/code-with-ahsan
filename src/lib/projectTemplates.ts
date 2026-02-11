import type { ProjectTemplate, ProjectTemplateId } from "@/types/mentorship";

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "fullstack-app",
    name: "Fullstack Web Application",
    description: "Build a complete web application with frontend, backend, and database",
    defaultTitle: "Fullstack Web Application",
    defaultDescription: `Build a full-stack web application from the ground up.

**Project Scope:**
- Design and implement a modern frontend using React
- Build a RESTful API backend with Node.js
- Integrate a PostgreSQL database for data persistence
- Implement authentication and authorization
- Deploy the application to a cloud platform

**Learning Objectives:**
- Understand the complete web development lifecycle
- Learn frontend-backend integration patterns
- Master database design and query optimization
- Gain experience with deployment and DevOps basics

**Expected Outcomes:**
- Fully functional web application with user authentication
- Clean, maintainable codebase following best practices
- Comprehensive documentation and deployment guide
- Portfolio-ready project showcasing full-stack skills`,
    suggestedTechStack: ["React", "Node.js", "PostgreSQL", "TypeScript"],
    suggestedDifficulty: "intermediate",
    suggestedMaxTeamSize: 4,
    suggestedTimeline: "6-8 weeks",
    recommendedSkills: ["Frontend development", "Backend APIs", "Database design"],
  },
  {
    id: "ai-tool",
    name: "AI/ML Tool",
    description: "Create an AI-powered tool or application using modern ML APIs",
    defaultTitle: "AI/ML Tool",
    defaultDescription: `Develop an AI-powered tool that leverages machine learning to solve a real problem.

**Project Scope:**
- Integrate OpenAI API or other ML services
- Build a FastAPI backend for ML inference
- Create a responsive React frontend
- Implement data processing and validation
- Handle API rate limiting and error scenarios

**Learning Objectives:**
- Understand ML API integration patterns
- Learn prompt engineering and model selection
- Master asynchronous data processing
- Gain experience with AI/ML best practices

**Expected Outcomes:**
- Working AI tool with practical use cases
- Efficient API integration with proper error handling
- User-friendly interface for interacting with AI
- Documentation covering architecture and usage`,
    suggestedTechStack: ["Python", "OpenAI API", "FastAPI", "React"],
    suggestedDifficulty: "advanced",
    suggestedMaxTeamSize: 3,
    suggestedTimeline: "4-6 weeks",
    recommendedSkills: ["Machine learning basics", "API integration", "Data processing"],
  },
  {
    id: "open-source-library",
    name: "Open Source Library",
    description: "Create a reusable, well-documented library and publish it to npm",
    defaultTitle: "Open Source Library",
    defaultDescription: `Create a reusable open-source library that solves a specific problem.

**Project Scope:**
- Design a clean, intuitive API
- Implement comprehensive test coverage with Jest
- Write thorough documentation with examples
- Set up CI/CD pipeline with GitHub Actions
- Publish to npm with semantic versioning

**Learning Objectives:**
- Learn library design and API architecture
- Master testing strategies and test-driven development
- Understand package publishing and distribution
- Gain experience with open-source workflows

**Expected Outcomes:**
- Published npm package with clear documentation
- 90%+ test coverage with comprehensive test suite
- GitHub repository with contribution guidelines
- Real-world usage and potential community adoption`,
    suggestedTechStack: ["TypeScript", "npm", "Jest", "GitHub Actions"],
    suggestedDifficulty: "intermediate",
    suggestedMaxTeamSize: 3,
    suggestedTimeline: "4-6 weeks",
    recommendedSkills: ["Package publishing", "API design", "Documentation writing"],
  },
];

export function getTemplateById(id: ProjectTemplateId): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((template) => template.id === id);
}
