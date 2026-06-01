const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets', 'logo.svg');
const outputDir = path.join(root, 'build');

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const png = await sharp(source)
    .resize(1024, 1024)
    .png()
    .toBuffer();

  const ico = png2icons.createICO(png, png2icons.BICUBIC, 0, false, true);
  const icns = png2icons.createICNS(png, png2icons.BICUBIC, 0);

  if (!ico || !icns) throw new Error('Icon conversion failed');

  fs.writeFileSync(path.join(outputDir, 'icon.png'), png);
  fs.writeFileSync(path.join(outputDir, 'icon.ico'), ico);
  fs.writeFileSync(path.join(outputDir, 'icon.icns'), icns);

  console.log('desktop icons generated: build/icon.png, build/icon.ico, build/icon.icns');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
