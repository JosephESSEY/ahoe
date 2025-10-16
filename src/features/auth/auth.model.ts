export interface User {
  id: string;
  email: string;
  phone: string;
  password?: string;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  role: string;
  fcm_token?: string | null;
  last_login?: Date;
  login_attempts: number;
  locked_until?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification'
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  date_of_birth?: Date | null;
  gender?: Gender | null;
  profession?: string | null;
  bio?: string | null;
  preferred_language: string;
  notification_preferences: NotificationPreferences;
  created_at: Date;
  updated_at: Date;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_type: RoleType;
  is_verified: boolean;
  verification_documents: any[];
  business_license?: string | null;
  tax_number?: string | null;
  verified_at?: Date | null;
  verified_by?: string | null;
  created_at: Date;
}

export enum RoleType {
  TENANT = 'tenant',
  LANDLORD = 'landlord',
  AGENT = 'agent',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface OtpCode {
  phone: string;
  code: string;
  expires_at: Date;
  attempts: number;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  revoked_at?: Date | null;
  replaced_by?: string | null;
}

export interface VerificationToken {
  id: string;
  user_id: string;
  token: string;
  type: VerificationType;
  expires_at: Date;
  used_at?: Date | null;
  created_at: Date;
}

export enum VerificationType {
  EMAIL = 'email',
  PHONE = 'phone',
  PASSWORD_RESET = 'password_reset'
}

export interface LoginHistory {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  location?: any;
  success: boolean;
  failure_reason?: string | null;
  created_at: Date;
}

// DTOs (Data Transfer Objects)
export interface RegisterDTO {
  email: string;
  phone: string;
  password: string;
  first_name: string;
  last_name: string;
  role_type: RoleType;
  preferred_language?: string;
  referral_code?: string;
}

export interface LoginDTO {
  identifier: string; // Email ou téléphone
  password: string;
  remember_me?: boolean;
}

export interface SocialAuthDTO {
  provider: 'google' | 'facebook';
  access_token: string;
  id_token?: string;
}

export interface VerifyEmailDTO {
  token: string;
}

export interface VerifyPhoneDTO {
  phone: string;
  code: string;
}

export interface ForgotPasswordDTO {
  identifier: string; // Email ou téléphone
}

export interface ResetPasswordDTO {
  token: string;
  new_password: string;
}

export interface ChangePasswordDTO {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileDTO {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  date_of_birth?: Date;
  gender?: Gender;
  profession?: string;
  bio?: string;
  preferred_language?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  phone: string;
  profile: UserProfile;
  roles: UserRole[];
  email_verified: boolean;
  phone_verified: boolean;
  status: UserStatus;
}