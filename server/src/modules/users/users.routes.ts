import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler, HttpError } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();
// All user management is ADMIN-only.
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "OPERATIONS", "FINANCE", "STUDENT"]),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const dup = await prisma.user.findUnique({ where: { email: data.email } });
    if (dup) throw new HttpError(409, "A user with this email already exists");
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 10),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // If this is a STUDENT login, link it to an existing unlinked student profile with the same email.
    let linkedStudentId: string | null = null;
    if (data.role === "STUDENT") {
      const student = await prisma.student.findFirst({ where: { email: data.email, userId: null } });
      if (student) {
        await prisma.student.update({ where: { id: student.id }, data: { userId: user.id } });
        linkedStudentId = student.id;
      }
    }

    res.status(201).json({ ...user, linkedStudentId });
  })
);

router.patch(
  "/:id/role",
  asyncHandler(async (req, res) => {
    const { role } = z.object({ role: z.enum(["ADMIN", "OPERATIONS", "FINANCE", "STUDENT"]) }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json(user);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, "You cannot delete your own account");
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "P2003") {
        throw new HttpError(
          409,
          "This user has linked records (expenses, enquiries, or a student profile) and cannot be deleted."
        );
      }
      throw e;
    }
    res.json({ ok: true });
  })
);

export default router;
