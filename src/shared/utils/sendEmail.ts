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
      from: `"Ahoé" <${process.env.SMTP_FROM || 'noreply@ahoé.tg'}>`,
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