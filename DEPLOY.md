# Deploying To `surpasself.github.io`

## Publishing Principle

Do not push the current source project root to GitHub Pages. Publish only the static files in `homepage/`.

Recommended public repository:

```text
surpasself/surpasself.github.io
```

Recommended local staging folder outside this source project:

```text
/private/tmp/surpasself.github.io-public
```

## Safe Manual Flow

1. Preview `homepage/` locally.
2. Inspect every public file for private notes, local paths, draft data, secrets, and unpublished datasets.
3. Clone the public Pages repository into a separate staging folder.
4. Copy only the contents of `homepage/` into that staging folder.
5. Commit and push from the staging folder, not from this source project.
6. Verify `https://surpasself.github.io/`.

## Files That Should Not Be Published

- `../app/`
- `../mcp-server/`
- `../.local-data/`
- `../.git/`
- `.env`
- unpublished datasets
- API keys or account tokens
- private school lab notes

## Future Automation

When the homepage becomes stable, use a private source repository and a public deployment repository:

- Private source: editable content, drafts, design experiments.
- Public Pages repo: generated or reviewed static output only.
