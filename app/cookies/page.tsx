import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";

export const metadata: Metadata = pageMeta({
  title: "Cookie Policy",
  description: "Every cookie and browser-storage item Vouchlio uses, what each one does and how long it lasts. No advertising or cross-site tracking cookies.",
  path: "/cookies",
});

/** Everything this site stores in the browser. Keep in step with the code when adding storage. */
const COOKIES: { name: string; type: string; purpose: string; lasts: string }[] = [
  { name: "checkin_token", type: "Essential cookie", purpose: "Keeps you signed in. HTTP-only, so page scripts can't read it, and only sent to this site.", lasts: "30 days, or until you log out" },
  { name: "cookie_consent", type: "Essential cookie", purpose: "Remembers your cookie choices.", lasts: "12 months" },
  { name: "cw_conversation, cw_user_*", type: "Essential cookie (Chatwoot)", purpose: "Keeps your live-chat conversation open as you move between pages. Cleared when you log out.", lasts: "Set by Chatwoot" },
];

const STORAGE: { name: string; type: string; purpose: string; lasts: string }[] = [
  { name: "vouchlio-theme", type: "Local storage", purpose: "Remembers light or dark mode.", lasts: "Until you clear site data" },
  { name: "vouchlio-sidebar-collapsed", type: "Local storage", purpose: "Remembers whether you collapsed the dashboard sidebar.", lasts: "Until you clear site data" },
  { name: "agent_activation_prompt_*, document_access_expiry_prompt_*", type: "Session storage", purpose: "Remembers when you dismissed in-app reminders, so they don't reappear straight away.", lasts: "Until you close the tab" },
  { name: "agent_dashboard_quick_start_snooze_until", type: "Session storage", purpose: "Remembers that you hid the quick-start card.", lasts: "Until you close the tab" },
  { name: "vouchlio-show-upgrade-offer", type: "Session storage", purpose: "Shows the plan offer once after you sign in.", lasts: "Removed as soon as it's read" },
];

function StorageTable({ rows }: { rows: typeof COOKIES }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>How long</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td><code>{r.name}</code></td>
              <td>{r.type}</td>
              <td>{r.purpose}</td>
              <td>{r.lasts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Cookie categories, in the order the Cookie Policy lists them. */
const CATEGORIES: { name: string; purpose: string; examples: string; status: string }[] = [
  {
    name: "Essential",
    purpose: "Required for sign-in, security and the document workspace (vouchers, tickets, placards, invoices and related tools). Can't be switched off while you use the service.",
    examples: "Sign-in cookie (checkin_token), cookie choices (cookie_consent), live chat (cw_conversation)",
    status: "Always on",
  },
  {
    name: "Functional",
    purpose: "Remember choices that make your work easier, such as light or dark mode, the sidebar layout and dismissed reminders.",
    examples: "Display settings and reminder snoozes, saved in your browser only",
    status: "Always on",
  },
  {
    name: "Analytics",
    purpose: "Would help us measure usage, fix errors and improve performance.",
    examples: "None — we don't use any analytics tools today",
    status: "Not used. Only ever with your consent",
  },
];

const sections: LegalSection[] = [
  {
    id: "what-are-cookies",
    title: "What are cookies?",
    body: (
      <>
        <p>
          Cookies are small text files stored on your device. They help websites remember your session, keep you signed in and
          protect your account. We also use similar technologies, such as your browser&apos;s local and session storage, for
          non-sensitive display preferences.
        </p>
        <p>
          Your account and documents (vouchers, tickets, placards, invoices, receipts and saved customers) are never kept in
          cookies or browser storage. They are stored securely on our servers.
        </p>
      </>
    ),
  },
  {
    id: "cookies-we-use",
    title: "Cookies we use",
    body: (
      <>
        <p>We don&apos;t use advertising, social-media or cross-site tracking cookies, and we don&apos;t sell anything we store.</p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Purpose</th>
                <th>Examples</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c.name}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.purpose}</td>
                  <td>{c.examples}</td>
                  <td>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="!mt-6 text-base font-semibold text-slate-900">Cookies in detail</h3>
        <StorageTable rows={COOKIES} />
        <h3 className="!mt-6 text-base font-semibold text-slate-900">Settings saved in your browser</h3>
        <p>These never leave your device and aren&apos;t sent to our servers.</p>
        <StorageTable rows={STORAGE} />
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party cookies",
    body: (
      <>
        <p>Some services we rely on may set their own cookies under their own policies. We limit them to what is needed to run the service.</p>
        <ul>
          <li>
            <strong>Chatwoot (live chat):</strong> keeps your chat conversation open as you move between pages.
          </li>
          <li>
            <strong>Razorpay (payments):</strong> when you pay for a plan, Razorpay&apos;s secure checkout window may set its own
            cookies, for example to prevent fraud.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "managing",
    title: "Managing cookies",
    body: (
      <>
        <p>
          You can block or delete cookies in your browser settings. Blocking essential cookies stops you from signing in and
          creating documents. You can review your cookie choices at any time:{" "}
          <CookieSettingsButton className="font-semibold text-[var(--primary)] underline underline-offset-2" />.
        </p>
        <ul>
          <li><strong>Log out</strong> to remove the sign-in and live-chat cookies straight away.</li>
          <li>Clear this site&apos;s data in your browser to remove everything, including your display settings.</li>
          <li>If we ever add analytics, it will stay off until you allow it in your cookie settings.</li>
        </ul>
      </>
    ),
  },
  {
    id: "updates-contact",
    title: "Updates and contact",
    body: (
      <p>
        We may update this Cookie Policy when the service changes; the date at the top will change when we do. It should be read
        with our <Link href="/privacy">Privacy Policy</Link>. Questions? Reach us through the <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          This Cookie Policy explains how Vouchlio uses cookies and similar technologies when you visit our website and use your
          document workspace (hotel vouchers, air tickets, pickup vouchers, welcome placards, invoices, proforma invoices, receipts
          and customers).
        </p>
      }
      sections={sections}
    />
  );
}
