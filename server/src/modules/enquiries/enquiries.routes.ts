import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  courseInterest: z.string().optional(),
  source: z.enum(["WEBSITE", "WALK_IN", "CALL"]).default("WEBSITE"),
  assignedStaffId: z.string().optional(),
  nextFollowUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// Public capture (e.g. website form) — no auth
router.post(
  "/public",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse({ ...req.body, source: "WEBSITE" });
    res.status(201).json(await prisma.enquiry.create({ data }));
  })
);

router.use(requireAuth);

router.get(
  "/",
  requireRole("ADMIN", "OPERATIONS", "FINANCE"),
  asyncHandler(async (req, res) => {
    const { status, assignedStaffId } = req.query as Record<string, string>;
    res.json(
      await prisma.enquiry.findMany({
        where: {
          status: status ? (status as never) : undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
        include: { assignedStaff: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    );
  })
);

router.post(
  "/",
  requireRole("ADMIN", "OPERATIONS"),
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    res.status(201).json(await prisma.enquiry.create({ data }));
  })
);

const updateSchema = createSchema.partial().extend({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "LOST"]).optional(),
});

router.patch(
  "/:id",
  requireRole("ADMIN", "OPERATIONS"),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    res.json(await prisma.enquiry.update({ where: { id: req.params.id }, data }));
  })
);

// Conversion-rate report
router.get(
  "/stats/conversion",
  requireRole("ADMIN", "OPERATIONS", "FINANCE"),
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.enquiry.groupBy({ by: ["status"], _count: true });
    const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
    const total = grouped.reduce((s, g) => s + g._count, 0);
    const converted = counts["CONVERTED"] ?? 0;
    res.json({ counts, total, conversionRate: total ? converted / total : 0 });
  })
);

export default router;
