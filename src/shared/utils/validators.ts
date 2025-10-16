// src/shared/utils/validators.ts
export const getMissingFields = (data: any, requiredFields: string[]): string[] => {
  return requiredFields.filter(field => !data[field]);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

export const isStrongPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Minimum 8 caractères' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Au moins une majuscule' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Au moins une minuscule' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Au moins un chiffre' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Au moins un caractère spécial' };
  }
  return { valid: true };
};