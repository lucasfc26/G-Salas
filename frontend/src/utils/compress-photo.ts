export const PHOTO_MAX_BYTES = 50 * 1024 * 1024;
const MAX_EDGE = 1600;
const TARGET_BYTES = 450 * 1024;

function blobToFile(blob: Blob, originalName: string) {
  const base = originalName.replace(/\.[^.]+$/, "") || "foto";
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error("Não foi possível comprimir a imagem.");
  return blob;
}

export async function compressPhoto(file: File): Promise<File> {
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error("Cada foto pode ter no máximo 50 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie apenas imagens JPG, PNG ou WebP.");
  }

  if (file.type === "image/webp" && file.size <= TARGET_BYTES) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível comprimir a imagem.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.78;
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    while (blob.size > TARGET_BYTES && quality > 0.52) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, "image/webp", quality);
    }

    if (blob.size > file.size && (file.type === "image/jpeg" || file.type === "image/webp") && file.size <= TARGET_BYTES) {
      return file;
    }
    return blobToFile(blob, file.name);
  } finally {
    bitmap.close();
  }
}

export async function compressPhotos(files: File[] | FileList): Promise<{ files: File[]; errors: string[] }> {
  const out: File[] = [];
  const errors: string[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    try {
      out.push(await compressPhoto(file));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Não foi possível comprimir ${file.name}.`);
    }
  }
  return { files: out, errors };
}
