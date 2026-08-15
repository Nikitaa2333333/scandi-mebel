import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Адрес сайта нужен для canonical, sitemap.xml и Open Graph — без него
// поисковики видят относительные ссылки и не склеивают страницы.
// Меняется одной переменной: на боевом домене ставим SITE_URL=https://домен.ру
const SITE = process.env.SITE_URL || 'https://scandi-chair.ru';

// GitHub Pages отдаёт сайт из подпапки /<repo>. На Vercel и своём домене —
// из корня, поэтому base подставляется только для Pages.
const onPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: SITE,
  base: onPages ? '/scandi-mebel' : '/',
  compressHTML: true,
  // Страница «Спасибо» из карты сайта исключена: она закрыта от индексации
  // в Layout, и держать её в sitemap — значит звать робота туда, откуда его
  // тут же разворачивают. Список адресов в карте должен совпадать с тем,
  // что мы правда хотим видеть в поиске.
  integrations: [sitemap({ filter: (page) => !page.endsWith('/thanks/') })],
});
