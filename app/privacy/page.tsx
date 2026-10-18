import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "How Vouchlio collects, uses, stores and protects your data and your customers' data, who we share it with, the cookies we use, and your rights under India's DPDP Act 2023 and the GDPR.",
  path: "/privacy",
});

const { legal } = SITE;
const EFFECTIVE_DATE = "18 October 2026";
const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

const sections: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <>
        <p>We collect data in five categories, only as far as needed to run a secure and reliable documentation service.</p>
        <p>
          <strong>1. Account data</strong>
        </p>
        <ul>
          <li>
            <strong>Data points:</strong> your full name, business email address, mobile/WhatsApp number, business name,
            login credentials (passwords are stored only as a salted one-way hash, using bcrypt), and your plan and payment
            records.
          </li>
          <li>
            <strong>Purpose:</strong> signing you in, keeping your account secure, managing your subscription and giving
            support.
          </li>
        </ul>
        <p>
          <strong>2. Business profile data</strong>
        </p>
        <ul>
          <li>
            <strong>Data points:</strong> agency trade (brand) name, legal business name, business type, company logo and
            stamp, registered address, GSTIN, IATA number, landline, document-numbering settings, and &mdash; only if you add
            them &mdash; bank account and UPI details that you choose to print on your invoices.
          </li>
          <li>
            <strong>Purpose:</strong> setting up your workspace, printing your branding on the PDFs you generate, and issuing
            GST invoices for your subscription under SAC code 998314.
          </li>
        </ul>
        <p>
          <strong>3. Customer directory (workspace data)</strong>
        </p>
        <ul>
          <li>
            <strong>Data points:</strong> your clients&apos; and travellers&apos; names, phone numbers, email addresses, billing
            addresses and tax identifiers (such as GSTIN, PAN or VAT number) that you save in your private customer list.
          </li>
          <li>
            <strong>Purpose:</strong> filling documents in quickly and keeping your agency&apos;s private client records.
          </li>
        </ul>
        <p>
          <strong>4. Document data</strong>
        </p>
        <ul>
          <li>
            <strong>Data points:</strong> guest and passenger names, flight segments, hotel stay dates, room categories, meal
            plans, pickup locations, driver details, line-item amounts, payment status, reference numbers, and details of the
            PDFs and images generated.
          </li>
          <li>
            <strong>Purpose:</strong> creating, previewing, storing and delivering your hotel vouchers, air tickets, pickup
            vouchers, welcome placards, itineraries, proforma invoices, tax invoices and receipts.
          </li>
        </ul>
        <p>
          <strong>5. Technical, log and security data</strong>
        </p>
        <ul>
          <li>
            <strong>Data points:</strong> IP address, browser and device type, operating system, session tokens, sign-in
            times and security logs.
          </li>
          <li>
            <strong>Purpose:</strong> preventing unauthorised access, stopping brute-force attacks, fixing technical problems
            and keeping the service available.
          </li>
        </ul>
        <p>
          We also keep what you send us through the Contact page, support tickets, bug reports and callback requests, to answer
          you. For online plan payments we receive the Razorpay order and payment IDs, amount, method type and status; for UPI
          payments, the transaction ID and the screenshot you upload.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information",
    body: (
      <>
        <p>We process personal and business data only for lawful, contractual and service purposes:</p>
        <ul>
          <li>
            <strong>To provide the service:</strong> signing you in, turning your entries into downloadable PDFs and images,
            storing drafts and documents, and keeping your customer directory.
          </li>
          <li>
            <strong>Service communications:</strong> password-reset links, profile and plan-renewal reminders, in-app
            notifications about your profile, plan, payments and support requests, security alerts and important service
            updates.
          </li>
          <li>
            <strong>Security and compliance:</strong> preventing fraud and misuse, protecting the platform, meeting tax and
            accounting obligations and complying with the law.
          </li>
        </ul>
        <p>
          <strong>Our roles and legal basis.</strong> For your own account and profile we are the <strong>Data Fiduciary</strong>{" "}
          under the Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;). For your customers&apos; data that you enter,
          you are the Data Fiduciary and we act as your <strong>Data Processor</strong>, using it only to provide the service to
          you. We rely on the consent you give when you create an account, and on the legitimate uses allowed under Section 7
          of the DPDP Act, such as providing a service you asked for and complying with the law.
        </p>
        <p>
          <strong>Non-solicitation and anti-poaching guarantee.</strong> Your customer directory, booking values and traveller
          lists are your most valuable business assets. Vouchlio and its parent entity, Frozen Highway, commit that subscriber
          client data is never used for travel marketing, and is never solicited, cross-sold, leased, shared for marketing or
          contacted by us under any circumstances.
        </p>
      </>
    ),
  },
  {
    id: "storage-security",
    title: "Storage, retention and security",
    body: (
      <>
        <ul>
          <li>
            <strong>Encryption:</strong> data is stored with our cloud database provider, encrypted at rest (AES-256), and all
            traffic is encrypted in transit with TLS (HTTPS).
          </li>
          <li>
            <strong>Workspace isolation:</strong> every record is tied to the agency account that created it, and every request
            is limited on our server to the signed-in account&apos;s own data, so other subscribers cannot access your workspace.
          </li>
          <li>
            <strong>Account security:</strong> passwords are hashed with bcrypt; password-reset links are stored hashed, expire
            after one hour and work once; repeated sign-in attempts are rate-limited; changing your password signs out your
            other devices.
          </li>
          <li>
            <strong>Retention:</strong> drafts, customer directories and documents are kept for as long as your account is
            open. On the free Silver plan, documents become locked (not deleted) 30 days after creation, and upgrading reopens
            them. When you close your account or ask for erasure, we permanently delete or anonymise your workspace records
            within 30 days, except records we must keep by law (for example, subscription payment and invoice records under
            Indian tax laws). Security counters expire automatically after a short time.
          </li>
          <li>
            <strong>Accuracy:</strong> you are responsible for the accuracy of guest details, room details, amounts and tax
            numbers you enter into documents.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights (DPDP Act and GDPR)",
    body: (
      <>
        <p>You stay in control of the data in your workspace:</p>
        <ul>
          <li>
            <strong>Access and review:</strong> view your documents and customer records in your dashboard, download your documents as PDFs, export
            your invoice records (CSV or Excel), and ask us for a summary of the personal data we hold about you and how we use
            it.
          </li>
          <li>
            <strong>Correction:</strong> update your business profile, logo, tax details and customer records at any time, or ask
            us to correct anything you cannot change yourself.
          </li>
          <li>
            <strong>Erasure and account closure:</strong> delete documents and customers yourself, or ask us to delete specific
            records or close your whole workspace, subject to what the law requires us to keep.
          </li>
          <li>
            <strong>Withdraw consent:</strong> at any time; this does not affect processing done before, but we may no longer be
            able to provide the service.
          </li>
          <li>
            <strong>Nominate</strong> someone to exercise these rights for you in case of death or incapacity.
          </li>
          <li>
            <strong>Complain</strong> to our Grievance Officer, and then to the Data Protection Board of India. If you are in the
            European Union or United Kingdom, you also have the rights given by the GDPR, including data portability and the right
            to object, and may complain to your local data protection authority.
          </li>
        </ul>
        <p>
          To use any of these rights, email {email}. We respond within 30 days. If your request is about a traveller&apos;s data
          inside a travel agent&apos;s documents, we pass it to that agent, who controls that data.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    body: (
      <>
        <p>
          We use only what the service needs to work, and no advertising or cross-site tracking cookies. The full list, including
          settings saved in your browser, is in our <Link href="/cookies">Cookie Policy</Link>.
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
          If we add analytics or marketing tools in the future, they will run only if you allow them. You can change your choice
          at any time: <CookieSettingsButton className="font-semibold text-[var(--primary)] underline underline-offset-2" />.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The service is for businesses and is not intended for anyone under 18. We do not knowingly create accounts for children.
        Travel agents entering details of travelling minors must have the consent of the child&apos;s parent or guardian.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Policy updates",
    body: (
      <p>
        We may update this policy to reflect changes to the service or the law. We will change the &quot;Last updated&quot; date
        above and, for significant changes, tell you by email or in the app before they take effect. Continuing to use the
        service after the new effective date means you accept the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact and Grievance Officer",
    body: (
      <>
        <p>
          For privacy questions, data requests or compliance matters, and in line with the Information Technology Act, 2000, the
          rules made under it, and the DPDP Act, contact our Grievance and Data Protection Officer:
        </p>
        <p>
          <strong>{legal.grievanceOfficer}</strong>, Grievance &amp; Data Protection Officer
          <br />
          Email: {email}
          <br />
          {legal.entityName} (parent entity: Frozen Highway), {legal.address}
          <br />
          Website: <a href={SITE.website}>vouchlio.com</a>
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
        <>
          <p>
            <strong>Effective date:</strong> {EFFECTIVE_DATE}
          </p>
          <p>
            {SITE.name} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot; or the &quot;Platform&quot;) is a cloud software-as-a-service (SaaS)
            travel documentation platform for travel agencies, tour operators, independent travel consultants and Destination
            Management Companies (DMCs) (&quot;Subscribers&quot;, &quot;you&quot;). Vouchlio is owned, designed and operated by the
            registered legal entity Frozen Highway.
          </p>
          <p>
            This policy explains how we collect, use, store, protect and share data when you use our tools to create hotel
            vouchers, air tickets, pickup vouchers, welcome placards, itineraries, proforma invoices, tax invoices and receipts,
            manage your customer directory and set up your business workspace. It applies to our website and the travel agent
            dashboard.
          </p>
          <p>
            <strong>We do not sell your personal or business data to third parties.</strong>
          </p>
        </>
      }
      sections={sections}
    />
  );
}
