import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SMSOptions {
  to: string;
  message: string;
}

export const sendSMS = async (options: SMSOptions): Promise<void> => {
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
      body: options.message
    });

    console.log(`SMS sent to ${options.to}`);
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error('Échec d\'envoi du SMS');
  }
};