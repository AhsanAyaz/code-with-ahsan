import { RoadmapDomain } from "@/types/mentorship";

export function mapTechStackToDomains(techStack: string[]): RoadmapDomain[] {
  const domains = new Set<RoadmapDomain>();
  const normalizedStack = techStack.map((t) => t.toLowerCase());

  normalizedStack.forEach((tech) => {
    if (["react", "vue", "svelte", "angular", "next.js", "remix", "tailwind", "css", "html"].some(k => tech.includes(k))) {
      domains.add("frontend");
      domains.add("web-dev");
    }
    if (["node", "express", "nest", "python", "django", "flask", "java", "spring", "go", "golang", "rust"].some(k => tech.includes(k))) {
      domains.add("backend");
      domains.add("web-dev");
    }
    if (["python", "tensorflow", "pytorch", "keras", "scikit", "pandas", "numpy"].some(k => tech.includes(k))) {
      domains.add("ml");
      domains.add("ai");
    }
    if (["openai", "llm", "gpt", "anthropic", "claude", "langchain", "llamaindex"].some(k => tech.includes(k))) {
      domains.add("ai");
      domains.add("prompt-engineering");
      domains.add("agents");
      domains.add("mcp");
    }
  });

  return Array.from(domains);
}

export function mapDomainToTechStack(domain: RoadmapDomain): string[] {
  switch (domain) {
    case "frontend":
    case "web-dev":
      return ["React", "Vue", "Svelte", "Angular", "Next.js", "Remix", "Tailwind", "CSS", "HTML"];
    case "backend":
      return ["Node", "Express", "Nest", "Python", "Django", "Flask", "Java", "Spring", "Go", "Golang", "Rust"];
    case "ml":
    case "ai":
      return ["Python", "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy"];
    case "mcp":
    case "agents":
    case "prompt-engineering":
      return ["OpenAI", "LLM", "GPT", "Anthropic", "Claude", "LangChain", "LlamaIndex"];
    default:
      return [];
  }
}

