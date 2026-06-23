import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { config } from "../config";

export async function generateReceiptPdf(opts: {
  paymentId: string;
  studentName: string;
  studentId: string;
  amount: number;
  method: string;
  paidAt: Date;
  course: string;
}): Promise<string> {
  const dir = path.join(config.uploadDir, "receipts");
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `receipt-${opts.paymentId}.pdf`;
  const filePath = path.join(dir, fileName);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text("Payment Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Receipt No: ${opts.paymentId}`);
    doc.text(`Date: ${opts.paidAt.toISOString().slice(0, 10)}`);
    doc.moveDown();
    doc.text(`Student: ${opts.studentName} (${opts.studentId})`);
    doc.text(`Course: ${opts.course}`);
    doc.moveDown();
    doc.text(`Method: ${opts.method}`);
    doc.fontSize(16).text(`Amount Paid: NGN ${opts.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`);
    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").text("Thank you. This is a system-generated receipt.", { align: "center" });

    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return `${config.publicUrl}/uploads/receipts/${fileName}`;
}
