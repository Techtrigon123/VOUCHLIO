import type { Agent, PlanId } from "@/lib/agent/types";
import {
  type InvoiceData,
  invoiceTotals,
  INVOICE_LABELS,
  termsFor,
  GST_TREATMENTS,
  num,
} from "@/lib/agent/documents";
import {
  createDoc,
  letterhead,
  sectionTitle,
  table,
  paragraph,
  numberedList,
  finish,
  text,
  rect,
  tint,
  fmtDate,
  contentWidth,
  ensure,
  drawImageFit,
  agencyName,
  MARGIN,
  GREY,
  LINE,
  SOFT,
} from "./kit";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function renderInvoice(
  d: InvoiceData,
  agent: Agent,
  plan: PlanId,
  extra: { paidAmount?: number } = {}
): Promise<Uint8Array> {
  const kind = d.docType;
  const labels = INVOICE_LABELS[kind];
  const c = await createDoc({ agent, plan, title: `${labels.title} ${d.number}` });
  c.footer = `${labels.title} ${d.number} · This is a computer-generated document.`;
  const t = invoiceTotals(d, agent.state);

  letterhead(c, { docTitle: labels.pdfTitle, docSubtitle: `# ${d.number}`, variant: "rule" });

  // Bill to (left) + document meta (right).
  const w = contentWidth(c);
  const half = w / 2 - 8;
  const b = d.billTo;
  const treatment = GST_TREATMENTS.find((g) => g.id === b.gstTreatment);
  const billLines = [
    b.company && b.company !== b.name ? b.company : "",
    b.address,
    [b.phone, b.email].filter(Boolean).join("  |  "),
    d.showCustomerGst && b.gstin ? `GSTIN: ${b.gstin}` : "",
    d.showCustomerGst && b.pan ? `PAN: ${b.pan}` : "",
  ].filter(Boolean);
  const meta: [string, string][] = [
    [`${labels.short} #`, d.number],
    [kind === "receipt" ? "Payment date" : `${labels.short} date`, fmtDate(d.date)],
  ];
  if (d.orderNumber) meta.push(["Order number", d.orderNumber]);
  if (b.placeOfSupply) meta.push(["Place of supply", b.placeOfSupply]);
  if (d.payment) {
    meta.push(["Payment mode", d.payment.mode]);
    if (d.payment.reference) meta.push(["Reference", d.payment.reference]);
    meta.push(["Against", `${INVOICE_LABELS[d.payment.againstType].short} ${d.payment.againstNumber}`]);
  }

  ensure(c, 110);
  const top = c.y;
  text(c, kind === "receipt" ? "RECEIVED FROM" : "BILL TO", MARGIN, top, { size: 7, color: GREY });
  let ly = top - 14;
  ly -= text(c, b.name, MARGIN, ly, { size: 11, font: c.fonts.bold, maxWidth: half });
  for (const line of billLines) ly -= text(c, line, MARGIN, ly, { size: 8.5, color: GREY, maxWidth: half });
  if (treatment && d.showCustomerGst) ly -= text(c, treatment.label, MARGIN, ly, { size: 7.5, color: GREY, maxWidth: half });

  let ry = top;
  const rx = MARGIN + half + 16;
  for (const [k, v] of meta) {
    text(c, k, rx, ry, { size: 8.5, color: GREY });
    text(c, v, c.width - MARGIN, ry, { size: 8.5, font: c.fonts.bold, align: "right" });
    ry -= 14;
  }
  c.y = Math.min(ly, ry) - 12;

  // Items.
  const taxCol = t.inter ? "IGST" : "CGST + SGST";
  table(
    c,
    [
      { header: "#", width: 0.05 },
      { header: "Item & description", width: 0.43 },
      { header: "Qty", width: 0.08, align: "right" },
      { header: "Rate", width: 0.14, align: "right" },
      { header: taxCol, width: 0.14, align: "right" },
      { header: "Amount", width: 0.16, align: "right" },
    ],
    t.lines.map((l, i) => [
      String(i + 1),
      l.description || "-",
      String(num(l.qty)),
      fmt(num(l.rate)),
      l.taxRate ? `${l.taxRate}%  ${fmt(l.lineTax)}` : "-",
      fmt(l.amount),
    ])
  );

  // Totals box.
  const tw = 240;
  // The total's tinted box reaches 8pt past the figures; keep it inside the right margin.
  const tx = c.width - MARGIN - tw - 8;
  const rows: [string, string][] = [["Subtotal", fmt(t.subtotal)]];
  if (t.tax) {
    if (t.inter) rows.push(["IGST", fmt(t.igst)]);
    else rows.push(["CGST", fmt(t.cgst)], ["SGST", fmt(t.sgst)]);
  }
  if (t.roundOff) rows.push(["Round off", fmt(t.roundOff)]);
  ensure(c, rows.length * 14 + 60);
  for (const [k, v] of rows) {
    text(c, k, tx, c.y, { size: 9, color: GREY });
    text(c, v, tx + tw, c.y, { size: 9, align: "right" });
    c.y -= 14;
  }
  c.y -= 6;
  rect(c, tx - 8, c.y - 8, tw + 16, 22, tint(c.accent, 0.88));
  text(c, kind === "receipt" ? `Amount received (${d.currency})` : `Total (${d.currency})`, tx, c.y, { size: 10, font: c.fonts.bold });
  text(c, fmt(t.total), tx + tw, c.y, { size: 11, font: c.fonts.bold, color: c.accent, align: "right" });
  c.y -= 26;
  if (kind !== "receipt" && extra.paidAmount) {
    text(c, "Payment made", tx, c.y, { size: 9, color: GREY });
    text(c, `– ${fmt(extra.paidAmount)}`, tx + tw, c.y, { size: 9, align: "right" });
    c.y -= 14;
    text(c, "Balance due", tx, c.y, { size: 10, font: c.fonts.bold });
    text(c, fmt(Math.max(0, t.total - extra.paidAmount)), tx + tw, c.y, { size: 10, font: c.fonts.bold, align: "right" });
    c.y -= 18;
  }
  c.y -= 6;

  if (d.notes?.trim()) {
    sectionTitle(c, "Notes");
    paragraph(c, d.notes, { size: 8.5 });
  }

  // Agent payment information prints below notes on invoice & proforma.
  const bank: [string, string | undefined][] = [
    ["Account name", agent.bankAccountHolder],
    ["Bank", agent.bankName],
    ["Account number", agent.bankAccountNumber],
    ["IFSC", agent.bankIfscCode],
    ["Branch", agent.bankBranchAddress],
    ["UPI ID", agent.paymentUpi],
  ];
  if (kind !== "receipt" && bank.some(([, v]) => v?.trim())) {
    sectionTitle(c, "Payment information");
    const rowsB = bank.filter(([, v]) => v?.trim());
    ensure(c, rowsB.length * 13 + 16);
    rect(c, MARGIN, c.y - rowsB.length * 13 + 4, w, rowsB.length * 13 + 8, SOFT, LINE);
    for (const [k, v] of rowsB) {
      text(c, k, MARGIN + 10, c.y, { size: 8.5, color: GREY });
      text(c, v, MARGIN + 130, c.y, { size: 8.5, font: c.fonts.bold });
      c.y -= 13;
    }
    c.y -= 12;
  }

  const terms = termsFor(kind, d.terms).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12);
  if (terms.length) {
    sectionTitle(c, "Terms & conditions");
    numberedList(c, terms);
  }

  // Signature block with optional company stamp.
  ensure(c, 100);
  c.y -= 10;
  const sx = c.width - MARGIN - 180;
  if (c.stamp) drawImageFit(c, c.stamp, sx + 40, c.y - 62, 100, 60, "center");
  text(c, `For ${agencyName(agent)}`, sx + 90, c.y + 6, { size: 8.5, font: c.fonts.bold, align: "center" });
  c.page.drawLine({ start: { x: sx, y: c.y - 70 }, end: { x: sx + 180, y: c.y - 70 }, thickness: 0.6, color: GREY });
  text(c, "Authorised signatory", sx + 90, c.y - 82, { size: 8, color: GREY, align: "center" });
  c.y -= 96;

  return finish(c);
}
