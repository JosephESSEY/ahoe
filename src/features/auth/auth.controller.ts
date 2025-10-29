import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDTO,
  LoginDTO,
  SocialAuthDTO,
  VerifyEmailDTO,
  VerifyPhoneDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO
} from './auth.model';
import { getMissingFields } from '../../shared/utils/validators';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response, next: NextFunction) {
  try {
    const { method } = req.body;

    if (!method) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "method" est requis (email, phone, google, facebook).'
      });
    }

    let requiredFields: string[] = ['first_name', 'last_name', 'password'];

    if (method === 'email') {
      requiredFields.push('email');
    } else if (method === 'phone') {
      requiredFields.push('phone');
    }

    const missingFields = getMissingFields(req.body, requiredFields);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs manquants',
        missingFields
      });
    }

    let data: RegisterDTO | null = null;

    if (method === 'email') {
      data = {
        email: req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        preferred_language: req.body.preferred_language || 'fr',
        referral_code: req.body.referral_code
      };
    } else if (method === 'phone') {
      data = {
        phone: req.body.phone,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        preferred_language: req.body.preferred_language || 'fr',
        referral_code: req.body.referral_code
      };
    } else if (method === 'google' || method === 'facebook') {
      // Cas d'inscription via un fournisseur externe
      data = {
    token: req.body.token, // 👈 ajoute cette ligne
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    preferred_language: req.body.preferred_language || 'fr',
    referral_code: req.body.referral_code
  };

  if (!req.body.token) {
    return res.status(400).json({
      success: false,
      message: 'Le token d’authentification du fournisseur est requis (Google/Facebook).'
    });
  }
      
    } else {
      return res.status(400).json({
        success: false,
        message: `Méthode d'inscription invalide : ${method}`
      });
    }

    const result = await this.authService.register(data, method);

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Vérifiez votre email et téléphone.',
      data: result
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Erreur serveur',
      error: error.details || undefined
    });
  }
}

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
    const { channel, target, code, purpose } = req.body;

    if (!channel || !target || !code) {
      return res.status(400).json({ success: false, message: 'channel, target et code sont requis' });
    }

    const result = await this.authService.verifyOtp({ channel, target, code, purpose });
    return res.status(200).json(result);
  } catch (err: any) {
    const status = err?.statusCode || 500;
    const message = err?.message || 'Erreur serveur';
    return res.status(status).json({ success: false, message });
  }
  }


  // ==================== LOGIN ====================

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const requiredFields = ['identifier', 'password'];
      const missingFields = getMissingFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Champs manquants',
          missingFields
        });
      }

      const data: LoginDTO = {
        identifier: req.body.identifier,
        password: req.body.password,
        remember_me: req.body.remember_me || false
      };

      const metadata = {
        ip_address: req.ip || req.connection.remoteAddress || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
        device_info: {
          platform: req.headers['x-platform'] || 'web',
          app_version: req.headers['x-app-version'] || 'unknown'
        }
      };

      const result = await this.authService.login(data, metadata);

      // Set refresh token as httpOnly cookie
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: data.remember_me ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          access_token: result.access_token,
          expires_in: result.expires_in,
          token_type: result.token_type,
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== SOCIAL AUTH ====================

  async socialAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const requiredFields = ['provider', 'access_token'];
      const missingFields = getMissingFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Champs manquants',
          missingFields
        });
      }

      const data: SocialAuthDTO = {
        provider: req.body.provider,
        access_token: req.body.access_token,
        id_token: req.body.id_token
      };

      const result = await this.authService.socialAuth(data);

      // Set refresh token as httpOnly cookie
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          access_token: result.access_token,
          expires_in: result.expires_in,
          token_type: result.token_type,
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== TOKEN MANAGEMENT ====================

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token manquant'
        });
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      // Set new refresh token as httpOnly cookie
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        success: true,
        message: 'Token rafraîchi',
        data: {
          access_token: result.access_token,
          expires_in: result.expires_in,
          token_type: result.token_type
        }
      });
    } catch (error: any) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      await this.authService.logout(userId, refreshToken);

      // Clear refresh token cookie
      res.clearCookie('refresh_token');

      res.status(200).json({
        success: true,
        message: 'Déconnexion réussie'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async logoutAllDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      await this.authService.logoutAllDevices(userId);

      // Clear refresh token cookie
      res.clearCookie('refresh_token');

      res.status(200).json({
        success: true,
        message: 'Déconnexion de tous les appareils réussie'
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== EMAIL VERIFICATION ====================

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Token manquant'
        });
      }

      const data: VerifyEmailDTO = { token };

      await this.authService.verifyEmail(data);

      res.status(200).json({
        success: true,
        message: 'Email vérifié avec succès'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async resendEmailVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      await this.authService.resendEmailVerification(userId);

      res.status(200).json({
        success: true,
        message: 'Email de vérification renvoyé'
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== PHONE VERIFICATION ====================

  async sendPhoneVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone manquant'
        });
      }

      await this.authService.sendPhoneVerification(phone);

      res.status(200).json({
        success: true,
        message: 'Code de vérification envoyé par SMS'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async verifyPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const requiredFields = ['phone', 'code'];
      const missingFields = getMissingFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Champs manquants',
          missingFields
        });
      }

      const data: VerifyPhoneDTO = {
        phone: req.body.phone,
        code: req.body.code
      };

      await this.authService.verifyPhone(data);

      res.status(200).json({
        success: true,
        message: 'Téléphone vérifié avec succès'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async resendPhoneVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone manquant'
        });
      }

      await this.authService.resendPhoneVerification(phone);

      res.status(200).json({
        success: true,
        message: 'Code de vérification renvoyé par SMS'
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== PASSWORD RESET ====================

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Email ou téléphone manquant'
        });
      }

      const data: ForgotPasswordDTO = { identifier };

      await this.authService.forgotPassword(data);

      res.status(200).json({
        success: true,
        message: 'Si ce compte existe, vous recevrez un lien/code de réinitialisation'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const requiredFields = ['token', 'new_password'];
      const missingFields = getMissingFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Champs manquants',
          missingFields
        });
      }

      const data: ResetPasswordDTO = {
        token: req.body.token,
        new_password: req.body.new_password
      };

      await this.authService.resetPassword(data);

      res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      const requiredFields = ['current_password', 'new_password'];
      const missingFields = getMissingFields(req.body, requiredFields);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Champs manquants',
          missingFields
        });
      }

      const data: ChangePasswordDTO = {
        current_password: req.body.current_password,
        new_password: req.body.new_password
      };

      await this.authService.changePassword(userId, data);

      res.status(200).json({
        success: true,
        message: 'Mot de passe modifié avec succès'
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== USER INFO ====================

  
  async updateFcmToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { fcm_token } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      if (!fcm_token) {
        return res.status(400).json({
          success: false,
          message: 'FCM token manquant'
        });
      }

      await this.authService.updateFcmToken(userId, fcm_token);

      res.status(200).json({
        success: true,
        message: 'FCM token mis à jour'
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getLoginHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const history = await this.authService.getLoginHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error: any) {
      next(error);
    }
  }
}