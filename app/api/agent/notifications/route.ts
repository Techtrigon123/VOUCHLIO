import { NextRequest } from "next/server";
import { requireAgent, ok, fail, isUuid } from "@/lib/agent/server";
import { listNotifications, markNotificationsRead } from "@/lib/db/notifications-repo";

/** The bell: latest notifications from the Vouchlio team plus the unread count. Polled while the tab is open. */
export async function GET() {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;
    return ok(await listNotifications(user.id));
  } catch (error) {
    console.error("[GET /api/agent/notifications]", error);
    return fail("Could not load notifications.", 500);
  }
}

/** Mark as read. Body: { ids: string[] } for specific ones, or { all: true }. */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;
    const body = (await req.json().catch(() => null)) as { ids?: unknown; all?: unknown } | null;
    if (body?.all === true) {
      await markNotificationsRead(user.id);
      return ok(true);
    }
    const ids = Array.isArray(body?.ids) ? body.ids.filter((v): v is string => typeof v === "string" && isUuid(v)).slice(0, 100) : [];
    if (!ids.length) return fail("Nothing to mark as read.");
    await markNotificationsRead(user.id, ids);
    return ok(true);
  } catch (error) {
    console.error("[POST /api/agent/notifications]", error);
    return fail("Could not update notifications.", 500);
  }
}
