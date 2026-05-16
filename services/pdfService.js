// services/pdfService.js — FlowPOS
const PDFDocument = require('pdfkit');

/**
 * Generates a PDF buffer for a given invoice.
 * @param {Object} invoice - Fully populated Mongoose Invoice document
 * @returns {Promise<Buffer>}
 */
const generateInvoicePdf = (invoice) => {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', err   => reject(err));

    const company   = process.env.COMPANY_NAME    || 'FlowPOS';
    const companyEmail = process.env.COMPANY_EMAIL || '';
    const companyPhone = process.env.COMPANY_PHONE || '';
    const companyAddress = process.env.COMPANY_ADDRESS || '';

    const formatDate     = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const formatCurrency = (n) => `$${(n ?? 0).toFixed(2)}`;

    const W       = doc.page.width - 100; // usable width
    const GRAY    = '#6B7280';
    const DARK    = '#111827';
    const ACCENT  = '#1D4ED8';
    const LIGHT   = '#F3F4F6';

    // ── Header ───────────────────────────────────────────────────────────────
    doc.fontSize(22).fillColor(ACCENT).font('Helvetica-Bold').text(company, 50, 50);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica');
    if (companyAddress) doc.text(companyAddress);
    if (companyPhone)   doc.text(companyPhone);
    if (companyEmail)   doc.text(companyEmail);

    // Invoice title (top right)
    doc.fontSize(28).fillColor(DARK).font('Helvetica-Bold')
       .text('INVOICE', 50, 50, { align: 'right' });
    doc.fontSize(10).fillColor(GRAY).font('Helvetica')
       .text(`# ${invoice.invoiceNumber}`, 50, 85, { align: 'right' });

    // Status badge
    const statusColor = {
      draft:     '#9CA3AF',
      sent:      '#3B82F6',
      paid:      '#10B981',
      partial:   '#F59E0B',
      overdue:   '#EF4444',
      cancelled: '#6B7280',
    }[invoice.status] || GRAY;

    doc.roundedRect(doc.page.width - 150, 100, 100, 22, 4)
       .fill(statusColor);
    doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text(invoice.status.toUpperCase(), doc.page.width - 150, 106, { width: 100, align: 'center' });

    doc.moveDown(4);

    // ── Divider ──────────────────────────────────────────────────────────────
    const dividerY = doc.y;
    doc.moveTo(50, dividerY).lineTo(50 + W, dividerY).strokeColor('#E5E7EB').lineWidth(1).stroke();
    doc.moveDown(1);

    // ── Bill To / Invoice Details ────────────────────────────────────────────
    const col2X = 350;
    const startY = doc.y;

    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('BILL TO', 50, startY);
    doc.moveDown(0.4);
    const customer = invoice.customer;
    doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
       .text(customer?.company || customer?.name || '—', 50);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica');
    if (customer?.company && customer?.name) doc.text(customer.name);
    if (customer?.email)   doc.text(customer.email);
    if (customer?.phone)   doc.text(customer.phone);
    if (customer?.address) doc.text(customer.address);

    // Right column — invoice meta
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('INVOICE DATE', col2X, startY);
    doc.fontSize(10).fillColor(DARK).font('Helvetica').text(formatDate(invoice.issueDate), col2X);
    doc.moveDown(0.6);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('DUE DATE', col2X);
    doc.fontSize(10).fillColor(DARK).font('Helvetica').text(formatDate(invoice.dueDate), col2X);

    if (invoice.job?.jobNumber) {
      doc.moveDown(0.6);
      doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('JOB NUMBER', col2X);
      doc.fontSize(10).fillColor(DARK).font('Helvetica').text(invoice.job.jobNumber, col2X);
    }
    if (invoice.job?.vesselName) {
      doc.moveDown(0.6);
      doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('VESSEL', col2X);
      doc.fontSize(10).fillColor(DARK).font('Helvetica').text(invoice.job.vesselName, col2X);
    }

    doc.moveDown(2);

    // ── Line Items Table ─────────────────────────────────────────────────────
    const tableTop  = doc.y;
    const colWidths = { desc: 220, qty: 60, unit: 70, tax: 50, total: 80 };
    const cols = {
      desc:  50,
      qty:   50  + colWidths.desc,
      unit:  50  + colWidths.desc + colWidths.qty,
      tax:   50  + colWidths.desc + colWidths.qty + colWidths.unit,
      total: 50  + colWidths.desc + colWidths.qty + colWidths.unit + colWidths.tax,
    };

    // Table header
    doc.rect(50, tableTop, W, 20).fill(ACCENT);
    doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
    doc.text('DESCRIPTION', cols.desc,  tableTop + 6, { width: colWidths.desc });
    doc.text('QTY',         cols.qty,   tableTop + 6, { width: colWidths.qty,  align: 'right' });
    doc.text('UNIT PRICE',  cols.unit,  tableTop + 6, { width: colWidths.unit, align: 'right' });
    doc.text('TAX %',       cols.tax,   tableTop + 6, { width: colWidths.tax,  align: 'right' });
    doc.text('TOTAL',       cols.total, tableTop + 6, { width: colWidths.total, align: 'right' });

    // Table rows
    const lines = invoice.job?.lines || [];
    let rowY = tableTop + 20;

    lines.forEach((line, i) => {
      const rowH   = 30;
      const bgColor = i % 2 === 0 ? '#FFFFFF' : LIGHT;
      doc.rect(50, rowY, W, rowH).fill(bgColor);

      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
         .text(line.serviceName || '—', cols.desc, rowY + 6, { width: colWidths.desc - 5 });
      if (line.description) {
        doc.fontSize(8).fillColor(GRAY).font('Helvetica')
           .text(line.description, cols.desc, rowY + 17, { width: colWidths.desc - 5 });
      }

      doc.fontSize(9).fillColor(DARK).font('Helvetica');
      doc.text(String(line.quantity),            cols.qty,   rowY + 10, { width: colWidths.qty,   align: 'right' });
      doc.text(formatCurrency(line.unitPrice),   cols.unit,  rowY + 10, { width: colWidths.unit,  align: 'right' });
      doc.text(`${line.taxRate ?? 0}%`,          cols.tax,   rowY + 10, { width: colWidths.tax,   align: 'right' });
      doc.text(formatCurrency(line.lineTotal),   cols.total, rowY + 10, { width: colWidths.total, align: 'right' });

      rowY += rowH;
    });

    // Bottom border of table
    doc.moveTo(50, rowY).lineTo(50 + W, rowY).strokeColor('#E5E7EB').lineWidth(1).stroke();

    doc.moveDown(1);
    doc.y = rowY + 16;

    // ── Totals ───────────────────────────────────────────────────────────────
    const totalsX     = 350;
    const totalsValX  = 450;
    const totalsWidth = 100;

    const drawTotalRow = (label, value, bold = false, color = DARK) => {
      doc.fontSize(9)
         .fillColor(GRAY).font('Helvetica')
         .text(label, totalsX, doc.y, { width: 95, align: 'right' });
      doc.fontSize(9)
         .fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica')
         .text(value, totalsValX, doc.y - doc.currentLineHeight(), { width: totalsWidth, align: 'right' });
      doc.moveDown(0.5);
    };

    drawTotalRow('Subtotal',   formatCurrency(invoice.subtotal));
    drawTotalRow('Tax',        formatCurrency(invoice.taxTotal));
    doc.moveTo(totalsX, doc.y).lineTo(50 + W, doc.y).strokeColor('#E5E7EB').lineWidth(1).stroke();
    doc.moveDown(0.4);
    drawTotalRow('Grand Total', formatCurrency(invoice.grandTotal), true, ACCENT);

    if (invoice.amountPaid > 0) {
      drawTotalRow('Amount Paid', formatCurrency(invoice.amountPaid), false, '#10B981');
      drawTotalRow('Balance Due', formatCurrency(invoice.balance),    true,  '#EF4444');
    }

    // ── Notes & Terms ────────────────────────────────────────────────────────
    doc.moveDown(2);

    if (invoice.notes) {
      doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('NOTES');
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(invoice.notes);
      doc.moveDown(1);
    }

    if (invoice.termsAndConditions) {
      doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('TERMS & CONDITIONS');
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(invoice.termsAndConditions);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 60;
    doc.moveTo(50, footerY).lineTo(50 + W, footerY).strokeColor('#E5E7EB').lineWidth(1).stroke();
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
       .text(`Thank you for your business — ${company}`, 50, footerY + 8, { align: 'center', width: W });

    doc.end();
  });
};

module.exports = { generateInvoicePdf };