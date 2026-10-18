import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Cookie Policy",
  description: "Every cookie and browser-storage item Vouchlio uses, what each one does and how long it lasts. No advertising or cross-site tracking cookies.",
  path: "/cookies",
});

const { legal } = SITE;
const EFFECTIVE_DATE = "18 October 2026";
const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

/** Everything this site stores in the browser. Keep in step with the code when adding storage. */
const COOKIES: { name: string; type: string; purpose: string; lasts: string }[] = [
  { name: "checkin_token", type: "Essential cookie", purpose: "Keeps you signed in. HTTP-only, so page scripts can't read it, and only sent to this site.", lasts: "30 days, or until you log out" },
  { name: "cookie_consent", type: "Essential cookie", purpose: "Remembers your cookie choices.", lasts: "12 months" },
];

const STORAGE: { name: string; type: string; purpose: string; lasts: string }[] = [
  { name: "vouchlio-theme", type: "Local storage", purpose: "Remembers light or dark mode.", lasts: "Until you clear site data" },
  { name: "vouchlio-live-preview", type: "Local storage", purpose: "Remembers whether the live PDF preview is open while you fill a form.", lasts: "Until you clear site data" },
  { name: "vouchlio-notifications-muted", type: "Local storage", purpose: "Remembers whether you muted the notification sound.", lasts: "Until you clear site data" },
  { name: "vouchlio-renewal-popup:*, vouchlio-upgrade-offer-day", type: "Local storage", purpose: "Remembers that you saw today's renewal or plan reminder, so it shows at most once a day.", lasts: "Until you clear site data" },
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
    purpose:
      "Required for sign-in, authentication, workspace security and the document tools (vouchers, itineraries, placards, invoices and more). Can't be switched off while you use the service.",
    examples: "Sign-in cookie (checkin_token), cookie choices (cookie_consent)",
    status: "Always on",
  },
  {
    name: "Functional",
    purpose:
      "Remember choices that speed up your daily work, such as light or dark mode, the live preview panel, notification sound and dismissed reminders.",
    examples: "Display settings and reminder snoozes, saved in your browser only",
    status: "Always on",
  },
  {
    name: "Analytics",
    purpose: "Would help us measure performance, fix errors and improve reliability, using aggregated data only.",
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
          Cookies are small text files stored on your device when you visit a website or web app. They help recognise your device,
          keep you signed in and protect your account. We also use similar technologies, such as your browser&apos;s local and
          session storage, for non-sensitive display preferences.
        </p>
        <p>
          Your account details, customer directory and generated documents are never kept in cookies or browser storage. They are
          stored securely on our cloud servers.
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
    title: "Third-party services",
    body: (
      <>
        <p>
          We limit third-party tools strictly to what is needed to run and protect the Platform. We do not use third-party
          advertising or tracking cookies, and never sell subscriber or traveller data.
        </p>
        <ul>
          <li>
            <strong>Razorpay (RBI-authorised payment gateway):</strong> when you pay for a plan, Razorpay&apos;s secure checkout
            window may set its own cookies under its own policy, for example to prevent fraud.
          </li>
          <li>
            <strong>Web fonts:</strong> our fonts are served from our own website, so no font provider sets cookies or sees your
            visit.
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
          You can block or delete cookies in your browser settings at any time. Blocking essential cookies stops you from signing
          in to your workspace and generating document PDFs. You can review your cookie choices at any time:{" "}
          <CookieSettingsButton className="font-semibold text-[var(--primary)] underline underline-offset-2" />.
        </p>
        <ul>
          <li><strong>Log out</strong> to remove the sign-in cookie straight away.</li>
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
      <>
        <p>
          We may update this Cookie Policy when the service changes; the effective date above will change when we do.
        </p>
        <p>
          <strong>Vouchlio Data &amp; Compliance</strong>
          <br />
          Email: {email}
          <br />
          Parent entity: Frozen Highway, {legal.address}
          <br />
          Website: <a href={SITE.website}>vouchlio.com</a>
        </p>
      </>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <>
          <p>
            <strong>Effective date:</strong> {EFFECTIVE_DATE}
          </p>
          <p>
            This Cookie Policy explains how {SITE.name} (&quot;we&quot;, &quot;us&quot;) uses cookies and similar technologies when you
            visit our website and use your cloud document workspace (hotel vouchers, air tickets, pickup vouchers, welcome placards,
            itineraries, proforma invoices, tax invoices, receipts and your customer directory). Vouchlio is owned and operated by
            the legal entity Frozen Highway.
          </p>
          <p>
            Please read it with our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
          </p>
        </>
      }
      sections={sections}
    />
  );
}
