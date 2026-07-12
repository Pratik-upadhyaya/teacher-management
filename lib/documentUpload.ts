/**
 * Client-side document upload prep: validates file type, and for images,
 * compresses + normalizes everything to JPEG before it ever hits the wire.
 *
 * Why this exists: many teachers upload straight from a phone camera —
 * multi-megabyte photos, often HEIC on iPhone. Without this, every one of
 * those eats into server storage and the 5MB cap becomes a source of
 * confusing failures for non-technical users. This shrinks images
 * automatically and converts anything browser-drawable (plus HEIC, via
 * heic2any) into a small JPEG, so "just pick your photo" works without the
 * teacher ever thinking about file size or format.
 *
 * PDFs are passed through untouched — real PDF compression needs a
 * server-side tool (e.g. Ghostscript), not something feasible in-browser.
 */

const MAX_DIMENSION = 2000; // long edge, px — plenty for a readable scanned document
const JPEG_QUALITIES = [0.82, 0.7, 0.55, 0.4]; // tried in order until under the size cap
// Real document photos land ~400-550KB at quality 0.82 (tested against
// realistic phone-camera resolutions) -- this ceiling is a rarely-hit
// backstop for pathological cases, not the typical output size. Matches
// IMAGE_MAX_BYTES in backend/documents/file_processing.py.
const IMAGE_MAX_BYTES = 1_500_000;
// PDFs aren't compressed (no lightweight in-browser option), so this stays
// the real, binding cap. Matches PDF_MAX_BYTES in file_processing.py.
const PDF_MAX_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_TYPES =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,.pdf,application/pdf";

export class UnsupportedFileTypeError extends Error {}
export class FileTooLargeError extends Error {}

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function isRasterImage(file: File): boolean {
  return file.type.startsWith("image/") || isHeic(file);
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function decodeToBlob(file: File): Promise<Blob> {
  if (isHeic(file)) {
    // heic2any is loaded lazily — it's only needed for the (relatively rare)
    // HEIC path, no reason to add it to everyone's initial bundle.
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return Array.isArray(result) ? result[0] : result;
  }
  return file;
}

async function blobToBitmapSize(blob: Blob): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

function drawResized(bitmap: ImageBitmap, width: number, height: number): HTMLCanvasElement {
  let targetW = width;
  let targetH = height;
  if (Math.max(width, height) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    targetW = Math.round(width * scale);
    targetH = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  // White background first: source may have transparency, and JPEG has no
  // alpha channel — without this, transparent areas would turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Compresses+converts an image file to a JPEG under IMAGE_MAX_BYTES,
 * trying progressively lower quality until it fits. Returns a new File
 * with a .jpg extension regardless of the original format.
 */
async function compressImageFile(file: File): Promise<File> {
  const decoded = await decodeToBlob(file);
  const { bitmap, width, height } = await blobToBitmapSize(decoded);
  const canvas = drawResized(bitmap, width, height);
  bitmap.close();

  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= IMAGE_MAX_BYTES) {
      const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], newName, { type: "image/jpeg" });
    }
  }
  // Even the lowest quality didn't fit (extremely high original resolution
  // at a huge aspect ratio, or similar edge case) — throw so the caller can
  // show a clear "still too large" message rather than silently uploading
  // something that will get 400'd by the backend anyway.
  throw new FileTooLargeError("Could not compress image below the size limit.");
}

/**
 * Validates and, for images, compresses/converts a file selected for
 * document upload. Throws UnsupportedFileTypeError or FileTooLargeError on
 * failure; otherwise resolves to the File that should actually be uploaded.
 */
export async function prepareDocumentFile(file: File): Promise<File> {
  if (isPdf(file)) {
    if (file.size > PDF_MAX_BYTES) {
      throw new FileTooLargeError("File too large — max 5MB.");
    }
    return file;
  }
  if (isRasterImage(file)) {
    return compressImageFile(file);
  }
  throw new UnsupportedFileTypeError(
    "Unsupported file type — please upload a JPG, PNG, HEIC, or PDF."
  );
}