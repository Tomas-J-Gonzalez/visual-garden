#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, relative, join } from 'node:path';
import { readdir } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsRoot = new URL('../assets/uploads/', import.meta.url);

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
  const rootPath = uploadsRoot.pathname;
  let files = [];
  try {
    files = await listFilesRecursive(rootPath);
  } catch (e) {
    // Directory may not exist yet
    files = [];
  }
  files = files.filter(Boolean);
  if (files.length === 0) {
    console.log('No files found in assets/uploads');
    return;
  }
  for (const absPath of files) {
    const relPath = relative(rootPath, absPath);
    const publicId = relPath.replace(/\.[^/.]+$/, '');
    const cmd = [
      'npx', '--yes', '@cloudinary/cli', 'cld', 'uploader', 'upload',
      absPath,
      '--folder', 'visual-garden',
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


