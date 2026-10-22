import PDFDocument from 'pdfkit';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const INK = '#0d1117';
const MUTED = '#6b7482';
const LINE = '#e4e7ec';

const money = (n) => `PKR ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

// What each slip actually pays out.
//
// `additionalAmount` is held in its own field and added once here. Records
// created before that split have `additionalInBase` unset, and on those the
// stored `salaryAmount` already includes the extra — so it is not added again.
export function payslipFigures(salary) {
  const stored = Number(salary.salaryAmount) || 0;
  const extra = Number(salary.additionalAmount) || 0;
  const base = salary.additionalInBase === false ? stored : stored - extra;
  const loan = Number(salary.loanDeduction) || 0;
  return { base, extra, loan, gross: base + extra, net: base + extra - loan };
}

const line = (doc, y) => doc
  .moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(LINE).stroke();

function row(doc, y, label, value, { bold = false, size = 10 } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(bold ? INK : MUTED);
  doc.text(label, 50, y, { width: 300 });
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(INK);
  doc.text(value, 350, y, { width: 195, align: 'right' });
  return y + (size + 8);
}

// Draws one payslip onto the page the document is currently on. Kept separate
// from document creation so a month's worth can be written into one file.
export function drawPayslip(doc, salary) {
  const emp = salary.employee || {};
  const f = payslipFigures(salary);
  const period = `${MONTHS[(Number(salary.month) || 1) - 1]} ${salary.year}`;

  doc.font('Helvetica-Bold').fontSize(18).fillColor(INK).text('Payslip', 50, 50);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(period, 50, 72);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
    .text('MinuteSheet', 350, 50, { width: 195, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
    .text(`Issued ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      350, 66, { width: 195, align: 'right' });

  line(doc, 95);

  let y = 112;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Employee', 50, y);
  y += 20;
  y = row(doc, y, 'Name', emp.Name || emp.name || '—');
  if (emp.designation) y = row(doc, y, 'Designation', emp.designation);
  y = row(doc, y, 'Pay period', period);

  y += 10;
  line(doc, y);
  y += 16;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Attendance', 50, y);
  y += 20;
  y = row(doc, y, 'Total working days', String(salary.totalWorkingDays ?? '—'));
  y = row(doc, y, 'Days present', String(salary.presentDays ?? '—'));

  y += 10;
  line(doc, y);
  y += 16;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Earnings', 50, y);
  y += 20;
  y = row(doc, y, 'Basic pay for days worked', money(f.base));
  if (f.extra) {
    y = row(doc, y, salary.additionalAmountReason || 'Additional', money(f.extra));
  }
  y = row(doc, y, 'Gross pay', money(f.gross), { bold: true });

  if (f.loan) {
    y += 10;
    line(doc, y);
    y += 16;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Deductions', 50, y);
    y += 20;
    y = row(doc, y, 'Loan repayment', `- ${money(f.loan)}`);
  }

  y += 12;
  doc.rect(50, y, 495, 40).fillColor('#f5f6f8').fill();
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text('Net pay', 64, y + 14);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK)
    .text(money(f.net), 350, y + 12, { width: 181, align: 'right' });

  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
    'This is a computer-generated document. No signature is required.',
    50, 760, { width: 495, align: 'center' },
  );
}

export function buildPayslipDocument(salaries) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  salaries.forEach((salary, i) => {
    if (i > 0) doc.addPage();
    drawPayslip(doc, salary);
  });
  if (salaries.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
      .text('No salaries were found for this period.', 50, 100);
  }
  doc.end();
  return doc;
}

export const payslipFileName = (salary) => {
  const emp = salary.employee || {};
  const name = String(emp.Name || emp.name || 'employee').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  return `payslip-${name}-${MONTHS[(Number(salary.month) || 1) - 1]}-${salary.year}.pdf`;
};

export { MONTHS };
