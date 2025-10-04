# Visual Garden Upload Tool

A simple GUI tool for uploading new posts to your Visual Garden moodboard site.

## Features

- 🖼️ Drag & drop image uploads
- ☁️ Automatic Cloudinary integration [[memory:8331881]]
- 📝 Auto-generated Hugo post files
- 🏷️ Tag management
- 📱 Responsive design matching your site

## Usage

1. **Start the upload server:**
   ```bash
   npm run upload:server
   ```

2. **Open the upload interface:**
   Visit http://localhost:3001/upload-gui.html (local development only)

3. **Upload your image:**
   - Drag & drop an image or click to select
   - Fill in the post details (title, alt text, tags)
   - Click "Upload & Create Post"

4. **The tool will:**
   - Upload your image to Cloudinary
   - Create a new Hugo post in `content/post/`
   - Generate proper frontmatter with your details

## Configuration

The tool uses your existing Cloudinary setup with cloud name 'tomasgo' [[memory:8331881]]. Make sure your Cloudinary CLI is configured:

```bash
cld config
```

## File Structure

After upload, your post will be created as:
```
content/post/YYYY-MM-DD-slug/
├── index.md          # Hugo post file
└── your-image.jpg    # Original image
```

## Tips

- **Image ratios**: Choose square/landscape/portrait for consistent display
- **Tags**: Use existing tags like 'inspiration', 'design', 'minimalism'
- **Video URLs**: Add YouTube/Vimeo links for video content
- **Drafts**: Check "Save as draft" to keep posts private until ready

## Troubleshooting

- **Upload fails**: Check your Cloudinary credentials and CLI setup
- **Images not showing**: Ensure Hugo is running to regenerate the site
- **File too large**: Current limit is 50MB per image

---

*This tool is designed specifically for the Visual Garden site owner to easily add new moodboard content.*
