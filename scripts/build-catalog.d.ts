export interface ParsedSubmission {
  name: string;
  tagline?: string;
  description: string;
  demoUrl: string;
  sourceUrl?: string;
  category: string;
  tags: string[];
  aiTools: string[];
  buildStory?: string;
  creatorName?: string;
  creatorUrl?: string;
  pricing: string;
  languages: string[];
  agreed: true;
}

export function parseIssueBody(body?: string): ParsedSubmission;
export function slugify(value: string, issueNumber: number): string;
