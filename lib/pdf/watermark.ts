import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

const ANGLE = 35;

/**
 * Stamp a large diagonal "PREVIEW" across every page. Live previews are rendered from unsaved
 * form data, so the mark keeps them from standing in for a saved, generated PDF.
 */
export async function watermarkPreview(bytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = "PREVIEW";
  const rad = (ANGLE * Math.PI) / 180;
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.min(width, height) / 4;
    const w = font.widthOfTextAtSize(text, size);
    // Start point chosen so the rotated word's centre lands on the page centre.
    page.drawText(text, {
      x: width / 2 - (w / 2) * Math.cos(rad) + (size / 3) * Math.sin(rad),
      y: height / 2 - (w / 2) * Math.sin(rad) - (size / 3) * Math.cos(rad),
      size,
      font,
      color: rgb(0.9, 0.22, 0.27),
      opacity: 0.13,
      rotate: degrees(ANGLE),
    });
  }
  return pdf.save();
}
