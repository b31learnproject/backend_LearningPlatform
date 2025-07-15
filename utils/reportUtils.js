const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');

// Create one receipt PDF
function generateReceiptPDF(enrollment, outputPath) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(outputPath));

    doc.fontSize(20).text('Enrollment Receipt', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Receipt ID: ${enrollment._id}`);
    doc.text(`Learner: ${enrollment.learner?.firstName || ''} ${enrollment.learner?.lastName || ''}`);
    doc.text(`Course: ${enrollment.course?.title}`);
    doc.text(`Payment Status: ${enrollment.paymentStatus}`);
    doc.text(`Enrollment Date: ${new Date(enrollment.enrollmentDate).toLocaleDateString()}`);
    doc.text(`Progress: ${enrollment.progressPercentage}%`);

    doc.end();
    doc.on('finish', () => resolve());
  });
}

// Bundle all successful receipts into a ZIP
async function generateReceiptZip(enrollments, zipPath) {
  return new Promise(async (resolve, reject) => {
    const zipOutput = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    zipOutput.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(zipOutput);

    for (const enrollment of enrollments) {
      if (enrollment.paymentStatus === 'success') {
        const pdfPath = path.join(__dirname, `receipt-${enrollment._id}.pdf`);
        await generateReceiptPDF(enrollment, pdfPath);
        archive.file(pdfPath, { name: `receipt-${enrollment._id}.pdf` });
      }
    }

    await archive.finalize();

    // Clean up temp PDF files
    enrollments.forEach((e) => {
      const pdfPath = path.join(__dirname, `receipt-${e._id}.pdf`);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    });
  });
}

module.exports = {
  generateReceiptPDF,
  generateReceiptZip,
};
