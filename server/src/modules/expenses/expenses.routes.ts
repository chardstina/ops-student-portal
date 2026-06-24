import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler, HttpError } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  documentUrl: z.string().url().optional(),
  budgetId: z.string().optional(),
});

router.get(
  "/",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const { status, category } = req.query as Record<string, string>;
    res.json(
      await prisma.expense.findMany({
        where: { status: status ? (status as never) : undefined, category: category || undefined },
        include: { createdBy: { select: { name: true } }, approvedBy: { select: { name: true } }, budget: true },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

router.post(
  "/",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    res.status(201).json(
      await prisma.expense.create({ data: { ...data, createdById: req.user!.id } })
    );
  })
);

// Approve / reject (Admin or Finance)
router.patch(
  "/:id/decision",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const { decision } = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }).parse(req.body);
    res.json(
      await prisma.expense.update({
        where: { id: req.params.id },
        data: { status: decision, approvedById: req.user!.id },
      })
    );
  })
);

// Budgets
router.get(
  "/budgets/all",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (_req, res) => {
    res.json(await prisma.budget.findMany({ include: { expenses: true } }));
  })
);

router.post(
  "/budgets",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const data = z
      .object({ category: z.string(), period: z.string(), allocatedAmount: z.number().nonnegative() })
      .parse(req.body);
    res.status(201).json(await prisma.budget.create({ data }));
  })
);

// Budget vs actual report
router.get(
  "/reports/budget-vs-actual",
  requireRole("ADMIN", "FINANCE"),
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || undefined;
    const budgets = await prisma.budget.findMany({ where: { period }, include: { expenses: true } });
    const report = budgets.map((b) => {
      const actual = b.expenses
        .filter((e) => e.status === "APPROVED")
        .reduce((s, e) => s + Number(e.amount), 0);
      return {
        category: b.category,
        period: b.period,
        allocated: Number(b.allocatedAmount),
        actual,
        remaining: Number(b.allocatedAmount) - actual,
      };
    });
    res.json(report);
  })
);

export default router;
