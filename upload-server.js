#!/usr/bin/env node

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const cloudinary = require('cloudinary').v2;

// Load environment variables
require('dotenv').config();
const app = express();
const PORT = 3001;

// Configure Cloudinary (you'll need to set these environment variables)
cloudinary.config({
    cloud_name: 'tomasgo',
    api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key_here',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret_here'
});

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
}).single('image');

// Global error handler for multer errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('🚨 Multer Error:', error.message);
        console.error('🚨 Error code:', error.code);
        console.error('🚨 Request body fields:', Object.keys(req.body || {}));
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unexpected field. Please make sure you are uploading a single image file.' });
        } else {
            return res.status(400).json({ error: `Upload error: ${error.message}` });
        }
    }
    next(error);
});

// Serve the upload GUI
app.use(express.static('.'));

// API endpoint for uploading posts
app.post('/api/upload-post', upload, async (req, res) => {
    try {
        console.log('📨 Received upload request');
        console.log('📁 Request body fields:', Object.keys(req.body));
        console.log('📁 Request file:', req.file ? `${req.file.originalname} (${req.file.mimetype})` : 'No file');
        
        if (!req.file) {
            console.log('❌ No file provided in request');
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { title, imageAlt, tags, imageRatio, videoUrl } = req.body;
        
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

        // Upload to Cloudinary using API (no CLI needed)
        const baseName = path.parse(originalName).name; // Remove extension
        const cloudinaryPath = `post/${dateStr}-${slug}/${baseName}`;
        console.log(`📁 Original filename: ${originalName}`);
        console.log(`📁 Base name (no extension): ${baseName}`);
        console.log(`📁 Cloudinary public_id: ${cloudinaryPath}`);
        const uploadResult = await uploadToCloudinaryAPI(imagePath, cloudinaryPath);

        // Create frontmatter
        const frontmatter = {
            title: `"${title}"`,
            date: timestamp,
            draft: false, // Always publish immediately
            layout: 'lightbox',
            image: `tomas-master/visual-garden/${cloudinaryPath}${extension}`,
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

        console.log('📝 Generated frontmatter:', yaml);

        // Write index.md file
        const indexPath = path.join(postDir, 'index.md');
        console.log('📁 Writing index.md to:', indexPath);
        await fs.writeFile(indexPath, yaml);
        console.log('✅ Successfully wrote index.md');

        // Clean up temp file
        try {
            await fs.unlink(req.file.path);
        } catch (e) {
            // File might already be moved
        }

        // Automatically commit and push to GitHub
        let gitStatus = 'Failed to commit';
        try {
            console.log('📝 Auto-committing changes to GitHub...');
            
            // Check if there are any changes to commit
            const gitStatusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
            if (!gitStatusOutput.trim()) {
                console.log('ℹ️ No changes to commit');
                gitStatus = 'No changes to commit';
            } else {
                console.log('📁 Changes detected:', gitStatusOutput);
                execSync('git add .', { stdio: 'inherit' });
                execSync(`git commit -m "feat: add new post - ${title}"`, { stdio: 'inherit' });
                execSync('git push origin main', { stdio: 'inherit' });
                console.log('✅ Successfully pushed to GitHub!');
                gitStatus = 'Committed and pushed to GitHub automatically';
            }
        } catch (gitError) {
            console.error('⚠️ Git auto-commit failed:', gitError.message);
            gitStatus = `Git commit failed: ${gitError.message}`;
            // Don't fail the upload if git fails
        }

        res.json({ 
            message: `Post created at ${postDir}`,
            slug: `${dateStr}-${slug}`,
            cloudinaryPath: `tomas-master/visual-garden/${cloudinaryPath}`,
            cloudinaryUrl: uploadResult.secure_url,
            gitStatus: gitStatus
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        // Try to commit any changes that might have been created before the error
        try {
            const gitStatusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
            if (gitStatusOutput.trim()) {
                console.log('📝 Attempting to commit changes before error response...');
                execSync('git add .', { stdio: 'inherit' });
                execSync('git commit -m "fix: partial upload recovery"', { stdio: 'inherit' });
                console.log('✅ Committed pending changes');
            }
        } catch (gitError) {
            console.warn('⚠️ Could not commit pending changes:', gitError.message);
        }
        
        res.status(500).json({ error: error.message });
    }
});

async function uploadToCloudinaryAPI(filePath, publicId) {
    try {
        console.log('Uploading to Cloudinary via API:', publicId);
        
        // Ensure public_id has no file extension to prevent double extensions
        const cleanPublicId = publicId.replace(/\.[^/.]+$/, '');
        console.log(`🧹 Cleaned public_id (no extension): ${cleanPublicId}`);
        
        // Upload using Cloudinary API directly
        const result = await cloudinary.uploader.upload(filePath, {
            public_id: cleanPublicId,
            use_filename: false,
            unique_filename: false,
            overwrite: true,
            invalidate: true,
            folder: 'tomas-master/visual-garden'
        });
        
        console.log('Upload successful:', result.secure_url);
        return result;
        
    } catch (error) {
        throw new Error(`Cloudinary API upload failed: ${error.message}`);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Upload server running at http://localhost:${PORT}`);
    console.log(`📝 Upload GUI available at http://localhost:${PORT}/upload-gui.html`);
    console.log(`🌐 Your live site: https://garden.tomasjgonzalez.com/`);
    console.log(`📸 Upload images here to add them to your live site!`);
});

module.exports = app;
