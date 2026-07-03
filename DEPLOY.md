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

When you see “homepage/ 覆盖到临时 Pages 仓库”, it means:

- A separate clone of `surpasself/surpasself.github.io` was created outside the source project.
- Files in that temporary clone were replaced by the reviewed static files from `homepage/`.
- The source folders `app/`, `mcp-server/`, `.git/`, local data, secrets, and drafts were not copied.
- The temporary clone is the only place that should be committed and pushed to the public Pages repository.

## Blog Publishing Flow

1. Draft an article with `admin/blog-publisher.html` or any Markdown editor.
2. Save the `.md` file into `homepage/content/posts/`.
3. Run `node homepage/scripts/build-blog.mjs` from the project root, or `node scripts/build-blog.mjs` from inside `homepage/`.
4. Preview `homepage/blog/`.
5. Publish the reviewed static output through the separate Pages staging folder.

Do not place private drafts, school-restricted data, keys, or unpublished notes into `content/posts/`.

## Voice Publishing Flow

1. Build the app with the public base path `/voice/`.
2. Copy only the compiled `dist` output into `homepage/voice/`.
3. Confirm `homepage/voice/index.html` opens in local preview.
4. Publish only the `homepage/` static output through the Pages staging folder.

The public web version necessarily exposes browser JavaScript bundles. Keep private logic, data, MCP services, and credentials outside the public output.

## Files That Should Not Be Published

- `../app/`
- `../mcp-server/`
- `../.local-data/`
- `../.git/`
- `.env`
- unpublished datasets
- private article drafts
- API keys or account tokens
- private school lab notes

## Future Automation

When the homepage becomes stable, use a private source repository and a public deployment repository:

- Private source: editable content, drafts, design experiments.
- Public Pages repo: generated or reviewed static output only.
