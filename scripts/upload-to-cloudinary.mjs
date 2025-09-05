#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, relative, join } from 'node:path';
import { readdir } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsRoot = new URL('../assets/uploads/', import.meta.url);
const postsRoot = new URL('../content/post/', import.meta.url);

async function listFilesRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(res);
    }
    return res;
  }));
  return files.flat();
}

const run = async () => {
  const uploadsPath = uploadsRoot.pathname;
  const postsPath = postsRoot.pathname;
  let uploadFiles = [];
  let postFiles = [];
  try {
    uploadFiles = await listFilesRecursive(uploadsPath);
  } catch (e) {
    // Directory may not exist yet
    uploadFiles = [];
  }
  try {
    postFiles = await listFilesRecursive(postsPath);
  } catch {
    postFiles = [];
  }
  const imageExt = /\.(jpg|jpeg|png|webp|avif|gif)$/i;
  const files = [
    ...uploadFiles.filter(Boolean),
    ...postFiles.filter(Boolean).filter((p) => imageExt.test(p)),
  ];
  if (files.length === 0) {
    console.log('No image files found in assets/uploads or content/post');
    return;
  }
  for (const absPath of files) {
    let relPath;
    let publicId;
    if (absPath.startsWith(uploadsPath)) {
      relPath = relative(uploadsPath, absPath);
      publicId = relPath.replace(/\.[^/.]+$/, '');
    } else {
      relPath = relative(postsPath, absPath);
      publicId = ('post/' + relPath).replace(/\.[^/.]+$/, '');
    }
    const cmd = [
      'npx', '--yes', '@cloudinary/cli', 'cld', 'uploader', 'upload',
      absPath,
      '--folder', 'tomas-master/visual-garden',
      '--public_id', publicId,
      '--use_filename=false',
      '--unique_filename=false',
      '--overwrite=true',
      '--invalidate=true'
    ];
    console.log('Uploading', relPath);
    execSync(cmd.join(' '), { stdio: 'inherit' });
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


