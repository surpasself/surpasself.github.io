# Surpasself Homepage

Public static website framework for `https://surpasself.github.io`.

This directory is intentionally separate from the private/local product source in the repository root. Only files inside `homepage/` should be copied into the public GitHub Pages repository.

## Structure

- `index.html` - homepage and navigation hub
- `projects/index.html` - project portfolio and filters
- `products/surpasself-voice.html` - product detail page
- `voice/` - compiled Surpasself Voice static app output, generated from `../app/dist`
- `research/index.html` - academic profile, papers, activities
- `datasets/index.html` - public dataset catalog
- `blog/index.html` - generated blog index
- `content/posts/*.md` - published Markdown article sources
- `admin/blog-publisher.html` - local Markdown post helper; it does not upload to GitHub
- `scripts/build-blog.mjs` - generates static blog pages from Markdown posts
- `assets/styles.css` - shared visual system
- `assets/main.js` - small progressive interactions
- Language selector - defaults to Simplified Chinese (`zh-CN`); English is reserved for a future translation pass.
- `docs/requirements-and-architecture.md` - requirements, IA, and deployment plan
- `DEPLOY.md` - safe GitHub Pages deployment workflow

## Local Preview

From this directory:

```bash
python3 -m http.server 5174
```

Then open:

```text
http://127.0.0.1:5174/
```

If Python is unavailable, any static file server works.

## Blog Workflow

1. Create a Markdown post in `content/posts/`.
2. Use YAML-style front matter:

```md
---
title: Article title
date: 2026-07-03
slug: article-slug
excerpt: One sentence summary.
tags: product, notes
---
```

3. Generate the static pages:

```bash
node scripts/build-blog.mjs
```

4. Preview `blog/`, then publish only the reviewed `homepage/` output to the public Pages repository.

`admin/blog-publisher.html` is a browser helper for drafting and downloading `.md` files. Because GitHub Pages is static, it cannot securely commit to your repository by itself.

## Voice App Workflow

The online product entry is `voice/`. Build it from the private app folder with a `/voice/` base path, then copy only the compiled output into this homepage directory.

GitHub Pages can host the browser app, but cross-device realtime sync, MCP writes, OAuth callbacks, model calls, and private server state require a backend or local companion service.
