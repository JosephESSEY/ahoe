import { AuthRepository } from './auth.repository';
import {
  RegisterDTO,
  LoginDTO,
  SocialAuthDTO,
  VerifyEmailDTO,
  VerifyPhoneDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
  TokenResponse,
  User,
  UserStatus,
  RoleType,
  VerificationType
} from './auth.model';
import {
  hashPassword,
  comparePassword,
  generateSalt
} from '../../shared/utils/password.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../../shared/utils/jwt.utils';
import { generateOtp } from '../../shared/utils/generateOtp.utils';
import { sendEmail } from '../../shared/utils/sendEmail';
import { sendSMS } from '../../shared/utils/sendSms';
import crypto from 'crypto';

import { generateAuthTokens } from './helpers/generateAuthTokens.helper';
import { Permission } from '../../shared/permissions/permissions';

export class AuthService {
  private repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  async register(data: RegisterDTO): Promise<TokenResponse> {
    console.log("Register data:", data);
    const existingEmail = await this.repo.findUserByEmail(data.email);
    console.log("Existing email check:", existingEmail);
    if (existingEmail) {
      throw { statusCode: 400, message: 'Cet email est déjà utilisé' };
    }

    const existingPhone = await this.repo.findUserByPhone(data.phone);
    if (existingPhone) {
      throw { statusCode: 400, message: 'Ce numéro de téléphone est déjà utilisé' };
    }

    const hashedPassword = await hashPassword(data.password);

    const role_id = await this.repo.getOrCreateRole(RoleType.TENANT, "Locataire par défaut");

    const tenantPermissions = [
      Permission.USERS_READ_OWN,
      Permission.USERS_UPDATE_OWN,
      Permission.BOOKINGS_CREATE,
      Permission.BOOKINGS_READ_OWN,
    ];

    for (const permission of tenantPermissions) {
      const permission_id = await this.repo.getOrCreatePermission(permission);
      await this.repo.linkRoleToPermission(role_id, permission_id);
    }


    const user = await this.repo.createUser(data, role_id, hashedPassword);

    await this.repo.createUserProfile(user.id, data);


    // await this.sendEmailVerification(user.id, data.email);

    // await this.sendPhoneVerification(data.phone);

    // Generate tokens
    const tokens = generateAuthTokens(user);

    await this.repo.saveRefreshToken(user.id, tokens.refresh_token, tokens.expiresAt);


    return tokens;
  }


  // ==================== LOGIN ====================

  async login(data: LoginDTO, metadata: {
    ip_address: string;
    user_agent: string;
    device_info: any;
  }): Promise<TokenResponse> {
    // Find user
    const user = await this.repo.findUserByEmailOrPhone(data.identifier);

    if (!user) {
      await this.logFailedLogin(null, metadata, 'Utilisateur introuvable');
      throw { statusCode: 401, message: 'Identifiants invalides' };
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      throw {
        statusCode: 423,
        message: `Compte temporairement bloqué. Réessayez dans ${remainingMinutes} minutes`
      };
    }

    // Check password
    const isPasswordValid = await comparePassword(data.password, user.password!);

    if (!isPasswordValid) {
      // Increment login attempts
      const attempts = await this.repo.incrementLoginAttempts(user.id);

      // Lock account after 5 failed attempts
      if (attempts >= 5) {
        await this.repo.lockUser(user.id, 30); // Lock for 30 minutes
        await this.logFailedLogin(user.id, metadata, 'Trop de tentatives - compte bloqué');
        throw {
          statusCode: 423,
          message: 'Trop de tentatives échouées. Compte bloqué pour 30 minutes'
        };
      }

      await this.logFailedLogin(user.id, metadata, 'Mot de passe incorrect');
      throw {
        statusCode: 401,
        message: `Mot de passe incorrect. ${5 - attempts} tentatives restantes`
      };
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw { statusCode: 403, message: 'Compte suspendu. Contactez le support' };
    }
    if (user.status === UserStatus.DELETED) {
      throw { statusCode: 403, message: 'Compte supprimé' };
    }

    // Update last login
    await this.repo.updateLastLogin(user.id);

    // Log successful login
    await this.repo.saveLoginHistory({
      user_id: user.id,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      device_info: metadata.device_info,
      success: true
    });

    // Generate tokens
    const tokens = await generateAuthTokens(user, data.remember_me);

    return tokens;
  }

  private async logFailedLogin(
    userId: string | null,
    metadata: any,
    reason: string
  ): Promise<void> {
    if (userId) {
      await this.repo.saveLoginHistory({
        user_id: userId,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        device_info: metadata.device_info,
        success: false,
        failure_reason: reason
      });
    }
  }

  // ==================== SOCIAL AUTH ====================

  async socialAuth(data: SocialAuthDTO): Promise<TokenResponse> {
    // Verify token with provider
    const socialUser = await this.verifySocialToken(data);

    // Find or create user
    let user = await this.repo.findUserByEmail(socialUser.email);

    if (!user) {
      // Create new user from social data
      const registerData: RegisterDTO = {
        email: socialUser.email,
        phone: socialUser.phone || '', // May need to be collected separately
        password: crypto.randomBytes(32).toString('hex'), // Random password
        first_name: socialUser.first_name,
        last_name: socialUser.last_name,
        preferred_language: 'fr'
      };

      // user = await this.repo.createUser(registerData, await hashPassword(registerData.password));
      // await this.repo.createUserProfile(user.id, registerData);

      // Auto-verify email for social accounts
      // await this.repo.updateEmailVerification(user.id);
    }

    // Generate tokens
    const tokens = await generateAuthTokens(user!);

    return tokens;
  }

  private async verifySocialToken(data: SocialAuthDTO): Promise<any> {
    // Implementation depends on provider
    // For Google, verify with Google OAuth API
    // For Facebook, verify with Facebook Graph API
    throw new Error('Social auth not fully implemented');
  }

  // ==================== TOKEN MANAGEMENT ====================

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find token in database
    const tokenRecord = await this.repo.findRefreshToken(refreshToken);

    if (!tokenRecord) {
      throw { statusCode: 401, message: 'Refresh token invalide' };
    }

    // Find user
    const user = await this.repo.findUserById(tokenRecord.user_id);

    if (!user) {
      throw { statusCode: 401, message: 'Utilisateur introuvable' };
    }

    // Revoke old token
    const newRefreshToken = generateRefreshToken(user.id, false);
    await this.repo.revokeRefreshToken(tokenRecord.id, newRefreshToken);

    // Save new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.repo.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.role);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 900, // 15 minutes
      token_type: 'Bearer',
      expiresAt: expiresAt};
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific token
      const tokenRecord = await this.repo.findRefreshToken(refreshToken);
      if (tokenRecord) {
        await this.repo.revokeRefreshToken(tokenRecord.id);
      }
    } else {
      // Revoke all tokens
      await this.repo.revokeAllUserTokens(userId);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.repo.revokeAllUserTokens(userId);
  }

  // ==================== EMAIL VERIFICATION ====================

  async sendEmailVerification(userId: string, email: string): Promise<void> {
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token
    await this.repo.createVerificationToken(userId, token, VerificationType.EMAIL, expiresAt);

    // Send email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Vérifiez votre email - TogoLocation',
      template: 'email-verification',
      context: {
        verificationUrl,
        expiresIn: '24 heures'
      }
    });
  }

  async verifyEmail(data: VerifyEmailDTO): Promise<void> {
    // Find token
    const tokenRecord = await this.repo.findVerificationToken(data.token, VerificationType.EMAIL);

    if (!tokenRecord) {
      throw { statusCode: 400, message: 'Token de vérification invalide ou expiré' };
    }

    // Update user
    await this.repo.updateEmailVerification(tokenRecord.user_id);

    // Mark token as used
    await this.repo.markTokenAsUsed(tokenRecord.id);

    // Send welcome email
    const user = await this.repo.findUserById(tokenRecord.user_id);
    if (user) {
      await sendEmail({
        to: user.email,
        subject: 'Bienvenue sur TogoLocation!',
        template: 'welcome',
        context: {
          firstName: (await this.repo.findUserProfile(user.id))?.first_name
        }
      });
    }
  }

  async resendEmailVerification(userId: string): Promise<void> {
    const user = await this.repo.findUserById(userId);

    if (!user) {
      throw { statusCode: 404, message: 'Utilisateur introuvable' };
    }

    if (user.email_verified) {
      throw { statusCode: 400, message: 'Email déjà vérifié' };
    }

    await this.sendEmailVerification(userId, user.email);
  }

  // ==================== PHONE VERIFICATION ====================

  async sendPhoneVerification(phone: string): Promise<void> {
    // Generate OTP
    const { otp, expiration } = generateOtp();

    // Save OTP
    await this.repo.saveOtp(phone, otp, expiration);

    // Send SMS
    await sendSMS({
      to: phone,
      message: `Votre code de vérification TogoLocation est: ${otp}. Valide pendant 10 minutes.`
    });
  }

  async verifyPhone(data: VerifyPhoneDTO): Promise<void> {
    // Find OTP
    const otpRecord = await this.repo.findOtp(data.phone);

    if (!otpRecord) {
      throw { statusCode: 400, message: 'Code OTP invalide ou expiré' };
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      await this.repo.deleteOtp(data.phone);
      throw { statusCode: 429, message: 'Trop de tentatives. Demandez un nouveau code' };
    }

    // Verify code
    if (otpRecord.code !== data.code) {
      await this.repo.incrementOtpAttempts(data.phone);
      const remainingAttempts = 3 - (otpRecord.attempts + 1);
      throw {
        statusCode: 400,
        message: `Code incorrect. ${remainingAttempts} tentatives restantes`
      };
    }

    // Find user by phone
    const user = await this.repo.findUserByPhone(data.phone);
    if (!user) {
      throw { statusCode: 404, message: 'Utilisateur introuvable' };
    }

    // Update user
    await this.repo.updatePhoneVerification(user.id);

    // Delete OTP
    await this.repo.deleteOtp(data.phone);
  }

  async resendPhoneVerification(phone: string): Promise<void> {
    const user = await this.repo.findUserByPhone(phone);

    if (!user) {
      throw { statusCode: 404, message: 'Numéro de téléphone introuvable' };
    }

    if (user.phone_verified) {
      throw { statusCode: 400, message: 'Téléphone déjà vérifié' };
    }

    await this.sendPhoneVerification(phone);
  }

  // ==================== PASSWORD RESET ====================

  async forgotPassword(data: ForgotPasswordDTO): Promise<void> {
    // Find user
    const user = await this.repo.findUserByEmailOrPhone(data.identifier);

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token
    await this.repo.createVerificationToken(
      user.id,
      token,
      VerificationType.PASSWORD_RESET,
      expiresAt
    );

    // Determine if identifier is email or phone
    const isEmail = data.identifier.includes('@');

    if (isEmail) {
      // Send email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: 'Réinitialisation de mot de passe - TogoLocation',
        template: 'password-reset',
        context: {
          resetUrl,
          expiresIn: '1 heure'
        }
      });
    } else {
      // Send SMS with OTP instead of URL
      const { otp, expiration } = generateOtp();
      await this.repo.saveOtp(user.phone, otp, expiration);
      await sendSMS({
        to: user.phone,
        message: `Votre code de réinitialisation TogoLocation: ${otp}. Valide 10 minutes.`
      });
    }
  }

  async resetPassword(data: ResetPasswordDTO): Promise<void> {
    // Find token
    const tokenRecord = await this.repo.findVerificationToken(
      data.token,
      VerificationType.PASSWORD_RESET
    );

    if (!tokenRecord) {
      throw { statusCode: 400, message: 'Lien de réinitialisation invalide ou expiré' };
    }

    // Validate new password
    await this.validatePassword(data.new_password);

    // Hash new password
    const hashedPassword = await hashPassword(data.new_password);

    // Update password
    await this.repo.updateUserPassword(tokenRecord.user_id, hashedPassword);

    // Mark token as used
    await this.repo.markTokenAsUsed(tokenRecord.id);

    // Revoke all refresh tokens (force re-login everywhere)
    await this.repo.revokeAllUserTokens(tokenRecord.user_id);

    // Send confirmation email
    const user = await this.repo.findUserById(tokenRecord.user_id);
    if (user) {
      await sendEmail({
        to: user.email,
        subject: 'Mot de passe modifié - TogoLocation',
        template: 'password-changed',
        context: {}
      });
    }
  }

  async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
    // Find user
    const user = await this.repo.findUserById(userId);

    if (!user) {
      throw { statusCode: 404, message: 'Utilisateur introuvable' };
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(data.current_password, user.password!);

    if (!isCurrentPasswordValid) {
      throw { statusCode: 401, message: 'Mot de passe actuel incorrect' };
    }

    // Validate new password
    await this.validatePassword(data.new_password);

    // Ensure new password is different
    const isSamePassword = await comparePassword(data.new_password, user.password!);
    if (isSamePassword) {
      throw { statusCode: 400, message: 'Le nouveau mot de passe doit être différent' };
    }

    // Hash new password
    const hashedPassword = await hashPassword(data.new_password);

    // Update password
    await this.repo.updateUserPassword(userId, hashedPassword);

    // Revoke all refresh tokens except current session (optional)
    // await this.repo.revokeAllUserTokens(userId);

    // Send notification email
    await sendEmail({
      to: user.email,
      subject: 'Mot de passe modifié - TogoLocation',
      template: 'password-changed',
      context: {}
    });
  }

  private async validatePassword(password: string): Promise<void> {
    if (password.length < 8) {
      throw { statusCode: 400, message: 'Le mot de passe doit contenir au moins 8 caractères' };
    }
    if (!/[A-Z]/.test(password)) {
      throw { statusCode: 400, message: 'Le mot de passe doit contenir au moins une majuscule' };
    }
    if (!/[a-z]/.test(password)) {
      throw { statusCode: 400, message: 'Le mot de passe doit contenir au moins une minuscule' };
    }
    if (!/[0-9]/.test(password)) {
      throw { statusCode: 400, message: 'Le mot de passe doit contenir au moins un chiffre' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw { statusCode: 400, message: 'Le mot de passe doit contenir au moins un caractère spécial' };
    }
  }

  // ==================== USER MANAGEMENT ====================

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.repo.updateFcmToken(userId, fcmToken);
  }

  async getLoginHistory(userId: string, limit: number = 10): Promise<any[]> {
    return await this.repo.getUserLoginHistory(userId, limit);
  }

  // ==================== HELPER METHODS ====================

}