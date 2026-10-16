import "server-only";
import { db } from "@/lib/db/supabase";

/** Rows are written by database triggers (migration 0013) when the Vouchlio team acts on an agent's account. */
export type NotificationKind = "verification" | "plan" | "payment" | "ticket" | "callback" | "account";

export interface AgentNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

const LIST_LIMIT = 30;

/** PostgREST "table not found" (PGRST205) or Postgres "relation does not exist" (42P01). */
const isMissingTable = (e: { code?: string; message: string }) => e.code === "PGRST205" || e.code === "42P01" || /could not find the table|does not exist/i.test(e.message);

/** Latest notifications and the unread count. Before migration 0013 runs, the bell is simply empty. */
export async function listNotifications(agentId: string): Promise<{ items: AgentNotification[]; unread: number }> {
  const [list, count] = await Promise.all([
    db().from("agent_notifications").select("id,kind,title,body,href,read_at,created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(LIST_LIMIT),
    db().from("agent_notifications").select("id", { count: "exact", head: true }).eq("agent_id", agentId).is("read_at", null),
  ]);
  const error = list.error ?? count.error;
  if (error) {
    if (isMissingTable(error)) return { items: [], unread: 0 };
    throw new Error(`Supabase: ${error.message}`);
  }
  const items = ((list.data ?? []) as { id: string; kind: NotificationKind; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    read: !!r.read_at,
    createdAt: r.created_at,
  }));
  return { items, unread: count.count ?? 0 };
}

/** Mark the given notifications (or all of them) as read. Only ever touches this agent's rows. */
export async function markNotificationsRead(agentId: string, ids?: string[]): Promise<void> {
  let q = db().from("agent_notifications").update({ read_at: new Date().toISOString() }).eq("agent_id", agentId).is("read_at", null);
  if (ids) q = q.in("id", ids);
  const { error } = await q;
  if (error && !isMissingTable(error)) throw new Error(`Supabase: ${error.message}`);
}
