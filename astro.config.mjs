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
  // lastmod — дата сборки. Google по ней решает, стоит ли перечитывать
  // страницу, и без неё робот ходит по своему усмотрению, иногда раз в
  // несколько недель. Сборка тут запускается только пушем в main, то есть
  // осмысленным изменением, — дата получается честной. Если начнём
  // деплоить по десять раз в день из-за правок стилей, дата станет шумом
  // и Google перестанет ей верить; тогда переносим lastmod в serialize и
  // считаем по времени коммита конкретной страницы.
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/thanks/'),
      lastmod: new Date(),
    }),
  ],
});
