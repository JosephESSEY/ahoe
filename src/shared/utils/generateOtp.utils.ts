// src/shared/utils/generateOtp.ts
export const generateOtp = (): { otp: string; expiration: Date } => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration to 10 minutes from now
  const expiration = new Date(Date.now() + 10 * 60 * 1000);
  
  return { otp, expiration };
};

export default generateOtp;