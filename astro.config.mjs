import { defineConfig } from 'astro/config';

// GitHub Pages отдаёт сайт из подпапки /<repo>, локальный дев — из корня.
// Без base все пути из asset() на Pages уедут в несуществующую папку.
const onPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: 'https://nikitaa2333333.github.io',
  base: onPages ? '/scandi-mebel' : '/',
  compressHTML: true,
});
