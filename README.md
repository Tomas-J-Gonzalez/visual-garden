# mood-site

Deployed with Netlify.

## Cloudinary uploads (best practice)

This repo syncs images to Cloudinary via CI using the official CLI. This avoids local secrets and keeps naming deterministic.

### Setup (one-time)

- Add repository secret `CLOUDINARY_URL` with value `cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>`.
- Optionally add `CLOUDINARY_CLOUD_NAME` for URL previews in CI logs.

### Workflow

- Place images under `content/post/<slug>/` alongside the post, or in `assets/uploads/`.
- On push, GitHub Actions uploads them to Cloudinary folder `visual-garden/` with deterministic `public_id`:
  - From `content/post/<slug>/foo.jpg` → `visual-garden/post/<slug>/foo`
  - From `assets/uploads/bar.jpg` → `visual-garden/bar`
- Re-uploads overwrite to keep files in sync.

### Local helper

Install Node 18+.

```
npm run sync:images
```

This uploads files from `content/post/**` and `assets/uploads/` using the same strategy. Requires `CLOUDINARY_URL` in your shell env.

### Referencing in content

- Frontmatter `image:` should point to the id under `visual-garden/`. Example:

```
image: "visual-garden/post/tekken-3.jpg"
```

- The templates already use `/images/...` path via Netlify redirect to Cloudinary. Ensure `hugo.toml` and `netlify.toml` Cloudinary cloud names are in sync.
