import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

// Any authenticated user (incl. students) can see active accounts to pay into.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const all = req.user!.role === "ADMIN" || req.user!.role === "FINANCE";
    res.json(
      await prisma.bankAccount.findMany({
        where: all ? {} : { isActive: true },
        orderBy: { bankName: "asc" },
      })
    );
  })
);

const schema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(4),
  isActive: z.boolean().optional(),
});

router.post(
  "/",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.bankAccount.create({ data: schema.parse(req.body) }));
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    res.json(await prisma.bankAccount.update({ where: { id: req.params.id }, data: schema.partial().parse(req.body) }));
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.bankAccount.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  })
);

export default router;
