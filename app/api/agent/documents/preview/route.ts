import { NextRequest } from "next/server";
import { requireAgent, serializeAgent, isUuid, fail } from "@/lib/agent/server";
import { getDocument } from "@/lib/db/repo";
import { effectivePlan, planIncludes } from "@/lib/agent/plans";
import { isFeatureEnabled } from "@/lib/agent/features";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { watermarkPreview } from "@/lib/pdf/watermark";
import type { DocumentKind } from "@/lib/agent/types";

/** Kinds rendered on the server. Welcome placards draw their own live preview in the browser. */
const PREVIEW_KINDS: DocumentKind[] = ["hotel_voucher", "air_ticket", "pickup_voucher", "invoice", "proforma", "receipt", "itinerary"];
const isPreviewKind = (k: unknown): k is DocumentKind => typeof k === "string" && (PREVIEW_KINDS as string[]).includes(k);

/**
 * Live preview while a form is being filled. Body: { kind, data }.
 * Renders the unsaved data with the same templates as the real PDF, stamped "PREVIEW". Nothing is
 * saved and it doesn't count toward the plan's document allowance, so the watermark is what keeps
 * a preview from replacing a generated PDF.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;
    const body = (await req.json().catch(() => null)) as { kind?: unknown; data?: unknown; documentId?: unknown } | null;
    if (!body || !isPreviewKind(body.kind) || typeof body.data !== "object" || !body.data) return fail("Invalid request body.");

    const agent = serializeAgent(user);
    const plan = effectivePlan(user);
    if (!isFeatureEnabled(agent, body.kind) || !planIncludes(plan, body.kind))
      return fail("This document type isn't available on your account.", 403, "FEATURE_DISABLED");

    // Editing a saved invoice: show its recorded payments (paid / balance due) like the real PDF.
    // The amount comes from the agent's own saved document, never from the request.
    let paidAmount = 0;
    if (typeof body.documentId === "string" && isUuid(body.documentId)) {
      const saved = await getDocument(user.id, body.documentId);
      if (saved) paidAmount = Number(saved.paidAmount ?? 0);
    }

    let bytes: Uint8Array | null;
    try {
      bytes = await renderDocumentPdf(body.kind, body.data as Record<string, unknown>, agent, plan, { paidAmount });
    } catch {
      // Half-filled forms can trip a template (e.g. an unparseable date) — not a server fault.
      return fail("Fill in a few more details to see the preview.", 422, "PREVIEW_INCOMPLETE");
    }
    if (!bytes) return fail("No preview for this document type.", 400);

    return new Response(Buffer.from(await watermarkPreview(bytes)), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="preview.pdf"', "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[POST /api/agent/documents/preview]", error);
    return fail("Could not build the preview.", 500);
  }
}
