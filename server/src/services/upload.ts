import multer from "multer";
import fs from "fs";
import path from "path";
import { config } from "../config";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(config.uploadDir, "files");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

export function publicUrlFor(filename: string): string {
  return `${config.publicUrl}/uploads/files/${filename}`;
}
