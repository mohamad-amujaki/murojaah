interface EmailConfig {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(_config: EmailConfig | null, options: EmailOptions): Promise<boolean> {
  console.log(`[EMAIL] to=${options.to} subject=${options.subject}`);
  return false;
}

export function emailConfigFromEnv(env: Record<string, unknown>): EmailConfig | null {
  const host = env.SMTP_HOST as string | undefined;
  const port = env.SMTP_PORT as number | undefined;
  const user = env.SMTP_USER as string | undefined;
  const pass = env.SMTP_PASS as string | undefined;
  const fromEmail = (env.FROM_EMAIL as string | undefined) ?? "noreply@murojaah.app";
  const fromName = (env.FROM_NAME as string | undefined) ?? "Murojaah";
  if (!host || !user || !pass) return null;
  return { SMTP_HOST: host, SMTP_PORT: port ?? 587, SMTP_USER: user, SMTP_PASS: pass, FROM_EMAIL: fromEmail, FROM_NAME: fromName };
}

export const RESET_EMAIL_HTML = (resetUrl: string, name: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Manrope,sans-serif;max-width:480px;margin:auto;padding:24px;color:#18332c">
  <div style="text-align:center;margin-bottom:24px">
    <div style="display:inline-flex;align-items:center;gap:8px;font-size:21px;font-weight:800">
      <div style="width:38px;height:38px;background:#106b55;border-radius:12px;display:grid;place-items:center;color:#fff">📖</div>
      <span>Muro<span style="color:#106b55">jaah</span></span>
    </div>
  </div>
  <h2 style="text-align:center;color:#106b55;margin-bottom:16px">Atur Ulang Kata Sandi</h2>
  <p style="font-size:14px;line-height:1.7;color:#70817c">Halo ${name},</p>
  <p style="font-size:14px;line-height:1.7;color:#70817c">Kami menerima permintaan untuk mengatur ulang kata sandi akun Murojaah kamu.</p>
  <p style="font-size:14px;line-height:1.7;color:#70817c">Klik tombol di bawah untuk mengatur kata sandi baru:</p>
  <div style="text-align:center;margin:28px 0">
    <a href="${resetUrl}" style="display:inline-block;background:#106b55;color:#fff;border-radius:11px;padding:14px 28px;font-weight:800;font-size:13px;text-decoration:none">Atur Ulang Kata Sandi</a>
  </div>
  <p style="font-size:12px;color:#70817c;line-height:1.6">Tautan ini berlaku selama 1 jam dan hanya bisa dipakai sekali.<br>Jika kamu tidak merasa permintaan ini, abaikan email ini.</p>
  <hr style="border:none;border-top:1px solid #e2e9e5;margin:24px 0">
  <p style="font-size:11px;color:#70817c;text-align:center">Konten &amp; audio Al-Qur'an: EQuran.id &middot; &copy; ${new Date().getFullYear()} Murojaah</p>
</body></html>
`;
