import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(process.env.BLOG_SOURCE_DIR || '/home/heiyulong/AI/codex/blog/懂言懂语');
const publicDir = path.join(projectDir, 'public');
const articlesDir = path.join(publicDir, 'articles');
const siteUrl = (process.env.SITE_URL || 'https://duyan-duyu-blog.heiyulong06.workers.dev').replace(/\/$/, '');

const escapeHtml = (value = '') => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const cleanSentence = (value) => value.replace(/^>\s*/, '').trim();
const readImage = (line) => {
  const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  return match ? { alt: match[1], src: match[2] } : null;
};
const stableSlug = (date, title) => crypto.createHash('sha1').update(`${date}:${title}`).digest('hex').slice(0, 10);

function parseArticle(file, date) {
  const markdown = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = markdown.split('\n');
  const title = lines.find((line) => line.startsWith('# '))?.slice(2).trim();
  if (!title) throw new Error(`缺少标题: ${file}`);
  const images = lines.map(readImage).filter(Boolean);
  const sentences = lines.filter((line) => line.startsWith('> ')).map(cleanSentence);
  const sections = [];
  for (let index = 1; index <= 9; index += 1) {
    const heading = `## ${String(index).padStart(2, '0')}`;
    const start = lines.indexOf(heading);
    if (start < 0) continue;
    const sentence = lines.slice(start + 1).find((line) => line.startsWith('> '));
    const image = lines.slice(start + 1).map(readImage).find(Boolean);
    if (sentence && image) sections.push({ number: index, sentence: cleanSentence(sentence), image });
  }
  if (!images[0] || sections.length !== 9) throw new Error(`文章结构不完整: ${file}`);
  return { date, title, file, cover: images[0], sentences, sections, slug: stableSlug(date, title) };
}

function collectArticles() {
  return fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .flatMap((entry) => {
      const dateDir = path.join(sourceDir, entry.name);
      return fs.readdirSync(dateDir)
        .filter((name) => name.endsWith('.md') && name !== 'INDEX.md')
        .map((name) => parseArticle(path.join(dateDir, name), entry.name));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

async function copyImage(article, image) {
  const source = path.resolve(path.dirname(article.file), image.src);
  if (!source.startsWith(sourceDir + path.sep) || !fs.existsSync(source)) throw new Error(`图片不存在: ${source}`);
  const destinationDir = path.join(publicDir, 'media', article.date, article.slug);
  fs.mkdirSync(destinationDir, { recursive: true });
  const filename = `${path.parse(source).name}.webp`;
  await sharp(source).webp({ quality: 84, effort: 5 }).toFile(path.join(destinationDir, filename));
  return `/media/${article.date}/${article.slug}/${encodeURIComponent(filename)}`;
}

const stylesheet = `
:root{--paper:#f8f5ef;--ink:#282622;--muted:#777168;--accent:#9b6b4c;--line:#e4ddd2;--card:#fffdf9;--shadow:0 18px 50px rgba(70,55,40,.08)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Noto Serif SC","Songti SC",Georgia,serif;line-height:1.8}a{color:inherit;text-decoration:none}img{display:block;max-width:100%}
.site-header{position:sticky;top:0;z-index:10;background:rgba(248,245,239,.88);backdrop-filter:blur(16px);border-bottom:1px solid rgba(228,221,210,.75)}.nav{max-width:1120px;margin:auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}.brand{font-size:20px;letter-spacing:.18em}.nav-note{color:var(--muted);font-size:13px;letter-spacing:.08em}
.hero{max-width:1120px;margin:0 auto;padding:88px 24px 52px}.eyebrow{color:var(--accent);font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase}.hero h1{max-width:760px;font-size:clamp(40px,7vw,78px);line-height:1.15;margin:16px 0 24px;font-weight:500;letter-spacing:.02em}.hero p{max-width:620px;color:var(--muted);font-size:17px}.hero-meta{margin-top:28px;font:13px system-ui,sans-serif;color:var(--muted)}
.archive{max-width:1120px;margin:auto;padding:10px 24px 100px}.section-title{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:30px}.section-title h2{font-size:22px;font-weight:500;margin:0}.section-title span{color:var(--muted);font:13px system-ui,sans-serif}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:34px 28px}.card{background:var(--card);border:1px solid var(--line);border-radius:3px;overflow:hidden;transition:.25s ease}.card:hover{transform:translateY(-5px);box-shadow:var(--shadow)}.card-cover{aspect-ratio:900/383;object-fit:cover;width:100%}.card-body{padding:22px 24px 26px}.date{font:12px system-ui,sans-serif;color:var(--accent);letter-spacing:.1em}.card h3{font-size:24px;line-height:1.45;font-weight:500;margin:10px 0 12px}.excerpt{color:var(--muted);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.article-shell{max-width:900px;margin:auto;padding:64px 24px 110px}.back{display:inline-block;color:var(--muted);font:13px system-ui,sans-serif;margin-bottom:34px}.article-header{text-align:center;margin-bottom:54px}.article-header h1{font-size:clamp(32px,6vw,52px);line-height:1.35;font-weight:500;margin:14px auto 22px}.article-date{color:var(--muted);font:13px system-ui,sans-serif;letter-spacing:.12em}.cover{width:100%;aspect-ratio:900/383;object-fit:cover;border-radius:3px;box-shadow:var(--shadow);margin:36px 0 76px}.sentence-block{margin:0 auto 92px}.number{font:12px system-ui,sans-serif;color:var(--accent);letter-spacing:.22em;text-align:center}.quote{font-size:clamp(21px,3vw,29px);line-height:1.75;text-align:center;font-weight:400;margin:18px auto 30px;max-width:760px}.scene{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:3px;background:#eee8df}.footer{border-top:1px solid var(--line);padding:32px 24px;text-align:center;color:var(--muted);font-size:13px}.not-found{text-align:center;max-width:620px;margin:15vh auto;padding:24px}.not-found h1{font-size:72px;margin:0}.not-found p{color:var(--muted)}
@media(max-width:720px){.nav-note{display:none}.hero{padding-top:58px}.grid{grid-template-columns:1fr}.article-shell{padding-top:40px}.cover{margin-bottom:58px}.sentence-block{margin-bottom:68px}.quote{font-size:21px}.card h3{font-size:21px}}
`;

const layout = ({ title, description, body, canonical = `${siteUrl}/` }) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="theme-color" content="#f8f5ef">
<link rel="canonical" href="${canonical}"><link rel="stylesheet" href="/styles.css"></head>
<body><header class="site-header"><nav class="nav"><a class="brand" href="/">懂言懂语</a><span class="nav-note">九句话 · 十幅生活镜头</span></nav></header>${body}<footer class="footer">愿文字给你留一盏灯，也留一点呼吸。</footer></body></html>`;

async function build() {
  const articles = collectArticles();
  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.mkdirSync(articlesDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'styles.css'), stylesheet);

  for (const article of articles) {
    article.coverUrl = await copyImage(article, article.cover);
    const renderedSections = [];
    for (const section of article.sections) renderedSections.push({ ...section, imageUrl: await copyImage(article, section.image) });
    article.sections = renderedSections;
    const route = `/articles/${article.date}/${article.slug}/`;
    const body = `<main class="article-shell"><a class="back" href="/">← 返回文章列表</a><article><header class="article-header"><div class="article-date">${article.date}</div><h1>${escapeHtml(article.title)}</h1></header><img class="cover" src="${article.coverUrl}" alt="${escapeHtml(article.cover.alt)}">${article.sections.map((section) => `<section class="sentence-block"><div class="number">${String(section.number).padStart(2, '0')}</div><p class="quote">${escapeHtml(section.sentence)}</p><img class="scene" src="${section.imageUrl}" alt="${escapeHtml(section.image.alt)}" loading="lazy"></section>`).join('')}</article></main>`;
    const output = path.join(articlesDir, article.date, article.slug);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'index.html'), layout({ title: `${article.title}｜懂言懂语`, description: article.sentences[0], body, canonical: `${siteUrl}${route}` }));
    article.route = route;
  }

  const cards = articles.map((article) => `<a class="card" href="${article.route}"><img class="card-cover" src="${article.coverUrl}" alt="${escapeHtml(article.cover.alt)}" loading="lazy"><div class="card-body"><div class="date">${article.date}</div><h3>${escapeHtml(article.title)}</h3><div class="excerpt">${escapeHtml(article.sentences[0])}</div></div></a>`).join('');
  const home = `<main><section class="hero"><div class="eyebrow">Words for ordinary days</div><h1>把日子里的风、灯和晚饭，写成九句话。</h1><p>这里收藏克制、温柔、清醒的生活短句。你不必急着变好，先坐一会儿，也很好。</p><div class="hero-meta">已收录 ${articles.length} 篇 · 持续从公众号工程同步</div></section><section class="archive"><div class="section-title"><h2>最近文章</h2><span>按日期倒序</span></div><div class="grid">${cards}</div></section></main>`;
  fs.writeFileSync(path.join(publicDir, 'index.html'), layout({ title: '懂言懂语｜给普通日子的九句话', description: '克制、温柔、清醒的九句图文博客。', body: home }));
  fs.writeFileSync(path.join(publicDir, '404.html'), layout({ title: '页面没有找到｜懂言懂语', description: '页面没有找到', body: '<main class="not-found"><h1>404</h1><p>这页像一阵风，已经走远了。</p><a class="back" href="/">← 回到首页</a></main>' }));
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}/</loc></url>${articles.map((a) => `<url><loc>${siteUrl}${a.route}</loc><lastmod>${a.date}</lastmod></url>`).join('')}</urlset>`);
  console.log(`同步完成：${articles.length} 篇文章，输出到 ${publicDir}`);
}

await build();
