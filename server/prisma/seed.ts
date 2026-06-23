import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateStudentId } from "../src/modules/students/studentId";

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash("Password123!", 10);

  const [admin, ops, finance] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@institute.test" },
      update: {},
      create: { name: "Admin User", email: "admin@institute.test", passwordHash: pw, role: "ADMIN" },
    }),
    prisma.user.upsert({
      where: { email: "ops@institute.test" },
      update: {},
      create: { name: "Ops Staff", email: "ops@institute.test", passwordHash: pw, role: "OPERATIONS" },
    }),
    prisma.user.upsert({
      where: { email: "finance@institute.test" },
      update: {},
      create: { name: "Finance Officer", email: "finance@institute.test", passwordHash: pw, role: "FINANCE" },
    }),
  ]);

  const webDev = await prisma.course.upsert({
    where: { code: "WD" },
    update: {},
    create: { name: "Web Development", code: "WD", durationMonths: 6, price: 1500, discountPrice: 1200, isActive: true },
  });
  const dataSci = await prisma.course.upsert({
    where: { code: "DS" },
    update: {},
    create: { name: "Data Science", code: "DS", durationMonths: 9, price: 2200, isActive: true },
  });

  // Sample student with user login
  const existing = await prisma.student.findUnique({ where: { email: "jane@student.test" } });
  if (!existing) {
    const id = await generateStudentId(prisma, webDev.code);
    const studentUser = await prisma.user.upsert({
      where: { email: "jane@student.test" },
      update: {},
      create: { name: "Jane Doe", email: "jane@student.test", passwordHash: pw, role: "STUDENT" },
    });
    const today = new Date();
    const student = await prisma.student.create({
      data: {
        id,
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@student.test",
        phone: "+10000000001",
        dateOfBirth: new Date(`2000-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`),
        sponsorName: "Acme Corp",
        sponsorContact: "+10000000099",
        courseId: webDev.id,
        batch: "2026-A",
        status: "ACTIVE",
        userId: studentUser.id,
      },
    });

    const plan = await prisma.installmentPlan.create({
      data: { studentId: student.id, totalAmount: 1200 },
    });
    const due1 = new Date(); due1.setDate(due1.getDate() + 14);
    const due2 = new Date(); due2.setDate(due2.getDate() + 44);
    const i1 = await prisma.installment.create({ data: { planId: plan.id, amount: 600, dueDate: due1 } });
    await prisma.installment.create({ data: { planId: plan.id, amount: 600, dueDate: due2 } });

    await prisma.payment.create({
      data: { studentId: student.id, amount: 600, method: "CASH", status: "PAID", paidAt: new Date(), installmentId: i1.id },
    });
    await prisma.installment.update({ where: { id: i1.id }, data: { paid: true } });
    await prisma.payment.create({
      data: { studentId: student.id, amount: 600, method: "PENDING", status: "PENDING", dueDate: due2 },
    });
  }

  await prisma.enquiry.create({
    data: { name: "Mark Lee", contact: "mark@example.com", courseInterest: "Web Development", source: "WEBSITE", status: "NEW", assignedStaffId: ops.id },
  }).catch(() => {});

  // Company bank accounts (students choose one when paying)
  const accountsExist = await prisma.bankAccount.count();
  if (accountsExist === 0) {
    await prisma.bankAccount.createMany({
      data: [
        { bankName: "First Bank", accountName: "Training Institute Ltd", accountNumber: "3011223344" },
        { bankName: "GTBank", accountName: "Training Institute Ltd", accountNumber: "0123456789" },
        { bankName: "Zenith Bank", accountName: "Training Institute Ltd", accountNumber: "1010101010" },
      ],
    });
  }

  await prisma.budget.upsert({
    where: { category_period: { category: "Marketing", period: "2026-06" } },
    update: {},
    create: { category: "Marketing", period: "2026-06", allocatedAmount: 5000 },
  });
  await prisma.expense.create({
    data: { category: "Marketing", amount: 800, description: "Facebook ads", status: "PENDING", createdById: finance.id },
  }).catch(() => {});

  console.log("Seed complete. Logins (password: Password123!):");
  console.log("  admin@institute.test / ops@institute.test / finance@institute.test / jane@student.test");
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
