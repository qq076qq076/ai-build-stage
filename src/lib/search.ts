import type { Project } from './catalog';

export type SortKey = 'newest' | 'updated' | 'recommended' | 'discussed' | 'title';

export interface ProjectFilters {
  query: string;
  category: string;
  tool: string;
  sort: SortKey;
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('zh-Hant').trim().replace(/\s+/g, ' ');
}

export function matchesProject(project: Project, filters: ProjectFilters): boolean {
  const haystack = normalizeSearchText([
    project.title,
    project.description,
    project.creator.name,
    project.creator.githubLogin,
    project.category,
    ...project.tags,
    ...project.aiTools,
  ].join(' '));
  const query = normalizeSearchText(filters.query);
  const matchesQuery = !query || haystack.includes(query);
  const matchesCategory = !filters.category || project.category === filters.category;
  const matchesTool = !filters.tool || project.aiTools.some((tool) => normalizeSearchText(tool) === normalizeSearchText(filters.tool));
  return matchesQuery && matchesCategory && matchesTool;
}

export function sortProjects(projects: Project[], sort: SortKey): Project[] {
  const items = [...projects];
  const byId = (a: Project, b: Project) => a.id.localeCompare(b.id);
  const byDate = (field: 'approvedAt' | 'updatedAt') => (a: Project, b: Project) =>
    Date.parse(b[field]) - Date.parse(a[field]) || byId(a, b);

  switch (sort) {
    case 'updated': return items.sort(byDate('updatedAt'));
    case 'recommended': return items.sort((a, b) => b.issue.reactions.plusOne - a.issue.reactions.plusOne || byDate('approvedAt')(a, b));
    case 'discussed': return items.sort((a, b) => b.issue.commentsCount - a.issue.commentsCount || byDate('approvedAt')(a, b));
    case 'title': return items.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant') || byId(a, b));
    case 'newest':
    default: return items.sort(byDate('approvedAt'));
  }
}
