// services/emailService.js — FlowPOS
const nodemailer = require('nodemailer');

/**
 * Creates a reusable transporter from environment variables.
 * Supports SMTP (Gmail, Outlook, custom) via env config.
 */
const createTransporter = () => nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an invoice email with PDF attachment.
 *
 * @param {Object} options
 * @param {string} options.to            - Recipient email
 * @param {string} options.customerName  - Customer display name
 * @param {string} options.invoiceNumber - e.g. INV-2024-00001
 * @param {number} options.grandTotal    - Total amount
 * @param {string} options.dueDate       - Formatted due date string
 * @param {string} options.companyName   - Sender company name
 * @param {Buffer} options.pdfBuffer     - Generated PDF buffer
 */
const sendInvoiceEmail = async ({
  to,
  customerName,
  invoiceNumber,
  grandTotal,
  dueDate,
  companyName,
  pdfBuffer,
}) => {
  const transporter = createTransporter();

  const subject = `Invoice ${invoiceNumber} from ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body        { margin: 0; padding: 0; background: #F3F4F6; font-family: Arial, sans-serif; color: #111827; }
        .wrapper    { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header     { background: #1D4ED8; padding: 32px 40px; text-align: center; }
        .header h1  { margin: 0; color: #FFFFFF; font-size: 24px; letter-spacing: 1px; }
        .header p   { margin: 6px 0 0; color: #BFDBFE; font-size: 14px; }
        .body       { padding: 32px 40px; }
        .body p     { font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
        .summary    { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
        .summary table { width: 100%; border-collapse: collapse; }
        .summary td { padding: 6px 0; font-size: 14px; color: #374151; }
        .summary td:last-child { text-align: right; font-weight: bold; color: #111827; }
        .total-row td { border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 16px; color: #1D4ED8; }
        .cta        { text-align: center; margin: 28px 0 8px; }
        .footer     { background: #F9FAFB; padding: 20px 40px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>${companyName}</h1>
          <p>Invoice Notification</p>
        </div>
        <div class="body">
          <p>Dear ${customerName},</p>
          <p>
            Please find your invoice attached to this email. Here is a summary
            of your invoice details:
          </p>
          <div class="summary">
            <table>
              <tr>
                <td>Invoice Number</td>
                <td>${invoiceNumber}</td>
              </tr>
              <tr>
                <td>Due Date</td>
                <td>${dueDate}</td>
              </tr>
              <tr class="total-row">
                <td>Amount Due</td>
                <td>$${Number(grandTotal).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <p>
            Please remit payment by the due date. If you have any questions
            regarding this invoice, don't hesitate to contact us.
          </p>
          <p>Thank you for your business!</p>
          <p style="margin-top: 24px;">
            Best regards,<br/>
            <strong>${companyName}</strong><br/>
            ${process.env.COMPANY_EMAIL  ? `<a href="mailto:${process.env.COMPANY_EMAIL}" style="color:#1D4ED8;">${process.env.COMPANY_EMAIL}</a><br/>` : ''}
            ${process.env.COMPANY_PHONE  ? process.env.COMPANY_PHONE + '<br/>'  : ''}
            ${process.env.COMPANY_ADDRESS ? process.env.COMPANY_ADDRESS         : ''}
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:        `"${companyName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments: [
      {
        filename:    `${invoiceNumber}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

module.exports = { sendInvoiceEmail };