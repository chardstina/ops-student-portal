import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "../../prisma";
import { config } from "../../config";
import { asyncHandler, HttpError } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";
import { generateReceiptPdf } from "../../services/receipt";
import { notify } from "../../services/notify";

const router = Router();
const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

router.use(requireAuth);

// Record a manual payment (Finance/Admin)
const recordSchema = z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  method: z.string().min(1),
  installmentId: z.string().optional(),
  gatewayReference: z.string().optional(),
});

router.post(
  "/",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const data = recordSchema.parse(req.body);
    const student = await prisma.student.findUnique({ where: { id: data.studentId }, include: { course: true } });
    if (!student) throw new HttpError(404, "Student not found");

    const payment = await prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        method: data.method,
        gatewayReference: data.gatewayReference,
        status: "PAID",
        paidAt: new Date(),
        installmentId: data.installmentId,
      },
    });
    if (data.installmentId) {
      await prisma.installment.update({ where: { id: data.installmentId }, data: { paid: true } });
    }

    const receiptUrl = await generateReceiptPdf({
      paymentId: payment.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentId: student.id,
      amount: data.amount,
      method: data.method,
      paidAt: payment.paidAt!,
      course: student.course.name,
    });
    const updated = await prisma.payment.update({ where: { id: payment.id }, data: { receiptUrl } });

    await notify({
      type: "RECEIPT",
      email: student.email,
      subject: "Payment received",
      html: `<p>Hi ${student.firstName}, we received your payment of ${data.amount}. <a href="${receiptUrl}">Download receipt</a>.</p>`,
    });

    res.status(201).json(updated);
  })
);

// Student submits a payment with proof of transfer -> awaits admin approval
const submitSchema = z.object({
  amount: z.number().positive(),
  accountId: z.string().min(1),
  proofUrl: z.string().url(),
});

router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "STUDENT") throw new HttpError(403, "Only students submit payments here");
    const me = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!me) throw new HttpError(404, "No student profile linked to your account");
    const data = submitSchema.parse(req.body);
    const account = await prisma.bankAccount.findUnique({ where: { id: data.accountId } });
    if (!account || !account.isActive) throw new HttpError(400, "Invalid bank account");

    const payment = await prisma.payment.create({
      data: {
        studentId: me.id,
        amount: data.amount,
        method: "BANK_TRANSFER",
        status: "AWAITING_APPROVAL",
        proofUrl: data.proofUrl,
        accountId: data.accountId,
      },
    });
    res.status(201).json(payment);
  })
);

// Pending submissions awaiting approval (Admin/Finance)
router.get(
  "/pending",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.payment.findMany({
        where: { status: "AWAITING_APPROVAL" },
        include: {
          account: true,
          student: { select: { id: true, firstName: true, lastName: true, email: true, course: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      })
    );
  })
);

// Approve a submitted payment -> mark PAID + generate receipt + notify
router.patch(
  "/:id/approve",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: { include: { course: true } } } });
    if (!payment) throw new HttpError(404, "Payment not found");
    if (payment.status !== "AWAITING_APPROVAL") throw new HttpError(400, "Payment is not awaiting approval");

    const paidAt = new Date();
    const receiptUrl = await generateReceiptPdf({
      paymentId: payment.id,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      studentId: payment.student.id,
      amount: Number(payment.amount),
      method: payment.method,
      paidAt,
      course: payment.student.course.name,
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt, receiptUrl, approvedById: req.user!.id },
    });

    await notify({
      type: "RECEIPT",
      email: payment.student.email,
      subject: "Payment approved",
      html: `<p>Hi ${payment.student.firstName}, your payment of ${Number(payment.amount)} has been approved. <a href="${receiptUrl}">Download receipt</a>.</p>`,
    });

    res.json(updated);
  })
);

// Reject a submitted payment
router.patch(
  "/:id/reject",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: true } });
    if (!payment) throw new HttpError(404, "Payment not found");
    if (payment.status !== "AWAITING_APPROVAL") throw new HttpError(400, "Payment is not awaiting approval");

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", approvedById: req.user!.id },
    });
    await notify({
      type: "RECEIPT",
      email: payment.student.email,
      subject: "Payment could not be verified",
      html: `<p>Hi ${payment.student.firstName}, your submitted payment of ${Number(payment.amount)} could not be verified${reason ? `: ${reason}` : ""}. Please re-submit with a valid proof of payment.</p>`,
    });
    res.json(updated);
  })
);

// Payment history per student
router.get(
  "/student/:studentId",
  asyncHandler(async (req, res) => {
    if (req.user!.role === "STUDENT") {
      const me = await prisma.student.findUnique({ where: { userId: req.user!.id } });
      if (!me || me.id !== req.params.studentId) throw new HttpError(403, "Forbidden");
    }
    res.json(
      await prisma.payment.findMany({ where: { studentId: req.params.studentId }, orderBy: { createdAt: "i\ØÈˆHJBˆ
NÂˆJBŠNÂ‚‹ËÈš[˜[˜ÙH\Ú›Ø\™ˆ™]™[YH
Èİ]İ[™[™Âœ›İ]\‹™Ù]
ˆ‹Üİ]ËÛİ™\šY]È‹ˆ™\]Z\™T›ÛJQRSˆ‹‘’SSÑHŠKˆ\Ş[˜Ò[™\Š\Ş[˜È
Ü™\K™\ÊHOˆÂˆÛÛœİZYH]ØZ]š\ÛXKœ^[Y[˜YÙÜ™YØ]JÈÜİ[NˆÈ[[İ[ˆYHKÚ\™NˆÈİ]\Îˆ”RQˆHJNÂˆÛÛœİ[™[™ÈH]ØZ]š\ÛXKœ^[Y[˜YÙÜ™YØ]JÂˆÜİ[NˆÈ[[İ[ˆYHKˆÚ\™NˆÈİ]\ÎˆÈ[ˆÈ”S‘S‘È‹“Õ‘T‘QH—HHKˆJNÂˆ™\ËšœÛÛŠÂˆİ[™]™[YNˆ[X™\ŠZY—Üİ[K˜[[İ[ÏÈ
Kˆİ[İ]İ[™[™Îˆ[X™\Š[™[™Ë—Üİ[K˜[[İ[ÏÈ
KˆJNÂˆJBŠNÂ‚‹ËÈÜ™X]Hİš\HÚXÚÛİ]Ü^[Y[[[›ÜˆÛ›[™H^[Y[œ›İ]\‹œÜİ
ˆ‹ØÚXÚÛİ]‹ˆ\Ş[˜Ò[™\Š\Ş[˜È
™\K™\ÊHOˆÂˆÛÛœİÈİY[Y[[İ[HH‹›Øš™Xİ
ÈİY[Yˆ‹œİš[™Ê
K[[İ[ˆ‹›[X™\Š
KœÜÚ]]™J
HJKœ\œÙJ™\K˜›ÙJNÂˆYˆ
\İš\JH›İÈ™]È\œ›ÜŠLË”İš\H›İÛÛ™šYİ\™YŠNÂˆÛÛœİ[[H]ØZ]İš\Kœ^[Y[[[Ë˜Ü™X]JÂˆ[[İ[ˆX]œ›İ[™
[[İ[
ˆL
Kˆİ\œ™[˜ŞNˆÛÛ™šYËœİš\K˜İ\œ™[˜ŞKˆY]Y]NˆÈİY[YKˆJNÂˆËÈ™XÛÜ™\È[™[™Âˆ]ØZ]š\ÛXKœ^[Y[˜Ü™X]JÂˆ]NˆÈİY[Y[[İ[Y]Ùˆ”Õ’TH‹İ]\Îˆ”S‘S‘È‹Ø]]Ø^T™Y™\™[˜ÙNˆ[[šYKˆJNÂˆ™\ËšœÛÛŠÈÛY[ÙXÜ™]ˆ[[˜ÛY[ÜÙXÜ™]JNÂˆJBŠNÂ‚™^ÜY˜][›İ]\Â