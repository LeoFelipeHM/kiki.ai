/**
 * Gera favicons raster a partir de `src/logo.svg` para Safari / iOS e outros
 * browsers que não usam bem SVG ou favicon definido só em runtime.
 */
import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'src/logo.svg');
const publicDir = join(root, 'public');
const svgBuffer = readFileSync(svgPath);
const white = { r: 255, g: 255, b: 255, alpha: 1 };

await sharp(svgBuffer).resize(16, 16, { fit: 'contain', background: white }).png().toFile(join(publicDir, 'favicon-16x16.png'));
await sharp(svgBuffer).resize(32, 32, { fit: 'contain', background: white }).png().toFile(join(publicDir, 'favicon-32x32.png'));
await sharp(svgBuffer).resize(180, 180, { fit: 'contain', background: white }).png().toFile(join(publicDir, 'apple-touch-icon.png'));

copyFileSync(svgPath, join(publicDir, 'favicon.svg'));
