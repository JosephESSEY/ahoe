import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
// import { rateLimiterMiddleware } from '../../shared/middlewares/rateLimiter.middleware';

const router = Router();
const authController = new AuthController();

// Rate limiters
// const = rateLimiterMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }); // 5 req/15min
// const normalLimiter = rateLimiterMiddleware({ windowMs: 15 * 60 * 1000, max: 100 }); // 100 req/15min

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - password
 *               - first_name
 *               - last_name
 *               - role_type
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 pattern: '^\+?[1-9]\d{1,14}$'
 *               password:
 *                 type: string
 *                 minLength: 8
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *               role_type:
 *                 type: string
 *                 enum: [tenant, landlord, agent]
 *               preferred_language:
 *                 type: string
 *                 enum: [fr, en, ee, kbp]
 *                 default: fr
 *               referral_code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inscription réussie
 *       400:
 *         description: Données invalides
 */
router.post('/register', authController.register.bind(authController));


/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Vérifier le code OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target
 *               - channel
 *               - code
 *             properties:
 *               target:
 *                 type: string
 *                 description: Email ou téléphone selon le canal
 *               channel:
 *                 type: string
 *                 enum: [email, phone]
 *                 description: Canal utilisé pour l’envoi de l’OTP
 *               code:
 *                 type: string
 *                 description: Code OTP reçu par l’utilisateur
 *     responses:
 *       200:
 *         description: OTP vérifié avec succès
 *       400:
 *         description: Code OTP invalide ou expiré
 *       429:
 *         description: Trop de tentatives
 */
router.post('/verify-otp', authController.verifyOtp.bind(authController));


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email ou numéro de téléphone
 *               password:
 *                 type: string
 *               remember_me:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Connexion réussie
 *       401:
 *         description: Identifiants invalides
 *       423:
 *         description: Compte bloqué
 */
router.post('/login', authController.login.bind(authController));

router.post('/login-with-google', authController.loginWithGoogle.bind(authController));


/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Optionnel si envoyé via cookie
 *     responses:
 *       200:
 *         description: Token rafraîchi
 *       401:
 *         description: Refresh token invalide
 */
router.post('/refresh', authController.refreshToken.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnexion (appareil actuel)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         description: Non authentifié
 */
router.post('/logout', authMiddleware, authController.logout.bind(authController));

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Déconnexion de tous les appareils
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion de tous les appareils réussie
 *       401:
 *         description: Non authentifié
 */
router.post('/logout-all', authMiddleware, authController.logoutAllDevices.bind(authController));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Demander la réinitialisation du mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email ou téléphone
 *     responses:
 *       200:
 *         description: Lien/code envoyé si le compte existe
 */
router.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe avec token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - new_password
 *             properties:
 *               token:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 *       400:
 *         description: Token invalide ou mot de passe faible
 */
router.post('/reset-password', authController.resetPassword.bind(authController));

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Changer le mot de passe (utilisateur connecté)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Mot de passe modifié
 *       401:
 *         description: Mot de passe actuel incorrect
 */
router.post(
  '/change-password',
  authMiddleware,
  authController.changePassword.bind(authController)
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtenir les informations de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations utilisateur
 *       401:
 *         description: Non authentifié
 */
// router.get('/me', authMiddleware, authController.getMe.bind(authController));

/**
 * @swagger
 * /auth/fcm-token:
 *   patch:
 *     summary: Mettre à jour le token FCM pour les notifications push
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcm_token
 *             properties:
 *               fcm_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token FCM mis à jour
 *       401:
 *         description: Non authentifié
 */
router.patch('/fcm-token', authMiddleware, authController.updateFcmToken.bind(authController));

/**
 * @swagger
 * /auth/login-history:
 *   get:
 *     summary: Historique des connexions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Historique des connexions
 *       401:
 *         description: Non authentifié
 */
router.get('/login-history', authMiddleware, authController.getLoginHistory.bind(authController));

export default router;