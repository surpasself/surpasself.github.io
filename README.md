# Surpasself Homepage

Public static website framework for `https://surpasself.github.io`.

This directory is intentionally separate from the private/local product source in the repository root. Only files inside `homepage/` should be copied into the public GitHub Pages repository.

## Structure

- `index.html` - homepage and navigation hub
- `projects/index.html` - project portfolio and filters
- `products/surpasself-voice.html` - product detail page
- `research/index.html` - academic profile, papers, activities
- `datasets/index.html` - public dataset catalog
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
