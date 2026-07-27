import type { Env } from "./http";

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function generateResetToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export function resetTokenExpiry(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

export async function sendPasswordResetEmail(env: Env, to: string, resetLink: string): Promise<void> {
  if (env.MU_SMTP_HOST && env.MU_SMTP_USER && env.MU_SMTP_PASS) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: env.MU_SMTP_HOST,
      port: Number(env.MU_SMTP_PORT) || 587,
      secure: Number(env.MU_SMTP_PORT) === 465,
      auth: { user: env.MU_SMTP_USER, pass: env.MU_SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"${env.MU_FROM_NAME ?? "Murojaah"}" <${env.MU_FROM_EMAIL ?? "noreply@murojaah.app"}>`,
      to,
      subject: "Atur ulang kata sandi Murojaah",
      html: `<p>Klik tautan berikut untuk mengatur ulang kata sandi:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Tautan berlaku selama 1 jam.</p>`,
    });
  } else {
    console.log(`[DEV] Password reset for ${to}: ${resetLink}`);
  }
}
