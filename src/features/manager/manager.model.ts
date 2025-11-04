export interface Role {
    role_id?: string;
    role_name: string;
    role_description:  string;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface Permission {
    permission_id: string;
    permission_name: string;
    created_at?: Date;
}

export interface Role_Permission {
    role_id: string;
    permission_id: string;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  password_hash?: string;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  fcm_token?: string | null;
  last_login?: Date;
  login_attempts: number;
  locked_until?: Date | null;
  created_at: Date;
  updated_at: Date;
  role: string;
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification'
}


export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum RoleType {
  TENANT = 'tenant',
  LANDLORD = 'landlord',
  AGENT = 'agent',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
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

export interface RegisterDTO {
  email?: string;
  phone?: string | null;
  password?: string | null;
  first_name?: string;
  last_name?: string;
  preferred_language?: string;
  referral_code?: string;
  token?: string;
}

export interface LoginDTO {
  identifier: string;
  password: string;
  remember_me?: boolean;
}

export interface SocialAuthDTO {
  provider: 'google' | 'facebook';
  access_token: string;
  id_token?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  expiresAt: Date;
}

export enum OtpChannel {
  EMAIL = 'email',
  PHONE = 'phone'
}

export interface OtpCode {
  id: string;
  user_id?: string | null;
  channel: OtpChannel;
  target: string;               
  code: string;                  
  purpose?: string;              
  attempts: number;
  max_attempts: number;
  used: boolean;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}
