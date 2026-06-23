import { prisma } from "../prisma";
import { notify } from "../services/notify";
import { isBirthday, milestoneText, reminderMilestone } from "./reminderLogic";

// --- Birthday greetings ---
export async function runBirthdayJob(today = new Date()) {
  const students = await prisma.student.findMany({ where: { status: "ACTIVE" } });
  let sent = 0;
  for (const s of students) {
    if (isBirthday(today, s.dateOfBirth)) {
      await notify({
        type: "BIRTHDAY",
        email: s.email,
        phone: s.phone,
        subject: "Happy Birthday! 🎉",
        html: `<p>Dear ${s.firstName}, the whole team wishes you a wonderful birthday!</p>`,
        smsText: `Happy Birthday, ${s.firstName}! - The Institute`,
      });
      sent++;
    }
  }
  return { job: "birthdays", checked: students.length, sent };
}

// --- Payment reminders: 2 weeks, 1 week, due date ---
export async function runReminderJob(today = new Date()) {
  const installments = await prisma.installment.findMany({
    where: { paid: false },
    include: { plan: { include: { student: true } } },
  });
  let sent = 0;
  for (const inst of installments) {
    const milestone = reminderMilestone(today, inst.dueDate);
    if (!milestone) continue;
    const student = inst.plan.student;
    await notify({
      type: "PAYMENT_REMINDER",
      email: student.email,
      phone: student.phone,
      subject: `Payment reminder — ${milestoneText(milestone)}`,
      html: `<p>Dear ${student.firstName}, this is a reminder that your payment of ${Number(
        inst.amount
      ).toFixed(2)} is ${milestoneText(milestone)} (${inst.dueDate.toISOString().slice(0, 10)}).</p>`,
      smsText: `Hi ${student.firstName}, payment of ${Number(inst.amount).toFixed(2)} ${milestoneText(milestone)}.`,
    });
    sent++;
  }
  // Mark overdue pending payments
  await prisma.payment.updateMany({
    where: { status: "PENDING", dueDate: { lt: today } },
    data: { status: "OVERDUE" },
  });
  return { job: "reminders", checked: installments.length, sent };
}

// --- Enquiry follow-up reminders ---
export async function runFollowUpJob(today = new Date()) {
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(23, 59, 59, 999);
  const enquiries = await prisma.enquiry.findMany({
    where: {
      status: { in: ["NEW", "CONTACTED"] },
      nextFollowUpDate: { gte: start, lte: end },
      assignedStaff: { isNot: null },
    },
    include: { assignedStaff: true },
  });
  let sent = 0;
  for (const e of enquiries) {
    if (!e.assignedStaff) continue;
    await notify({
      type: "ENQUIRY_FOLLOWUP",
      email: e.assignedStaff.email,
      subject: `Follow up with ${e.name}`,
      html: `<p>Reminder to follow up with enquiry <strong>${e.name}</strong> (${e.contact}) about ${
        e.courseInterest ?? "their interest"
      }.</p>`,
    });
    sent++;
  }
  return { job: "followups", checked: enquiries.length, sent };
}
