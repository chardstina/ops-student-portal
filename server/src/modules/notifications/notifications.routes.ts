import { Router } from "express";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../middleware/errors";
import { requireAuth, requireRole } from "../../middleware/auth";
import { runBirthdayJob, runReminderJob, runFollowUpJob } from "../../cron/jobs";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/logs",
  asyncHandler(async (_req, res) => {
    res.json(await prisma.notificationLog.findMany({ orderBy: { sentAt: "desc" }, take: 200 }));
  })
);

// Manual triggers for testing (jobs themselves run automatically via cron)
router.post("/run/birthdays", asyncHandler(async (_req, res) => res.json(await runBirthdayJob())));
router.post("/run/reminders", asyncHandler(async (_req, res) => res.json(await runReminderJob())));
router.post("/run/followups", asyncHandler(async (_req, res) => res.json(await runFollowUpJob())));

export default router;
