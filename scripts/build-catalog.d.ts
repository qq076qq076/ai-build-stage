export interface ParsedSubmission {
  name: string;
  description: string;
  demoUrl: string;
  sourceUrl?: string;
  category: string;
  tags: string[];
  aiTools: string[];
  creatorName?: string;
  creatorUrl?: string;
  agreed: true;
}

export function parseIssueBody(body?: string, issueTitle?: string): ParsedSubmission;
export function slugify(value: string, issueNumber: number): string;
export function extractMetadataImage(html: string, pageUrl: string): string | undefined;
export function formatDescription(value: string): string;
