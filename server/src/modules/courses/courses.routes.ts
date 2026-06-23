import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await prisma.course.findMany({ orderBy: { name: "asc" } }));
  })
);

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(8).regex(/^[A-Z0-9]+$/, "Code must be uppercase letters/digits"),
  durationMonths: z.number().int().positive(),
  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Pricing edits restricted to ADMIN and FINANCE
router.post(
  "/",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await prisma.course.create({ data }));
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    res.json(await prisma.course.update({ where: { id: req.params.id }, data }));
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.course.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  })
);

export default router;
