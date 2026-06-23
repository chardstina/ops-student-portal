import { NotificationChannel, NotificationType } from "@prisma/client";
import { prisma } from "../prisma";
import { sendEmail } from "./mailer";
import { sendSms } from "./sms";

export async function notify(opts: {
  type: NotificationType;
  email?: string;
  phone?: string;
  subject: string;
  html: string;
  smsText?: string;
}) {
  if (opts.email) {
    let status = "SENT";
    try {
      await sendEmail(opts.email, opts.subject, opts.html);
    } catch (e) {
      status = "FAILED";
    }
    await prisma.notificationLog.create({
      data: { type: opts.type, channel: NotificationChannel.EMAIL, recipient: opts.email, status },
    });
  }
  if (opts.phone && opts.smsText) {
    let status = "SENT";
    try {
      await sendSms(opts.phone, opts.smsText);
    } catch (e) {
      status = "FAILED";
    }
    await prisma.notificationLog.create({
      data: { type: opts.type, channel: NotificationChannel.SMS, recipient: opts.phone, status },
    });
  }
}
