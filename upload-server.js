#!/usr/bin/env node

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const app = express();
const PORT = 3001;

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Serve the upload GUI
app.use(express.static('.'));

// API endpoint for uploading posts
app.post('/api/upload-post', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { title, imageAlt, tags, imageRatio, videoUrl, isDraft } = req.body;
        
        if (!title || !imageAlt) {
            return res.status(400).json({ error: 'Title and image alt text are required' });
        }

        // Generate slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        // Generate date in YYYY-MM-DD format
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timestamp = now.toISOString();

        // Create post directory
        const postDir = path.join('content', 'post', `${dateStr}-${slug}`);
        await fs.mkdir(postDir, { recursive: true });

        // Move uploaded file to post directory
        const originalName = req.file.originalname;
        const extension = path.extname(originalName);
        const imagePath = path.join(postDir, originalName);
        await fs.rename(req.file.path, imagePath);

        // Upload to Cloudinary
        const cloudinaryPath = `tomas-master/visual-garden/post/${dateStr}-${slug}/${originalName}`;
        await uploadToCloudinary(imagePath, cloudinaryPath);

        // Create frontmatter
        const frontmatter = {
            title: `"${title}"`,
            date: timestamp,
            draft: isDraft === 'true',
            layout: 'lightbox',
            image: cloudinaryPath,
            image_alt: `"${imageAlt}"`
        };

        if (imageRatio) {
            frontmatter.image_ratio = `"${imageRatio}"`;
        }

        if (videoUrl) {
            frontmatter.video_url = `"${videoUrl}"`;
        }

        if (tags && tags.trim()) {
            const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            if (tagArray.length > 0) {
                frontmatter.tags = tagArray;
            }
        }

        // Convert to YAML format
        let yaml = '---\n';
        Object.entries(frontmatter).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                yaml += `${key}:\n`;
                value.forEach(tag => {
                    yaml += `  - ${tag}\n`;
                });
            } else {
                yaml += `${key}: ${value}\n`;
            }
        });
        yaml += '---\n\n';

        // Write index.md file
        const indexPath = path.join(postDir, 'index.md');
        await fs.writeFile(indexPath, yaml);

        // Clean up temp file
        try {
            await fs.unlink(req.file.path);
        } catch (e) {
            // File might already be moved
        }

        res.json({ 
            message: `Post created at ${postDir}`,
            slug: `${dateStr}-${slug}`,
            cloudinaryPath: cloudinaryPath
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function uploadToCloudinary(filePath, publicId) {
    try {
        // Check if cloudinary-cli is available
        try {
            execSync('cld --version', { stdio: 'ignore' });
        } catch {
            console.log('Installing cloudinary-cli...');
            execSync('python3 -m pip install --user --upgrade cloudinary-cli', { stdio: 'inherit' });
        }

        const cmd = [
            'cld', 'uploader', 'upload',
            filePath,
            `public_id=${publicId}`,
            'use_filename=false',
            'unique_filename=false',
            'overwrite=true',
            'invalidate=true'
        ];

        console.log('Uploading to Cloudinary:', publicId);
        execSync(cmd.join(' '), { stdio: 'inherit' });
        
    } catch (error) {
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Upload server running at http://localhost:${PORT}`);
    console.log(`📝 Upload GUI available at http://localhost:${PORT}/upload-gui.html`);
});

module.exports = app;
