import db from '../../shared/database/client';
import {
  User,
  UserProfile,
  UserRole,
  OtpCode,
  RefreshToken,
  VerificationToken,
  LoginHistory,
  RegisterDTO,
  UserStatus,
  RoleType,
  VerificationType
} from './auth.model';

export class AuthRepository {
  
  // ==================== USERS ====================
  
  async createUser(data: RegisterDTO, hashedPassword: string): Promise<User> {
    const query = `
      INSERT INTO users (email, phone, password, status, email_verified, phone_verified, role, login_attempts)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      data.email,
      data.phone,
      hashedPassword,
      UserStatus.PENDING_VERIFICATION,
      false,
      false,
      data.role_type,
      0
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE phone = $1`;
    const result = await db.query(query, [phone]);
    return result.rows[0] || null;
  }

  async findUserByEmailOrPhone(identifier: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE email = $1 OR phone = $1
    `;
    const result = await db.query(query, [identifier]);
    return result.rows[0] || null;
  }

  async findUserById(userId: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    const query = `
      UPDATE users 
      SET password = $1, updated_at = NOW() 
      WHERE id = $2
    `;
    await db.query(query, [hashedPassword, userId]);
  }

  async updateEmailVerification(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET email_verified = TRUE, 
          status = CASE 
            WHEN phone_verified = TRUE THEN 'active'::user_status 
            ELSE status 
          END,
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  async updatePhoneVerification(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET phone_verified = TRUE,
          status = CASE 
            WHEN email_verified = TRUE THEN 'active'::user_status 
            ELSE status 
          END,
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login = NOW(), login_attempts = 0, updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  async incrementLoginAttempts(userId: string): Promise<number> {
    const query = `
      UPDATE users 
      SET login_attempts = login_attempts + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING login_attempts
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0]?.login_attempts || 0;
  }

  async lockUser(userId: string, lockDuration: number): Promise<void> {
    const query = `
      UPDATE users 
      SET locked_until = NOW() + INTERVAL '${lockDuration} minutes',
          updated_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [userId]);
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    const query = `
      UPDATE users 
      SET fcm_token = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await db.query(query, [fcmToken, userId]);
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const query = `
      UPDATE users 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await db.query(query, [status, userId]);
  }

  // ==================== USER PROFILES ====================

  async createUserProfile(userId: string, data: RegisterDTO): Promise<UserProfile> {
    const query = `
      INSERT INTO user_profiles 
      (user_id, first_name, last_name, preferred_language, notification_preferences)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      userId,
      data.first_name,
      data.last_name,
      data.preferred_language || 'fr',
      JSON.stringify({ email: true, sms: false, push: true, marketing: false })
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findUserProfile(userId: string): Promise<UserProfile | null> {
    const query = `SELECT * FROM user_profiles WHERE user_id = $1`;
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE user_profiles 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // ==================== USER ROLES ====================

  async createUserRole(userId: string, roleType: RoleType): Promise<UserRole> {
    const query = `
      INSERT INTO user_roles (user_id, role_type, is_verified)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const isVerified = roleType === RoleType.TENANT; // Auto-verify tenants
    const result = await db.query(query, [userId, roleType, isVerified]);
    return result.rows[0];
  }

  async findUserRoles(userId: string): Promise<UserRole[]> {
    const query = `SELECT * FROM user_roles WHERE user_id = $1`;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  async updateRoleVerification(
    userId: string, 
    roleType: RoleType, 
    isVerified: boolean,
    verifiedBy?: string
  ): Promise<void> {
    const query = `
      UPDATE user_roles 
      SET is_verified = $1, 
          verified_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END,
          verified_by = $2
      WHERE user_id = $3 AND role_type = $4
    `;
    await db.query(query, [isVerified, verifiedBy, userId, roleType]);
  }

  // ==================== OTP CODES ====================

  async saveOtp(phone: string, code: string, expiresAt: Date): Promise<void> {
    const query = `
      INSERT INTO otp_codes (phone, code, expires_at, attempts)
      VALUES ($1, $2, $3, 0)
      ON CONFLICT (phone) 
      DO UPDATE SET code = $2, expires_at = $3, attempts = 0
    `;
    await db.query(query, [phone, code, expiresAt]);
  }

  async findOtp(phone: string): Promise<OtpCode | null> {
    const query = `
      SELECT * FROM otp_codes 
      WHERE phone = $1 AND expires_at > NOW()
    `;
    const result = await db.query(query, [phone]);
    return result.rows[0] || null;
  }

  async incrementOtpAttempts(phone: string): Promise<number> {
    const query = `
      UPDATE otp_codes 
      SET attempts = attempts + 1
      WHERE phone = $1
      RETURNING attempts
    `;
    const result = await db.query(query, [phone]);
    return result.rows[0]?.attempts || 0;
  }

  async deleteOtp(phone: string): Promise<void> {
    const query = `DELETE FROM otp_codes WHERE phone = $1`;
    await db.query(query, [phone]);
  }

  // ==================== VERIFICATION TOKENS ====================

  async createVerificationToken(
    userId: string, 
    token: string, 
    type: VerificationType,
    expiresAt: Date
  ): Promise<VerificationToken> {
    const query = `
      INSERT INTO verification_tokens (user_id, token, type, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [userId, token, type, expiresAt]);
    return result.rows[0];
  }

  async findVerificationToken(token: string, type: VerificationType): Promise<VerificationToken | null> {
    const query = `
      SELECT * FROM verification_tokens 
      WHERE token = $1 AND type = $2 AND expires_at > NOW() AND used_at IS NULL
    `;
    const result = await db.query(query, [token, type]);
    return result.rows[0] || null;
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    const query = `
      UPDATE verification_tokens 
      SET used_at = NOW()
      WHERE id = $1
    `;
    await db.query(query, [tokenId]);
  }

  async deleteExpiredTokens(): Promise<void> {
    const query = `
      DELETE FROM verification_tokens 
      WHERE expires_at < NOW() OR used_at IS NOT NULL
    `;
    await db.query(query);
  }

  // ==================== REFRESH TOKENS ====================

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = $1 AND expires_at > NOW() AND revoked_at IS NULL
    `;
    const result = await db.query(query, [token]);
    return result.rows[0] || null;
  }

  async revokeRefreshToken(tokenId: string, replacedBy?: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW(), replaced_by = $1
      WHERE id = $2
    `;
    await db.query(query, [replacedBy, tokenId]);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `;
    await db.query(query, [userId]);
  }

  // ==================== LOGIN HISTORY ====================

  async saveLoginHistory(data: {
    user_id: string;
    ip_address: string;
    user_agent: string;
    device_info: any;
    location?: any;
    success: boolean;
    failure_reason?: string;
  }): Promise<LoginHistory> {
    const query = `
      INSERT INTO login_history 
      (user_id, ip_address, user_agent, device_info, location, success, failure_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.user_id,
      data.ip_address,
      data.user_agent,
      JSON.stringify(data.device_info),
      data.location ? JSON.stringify(data.location) : null,
      data.success,
      data.failure_reason
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getUserLoginHistory(userId: string, limit: number = 10): Promise<LoginHistory[]> {
    const query = `
      SELECT * FROM login_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }
}