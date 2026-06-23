import { config } from "../config";

// SMS is stubbed. Plug in Twilio here when credentials are provided.
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!config.sms.enabled) {
    console.log(`[sms:stub] to=${to} body="${body}"`);
    return true;
  }
  // TODO: integrate Twilio
  // const client = twilio(config.sms.sid, config.sms.token);
  // await client.messages.create({ to, from: config.sms.from, body });
  console.log(`[sms:would-send] to=${to} body="${body}"`);
  return true;
}
