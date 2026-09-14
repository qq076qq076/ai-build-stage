import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  output: 'static',
  site: 'https://qq076qq076.github.io',
  base: isGitHubPages ? '/ai-build-stage' : '/',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
