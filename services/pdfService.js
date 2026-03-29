const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoicePDF = (sale, invoicePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        const stream = fs.createWriteStream(invoicePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('Medicine ERP Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice Number: ${sale._id}`);
        doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString()}`);
        doc.text(`Customer Name: ${sale.customerName}`);
        if (sale.customerContact) {
            doc.text(`Contact: ${sale.customerContact}`);
        }
        doc.moveDown();

        // Table Header
        const tableTop = 200;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, tableTop);
        doc.text('Qty', 300, tableTop);
        doc.text('Price', 350, tableTop);
        doc.text('Total', 450, tableTop);
        doc.font('Helvetica');

        // Items
        let position = tableTop + 30;
        sale.items.forEach(item => {
            doc.text(item.name, 50, position);
            doc.text(item.quantity.toString(), 300, position);
            doc.text(`Rs. ${item.price}`, 350, position);
            doc.text(`Rs. ${item.total}`, 450, position);
            position += 30;
        });

        // Total
        const subtotalPosition = position + 20;
        doc.font('Helvetica-Bold');
        doc.text(`Grand Total: Rs. ${sale.totalAmount}`, 400, subtotalPosition);

        doc.end();

        stream.on('finish', () => {
            resolve(invoicePath);
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
};

module.exports = { generateInvoicePDF };
