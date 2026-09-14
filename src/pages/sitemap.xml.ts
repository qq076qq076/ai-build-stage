import type { APIRoute } from 'astro';
import { loadCatalog } from '../lib/catalog';

export const prerender = true;

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] ?? character);

export const GET: APIRoute = ({ site }) => {
  const catalog = loadCatalog();
  const base = import.meta.env.BASE_URL;
  const paths = ['', 'projects/', 'guidelines/', 'about/', ...catalog.projects.map((project) => `projects/${project.slug}/`)];
  const urls = paths.map((path) => `  <url><loc>${escapeXml(new URL(`${base}${path}`, site).href)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

