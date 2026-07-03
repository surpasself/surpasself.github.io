import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const postsDir = path.join(rootDir, "content", "posts");
const blogDir = path.join(rootDir, "blog");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function parseFrontMatter(source, fileName) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error(`${fileName} is missing YAML-style front matter.`);
  }

  const meta = {};
  for (const line of match[1].split("\n")) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!item) continue;
    const [, key, rawValue] = item;
    meta[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }

  const body = source.slice(match[0].length).trim();
  const fileSlug = path.basename(fileName, path.extname(fileName));
  const tags = (meta.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    title: meta.title || fileSlug,
    date: meta.date || "undated",
    slug: meta.slug || fileSlug,
    excerpt: meta.excerpt || "",
    tags,
    body,
    sourceFile: fileName,
  };
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, url) => {
    return `<a href="${escapeAttr(url)}">${label}</a>`;
  });
  return html;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listType = null;
  let codeLines = null;

  const closeParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  for (const line of lines) {
    if (codeLines) {
      if (line.trim().startsWith("```")) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = null;
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      closeParagraph();
      closeList();
      codeLines = [];
      continue;
    }

    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      closeParagraph();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      closeParagraph();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      closeParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (codeLines) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  closeParagraph();
  closeList();
  return html.join("\n");
}

function nav(prefix, current) {
  const active = (name) => (current === name ? ' class="is-active"' : "");
  return `<header class="nav">
        <a class="brand" href="${prefix}index.html" aria-label="Surpasself home">
          <img src="${prefix}assets/mark.svg" alt="">
          <span>Surpasself</span>
        </a>
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false">Menu</button>
        <nav class="nav-links" data-nav-links aria-label="Primary">
          <a${active("home")} href="${prefix}index.html">Home</a>
          <a${active("projects")} href="${prefix}projects/">Projects</a>
          <a${active("products")} href="${prefix}products/surpasself-voice.html">Products</a>
          <a${active("research")} href="${prefix}research/">Research</a>
          <a${active("datasets")} href="${prefix}datasets/">Datasets</a>
          <a${active("blog")} href="${prefix}blog/">Blog</a>
        </nav>
        <div class="language-control" aria-label="选择语言">
          <label for="language-select-blog">语言</label>
          <select id="language-select-blog" data-language-select>
            <option value="zh-CN">简体中文</option>
            <option value="en" disabled>English · soon</option>
          </select>
        </div>
      </header>`;
}

function pageShell({ title, description, canonical, prefix, current = "blog", body }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}">
    <link rel="canonical" href="${escapeAttr(canonical)}">
    <link rel="icon" href="${prefix}assets/mark.svg" type="image/svg+xml">
    <link rel="stylesheet" href="${prefix}assets/styles.css">
  </head>
  <body>
    <div class="site-shell">
      ${nav(prefix, current)}
      <main>
${body}
      </main>
      <footer class="footer">
        <div class="footer-inner">
          <span>© <span data-year></span> Surpasself</span>
          <span>Products · Projects · Research · Datasets · Blog</span>
        </div>
      </footer>
    </div>
    <script src="${prefix}assets/main.js"></script>
  </body>
</html>
`;
}

function renderBlogIndex(posts) {
  const cards = posts
    .map((post) => {
      const tags = post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
      return `<article class="card article-card">
                <div class="article-meta"><time datetime="${escapeAttr(post.date)}">${escapeHtml(post.date)}</time>${tags}</div>
                <h3>${escapeHtml(post.title)}</h3>
                <p>${escapeHtml(post.excerpt)}</p>
                <div class="link-row"><a href="./${escapeAttr(post.slug)}/">阅读全文</a><a href="../content/posts/${escapeAttr(post.sourceFile)}">Markdown source</a></div>
              </article>`;
    })
    .join("\n");

  return pageShell({
    title: "Blog | Surpasself",
    description: "Surpasself 的文章、项目日志、研究笔记和产品复盘。",
    canonical: "https://surpasself.github.io/blog/",
    prefix: "../",
    body: `        <section class="section hero">
          <div class="container">
            <p class="eyebrow">Blog</p>
            <h1>文章、项目日志和研究笔记。</h1>
            <p class="lead">这里用于发布产品复盘、实验记录、读书笔记和长期写作。文章源文件来自本地 Markdown，并生成静态页面。</p>
            <div class="actions">
              <a class="button primary" href="../admin/blog-publisher.html">打开发文辅助器</a>
              <a class="button secondary" href="../projects/">浏览项目</a>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="container">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Posts</p>
                <h2>最新文章。</h2>
              </div>
              <p>正式发布前，请确认 Markdown 不包含私密笔记、未公开数据、学校限制信息或账号密钥。</p>
            </div>
            <div class="article-list">
              ${cards || '<article class="card"><h3>暂无文章</h3><p>把 Markdown 文件放入 content/posts 后运行 scripts/build-blog.mjs。</p></article>'}
            </div>
          </div>
        </section>`,
  });
}

function renderPost(post) {
  const tags = post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return pageShell({
    title: `${post.title} | Surpasself Blog`,
    description: post.excerpt || post.title,
    canonical: `https://surpasself.github.io/blog/${post.slug}/`,
    prefix: "../../",
    body: `        <section class="section hero">
          <div class="container article-body">
            <p class="eyebrow">Blog post</p>
            <h1>${escapeHtml(post.title)}</h1>
            <div class="article-meta"><time datetime="${escapeAttr(post.date)}">${escapeHtml(post.date)}</time>${tags}</div>
          </div>
        </section>

        <section class="section">
          <article class="container article-body">
${markdownToHtml(post.body)}
            <div class="actions">
              <a class="button secondary" href="../">返回博客</a>
              <a class="button secondary" href="../../content/posts/${escapeAttr(post.sourceFile)}">查看 Markdown</a>
            </div>
          </article>
        </section>`,
  });
}

async function main() {
  await fs.mkdir(blogDir, { recursive: true });
  const entries = await fs.readdir(postsDir);
  const posts = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const source = await fs.readFile(path.join(postsDir, entry), "utf8");
    posts.push(parseFrontMatter(source, entry));
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  await fs.writeFile(path.join(blogDir, "index.html"), renderBlogIndex(posts));
  for (const post of posts) {
    const postDir = path.join(blogDir, post.slug);
    await fs.mkdir(postDir, { recursive: true });
    await fs.writeFile(path.join(postDir, "index.html"), renderPost(post));
  }

  console.log(`Built ${posts.length} blog post(s) in ${path.relative(rootDir, blogDir)}/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
