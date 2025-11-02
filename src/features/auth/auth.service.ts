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
  VerificationType,
  OtpChannel
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
import { sendEmail, sendWelcomeEmail, sendOtpEmail } from '../../shared/utils/sendEmail';
import { sendSMS } from '../../shared/utils/sendSms';
import crypto from 'crypto';

import { generateAuthTokens } from './helpers/generateAuthTokens.helper';
import { Permission } from '../../shared/permissions/permissions';

import { verifyGoogleToken, GoogleUserData } from './helpers/google.helper';

export class AuthService {
  private repo: AuthRepository;

  constructor() {
    this.repo = new AuthRepository();
  }

  async register(data: RegisterDTO, method: string): Promise<TokenResponse | any> {
    let user: User | null = null;

    if (method === 'google') {
      const googleData = await verifyGoogleToken(data.token!);

      user = await this.repo.findUserByEmail(googleData.email);

      if (!user) {
        const role_id = await this.repo.getOrCreateRole(RoleType.TENANT, 'Locataire');

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

        user = await this.repo.createUser(
          {
            email: googleData.email,
            password: "",
            phone: "",
          },
          role_id,
          ""
        );

        await this.repo.createUserProfile(user.id, {
          first_name: googleData.first_name,
          last_name: googleData.last_name,
          preferred_language: 'fr'
        });

        await this.repo.updateEmailVerification(user.id);
        await this.repo.updateUserStatus(user.id, UserStatus.ACTIVE);
        await sendWelcomeEmail(googleData.email, googleData.first_name);

      }

      const tokens = generateAuthTokens(user);
      await this.repo.saveRefreshToken(user.id, tokens.refresh_token, tokens.expiresAt);
      return tokens;
    }

    else{
      if (data.email) {
        const existingEmail = await this.repo.findUserByEmail(data.email);
        if (existingEmail) throw { statusCode: 400, message: 'Cet email est déjà utilisé' };
      } else if (data.phone) {
        const existingPhone = await this.repo.findUserByPhone(data.phone);
        if (existingPhone) throw { statusCode: 400, message: 'Ce numéro de téléphone est déjà utilisé' };
      }

      const hashedPassword = await hashPassword(data.password!);
      const role_id = await this.repo.getOrCreateRole(RoleType.TENANT, 'Locataire');

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

      user = await this.repo.createUser(data, role_id, hashedPassword);
      await this.repo.createUserProfile(user.id, data);
      const {otp, expiration} = generateOtp();

      if (method === 'email' && data.email){
        await this.repo.saveOtp(data.email!, OtpChannel.EMAIL, otp, expiration, user.id);
        await sendOtpEmail(data.email!, otp, {
          purpose: 'votre code de vérification',
          minutes: 10,
          subject: 'Votre code de vérification (10 min)'
        });
      }else if (method === 'phone' && data.phone){
        await this.repo.saveOtp(data.phone!, OtpChannel.PHONE, otp, expiration, user.id);
      }

      if (!user.email_verified && method === 'email' && data.email) {
        return { success: true, message: 'Un OTP vous a été envoyé. Veuillez le valider.', nextAllowedAt: new Date(Date.now() + 60_000) };
      }else if( !user.phone_verified && method === 'phone' && data.phone){
        return { success: true, message: 'Un OTP vous a été envoyé. Veuillez le valider.', nextAllowedAt: new Date(Date.now() + 60_000) };
      }else{
        const tokens = generateAuthTokens(user);
        await this.repo.saveRefreshToken(user.id, tokens.refresh_token, tokens.expiresAt);
        return tokens;
      }

    }
  }

  async login(data: LoginDTO, metadata: {
    ip_address: string;
    user_agent: string;
    device_info: any;
  }): Promise<TokenResponse> {
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

    if(user.password_hash === null){
      await this.logFailedLogin(user.id, metadata, 'Ce compte utilise une authentification google');
      throw { statusCode: 401, message: 'Identifiants invalides' };
    }

    // Check password
    const isPasswordValid = await comparePassword(data.password, user.password_hash!);

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
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw { statusCode: 403, message: 'Veuillez vérifier votre compte' };
    }

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
    await this.repo.saveRefreshToken(user.id, tokens.refresh_token, tokens.expiresAt);

    return tokens;
  }

  async loginWithGoogle(token: string, metadata: {
    ip_address: string;
    user_agent: string;
    device_info: any;
  }): Promise<TokenResponse> {
    const googleData = await verifyGoogleToken(token);
    let user = await this.repo.findUserByEmail(googleData.email);

    if (!user) {
        const role_id = await this.repo.getOrCreateRole(RoleType.TENANT, 'Locataire');
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

        user = await this.repo.createUser(
          {
            email: googleData.email,
            password: "",
            phone: "",
          },
          role_id,
          ""
        );

        await this.repo.createUserProfile(user.id, {
          first_name: googleData.first_name,
          last_name: googleData.last_name,
          preferred_language: 'fr'
        });

        await this.repo.updateEmailVerification(user.id);
        await this.repo.updateUserStatus(user.id, UserStatus.ACTIVE);
        await this.repo.updateLastLogin(user.id);
        // Log successful login
        await this.repo.saveLoginHistory({
          user_id: user.id,
          ip_address: metadata.ip_address,
          user_agent: metadata.user_agent,
          device_info: metadata.device_info,
          success: true
        });
        await sendWelcomeEmail(googleData.email, googleData.first_name);
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
    const tokens = await generateAuthTokens(user);
    await this.repo.saveRefreshToken(user.id, tokens.refresh_token, tokens.expiresAt);
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

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {

    const decoded = verifyRefreshToken(refreshToken);

    const tokenRecord = await this.repo.findRefreshToken(refreshToken);

    if (!tokenRecord) {
      throw { statusCode: 401, message: 'Refresh token invalide' };
    }

    const user = await this.repo.findUserById(tokenRecord.user_id);


    if (!user) {
      throw { statusCode: 401, message: 'Utilisateur introuvable' };
    }

    const newRefreshToken = generateRefreshToken(user.id, false);
    await this.repo.revokeRefreshToken(tokenRecord.id, newRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    const accessToken = generateAccessToken(user.id, user.email, user.phone, user.role);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 900,
      token_type: 'Bearer',
      expiresAt: expiresAt};
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenRecord = await this.repo.findRefreshToken(refreshToken);
      if (tokenRecord) {
        await this.repo.revokeRefreshToken(tokenRecord.id);
      }
    } else {
      await this.repo.revokeAllUserTokens(userId);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.repo.revokeAllUserTokens(userId);
  }

  async resendOtp(userId: string, channel: OtpChannel): Promise<void> {
  const user = await this.repo.findUserById(userId);
  if (!user) {
    throw { statusCode: 404, message: 'Utilisateur introuvable.' };
  }

  const target = channel === OtpChannel.EMAIL ? user.email : user.phone;
  if (!target) {
    throw { statusCode: 400, message: `L'utilisateur n'a pas de ${channel === OtpChannel.EMAIL ? 'email' : 'téléphone'} enregistré.` };
  }

  const lastOtp = await this.repo.findLastOtpByTarget(target, channel);
  if (lastOtp?.updated_at) {
    const diffMs = Date.now() - new Date(lastOtp.updated_at).getTime();
    const cooldown = 60_000;
    if (diffMs < cooldown) {
      const remaining = Math.ceil((cooldown - diffMs) / 1000);
      throw {
        statusCode: 429,
        message: `Veuillez patienter ${remaining} seconde${remaining > 1 ? 's' : ''} avant de renvoyer un OTP.`
      };
    }
  }

  const { otp, expiration } = generateOtp();

  await this.repo.saveOtp(target, channel, otp, expiration, userId);

  if (channel === OtpChannel.EMAIL) {
    await sendOtpEmail(target, otp, {
      purpose: 'votre code de vérification',
      minutes: 10,
      subject: 'Votre code de vérification (10 min)'
    });
  } else if (channel === OtpChannel.PHONE) {
    await sendSMS({
      to: target,
      message: `Votre code de vérification TogoLocation : ${otp}. Valide 10 minutes.`
    });
  }
}

  async forgotPassword(data: ForgotPasswordDTO): Promise<void> {
    const user = await this.repo.findUserByEmailOrPhone(data.identifier); 
    if (!user) {
      throw { statusCode: 404, message: 'Utilisateur introuvable' };
    }
    const isEmail = /\S+@\S+\.\S+/.test(data.identifier);
    const lastOtp = await this.repo.findLastOtpByTarget(data.identifier, isEmail ? OtpChannel.EMAIL : OtpChannel.PHONE);

    if (lastOtp?.updated_at) {
      const diffMs = Date.now() - new Date(lastOtp.updated_at).getTime();
      const cooldown = 60_000;
      if (diffMs < cooldown) {
        const remaining = Math.ceil((cooldown - diffMs) / 1000);
        throw {
          statusCode: 429,
          message: `Veuillez patienter ${remaining} seconde${remaining > 1 ? 's' : ''} avant de renvoyer un OTP.`
        };
      }
    }

    const { otp, expiration } = generateOtp();
    if (isEmail) {
      await this.repo.saveOtp(data.identifier, OtpChannel.EMAIL, otp, expiration, user.id, 'password_reset');
      await sendOtpEmail(data.identifier, otp, {
        purpose: 'la réinitialisation de votre mot de passe',
        minutes: 10,
        subject: 'Réinitialisation du mot de passe (10 min)'
      });
    } else {
      await this.repo.saveOtp(data.identifier, OtpChannel.PHONE, otp, expiration, user.id, 'password_reset');
      await sendSMS({ 
        to: data.identifier, 
        message: `Votre code de réinitialisation de mot de passe TogoLocation : ${otp}. Valide 10 minutes.` 
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
    const isCurrentPasswordValid = await comparePassword(data.current_password, user.password_hash!);

    if (!isCurrentPasswordValid) {
      throw { statusCode: 401, message: 'Mot de passe actuel incorrect' };
    }

    // Validate new password
    await this.validatePassword(data.new_password);

    // Ensure new password is different
    const isSamePassword = await comparePassword(data.new_password, user.password_hash!);
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


  async verifyOtp(params: { channel: OtpChannel; target: string; code: string; purpose?: string }): Promise<{ success: true; message: string }> {
    const { channel, target, code, purpose } = params;
    console.log('Verifying OTP:', params);

    if (!channel || !target || !code) {
      throw { statusCode: 400, message: 'Paramètres manquants' };
    }

    const normalizedTarget = channel === OtpChannel.EMAIL ? target.toLowerCase().trim() : target.trim();

    const otpRecord = await this.repo.findOtp(normalizedTarget, channel);
    if (!otpRecord) {
      throw { statusCode: 400, message: 'Code OTP invalide ou expiré' };
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await this.repo.deleteOtp(normalizedTarget, channel);
      throw { statusCode: 429, message: 'Trop de tentatives. Demandez un nouveau code' };
    }

    if (otpRecord.code !== code) {
      const attempts = await this.repo.incrementOtpAttempts(normalizedTarget, channel);
      const remaining = Math.max(0, otpRecord.max_attempts - attempts);
      throw { statusCode: 400, message: `Code incorrect. ${remaining} tentatives restantes` };
    }

    await this.repo.markOtpAsUsed(normalizedTarget, channel);

    let user = null;
    if (otpRecord.user_id) {
      user = await this.repo.findUserById(otpRecord.user_id);
    } else {
      user = channel === OtpChannel.EMAIL
        ? await this.repo.findUserByEmail(normalizedTarget)
        : await this.repo.findUserByPhone(normalizedTarget);
    }

    if (user) {
      if (channel === OtpChannel.EMAIL) {
        await this.repo.updateEmailVerification(user.id);
        await this.repo.updateUserStatus(user.id, UserStatus.ACTIVE);
      } else {
        await this.repo.updatePhoneVerification(user.id);
        await this.repo.updateUserStatus(user.id, UserStatus.ACTIVE);
      }
    }

    return { success: true, message: 'OTP vérifié avec succès' };
  }

}