import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description: "How Vouchlio collects, uses, stores and protects your data and your customers' data, the cookies we use, and your rights under India's DPDP Act 2023.",
  path: "/privacy",
});

const { legal } = SITE;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {SITE.name} (&quot;we&quot;, &quot;us&quot;) is operated by <strong>{legal.entityName}</strong>, {legal.address}. We provide
          online software that travel agents, tour operators and DMCs use to create travel documents such as hotel vouchers,
          air tickets, pickup vouchers, welcome placards, invoices, proforma invoices and receipts.
        </p>
        <p>
          For your own account data we are the <strong>Data Fiduciary</strong> under the Digital Personal Data Protection Act,
          2023 (&quot;DPDP Act&quot;). For the personal data of <em>your</em> customers that you enter into documents, you are the Data
          Fiduciary and we act as your <strong>Data Processor</strong>, processing it only to provide the service to you.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    body: (
      <>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address, mobile number and password. Passwords are stored only
            as a one-way hash (bcrypt) — we cannot see them.
          </li>
          <li>
            <strong>Business profile:</strong> company and brand name, business type, address, city, state, PIN code, GSTIN,
            IATA number, landline, brand logo and company stamp, and — only if you add them — bank account and UPI details
            that you choose to print on your invoices.
          </li>
          <li>
            <strong>Documents you create:</strong> the details you type into vouchers, tickets, placards and invoices. These
            usually include your customers&apos; personal data, such as guest and passenger names, travel dates, flight and
            hotel details, and billing details (name, email, phone, address, GSTIN, PAN).
          </li>
          <li>
            <strong>Saved customers:</strong> customer records you save for reuse on invoices.
          </li>
          <li>
            <strong>Plan payments:</strong> for online payments, the Razorpay order and payment IDs, the amount, the method
            type (for example UPI or card) and the payment status. For UPI proof payments, the transaction ID and the
            screenshot you upload. Card numbers, bank logins and UPI PINs are entered on Razorpay&apos;s secure checkout and
            never reach us.
          </li>
          <li>
            <strong>Messages:</strong> what you send us through the Contact page, support tickets, bug reports or callback requests.
          </li>
          <li>
            <strong>Technical data:</strong> your IP address and basic request information, used for security (for example,
            limiting repeated login attempts) and to keep the service running.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    body: (
      <ul>
        <li>To create your account, sign you in and keep your account secure.</li>
        <li>To generate, store and let you download and share your documents.</li>
        <li>To verify plan payments and activate the plan you paid for.</li>
        <li>To answer your support and contact requests.</li>
        <li>To prevent fraud and abuse, and to protect the service (for example, rate limiting).</li>
        <li>To comply with legal obligations, including tax and accounting rules.</li>
        <li>To tell you about important changes to the service or these policies.</li>
      </ul>
    ),
  },
  {
    id: "legal-basis",
    title: "Legal basis",
    body: (
      <p>
        We process your personal data on the basis of the consent you give when you create an account and use the service,
        and for the legitimate uses permitted under Section 7 of the DPDP Act — such as providing a service you asked for and
        complying with the law. You can withdraw consent at any time (see &quot;Your rights&quot;); this will not affect processing
        done before you withdrew it, but we may no longer be able to provide the service.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    body: (
      <>
        <p>
          <strong>We do not sell your data or your customers&apos; data, and we do not use it for advertising.</strong> We share
          it only with service providers who process it for us under contract:
        </p>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What for</th>
              <th>What they receive</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Database hosting</td>
              <td>All data stored in the service</td>
            </tr>
            <tr>
              <td>Razorpay</td>
              <td>Online plan payments and refunds</td>
              <td>The amount and plan, your name, email and mobile number (to prefill checkout), and the payment details you enter on Razorpay&apos;s checkout</td>
            </tr>
            <tr>
              <td>Anthropic (Claude)</td>
              <td>Upload auto-fill — reading a voucher or e-ticket you upload to fill the form</td>
              <td>Only the file you choose to upload. We do not keep a copy of the uploaded file.</td>
            </tr>
            <tr>
              <td>Our hosting provider</td>
              <td>Running the website</td>
              <td>Request data such as IP address</td>
            </tr>
          </tbody>
        </table>
        <p>
          We may also disclose data when required by law, a court order or a government authority, or to protect the rights
          and safety of our users and the service. Some providers may process data outside India; where they do, it is done
          as permitted under the DPDP Act.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect data",
    body: (
      <ul>
        <li>All traffic is encrypted in transit with HTTPS.</li>
        <li>Passwords are hashed with bcrypt; password-reset links are stored hashed, expire after one hour and work once.</li>
        <li>Database access is restricted to our server; each account can only access its own records.</li>
        <li>Repeated login and password-reset attempts are rate-limited, and changing your password signs out other devices.</li>
      </ul>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <ul>
          <li>
            <strong>Account and documents:</strong> for as long as your account is open. On the free Silver plan, documents
            become locked (not deleted) 30 days after creation; upgrading reopens them.
          </li>
          <li>
            <strong>After you close your account:</strong> we delete or anonymise your data within 30 days, except records we
            must keep by law — for example, payment and invoice records under Indian tax laws.
          </li>
          <li>
            <strong>Security counters:</strong> login-attempt records expire after a short time and are removed automatically.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    body: (
      <>
        <p>
          We use only what the service needs to work. We do not use advertising or cross-site tracking cookies. The full list,
          including settings saved in your browser, is in our <Link href="/cookies">Cookie Policy</Link>.
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Purpose</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>checkin_token</td>
              <td>Essential cookie</td>
              <td>Keeps you signed in (HTTP-only, not readable by scripts)</td>
              <td>30 days</td>
            </tr>
            <tr>
              <td>cookie_consent</td>
              <td>Essential cookie</td>
              <td>Remembers your cookie choices</td>
              <td>12 months</td>
            </tr>
            <tr>
              <td>Session storage</td>
              <td>Browser storage</td>
              <td>Remembers when you dismissed in-app reminders (cleared when you close the tab)</td>
              <td>Browser session</td>
            </tr>
          </tbody>
        </table>
        <p>
          If we add analytics or marketing tools in the future, they will only run if you allow them in your cookie settings.
          You can change your choice at any time: <CookieSettingsButton className="font-semibold text-[var(--primary)] underline underline-offset-2" />.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the DPDP Act you have the right to:</p>
        <ul>
          <li>get a summary of the personal data we hold about you and how we process it;</li>
          <li>correct, complete or update your data (most of it you can edit yourself in your profile);</li>
          <li>have your data erased, subject to what the law requires us to keep;</li>
          <li>withdraw your consent;</li>
          <li>nominate someone to exercise these rights on your behalf in case of death or incapacity; and</li>
          <li>have your complaints addressed by our Grievance Officer, and then by the Data Protection Board of India.</li>
        </ul>
        <p>
          To use any of these rights, contact us through our <Link href="/contact">contact page</Link> or the Grievance Officer
          below. We will respond within 30 days. If your request is about a customer&apos;s data inside a travel agent&apos;s
          documents, we will pass it to that agent, who controls that data.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The service is for businesses and is not intended for anyone under 18. We do not knowingly create accounts for
        children. Travel agents entering details of travelling minors must have the consent of the child&apos;s parent or
        guardian.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy as the service or the law changes. We will change the &quot;Last updated&quot; date above and,
        for significant changes, notify you by email or in the app before they take effect.
      </p>
    ),
  },
  {
    id: "grievance-officer",
    title: "Grievance Officer and contact",
    body: (
      <>
        <p>
          In line with the Information Technology Act, 2000, the rules made under it, and the DPDP Act, our Grievance Officer
          is:
        </p>
        <p>
          <strong>{legal.grievanceOfficer}</strong>
          <br />
          {legal.entityName}, {legal.address}
          <br />
          {legal.grievanceEmail ? (
            <>
              Email: <a href={`mailto:${legal.grievanceEmail}`}>{legal.grievanceEmail}</a>
            </>
          ) : (
            <>
              Contact: <Link href="/contact">our contact page</Link> (choose &quot;Help with my account&quot;)
            </>
          )}
        </p>
        <p>We acknowledge complaints within 48 hours and aim to resolve them within 30 days.</p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what data {SITE.name} collects, why, who it is shared with, how long it is kept, and the
          rights you have. It applies to our website and the travel agent dashboard.
        </p>
      }
      sections={sections}
    />
  );
}
