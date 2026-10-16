import { NextRequest } from "next/server";
import {
  requireAgent,
  refreshAgentState,
  summarizeDocument,
  serializeAgent,
  ok,
  fail,
} from "@/lib/agent/server";
import { describeDocument, validateDocument } from "@/lib/agent/documents";
import { isFeatureEnabled } from "@/lib/agent/features";
import { creationBlock } from "@/lib/agent/entitlements";
import { createDocument, documentExists, latestVersionInGroup, listDocuments, updateDocument, type DocFilters } from "@/lib/db/repo";
import type { DocumentKind } from "@/lib/agent/types";

const DOCUMENT_KINDS: DocumentKind[] = [
  "hotel_voucher", "air_ticket", "pickup_voucher", "welcome_placard", "invoice", "proforma", "receipt", "itinerary",
];
const isKind = (k: unknown): k is DocumentKind => typeof k === "string" && (DOCUMENT_KINDS as string[]).includes(k);
const FIELDS = ["all", "title", "number", "ref", "preparedBy"] as const;

/**
 * List saved documents.
 * ?kind=hotel_voucher (or several, comma-separated) &q=…&field=all|title|number|ref|preparedBy
 * &from=YYYY-MM-DD&to=YYYY-MM-DD&status=…
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;

    const sp = req.nextUrl.searchParams;
    const field = sp.get("field");
    const from = sp.get("from");
    const to = sp.get("to");
    const filters: DocFilters = {
      kinds: (sp.get("kind") ?? "").split(",").filter(isKind),
      q: sp.get("q") ?? undefined,
      field: (FIELDS as readonly string[]).includes(field ?? "") ? (field as DocFilters["field"]) : "all",
      status: sp.get("status") ?? undefined,
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999`) : undefined,
    };

    const docs = await listDocuments(user.id, filters);
    return ok(docs.map((d) => summarizeDocument(d, user)));
  } catch (error) {
    console.error("[GET /api/agent/documents]", error);
    return fail("Could not load your documents.", 500);
  }
}

/** Create a document. Body: { kind, data, generatePdf?, groupKey?, version? } */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !isKind(body.kind) || typeof body.data !== "object" || !body.data)
      return fail("Invalid request body.");

    const kind = body.kind;
    const agent = serializeAgent(user);
    if (!isFeatureEnabled(agent, kind))
      return fail("This document type is not enabled for your account.", 403, "FEATURE_DISABLED");
    // A version above 1 only counts as a new version of a document that already exists —
    // otherwise it is a new document and uses the free allowance.
    const groupKey = typeof body.groupKey === "string" ? body.groupKey : undefined;
    const existing = groupKey && typeof body.version === "number" && body.version > 1 ? await latestVersionInGroup(user.id, groupKey, 0) : 0;
    const version = existing > 0 ? existing + 1 : 1;
    const block = await creationBlock(user, kind, { newVersion: version > 1 });
    if (block) return fail(block.message, block.status, block.code);

    const data = body.data as Record<string, unknown>;
    const companyName = kind === "welcome_placard" ? agent.brandName || agent.companyName : agent.companyName;
    const invalid = validateDocument(kind, data, companyName, agent.state);
    if (invalid) return fail(invalid, 422, "VALIDATION");

    const desc = describeDocument(kind, data, agent.state);

    if ((kind === "invoice" || kind === "proforma" || kind === "receipt") && desc.number) {
      if (await documentExists(user.id, { kind, number: desc.number }))
        return fail("This document number is already used. Choose another.", 409, "DUPLICATE_NUMBER");
    }

    let doc = await createDocument({
      agentId: user.id,
      kind,
      ...desc,
      groupKey: groupKey ?? desc.groupKey,
      version,
      data,
      pdfGeneratedAt: body.generatePdf ? new Date() : undefined,
    });
    // Every document belongs to a group so later versions can be stacked under it.
    if (!doc.groupKey) doc = await updateDocument(user.id, doc.id, { groupKey: doc.id });

    const wasActive = user.status === "ACTIVE";
    const fresh = await refreshAgentState(user);
    return ok(
      { document: summarizeDocument(doc, fresh), data: doc.data, becameActive: !wasActive && fresh.status === "ACTIVE" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/agent/documents]", error);
    return fail("Could not save. Please try again.", 500);
  }
}
