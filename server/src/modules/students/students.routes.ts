import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { asyncHandler, HttpError } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";
import { generateStudentId } from "./studentId";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  dateOfBirth: z.coerce.date(),
  passportPhotoUrl: z.string().url().optional(),
  sponsorName: z.string().optional(),
  sponsorContact: z.string().optional(),
  courseId: z.string().min(1),
  batch: z.string().min(1),
  password: z.string().min(6).optional(), // login password for the student (defaults if omitted)
});

const DEFAULT_STUDENT_PASSWORD = "Student123!";

// List + search/filter (staff only)
router.get(
  "/",
  requireRole("ADMIN", "OPERATIONS", "FINANCE"),
  asyncHandler(async (req, res) => {
    const { q, status, courseId, batch } = req.query as Record<string, string>;
    const where: Prisma.StudentWhereInput = {};
    if (status) where.status = status as Prisma.StudentWhereInput["status"];
    if (courseId) where.courseId = courseId;
    if (batch) where.batch = batch;
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { id: { contains: q, mode: "insensitive" } },
      ];
    }
    const students = await prisma.student.findMany({
      where,
      include: { course: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(students);
  })
);

// Create student (mandatory fields, duplicate prevention, auto ID)
router.post(
  "/",
  requireRole("ADMIN", "OPERATIONS"),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const dup = await prisma.student.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });
    if (dup) throw new HttpError(409, "A student with this email or phone already exists");

    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) throw new HttpError(409, "A user account already uses this email");

    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new HttpError(400, "Invalid course");

    const { password, ...studentData } = data;
    const passwordHash = await bcrypt.hash(password ?? DEFAULT_STUDENT_PASSWORD, 10);

    const student = await prisma.$transaction(async (tx) => {
      const id = await generateStudentId(tx, course.code);
      // Create a linked STUDENT login so they can sign in to their own dashboard.
      const user = await tx.user.create({
        data: {
          name: `${studentData.firstName} ${studentData.lastName}`,
          email: studentData.email,
          role: "STUDENT",
          passwordHash,
        },
      });
      return tx.student.create({
        data: { id, ...studentData, userId: user.id },
        include: { course: true },
      });
    });

    res.status(201).json({
      ...student,
      loginInfo: { email: student.email, password: password ?? DEFAULT_STUDENT_PASSWORD },
    });
  })
);

// Helper to enforce that a STUDENT can only access their own record
async function resolveAccessibleStudent(req: import("express").Request, id: string) {
  if (req.user!.role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!me || me.id !== id) throw new HttpError(403, "Forbidden");
  }
}

// Dashboard (full financial summary)
router.get(
  "/:id/dashboard",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await resolveAccessibleStudent(req, id);
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: true,
        payments: { orderBy: { createdAt: "desc" } },
        installmentPlan: { include: { installments: { orderBy: { dueDate: "asc" } } } },
      },
    });
    if (!student) throw new HttpError(404, "Student not found");

    // Billing is driven by the course price; use the discount only when it is a real, positive amount.
    const price = Number(student.course.price);
    const discount = student.course.discountPrice != null ? Number(student.course.discountPrice) : 0;
    const effectivePrice = discount > 0 ? discount : price;
    const totalBilled = effectivePrice;
    const totalPaid = student.payments
      .filter((p) => p.status === "PAID")
      .reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Math.max(totalBilled - totalPaid, 0);
    const fullyPaid = outstanding === 0;

    res.json({ student, summary: { effectivePrice, totalBilled, totalPaid, outstanding, fullyPaid } });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await resolveAccessibleStudent(req, req.params.id);
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: { course: true },
    });
    if (!student) throw new HttpError(404, "Student not found");
    res.json(student);
  })
);

const updateSchema = createSchema.partial().extend({
  status: z.enum(["ACTIVE", "GRADUATED", "INACTIVE"]).optional(),
  completionDate: z.coerce.date().optional(),
});

// Update student (ID is never accepted here)
router.patch(
  "/:id",
  requireRole("ADMIN", "OPERATIONS"),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    // Graduating requires a completion date
    if (data.status === "GRADUATED" && !data.completionDate) {
      data.completionDate = new Date();
    }
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data,
      include: { course: true },
    });
    res.json(student);
  })
);

// Delete a student (ADMIN only) — removes dependent records first
router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id }, include: { installmentPlan: true } });
      if (!student) throw new HttpError(404, "Student not found");
      await tx.payment.deleteMany({ where: { studentId: id } });
      if (student.installmentPlan) {
        await tx.installment.deleteMany({ where: { planId: student.installmentPlan.id } });
        await tx.installmentPlan.delete({ where: { id: student.installmentPlan.id } });
      }
      await tx.student.delete({ where: { id } });
      if (student.userId) {
        await tx.user.delete({ where: { id: student.userId } }).catch(() => {});
      }
    });
    res.json({ ok: true });
  })
);

export default router;
