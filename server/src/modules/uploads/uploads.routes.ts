import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler, HttpError } from "../../middleware/errors";
import { upload, publicUrlFor } from "../../services/upload";

const router = Router();
router.use(requireAuth);

// Upload a single file (e.g. passport photo, expense document). Returns a public URL.
router.post(
  "/",
  requireRole("ADMIN", "OPERATIONS", "FINANCE", "STUDENT"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded (field name must be 'file')");
    res.status(201).json({ url: publicUrlFor(req.file.filename) });
  })
);

export default router;
