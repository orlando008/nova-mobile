export async function decodePictures(assets) {
  const pictures = [];
  try {
    for (const { path, bytes } of assets) {
      const format = /\.(png|webp)$/i.exec(path)?.[1]?.toLowerCase();
      if (!format) continue;
      try {
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/' + format }), {
          premultiplyAlpha: 'premultiply',
        });
        pictures.push({ path, bitmap });
      } catch (error) {
        throw new Error('Could not decode ' + path, { cause: error });
      }
    }
    return pictures;
  } catch (error) {
    for (const { bitmap } of pictures) bitmap.close();
    throw error;
  }
}
