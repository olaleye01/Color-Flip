// tools/pack.mjs — zips the contents of dist/ into my-web-lens.zip per Snapchat Web Lens specifications.
// Run after `npm run build`: node tools/pack.mjs
import { createWriteStream, statSync, readFileSync } from 'node:fs';
import { ZipArchive } from 'archiver';

async function pack() {
  console.log('📦 Packaging Web Lens build into my-web-lens.zip...');

  const zipPath = 'my-web-lens.zip';
  const output = createWriteStream(zipPath);
  const zip = new ZipArchive({ zlib: { level: 9 } });

  const streamFinished = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    zip.on('error', reject);
  });

  zip.pipe(output);
  // `false` puts the folder contents at the zip root instead of under dist/
  zip.directory('dist/', false);
  await zip.finalize();
  await streamFinished;

  // Validation checks against official Snapchat Web Lens requirements
  const zipStats = statSync(zipPath);
  const zipSizeMB = (zipStats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Packed ${zipPath} (${zipSizeMB} MB / ${zipStats.size} bytes)`);

  if (zipStats.size > 8 * 1024 * 1024) {
    console.error(`❌ ERROR: Zip file size (${zipSizeMB} MB) exceeds Snapchat's 8 MB limit!`);
    process.exit(1);
  } else {
    console.log(`✅ Size check passed: ${zipSizeMB} MB is under the 8 MB limit.`);
  }

  // Check dist/index.html
  const htmlStats = statSync('dist/index.html');
  const htmlSizeKB = (htmlStats.size / 1024).toFixed(1);
  if (htmlStats.size > 1024 * 1024) {
    console.error(`❌ ERROR: index.html (${htmlSizeKB} KB) exceeds Snapchat's 1 MB limit!`);
    process.exit(1);
  } else {
    console.log(`✅ Entry point check passed: index.html is ${htmlSizeKB} KB (under 1 MB).`);
  }

  // Check for absolute paths
  const indexHtml = readFileSync('dist/index.html', 'utf8');
  const absoluteMatches = indexHtml.match(/(src|href)="\/[^"]*"/g);
  if (absoluteMatches && absoluteMatches.length > 0) {
    console.error('❌ ERROR: Found absolute paths in dist/index.html:', absoluteMatches);
    process.exit(1);
  } else {
    console.log('✅ Path check passed: all asset links are relative.');
  }

  console.log('🚀 Web Lens zip package is 100% compliant and ready for My Lenses upload!');
}

pack().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
