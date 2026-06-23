import cron from "node-cron";
import { runBirthdayJob, runFollowUpJob, runReminderJob } from "./jobs";

export function startCron() {
  // Every day at 08:00 server time
  cron.schedule("0 8 * * *", async () => {
    try {
      console.log(await runBirthdayJob());
      console.log(await runReminderJob());
      console.log(await runFollowUpJob());
    } catch (e) {
      console.error("Cron error", e);
    }
  });
  console.log("Cron scheduled: daily 08:00 (birthdays, reminders, follow-ups)");
}
