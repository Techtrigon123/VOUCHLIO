/**
 * Customer testimonials shown on the home page (components/marketing/TestimonialsSection.tsx).
 *
 * Add ONLY real quotes, from real customers, with their written permission to publish their name,
 * role and agency. Invented or edited reviews are a deceptive practice under India's consumer
 * protection rules and the ASCI code. Keep the wording as the customer wrote it (fixing typos is fine).
 *
 * The section stays hidden while this list is empty, and shows up to 3 entries.
 *
 * Example entry:
 *   {
 *     quote: "We send every hotel voucher from Vouchlio now — clients notice the difference.",
 *     name: "Full name",
 *     role: "Owner",
 *     company: "Agency name",
 *     city: "Kochi",
 *   },
 */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  city?: string;
}

export const TESTIMONIALS: Testimonial[] = [];
