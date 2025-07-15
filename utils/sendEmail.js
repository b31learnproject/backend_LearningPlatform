const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

/**
 * Replace {{placeholders}} in a template string
 */
function fillTemplate(template, variables) {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
    return variables[key] || '';
  });
}

/**
 * Core function to send email
 */
async function sendEmail({
  to,
  subject,
  text,
  html,
  templateName,
  templateVars,
  attachments,
}) {
  if (!to || !subject || (!text && !html && !templateName)) {
    throw new Error(
      'Missing required email fields: to, subject, and text/html/templateName.'
    );
  }

  let emailHtml = html;

  if (templateName) {
    const templatePath = path.join(__dirname, '../emailTemplates', `${templateName}.html`);
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      emailHtml = fillTemplate(templateContent, templateVars || {});
    } catch (err) {
      throw new Error(`Failed to load template "${templateName}": ${err.message}`);
    }
  }

  // ✅ Ensuring environment variables exist
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_HOST) {
    throw new Error('Missing SMTP configuration in environment variables');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailData = {
    from: `"${process.env.SMTP_FROM_NAME || 'No Reply'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    text: text || undefined, // ✅ fallback if only HTML used
    html: emailHtml,
    attachments: attachments || [],
  };

  try {
    const info = await transporter.sendMail(mailData);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Helper to send email with PDF or file attachment
 */
async function sendEmailWithAttachment({ to, subject, html, filePath }) {
  const filename = path.basename(filePath); // ✅ safe name
  return await sendEmail({
    to,
    subject,
    html,
    attachments: filePath ? [{ filename, path: filePath }] : [],
  });
}

/**
 * Cron job email to admin with weekly summary
 */
async function sendWeeklyEmailReport() {
  const Enrollment = require('../models/Enrollment');

  const enrollments = await Enrollment.find()
    .populate('learner', 'firstName lastName email')
    .populate('course', 'title category');

  const stats = {
    total: enrollments.length,
    success: enrollments.filter((e) => e.paymentStatus === 'success').length,
    failed: enrollments.filter((e) => e.paymentStatus === 'failed').length,
    pending: enrollments.filter((e) => e.paymentStatus === 'pending').length,
  };

  const html = `
    <h3>📊 Weekly Enrollment Report</h3>
    <ul>
      <li>Total Enrollments: <strong>${stats.total}</strong></li>
      <li>✅ Successful: <strong>${stats.success}</strong></li>
      <li>❌ Failed: <strong>${stats.failed}</strong></li>
      <li>⏳ Pending: <strong>${stats.pending}</strong></li>
    </ul>
  `;

  if (!process.env.ADMIN_EMAIL) {
    throw new Error('ADMIN_EMAIL is not configured in .env');
  }

  return await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: 'Weekly Enrollment Report',
    html,
  });
}

// ✅ Export all functions properly
module.exports = {
  sendEmail,
  sendEmailWithAttachment,
  sendWeeklyEmailReport,
};
