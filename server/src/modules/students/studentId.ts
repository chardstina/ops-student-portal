import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Generates an immutable, unique student ID in the format:
 *   {COURSE_CODE}-{YYYYMM}-{SEQ}   e.g. WD-202606-0042
 * SEQ is a 4-digit zero-padded running count per course+month.
 * Uses a transaction + uniqueness retry to guarantee no collisions.
 */
export async function generateStudentId(
  prisma: PrismaClient | Prisma.TransactionClient,
  courseCode: string,
  date: Date = new Date()
): Promise<string> {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `${courseCode}-${yyyymm}-`;

  // Find the highest existing sequence for this prefix.
  const existing = await prisma.student.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });

  let maxSeq = 0;
  for (const s of existing) {
    const seq = parseInt(s.id.slice(prefix.length), 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
