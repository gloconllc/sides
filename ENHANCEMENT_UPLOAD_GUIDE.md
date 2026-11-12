# Upload instructions

This package contains two new documentation files only:

- STRATEGY_ENHANCEMENT.md: Core strategy requirements and additive swing-trading specification.
- ENHANCEMENT_UPLOAD_GUIDE.md: These instructions.

## Upload

1. Extract the ZIP on your computer.
2. Open the existing GitHub repository.
3. Select Add file, then Upload files.
4. Upload the two Markdown files to the repository root, beside package.json.
5. Confirm neither filename already exists. If it does, compare it first; do not overwrite it blindly.
6. Commit with a message such as: Add strategy enhancement specification; no runtime changes.

Do not replace api/prices.js, api/scan.js, public/index.html, package.json, or vercel.json.

## Scope and limitations

These files document the enhancement; they do not implement trading analysis, change rankings, connect news sources, or improve model confidence automatically. Your existing Git integration may trigger a deployment for this commit, but these documents introduce no runtime behavior or configuration changes.

The current application source was not supplied or inspected when this package was prepared. Working replacement JavaScript or HTML cannot be safely produced while guaranteeing preservation of unseen code.

## Next step

Provide the current api/prices.js, api/scan.js, public/index.html, package.json, and vercel.json. Remove credentials first. The subsequent implementation should be reviewed as an additive diff and tested against the acceptance checks in STRATEGY_ENHANCEMENT.md.
