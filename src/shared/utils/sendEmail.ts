import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: any;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    // Load template
    const templatePath = path.join(__dirname, `../templates/emails/${options.template}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);
    const html = compiledTemplate(options.context);

    // Send email
    await transporter.sendMail({
      from: `"Ahoé" <${process.env.SMTP_FROM || 'noreply@ahoe.tg'}>`,
      to: options.to,
      subject: options.subject,
      html: html
    });

    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Échec d\'envoi de l\'email');
  }
};

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildWelcomeHtml(username: string): { html: string; text: string } {
  const rawName = (username || 'ami').toString().trim();
  const safeName = escapeHtml(rawName || 'ami');

  // calcule les initiales (2 lettres max), filtre les caractères non valides
  const initials = rawName
    .split(/\s+/)
    .map(part => part[0] || '')
    .join('')
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '')
    .toUpperCase()
    .slice(0, 2) || 'A';

  const appUrl = escapeHtml(process.env.APP_URL || 'https://ahoe.tg');
  const supportEmail = escapeHtml(process.env.SUPPORT_EMAIL || 'support@ahoe.tg');
  const year = new Date().getFullYear();

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    /* Styles simplifiés pour compatibilité clients mail */
    body { margin:0; padding:0; background:#f6f7fb; font-family: Arial, Helvetica, sans-serif; color:#111; }
    .wrapper { width:100%; padding:24px 12px; background:#f6f7fb; }
    .container { max-width:600px; margin:0 auto; }
    .card { background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e9ebf0; }
    .header { padding:20px; text-align:center; }
    .brand { display:inline-block; padding:8px 16px; border-radius:24px; background:#eef2ff; color:#3b37f0; font-weight:700; }
    .hero { background:#0f172a; color:#ffffff; text-align:center; padding:36px 20px; }
    .avatar { width:84px; height:84px; border-radius:50%; background:#ffffff; color:#0f172a; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:32px; margin:0 auto 12px; }
    .title { font-size:22px; margin:0 0 8px; }
    .subtitle { font-size:14px; color:rgba(255,255,255,0.85); margin:0; }
    .content { padding:28px 24px; color:#333333; font-size:15px; line-height:1.5; text-align:center; }
    .cta { display:inline-block; margin-top:18px; padding:12px 28px; background:#0f172a; color:#fff; text-decoration:none; border-radius:999px; font-weight:700; }
    .meta { margin-top:18px; font-size:13px; color:#7b7f88; }
    .footer { padding:18px 20px; text-align:center; font-size:12px; color:#9aa0ab; background:#fafafa; border-top:1px solid #eee; }
    a { color:inherit; }
    @media only screen and (max-width:480px) {
      .title { font-size:20px; }
      .avatar { width:72px; height:72px; font-size:28px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="card" role="article" aria-label="Bienvenue">
        <div class="header">
          <div class="brand">Ahoé</div>
        </div>

        <div class="hero">
          <div class="avatar">${escapeHtml(initials)}</div>
          <h1 class="title">Bienvenue, ${safeName} !</h1>
        </div>

        <div class="content">
          <a class="cta" href="${appUrl}">Commencer l'aventure →</a>
        </div>

        <div class="footer">
          © ${year} Ahoé — Tous droits réservés • Lomé, Togo
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

  const text = [
    `Bienvenue, ${rawName} !`,
  ].join('\n');

  return { html, text };
}

export const sendWelcomeEmail = async (to: string, username: string): Promise<void> => {
  try {
    const { html, text } = buildWelcomeHtml(username);

    await transporter.sendMail({
      from: `"Ahoé" <${process.env.SMTP_FROM || 'noreply@ahoe.tg'}>`,
      to,
      subject: `Bienvenue chez Ahoé, ${username} !`,
      text,
      html
    });

    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error('Welcome email sending failed:', error);
    throw new Error('Échec d\'envoi de l\'email de bienvenue');
  }
};

function buildOtpHtml(otp: string, purpose = 'votre code de vérification', minutes = 10): { html: string; text: string } {
  const safeOtp = escapeHtml(otp);
  const appUrl = escapeHtml(process.env.APP_URL || 'https://ahoe.tg');
  const supportEmail = escapeHtml(process.env.SUPPORT_EMAIL || 'support@ahoe.tg');
  const year = new Date().getFullYear();

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; padding:0; background:#f4f6fb; font-family: Arial, Helvetica, sans-serif; color:#111; }
    .wrap { width:100%; padding:28px 12px; }
    .box { max-width:520px; margin:0 auto; background:#fff; border-radius:12px; padding:22px; border:1px solid #eceff4; text-align:center; }
    .pre { font-size:13px; color:#7b7f88; margin-bottom:14px; }
    .otp { display:inline-block; font-size:28px; letter-spacing:6px; background:#0f172a; color:#fff; padding:12px 20px; border-radius:10px; font-weight:800; margin:10px 0; }
    .info { font-size:14px; color:#333; margin-top:12px; }
    .cta { display:inline-block; margin-top:18px; padding:10px 20px; background:#0f172a; color:#fff; text-decoration:none; border-radius:8px; font-weight:700; }
    .footer { font-size:12px; color:#9aa0ab; margin-top:18px; }
    @media only screen and (max-width:480px) { .otp { font-size:24px; letter-spacing:4px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box" role="article" aria-label="Code OTP">
      <div class="pre">Voici ${escapeHtml(purpose)}</div>
      <div class="otp" aria-hidden="true">${safeOtp}</div>
      <div class="info">Ce code expirera dans ${minutes} minutes. Ne le partagez pas.</div>
      <a class="cta" href="${appUrl}">Aller sur Ahoé</a>
      <div class="footer">Support : <a href="mailto:${supportEmail}">${supportEmail}</a> • © ${year} Ahoé</div>
    </div>
  </div>
</body>
</html>
`.trim();

  const text = [
    `Code: ${otp}`,
    '',
    `But: ${purpose}`,
    `Expire dans: ${minutes} minutes`,
    '',
    `Si ce n'est pas vous, ignorez ce message.`,
    '',
    `Support: ${supportEmail}`,
    `Site: ${appUrl}`,
    `© ${year} Ahoé`
  ].join('\n');

  return { html, text };
}

export const sendOtpEmail = async (
  to: string,
  otp: string,
  options?: { minutes?: number; purpose?: string; subject?: string }
): Promise<void> => {
  try {
    const minutes = options?.minutes ?? 10;
    const purpose = options?.purpose ?? 'votre code de vérification';
    const subject = options?.subject ?? `Votre code de vérification (${minutes} min)`;

    const { html, text } = buildOtpHtml(otp, purpose, minutes);

    await transporter.sendMail({
      from: `"Ahoé" <${process.env.SMTP_FROM || 'noreply@ahoe.tg'}>`,
      to,
      subject,
      text,
      html
    });

    console.log(`OTP email sent to ${to}`);
  } catch (err) {
    console.error('OTP email sending failed:', err);
    throw new Error('Échec d\'envoi de l\'OTP');
  }
}

/* helper générique pour invitations de rôle (super admin / admin / autre) */
async function sendRoleInviteEmail(
  to: string,
  rawPassword: string,
  roleLabel: string,
  options?: { otp?: string; appUrl?: string; supportEmail?: string; subject?: string }
): Promise<void> {
  try {
    const appUrl = escapeHtml(options?.appUrl ?? process.env.APP_URL ?? 'https://ahoe.tg');
    const supportEmail = escapeHtml(options?.supportEmail ?? process.env.SUPPORT_EMAIL ?? 'support@ahoe.tg');
    const safePwd = escapeHtml(rawPassword);
    const otp = options?.otp ? escapeHtml(options.otp) : null;
    const year = new Date().getFullYear();
    const subject = options?.subject ?? `Ahoé — Accès ${roleLabel} créé`;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111}
    .wrap{padding:28px 12px}
    .card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #eceff4}
    .brand{display:inline-block;padding:6px 14px;border-radius:20px;background:#eef2ff;color:#2b22d8;font-weight:700}
    h1{font-size:20px;margin:18px 0 6px}
    p{color:#334155;line-height:1.5}
    .cred{display:block;padding:14px 18px;background:#0f172a;color:#fff;border-radius:8px;font-weight:800;font-size:16px;text-align:center;margin:16px 0}
    .note{font-size:13px;color:#6b7280;margin-top:10px}
    .cta{display:inline-block;margin-top:18px;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:700}
    .footer{font-size:12px;color:#9aa0ab;margin-top:18px;text-align:center}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card" role="article" aria-label="Invitation ${escapeHtml(roleLabel)}">
      <div style="text-align:center"><span class="brand">Ahoé</span></div>

      <h1>Accès ${escapeHtml(roleLabel)} créé</h1>

      <p>Bonjour,</p>

      <p>Un compte ${escapeHtml(roleLabel)} a été créé pour l'adresse <strong>${escapeHtml(to)}</strong>. Vous pouvez vous connecter en utilisant le mot de passe temporaire ci‑dessous :</p>

      <div class="cred" aria-hidden="true">${safePwd}</div>

      ${otp ? `<p class="note">Un code de vérification (OTP) vous sera envoyé à votre adresse email lors de votre première tentative de connexion : <strong>${otp}</strong></p>` : `<p class="note">Un code de vérification (OTP) vous sera envoyé à votre adresse email lors de votre première tentative de connexion.</p>`}

      <p>Après connexion et vérification de votre email, vous serez invité à compléter votre profil et à définir un nouveau mot de passe.</p>

      <p style="text-align:center">
        <a class="cta" href="${appUrl}">Aller sur Ahoé</a>
      </p>

      <p class="note">Pour des raisons de sécurité, changez ce mot de passe dès votre première connexion.</p>

      <div class="footer">
        Support : <a href="mailto:${supportEmail}">${supportEmail}</a> • © ${year} Ahoé
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

    const text = [
      `Accès ${roleLabel} créé`,
      ``,
      `Bonjour,`,
      ``,
      `Un compte ${roleLabel} a été créé pour : ${to}`,
      ``,
      `Mot de passe temporaire : ${rawPassword}`,
      otp ? `Code OTP : ${options?.otp}` : `Un OTP sera envoyé lors de votre première connexion.`,
      ``,
      `Connectez-vous : ${appUrl}`,
      ``,
      `Changez votre mot de passe dès la première connexion.`,
      ``,
      `Support: ${supportEmail}`,
      `© ${year} Ahoé`
    ].join('\n');

    await transporter.sendMail({
      from: `"Ahoé" <${process.env.SMTP_FROM || 'noreply@ahoe.tg'}>`,
      to,
      subject,
      text,
      html
    });

    console.log(`${roleLabel} invite email sent to ${to}`);
  } catch (err) {
    console.error(`${roleLabel} invite email sending failed:`, err);
    throw new Error(`Échec d'envoi de l'email d'invitation ${roleLabel}`);
  }
}

/* wrappers existants utilisant helper */
export const sendSuperAdminInviteEmail = async (
  to: string,
  rawPassword: string,
  options?: { otp?: string; appUrl?: string; supportEmail?: string }
): Promise<void> => {
  return sendRoleInviteEmail(to, rawPassword, 'Super Admin', options);
};

export const sendAdminInviteEmail = async (
  to: string,
  rawPassword: string,
  options?: { otp?: string; appUrl?: string; supportEmail?: string }
): Promise<void> => {
  return sendRoleInviteEmail(to, rawPassword, 'Admin', options);
};