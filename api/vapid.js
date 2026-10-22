// One-time helper: shows a fresh pair of push-notification keys to paste into Vercel.
// Once VAPID_PUBLIC_KEY is set it only reports that reminders are configured.
import webpush from "web-push";
export default function handler(req, res) {
  if (process.env.VAPID_PUBLIC_KEY) return res.status(200).json({ configured: true });
  const k = webpush.generateVAPIDKeys();
  res.setHeader("cache-control", "no-store");
  res.status(200).json({ configured: false, add_these_to_vercel: { VAPID_PUBLIC_KEY: k.publicKey, VAPID_PRIVATE_KEY: k.privateKey }, note: "Add both in Vercel → Settings → Environment Variables, then redeploy. This page stops showing keys once they're set." });
}
