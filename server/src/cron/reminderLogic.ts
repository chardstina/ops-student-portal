/**
 * Pure logic for payment reminders. A reminder is due when the number of
 * whole days between `today` and `dueDate` is exactly 14, 7, or 0.
 * Returns the matching milestone label, or null if no reminder is due.
 */
export type ReminderMilestone = "TWO_WEEKS" | "ONE_WEEK" | "DUE_TODAY";

export function daysBetween(today: Date, dueDate: Date): number {
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function reminderMilestone(today: Date, dueDate: Date): ReminderMilestone | null {
  const d = daysBetween(today, dueDate);
  if (d === 14) return "TWO_WEEKS";
  if (d === 7) return "ONE_WEEK";
  if (d === 0) return "DUE_TODAY";
  return null;
}

export function isBirthday(today: Date, dob: Date): boolean {
  return today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
}

export function milestoneText(m: ReminderMilestone): string {
  switch (m) {
    case "TWO_WEEKS":
      return "due in 2 weeks";
    case "ONE_WEEK":
      return "due in 1 week";
    case "DUE_TODAY":
      return "due today";
  }
}
