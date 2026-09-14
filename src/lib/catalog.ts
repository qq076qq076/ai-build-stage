import { z } from 'zod';
import catalogData from '../../public/data/projects.json';

const httpsUrl = z.string().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, {
  message: 'URL 必須使用 HTTPS',
});

export const projectCategorySchema = z.enum([
  'web',
  'mobile',
  'game',
  'developer-tool',
  'creative',
  'productivity',
  'education',
  'other',
]);

export const projectSchema = z.object({
  id: z.string().regex(/^gh:[^/]+\/[^#]+#\d+$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(2).max(80),
  tagline: z.string().min(1).max(140),
  description: z.string().min(1).max(2_000),
  demoUrl: httpsUrl,
  sourceUrl: httpsUrl.optional(),
  category: projectCategorySchema,
  tags: z.array(z.string().min(2).max(24)).max(5),
  aiTools: z.array(z.string().min(1).max(48)).min(1).max(10),
  buildStory: z.string().max(2_000).optional(),
  creator: z.object({
    name: z.string().min(1).max(80),
    url: httpsUrl.optional(),
    githubLogin: z.string().min(1),
  }),
  pricing: z.enum(['free', 'freemium', 'paid', 'open-source', 'other', 'unspecified']),
  languages: z.array(z.string().min(2).max(35)),
  featured: z.boolean(),
  verified: z.literal(true),
  issue: z.object({
    number: z.number().int().positive(),
    nodeId: z.string().optional(),
    url: httpsUrl,
    state: z.enum(['open', 'closed']),
    reactions: z.object({ plusOne: z.number().int().nonnegative() }),
    commentsCount: z.number().int().nonnegative(),
  }),
  submittedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const projectCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  projects: z.array(projectSchema),
});

export type Project = z.infer<typeof projectSchema>;
export type ProjectCatalog = z.infer<typeof projectCatalogSchema>;
export type ProjectCategory = z.infer<typeof projectCategorySchema>;

export function loadCatalog(): ProjectCatalog {
  return projectCatalogSchema.parse(catalogData);
}

export const categoryLabels: Record<ProjectCategory, string> = {
  web: '網站',
  mobile: '行動應用',
  game: '遊戲',
  'developer-tool': '開發工具',
  creative: '創意內容',
  productivity: '生產力',
  education: '教育',
  other: '其他',
};

export const pricingLabels: Record<Project['pricing'], string> = {
  free: '免費',
  freemium: '部分免費',
  paid: '付費',
  'open-source': '開源',
  other: '其他',
  unspecified: '未指定',
};
