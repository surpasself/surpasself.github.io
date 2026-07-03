# Surpasself Homepage Requirements And Architecture

## Product Goal

Create a public personal homepage for `https://surpasself.github.io` that can represent three identities at once:

1. Builder: mature products and tools.
2. Researcher/student: academic work, experiments, datasets, publications.
3. Operator: a central doorway to live demos, downloads, documentation, and collaboration.

## Reference Analysis

The Jairo Narro site uses a portfolio structure with Home, Projects, Publications, and Contact, plus categorized project cards and downloadable assets.

The Fei Shen site uses an academic structure with About, News, Publications, Activities, Collaborators, Codes, research interests, selected publications, and code links.

Surpasself should combine both:

- Product-facing homepage for credibility and conversion.
- Project grid for works and experiments.
- Academic pages for datasets, publications, codes, collaborators, and lab notes.
- Clear separation between public static content and private product source.

## Information Architecture

```text
/
├── Home
├── Projects
├── Product: Surpasself Voice
├── Research
├── Datasets
├── Writing
└── Contact
```

## First Public Version

### Home

- One-sentence positioning.
- Primary product highlight.
- Three pillars: Products, Research, Datasets.
- Featured projects and datasets.
- Contact and collaboration CTA.

### Projects

- Cards with tags, status, links, and impact.
- Filters: Product, Research, Dataset, Tool, School.

### Product Detail

- Problem, user workflow, features, architecture, privacy model, roadmap.

### Research

- Research interests.
- News.
- Selected work.
- Publications placeholder.
- Collaborators placeholder.

### Datasets

- Dataset cards.
- License, citation, access link, documentation status.
- Dataset release checklist.

## Visual Direction

- Minimal academic/product hybrid.
- White/soft gray canvas.
- Dark ink typography.
- Blue accent for active links and technical credibility.
- Card-based project grid.
- Sticky navigation.
- Bilingual-friendly copy length.

## Interaction Scope

Static site with light progressive interaction:

- Project filtering.
- Copy citation button.
- Mobile navigation.
- Language selector with Simplified Chinese as the complete first language.
- Smooth anchor scrolling.

No backend, auth, payment, API key, or private dataset upload in version 1.

## Deployment Boundary

Only publish files inside `homepage/`.

Do not publish:

- private source code
- local MCP data
- unpublished datasets
- raw experiment logs
- credentials

## Content To Fill Later

- Real name or preferred display name.
- Bio in Chinese and English.
- Product screenshots and live URLs.
- Dataset titles, licenses, citation format, and download links.
- School/lab affiliation.
- Publications and project PDFs.
- Email or contact form target.
