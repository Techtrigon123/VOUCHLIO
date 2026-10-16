import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { watermarkPreview } from "@/lib/pdf/watermark";

describe("watermarkPreview", () => {
  it("keeps every page and its size, and adds content to each", async () => {
    const src = await PDFDocument.create();
    src.addPage([595, 842]);
    src.addPage([842, 595]);
    const before = await src.save();

    const out = await PDFDocument.load(await watermarkPreview(before));
    expect(out.getPageCount()).toBe(2);
    expect(out.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())])).toEqual([[595, 842], [842, 595]]);
    // An empty page has no content stream; the stamp adds one to every page.
    for (const page of out.getPages()) expect(page.node.Contents()).toBeDefined();
  });
});
