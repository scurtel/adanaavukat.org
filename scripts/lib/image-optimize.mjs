export async function optimizeImageBuffer(inputBuffer, { maxWidth = 1200, quality = 82 } = {}) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    return {
      buffer: inputBuffer,
      format: 'original',
      width: null,
      height: null,
      optimized: false,
    };
  }

  const image = sharp(inputBuffer, { failOn: 'none' });
  const metadata = await image.metadata();

  const output = await image
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    format: 'webp',
    width: output.info.width,
    height: output.info.height,
    optimized: true,
    originalWidth: metadata.width || null,
    originalHeight: metadata.height || null,
  };
}
