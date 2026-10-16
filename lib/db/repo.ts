import "server-only";
import { db } from "./supabase";
import type { DocumentKind, PartnerType, AgentStatus, PlanId } from "@/lib/agent/types";

/*
 * Thin data layer over Supabase. Tables use snake_case; the app uses camelCase.
 * Every function throws on a database error so route handlers can return 500.
 */

/* ─── mapping ────────────────────────────────────────────────────────────── */

const DATE_KEYS = new Set(["createdAt", "updatedAt", "pdfGeneratedAt", "subscriptionExpiresAt", "resetTokenExpiry"]);

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function fromRow<T>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = toCamel(k);
    out[key] = v === null ? undefined : DATE_KEYS.has(key) && typeof v === "string" ? new Date(v) : v;
  }
  return out as T;
}

/** camelCase patch → snake_case row. `undefined` values become NULL (clears the column). */
function toRow(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id") continue;
    out[toSnake(k)] = v === undefined ? null : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

/**
 * Whether a column added by a later migration exists yet. Checked once, then re-checked
 * every minute while missing — so the app keeps working before the migration is run and
 * picks the column up afterwards without a restart.
 */
const columnCache = new Map<string, { present: boolean; checkedAt: number }>();
export async function hasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const cached = columnCache.get(key);
  if (cached && (cached.present || Date.now() - cached.checkedAt < 60_000)) return cached.present;
  const { error } = await db().from(table).select(column).limit(0);
  const present = !error;
  columnCache.set(key, { present, checkedAt: Date.now() });
  return present;
}

/** Safe value for PostgREST `or=(…ilike…)` filters: drop filter syntax, escape LIKE wildcards. */
export function likePattern(q: string) {
  const clean = q.replace(/[,()"\\*]/g, " ").replace(/[%_]/g, (c) => `\\${c}`).trim();
  return `%${clean}%`;
}

function orIlike(cols: string[], q: string) {
  const p = likePattern(q);
  return cols.map((c) => `${c}.ilike.${p}`).join(",");
}

/* ─── users ──────────────────────────────────────────────────────────────── */

export interface DocumentNumberSettings {
  invoicePrefix: string;
  proformaPrefix: string;
  receiptPrefix: string;
  digits: number;
}

export interface ExtractUsage {
  day: string;
  voucher: number;
  airTicket: number;
  yearStart?: string;
  yearTotal: number;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  organization?: string;
  role: "owner" | "admin" | "staff";
  mobile?: string;
  landlineNumber?: string;
  brandName?: string;
  companyName?: string;
  partnerType?: PartnerType;
  partnerTypeOther?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstNumber?: string;
  iataNumber?: string;
  brandLogo?: string;
  companyStamp?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankBranchAddress?: string;
  paymentUpi?: string;
  status: AgentStatus;
  isVerified: boolean;
  agentLevel?: string;
  subscriptionPlan: PlanId;
  subscriptionExpiresAt?: Date;
  subscriptionCycle?: "monthly" | "yearly";
  /** Profile review (migration 0007). Undefined until the migration is run. */
  verificationStatus?: string;
  verificationSubmittedAt?: Date | string;
  verificationNote?: string;
  verificationFingerprint?: Record<string, string>;
  verificationCheckedFingerprint?: Record<string, string>;
  verificationChanges?: string[];
  airTicketingEnabled: boolean;
  travelServiceVoucherEnabled: boolean;
  welcomePlacardEnabled: boolean;
  documentNumberSettings: DocumentNumberSettings;
  extractUsage: ExtractUsage;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPatch = Partial<Omit<UserRecord, "id" | "createdAt" | "updatedAt">> & {
  passwordHash?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
};

// Never select secrets unless a caller asks for them explicitly.
const USER_BASE_COLUMNS =
  "id,name,email,organization,role,mobile,landline_number,brand_name,company_name,partner_type,partner_type_other,address,city,state,country,pincode,gst_number,iata_number,brand_logo,company_stamp,bank_account_holder,bank_name,bank_account_number,bank_ifsc_code,bank_branch_address,payment_upi,status,is_verified,agent_level,subscription_plan,subscription_expires_at,air_ticketing_enabled,travel_service_voucher_enabled,welcome_placard_enabled,document_number_settings,extract_usage,created_at,updated_at";

/** User columns, plus subscription_cycle (migration 0005) and profile review (0007) once they're in. */
const VERIFICATION_COLUMNS =
  "verification_status,verification_submitted_at,verification_note,verification_fingerprint,verification_checked_fingerprint,verification_changes";
async function userColumns(): Promise<string> {
  const [cycle, review] = await Promise.all([hasColumn("users", "subscription_cycle"), hasColumn("users", "verification_status")]);
  return [USER_BASE_COLUMNS, cycle ? "subscription_cycle" : "", review ? VERIFICATION_COLUMNS : ""].filter(Boolean).join(",");
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const row = check(await db().from("users").select(await userColumns()).eq("id", id).maybeSingle());
  return fromRow<UserRecord>(row as Record<string, unknown> | null);
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const row = check(await db().from("users").select(await userColumns()).eq("email", email.trim().toLowerCase()).maybeSingle());
  return fromRow<UserRecord>(row as Record<string, unknown> | null);
}

/** For login / password change only. */
export async function findUserWithPassword(by: { id?: string; email?: string }): Promise<(UserRecord & { passwordHash: string }) | null> {
  let q = db().from("users").select(`${await userColumns()},password_hash`);
  q = by.id ? q.eq("id", by.id) : q.eq("email", (by.email ?? "").trim().toLowerCase());
  const row = check(await q.maybeSingle());
  return fromRow<UserRecord & { passwordHash: string }>(row as Record<string, unknown> | null);
}

export async function findUserByResetToken(token: string): Promise<UserRecord | null> {
  const row = check(
    await db().from("users").select(await userColumns()).eq("reset_token", token).gt("reset_token_expiry", new Date().toISOString()).maybeSingle()
  );
  return fromRow<UserRecord>(row as Record<string, unknown> | null);
}

export async function createUser(input: { name: string; email: string; passwordHash: string; organization?: string; companyName?: string }): Promise<UserRecord> {
  const row = check(
    await db()
      .from("users")
      .insert(toRow({ ...input, email: input.email.trim().toLowerCase(), role: "owner" }))
      .select(await userColumns())
      .single()
  );
  return fromRow<UserRecord>(row as unknown as Record<string, unknown>)!;
}

export async function updateUser(id: string, patch: UserPatch): Promise<UserRecord> {
  const row = check(await db().from("users").update(toRow(patch)).eq("id", id).select(await userColumns()).single());
  return fromRow<UserRecord>(row as unknown as Record<string, unknown>)!;
}

/* ─── agent documents ───────────────────────────────────────────────────── */

export interface DocRecord {
  id: string;
  agentId: string;
  kind: DocumentKind;
  title: string;
  subtitle?: string;
  number?: string;
  groupKey?: string;
  version: number;
  status?: string;
  data: Record<string, unknown>;
  pdfGeneratedAt?: Date;
  currency?: string;
  total?: number;
  paidAmount: number;
  parentId?: string;
  searchText: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DocInsert = Omit<DocRecord, "id" | "createdAt" | "updatedAt" | "paidAmount" | "version"> & { paidAmount?: number; version?: number };
export type DocPatch = Partial<Omit<DocRecord, "id" | "agentId" | "createdAt" | "updatedAt">>;

const DOC_LIST_COLUMNS =
  "id,agent_id,kind,title,subtitle,number,group_key,version,status,pdf_generated_at,currency,total,paid_amount,parent_id,search_text,created_at,updated_at";

export interface DocFilters {
  kinds?: DocumentKind[];
  q?: string;
  field?: "all" | "title" | "number" | "ref" | "preparedBy" | "hotel";
  status?: string;
  from?: Date;
  to?: Date;
  parentId?: string;
  limit?: number;
  withData?: boolean;
  order?: "created_desc" | "created_asc" | "updated_desc";
}

export async function listDocuments(agentId: string, f: DocFilters = {}): Promise<DocRecord[]> {
  let q = db().from("agent_documents").select(f.withData ? `${DOC_LIST_COLUMNS},data` : DOC_LIST_COLUMNS).eq("agent_id", agentId);
  if (f.kinds?.length) q = q.in("kind", f.kinds);
  if (f.status) q = q.eq("status", f.status);
  if (f.parentId) q = q.eq("parent_id", f.parentId);
  if (f.from) q = q.gte("created_at", f.from.toISOString());
  if (f.to) q = q.lte("created_at", f.to.toISOString());
  const text = f.q?.trim();
  if (text) {
    const p = likePattern(text);
    if (f.field === "title") q = q.ilike("title", p);
    else if (f.field === "number") q = q.ilike("number", p);
    else if (f.field === "ref") q = q.ilike("data->>bookingRef", p);
    else if (f.field === "preparedBy") q = q.ilike("data->>preparedBy", p);
    else if (f.field === "hotel") q = q.ilike("data->>hotelName", p);
    else q = q.or(orIlike(["title", "number", "subtitle", "search_text"], text));
  }
  const order = f.order ?? "created_desc";
  q = q.order(order === "updated_desc" ? "updated_at" : "created_at", { ascending: order === "created_asc" });
  const rows = check(await q.limit(f.limit ?? 500));
  return (rows as unknown as Record<string, unknown>[]).map((r) => fromRow<DocRecord>({ data: {}, ...r })!);
}

export async function getDocument(agentId: string, id: string): Promise<DocRecord | null> {
  const row = check(await db().from("agent_documents").select("*").eq("agent_id", agentId).eq("id", id).maybeSingle());
  return fromRow<DocRecord>(row as Record<string, unknown> | null);
}

export async function createDocument(input: DocInsert): Promise<DocRecord> {
  const row = check(await db().from("agent_documents").insert(toRow(input)).select("*").single());
  return fromRow<DocRecord>(row as Record<string, unknown>)!;
}

export async function updateDocument(agentId: string, id: string, patch: DocPatch): Promise<DocRecord> {
  const row = check(await db().from("agent_documents").update(toRow(patch)).eq("agent_id", agentId).eq("id", id).select("*").single());
  return fromRow<DocRecord>(row as Record<string, unknown>)!;
}

export async function deleteDocument(agentId: string, id: string): Promise<void> {
  check(await db().from("agent_documents").delete().eq("agent_id", agentId).eq("id", id));
}

export async function documentExists(agentId: string, where: { kind?: DocumentKind; number?: string; excludeId?: string } = {}): Promise<boolean> {
  let q = db().from("agent_documents").select("id", { head: true, count: "exact" }).eq("agent_id", agentId);
  if (where.kind) q = q.eq("kind", where.kind);
  if (where.number !== undefined) q = q.eq("number", where.number);
  if (where.excludeId) q = q.neq("id", where.excludeId);
  const res = await q;
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return (res.count ?? 0) > 0;
}

/** Highest version in a group, or `ifNone` when the group has no documents. */
export async function latestVersionInGroup(agentId: string, groupKey: string, ifNone = 1): Promise<number> {
  const row = check(
    await db().from("agent_documents").select("version").eq("agent_id", agentId).eq("group_key", groupKey).order("version", { ascending: false }).limit(1).maybeSingle()
  );
  return row ? ((row as { version?: number | null }).version ?? 1) : ifNone;
}

export async function searchDocuments(agentId: string, q: string, limit = 20) {
  const rows = check(
    await db()
      .from("agent_documents")
      .select("id,kind,title,subtitle,number,pdf_generated_at")
      .eq("agent_id", agentId)
      .or(orIlike(["title", "number", "subtitle", "search_text"], q))
      .order("updated_at", { ascending: false })
      .limit(limit)
  );
  return (rows as Record<string, unknown>[]).map((r) => fromRow<Pick<DocRecord, "id" | "kind" | "title" | "subtitle" | "number" | "pdfGeneratedAt">>(r)!);
}

export async function documentCounts(agentId: string): Promise<{ key: DocumentKind; count: number }[]> {
  const rows = check(await db().rpc("agent_document_counts", { p_agent: agentId }));
  return ((rows ?? []) as { kind: DocumentKind; count: number | string }[]).map((r) => ({ key: r.kind, count: Number(r.count) }));
}

/**
 * Weekly activity for the dashboard chart: documents created and PDFs generated in each of the
 * last `weeks` weeks (oldest first). Week buckets are 7-day windows ending now.
 */
export async function weeklyActivity(agentId: string, weeks = 8): Promise<{ weekStart: string; created: number; pdfs: number }[]> {
  const WEEK = 7 * 86400000;
  const now = Date.now();
  const since = new Date(now - weeks * WEEK).toISOString();
  const [created, pdfs] = await Promise.all([
    db().from("agent_documents").select("created_at").eq("agent_id", agentId).gte("created_at", since).limit(5000),
    db().from("agent_documents").select("pdf_generated_at").eq("agent_id", agentId).gte("pdf_generated_at", since).limit(5000),
  ]);
  const buckets = Array.from({ length: weeks }, (_, i) => ({ weekStart: new Date(now - (weeks - i) * WEEK).toISOString(), created: 0, pdfs: 0 }));
  const slot = (iso: string) => Math.min(weeks - 1, Math.floor((new Date(iso).getTime() - (now - weeks * WEEK)) / WEEK));
  for (const r of (check(created) ?? []) as { created_at: string }[]) buckets[slot(r.created_at)].created++;
  for (const r of (check(pdfs) ?? []) as { pdf_generated_at: string }[]) buckets[slot(r.pdf_generated_at)].pdfs++;
  return buckets;
}

export async function activityRank(agentId: string, since: Date): Promise<{ activityScore: number; rank: number | null }> {
  const rows = check(await db().rpc("agent_activity_rank", { p_agent: agentId, p_since: since.toISOString() }));
  const r = ((rows ?? []) as { activity_score: number | string; rank: number | string | null }[])[0];
  return { activityScore: Number(r?.activity_score ?? 0), rank: r?.rank == null ? null : Number(r.rank) };
}

/* ─── customers ──────────────────────────────────────────────────────────── */

export interface CustomerRecord {
  id: string;
  agentId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  gstTreatment?: string;
  gstin?: string;
  placeOfSupply?: string;
  pan?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listCustomers(agentId: string, q?: string): Promise<CustomerRecord[]> {
  let query = db().from("customers").select("*").eq("agent_id", agentId);
  if (q?.trim()) query = query.or(orIlike(["name", "company", "email", "phone"], q));
  const rows = check(await query.order("updated_at", { ascending: false }).limit(200));
  return (rows as Record<string, unknown>[]).map((r) => fromRow<CustomerRecord>(r)!);
}

export async function getCustomer(agentId: string, id: string): Promise<CustomerRecord | null> {
  const row = check(await db().from("customers").select("*").eq("agent_id", agentId).eq("id", id).maybeSingle());
  return fromRow<CustomerRecord>(row as Record<string, unknown> | null);
}

export async function createCustomer(agentId: string, fields: Record<string, string>): Promise<CustomerRecord> {
  const row = check(await db().from("customers").insert(toRow({ ...fields, agentId })).select("*").single());
  return fromRow<CustomerRecord>(row as Record<string, unknown>)!;
}

export async function updateCustomer(agentId: string, id: string, fields: Record<string, string>): Promise<CustomerRecord | null> {
  const row = check(await db().from("customers").update(toRow(fields)).eq("agent_id", agentId).eq("id", id).select("*").maybeSingle());
  return fromRow<CustomerRecord>(row as Record<string, unknown> | null);
}

export async function deleteCustomer(agentId: string, id: string): Promise<void> {
  check(await db().from("customers").delete().eq("agent_id", agentId).eq("id", id));
}

export async function countCustomers(agentId: string): Promise<number> {
  const res = await db().from("customers").select("id", { head: true, count: "exact" }).eq("agent_id", agentId);
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.count ?? 0;
}

/* ─── plan payments ──────────────────────────────────────────────────────── */

export interface PlanPaymentRecord {
  id: string;
  agentId: string;
  planId: "gold" | "platinum";
  billingCycle?: "monthly" | "yearly";
  amountInr: number;
  paymentTransactionId: string;
  proof: string;
  proofType: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export async function findPendingPlanPayment(agentId: string, planId?: string): Promise<PlanPaymentRecord | null> {
  let q = db().from("plan_payments").select("*").eq("agent_id", agentId).eq("status", "pending");
  if (planId) q = q.eq("plan_id", planId);
  const row = check(await q.order("created_at", { ascending: false }).limit(1).maybeSingle());
  return fromRow<PlanPaymentRecord>(row as Record<string, unknown> | null);
}

export async function createPlanPayment(input: Omit<PlanPaymentRecord, "id" | "status" | "createdAt" | "updatedAt">): Promise<PlanPaymentRecord> {
  const row = check(await db().from("plan_payments").insert(toRow(input)).select("*").single());
  return fromRow<PlanPaymentRecord>(row as Record<string, unknown>)!;
}

export async function updatePlanPayment(id: string, patch: Partial<Pick<PlanPaymentRecord, "paymentTransactionId" | "proof" | "proofType" | "billingCycle" | "amountInr">>): Promise<PlanPaymentRecord> {
  const row = check(await db().from("plan_payments").update(toRow(patch)).eq("id", id).select("*").single());
  return fromRow<PlanPaymentRecord>(row as Record<string, unknown>)!;
}

/** New documents (first versions only — edits and new versions don't count) created since a date. */
export async function countNewDocumentsSince(agentId: string, since: Date): Promise<number> {
  const { count, error } = await db()
    .from("agent_documents")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .gte("created_at", since.toISOString())
    .or("version.is.null,version.eq.1");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return count ?? 0;
}

/* ─── contact messages (public Contact page) ─────────────────────────────── */

export async function createContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  topic: string;
  message: string;
}): Promise<void> {
  check(await db().from("contact_messages").insert(toRow(input)));
}
