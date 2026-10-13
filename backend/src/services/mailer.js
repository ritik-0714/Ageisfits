import nodemailer from "nodemailer";

let transportPromise;
async function transport() {
  if (transportPromise) return transportPromise;
  transportPromise = (async () => {
    if (process.env.SMTP_HOST)
      return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
    try {                                                     // no SMTP configured -> Ethereal test inbox (never delivers to real users)
      const acct = await nodemailer.createTestAccount();
      return nodemailer.createTransport({ host: "smtp.ethereal.email", port: 587, auth: { user: acct.user, pass: acct.pass } });
    } catch { return nodemailer.createTransport({ jsonTransport: true }); }   // offline fallback: message is only logged
  })();
  return transportPromise;
}

export async function sendVerificationEmail(to, name, code) {
  const t = await transport();
  const info = await t.sendMail({ from: process.env.MAIL_FROM || "AegisFit <no-reply@aegisfit.local>", to,
    subject: "Your AegisFit verification code",
    text: `Hi ${name},\n\nYour AegisFit verification code is ${code}. It expires in 15 minutes.\n`,
    html: `<p>Hi ${name},</p><p>Your AegisFit verification code is <b style="font-size:20px">${code}</b>. It expires in 15 minutes.</p>` });
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  if (previewUrl) console.log("[mail] preview:", previewUrl);
  else if (info.message) console.log(`[mail] (no SMTP - offline) verification code for ${to}: ${code}`);
  return { previewUrl };
}
