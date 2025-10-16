# Processus d'Authentification - LOCATAIRE

## Vue d'ensemble

Ce document décrit le processus complet d'authentification pour un **locataire** sur la plateforme TogoLocation.

---

## 1. INSCRIPTION

### Étape 1: Formulaire d'inscription
Le locataire remplit le formulaire avec :
- Email (requis)
- Numéro de téléphone (format international, ex: +22890123456)
- Mot de passe (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial)
- Prénom et Nom
- Langue préférée (français par défaut)

### Étape 2: Soumission
**Endpoint**: `POST /api/auth/register`
```json
{
  "email": "locataire@example.com",
  "phone": "+22890123456",
  "password": "SecurePass123!",
  "first_name": "Jean",
  "last_name": "Dupont",
  "role_type": "tenant",
  "preferred_language": "fr"
}
```

### Étape 3: Traitement serveur
1. Validation des données
2. Vérification que l'email/téléphone n'existe pas déjà
3. Hachage du mot de passe (bcrypt, 10 rounds)
4. Création de l'utilisateur dans la base de données
5. Création du profil utilisateur
6. Attribution du rôle "tenant" (auto-vérifié)
7. Génération des tokens JWT (access + refresh)

### Étape 4: Vérifications envoyées
- **Email**: Lien de vérification valide 24h
- **SMS**: Code OTP 6 chiffres valide 10 min

### Étape 5: Réponse
```json
{
  "success": true,
  "message": "Inscription réussie. Vérifiez votre email et téléphone.",
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "email": "locataire@example.com",
      "phone": "+22890123456",
      "profile": {...},
      "roles": [{"role_type": "tenant", "is_verified": true}],
      "email_verified": false,
      "phone_verified": false,
      "status": "pending_verification"
    }
  }
}
```

---

## 2. VÉRIFICATION EMAIL

### Étape 1: Clic sur le lien reçu par email
URL: `https://togolocation.tg/verify-email?token=abc123...`

### Étape 2: Vérification
**Endpoint**: `GET /api/auth/verify-email?token=abc123...`

### Traitement:
1. Vérification que le token existe et n'a pas expiré
2. Mise à jour `email_verified = true`
3. Si téléphone aussi vérifié → statut passe à `active`
4. Envoi email de bienvenue

### Réponse:
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

---

## 3. VÉRIFICATION TÉLÉPHONE

### Étape 1: Saisie du code OTP reçu par SMS

### Étape 2: Vérification
**Endpoint**: `POST /api/auth/verify-phone`
```json
{
  "phone": "+22890123456",
  "code": "123456"
}
```

### Traitement:
1. Vérification que le code existe et n'a pas expiré
2. Vérification du code (3 tentatives max)
3. Mise à jour `phone_verified = true`
4. Si email aussi vérifié → statut passe à `active`
5. Suppression du code OTP

### Réponse:
```json
{
  "success": true,
  "message": "Téléphone vérifié avec succès"
}
```

---

## 4. CONNEXION

### Méthode 1: Email/Téléphone + Mot de passe


**Endpoint**: `POST /api/auth/login`

```json
{
  "identifier": "locataire@example.com", // ou "+22890123456"
  "password": "SecurePass123!",
  "remember_me": false
}
```

### Traitement:
1. Recherche de l'utilisateur par email ou téléphone
2. Vérification que le compte existe
3. Vérification que le compte n'est pas bloqué (locked_until)
4. Comparaison du mot de passe (bcrypt)
5. En cas d'échec:
   - Incrémentation du compteur de tentatives
   - Blocage après 5 tentatives (30 minutes)
6. En cas de succès:
   - Reset du compteur de tentatives
   - Mise à jour de last_login
   - Enregistrement dans login_history
   - Génération de nouveaux tokens

### Réponse:
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "access_token": "eyJhbGc...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "email": "locataire@example.com",
      "profile": {...},
      "roles": [...],
      "email_verified": true,
      "phone_verified": true,
      "status": "active"
    }
  }
}
```

**Note**: Le refresh_token est envoyé dans un cookie httpOnly sécurisé.

---

## 5. RÉINITIALISATION MOT DE PASSE

### Étape 1: Mot de passe oublié
**Endpoint**: `POST /api/auth/forgot-password`

```json
{
  "identifier": "locataire@example.com" // ou téléphone
}
```

### Traitement:
1. Recherche de l'utilisateur
2. Génération d'un token de réinitialisation (valide 1h)
3. Si email: Envoi d'un lien par email
4. Si téléphone: Envoi d'un code OTP par SMS

### Étape 2: Réinitialisation
**Endpoint**: `POST /api/auth/reset-password`

```json
{
  "token": "reset-token-abc123",
  "new_password": "NewSecurePass456!"
}
```

### Traitement:
1. Vérification du token (valide et non utilisé)
2. Validation du nouveau mot de passe
3. Hachage et mise à jour
4. Révocation de tous les refresh tokens (déconnexion partout)
5. Envoi email de confirmation

---

## 6. UTILISATION DES TOKENS

### Access Token (15 minutes)
Utilisé dans l'en-tête de chaque requête authentifiée:

```http
Authorization: Bearer eyJhbGc...
```

### Refresh Token (7 jours / 30 jours si remember_me)
Stocké dans un cookie httpOnly. Utilisé pour renouveler l'access token.

**Endpoint**: `POST /api/auth/refresh`

### Réponse:
```json
{
  "success": true,
  "message": "Token rafraîchi",
  "data": {
    "access_token": "eyJhbGc...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

Un nouveau refresh_token est également généré et remplace l'ancien.

---

## 7. DÉCONNEXION

### Déconnexion appareil actuel
**Endpoint**: `POST /api/auth/logout`

Révoque le refresh token actuel.

### Déconnexion tous appareils
**Endpoint**: `POST /api/auth/logout-all`

Révoque tous les refresh tokens de l'utilisateur.

---

## 8. SÉCURITÉ

### Tentatives de connexion
- Maximum 5 tentatives échouées
- Blocage automatique pendant 30 minutes
- Compteur reset après connexion réussie

### Tokens
- Access token: 15 minutes (courte durée)
- Refresh token: 7 jours (ou 30 jours)
- Refresh token rotation (nouveau à chaque refresh)
- Stockage sécurisé (httpOnly cookies)

### Vérifications
- Email requis pour récupération mot de passe
- Téléphone requis pour authentification à 2 facteurs
- Compte doit être vérifié pour certaines actions

---

## 9. FLUX COMPLET - DIAGRAMME

```
┌─────────────────────────────────────────────────────────┐
│                    INSCRIPTION                           │
│  1. Formulaire → 2. Validation → 3. Création compte    │
│  4. Envoi email/SMS → 5. Tokens générés                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│ Vérif. Email  │        │ Vérif. Tél.   │
│ (Lien 24h)    │        │ (OTP 10min)   │
└───────┬───────┘        └───────┬───────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ Compte ACTIF     │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │   CONNEXION      │
          │ Email/Tél + MDP  │
          └────────┬─────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Recherche │ │Favoris   │ │Réserve   │
│Propriétés│ │Messages  │ │Logements │
└──────────┘ └──────────┘ └──────────┘
```

---

## 10. GESTION DES ERREURS

### Codes d'erreur courants

| Code | Erreur | Message |
|------|--------|---------|
| 400 | Bad Request | Email/téléphone déjà utilisé |
| 400 | Bad Request | Format email/téléphone invalide |
| 400 | Bad Request | Mot de passe trop faible |
| 401 | Unauthorized | Identifiants invalides |
| 401 | Unauthorized | Token expiré |
| 403 | Forbidden | Compte suspendu |
| 423 | Locked | Compte temporairement bloqué |
| 429 | Too Many Requests | Trop de tentatives |

---

## 11. ENDPOINTS RÉCAPITULATIFS

| Méthode | Endpoint | Authentification | Description |
|---------|----------|------------------|-------------|
| POST | /auth/register | Non | Inscription |
| POST | /auth/login | Non | Connexion |
| POST | /auth/social | Non | Connexion sociale (Google/Facebook) |
| GET | /auth/verify-email | Non | Vérifier email |
| POST | /auth/verify-phone | Non | Vérifier téléphone |
| POST | /auth/resend-email-verification | Oui | Renvoyer email |
| POST | /auth/resend-phone-verification | Non | Renvoyer SMS |
| POST | /auth/forgot-password | Non | Mot de passe oublié |
| POST | /auth/reset-password | Non | Réinitialiser MDP |
| POST | /auth/change-password | Oui | Changer MDP (connecté) |
| POST | /auth/refresh | Non | Rafraîchir token |
| POST | /auth/logout | Oui | Déconnexion |
| POST | /auth/logout-all | Oui | Déconnexion partout |
| GET | /auth/me | Oui | Info utilisateur |
| PATCH | /auth/fcm-token | Oui | Update token push |
| GET | /auth/login-history | Oui | Historique connexions |

```

---

### **9.2 AUTH_PROCESS_PROPRIETAIRE.md**

```markdown
# Processus d'Authentification - PROPRIÉTAIRE

## Vue d'ensemble

Ce document décrit le processus d'authentification pour un **propriétaire/bailleur** sur TogoLocation. Le processus diffère légèrement du locataire car le rôle nécessite une vérification supplémentaire.

---

## 1. INSCRIPTION PROPRIÉTAIRE

### Étape 1: Formulaire d'inscription
Le propriétaire remplit le formulaire standard avec :
- Email
- Téléphone
- Mot de passe
- Prénom et Nom
- **role_type: "landlord"**

**Endpoint**: `POST /api/auth/register`

```json
{
  "email": "proprietaire@example.com",
  "phone": "+22890123456",
  "password": "SecurePass123!",
  "first_name": "Kofi",
  "last_name": "Mensah",
  "role_type": "landlord",
  "preferred_language": "fr"
}
```

### Étape 2: Différence avec locataire

**Le rôle "landlord" n'est PAS auto-vérifié**:
- `is_verified = false` par défaut
- Le propriétaire peut créer un compte mais ne peut pas publier d'annonces immédiatement
- Une vérification d'identité est requise

---

## 2. VÉRIFICATION IDENTITÉ PROPRIÉTAIRE

### Étape 1: Soumission des documents
Une fois connecté, le propriétaire doit soumettre des documents pour vérification.

**Documents requis**:
- Carte d'identité nationale (CNI) ou passeport
- Justificatif de domicile récent (< 3 mois)
- Preuve de propriété (titre foncier, contrat achat) OU mandat de gestion
- Photo selfie avec CNI (vérification vivacité)

**Endpoint**: `POST /api/users/verification-documents`

```json
{
  "document_type": "cni",
  "document_number": "TG123456789",
  "document_urls": [
    "https://cdn.togolocation.tg/docs/cni-recto.jpg",
    "https://cdn.togolocation.tg/docs/cni-verso.jpg"
  ],
  "proof_of_ownership_url": "https://cdn.togolocation.tg/docs/titre-foncier.pdf",
  "selfie_url": "https://cdn.togolocation.tg/docs/selfie-cni.jpg"
}
```

### Étape 2: Processus de vérification (Admin)

**Côté administrateur**:
1. Réception de la demande dans le panel admin
2. Vérification manuelle des documents:
   - Authenticité de la CNI
   - Correspondance selfie vs CNI
   - Validité du justificatif de propriété
3. Décision: Approuver ou Rejeter

**Endpoint admin**: `PUT /api/admin/users/:userId/verify-role`

```json
{
  "role_type": "landlord",
  "is_verified": true,
  "verification_notes": "Documents conformes, identité vérifiée"
}
```

### Étape 3: Notification du résultat
Le propriétaire reçoit une notification (email + SMS + push):

**Si approuvé**:
```
"🎉 Félicitations! Votre compte propriétaire a été vérifié. 
Vous pouvez maintenant publier des annonces."
```

**Si rejeté**:
```
"❌ Votre demande de vérification a été refusée. 
Raison: [détails]
Vous pouvez soumettre de nouveaux documents."
```

---

## 3. FONCTIONNALITÉS LIMITÉES AVANT VÉRIFICATION

### Ce que le propriétaire NON vérifié PEUT faire:
- ✅ Se connecter à son compte
- ✅ Consulter les propriétés disponibles
- ✅ Mettre en favoris
- ✅ Modifier son profil
- ✅ Créer des **brouillons** d'annonces

### Ce que le propriétaire NON vérifié NE PEUT PAS faire:
- ❌ Publier des annonces en ligne
- ❌ Recevoir des demandes de réservation
- ❌ Accéder au dashboard propriétaire complet

**Middleware de protection**:
```typescript
// Exemple d'utilisation
router.post(
  '/properties/:id/publish',
  authMiddleware,
  requireVerifiedRole(RoleType.LANDLORD),
  propertyController.publishProperty
);
```

Réponse si non vérifié:
```json
{
  "success": false,
  "message": "Rôle landlord non vérifié. Soumettez vos documents d'identité.",
  "verification_status": "pending",
  "verification_url": "/profile/verification"
}
```

---

## 4. APRÈS VÉRIFICATION

Une fois le rôle vérifié (`is_verified = true`), le propriétaire a accès complet à:

### Fonctionnalités propriétaire:
- ✅ Publication d'annonces illimitées
- ✅ Gestion du calendrier de disponibilités
- ✅ Réception et gestion des demandes de réservation
- ✅ Messagerie avec locataires
- ✅ Dashboard analytics:
  - Nombre de vues par propriété
  - Taux d'occupation
  - Revenus générés
  - Statistiques de performance
- ✅ Gestion des contrats et paiements
- ✅ Évaluations des locataires
- ✅ Badge "Propriétaire vérifié" visible sur le profil

---

## 5. MULTI-RÔLES

Un utilisateur peut avoir plusieurs rôles simultanément.

**Exemple**: Propriétaire ET Locataire

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": [
      {
        "role_type": "tenant",
        "is_verified": true
      },
      {
        "role_type": "landlord",
        "is_verified": true
      }
    ]
  }
}
```

**Endpoint pour ajouter un rôle**:
`POST /api/users/roles`

```json
{
  "role_type": "landlord"
}
```

Cela déclenche le processus de vérification pour le nouveau rôle.

---

## 6. BADGE ET CONFIANCE

### Badges propriétaire:

| Badge | Condition | Avantage |
|-------|-----------|----------|
| ✅ Identité vérifiée | Documents approuvés | Confiance utilisateurs |
| 🌟 Super-Hôte | Note >4.8, 10+ avis | +30% visibilité |
| ⚡ Réponse rapide | Temps réponse <2h | Badge spécial |
| 💎 Propriétaire expérimenté | 50+ locations | Crédibilité accrue |

---

## 7. RÉVOCATION DE LA VÉRIFICATION

Un propriétaire peut perdre son statut vérifié si:
- Documents expirés (CNI périmée)
- Fraude détectée
- Comportement inapproprié (avis très négatifs, non-respect CGU)
- Suspension du compte

**Action admin**: `PUT /api/admin/users/:userId/revoke-verification`

Le propriétaire est notifié et doit soumettre de nouveaux documents.

---

## 8. CAS PARTICULIER: AGENTS IMMOBILIERS

Les agents ont un rôle distinct: `role_type: "agent"`

**Documents supplémentaires requis**:
- Licence professionnelle d'agent immobilier
- Numéro SIRET/équivalent togolais
- Assurance RC professionnelle

**Avantages agents vérifiés**:
- Gestion de multiples propriétés de clients
- Commission négociable
- Outils pro (CRM intégré, exports, API)
- Support prioritaire

---

## 9. FLUX COMPLET PROPRIÉTAIRE

```
┌──────────────────────────────────────────────────────┐
│          INSCRIPTION (role: landlord)                 │
│  Email/Tél + MDP → Compte créé (non vérifié)        │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Vérification Email/Tél│
          │ (même processus)      │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Compte ACTIF         │
          │ (mais landlord       │
          │  non vérifié)        │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Soumission Documents │
          │ CNI + Preuve proprio │
          └──────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Vérification Admin   │
          │ (24-48h)             │
          └──────────┬────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│  APPROUVÉ ✅  │        │  REJETÉ ❌    │
│ is_verified=  │        │ Re-soumission │
│ true          │        │ possible      │
└───────┬───────┘        └───────────────┘
        │
        ▼
┌───────────────────────┐
│ Propriétaire Vérifié  │
│ • Publier annonces    │
│ • Recevoir réservations│
│ • Dashboard complet   │
└───────────────────────┘
```

---

## 10. ENDPOINTS SPÉCIFIQUES PROPRIÉTAIRE

| Méthode | Endpoint | Auth | Vérifié | Description |
|---------|----------|------|---------|-------------|
| POST | /users/verification-documents | Oui | Non | Soumettre docs |
| GET | /users/verification-status | Oui | Non | Status vérification |
| POST | /users/roles | Oui | - | Ajouter rôle |
| GET | /properties/my-properties | Oui | - | Mes propriétés (dont brouillons) |
| POST | /properties | Oui | Non | Créer brouillon |
| PUT | /properties/:id/publish | Oui | **Oui** | Publier annonce |
| GET | /analytics/dashboard | Oui | **Oui** | Dashboard stats |
| GET | /bookings/received | Oui | **Oui** | Demandes reçues |

**Légende "Vérifié"**: Indique si le rôle landlord vérifié est requis.

```

---

### **9.3 AUTH_PROCESS_ADMIN.md**

```markdown
# Processus d'Authentification - ADMINISTRATEUR

## Vue d'ensemble

Ce document décrit le processus d'authentification et les permissions des **administrateurs** de la plateforme TogoLocation.

---

## 1. HIÉRARCHIE DES RÔLES ADMIN

### Rôles disponibles:

```
┌─────────────────────────────────────┐
│     SUPER ADMIN (super_admin)       │
│  • Accès complet                    │
│  • Gestion admins                   │
│  • Configuration système            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       ADMIN (admin)                 │
│  • Modération contenu               │
│  • Gestion utilisateurs             │
│  • Support client avancé            │
└─────────────────────────────────────┘
```

---

## 2. CRÉATION COMPTE ADMIN

**Les comptes admin ne peuvent PAS être créés via l'inscription publique.**

### Méthode 1: Commande CLI (Recommandée)
```bash
npm run create-admin --email=admin@togolocation.tg --password=SecureAdminPass123!
```

### Méthode 2: Endpoint protégé (Super Admin uniquement)
**Endpoint**: `POST /api/auth/register-admin`

**Headers**:
```http
Authorization: Bearer <super_admin_token>
```

**Body**:
```json
{
  "email": "newadmin@togolocation.tg",
  "phone": "+22890111111",
  "password": "SecureAdminPass123!",
  "first_name": "Admin",
  "last_name": "TogoLocation",
  "role_type": "admin"
}
```

**Traitement**:
1. Vérification que le demandeur est super_admin
2. Création du compte avec role "admin"
3. Auto-vérification email/téléphone
4. Statut immédiat: "active"
5. Envoi des credentials par email sécurisé

---

## 3. CONNEXION ADMIN

### Endpoint identique aux autres utilisateurs:
`POST /api/auth/login`

```json
{
  "identifier": "admin@togolocation.tg",
  "password": "SecureAdminPass123!"
}
```

### Différences:
- ✅ Logs de connexion admin conservés indéfiniment (audit)
- ✅ Notifications Slack/Discord si connexion admin détectée
- ✅ 2FA obligatoire (si configuré)
- ✅ IP whitelisting possible

---

## 4. AUTHENTIFICATION À 2 FACTEURS (2FA)

### Activation 2FA (Obligatoire pour admins)

**Endpoint**: `POST /api/auth/2fa/enable`

**Response**:
```json
{
  "success": true,
  "data": {
    "qr_code_url": "data:image/png;base64,...",
    "manual_code": "JBSWY3DPEHPK3PXP",
    "backup_codes": [
      "12345-67890",
      "23456-78901",
      "34567-89012"
    ]
  },
  "message": "Scannez le QR code avec Google Authenticator"
}
```

### Vérification 2FA lors de la connexion

**Après email/password valides**, si 2FA activé:

```json
{
  "success": false,
  "require_2fa": true,
  "message": "Code 2FA requis",
  "temp_token": "temp_xyz123"
}
```

**L'admin doit alors fournir le code**:
`POST /api/auth/2fa/verify`

```json
{
  "temp_token": "temp_xyz123",
  "code": "123456"
}
```

**Si code valide** → Tokens JWT complets générés.

---

## 5. PERMISSIONS ADMIN

### Permissions par rôle:

```typescript
const ADMIN_PERMISSIONS = {
  admin: [
    // Utilisateurs
    'users:read:all',
    'users:update:status', // Suspendre/Activer
    'users:verify:identity',
    
    // Propriétés
    'properties:read:all',
    'properties:moderate',
    'properties:feature',
    'properties:delete',
    
    // Réservations
    'bookings:read:all',
    'bookings:cancel',
    
    // Avis
    'reviews:moderate',
    'reviews:delete',
    
    // Paiements
    'payments:read:all',
    'payments:refund',
    
    // Support
    'support:respond',
    'support:escalate',
    
    // Analytics
    'analytics:view:platform',
  ],
  
  super_admin: [
    ...ADMIN_PERMISSIONS.admin, // Toutes permissions admin
    
    // Admins
    'admins:create',
    'admins:delete',
    'admins:update:permissions',
    
    // Système
    'system:settings:update',
    'system:maintenance:toggle',
    'system:logs:view',
    'system:database:backup',
    
    // Financier
    'finance:commission:update',
    'finance:reports:export',
  ]
};
```

### Middleware de vérification:

```typescript
router.delete(
  '/users/:id',
  authMiddleware,
  requirePermission('users:delete'),
  adminController.deleteUser
);
```

---

## 6. PANEL D'ADMINISTRATION

### Accès au panel:
**URL**: `https://admin.togolocation.tg`

**Authentification**:
- Même tokens JWT que l'API
- Vérification rôle admin/super_admin côté frontend
- Re-authentification requise après 30 min d'inactivité

### Sections disponibles:

```
📊 DASHBOARD
├─ Statistiques temps réel
├─ Graphiques utilisateurs/propriétés/revenus
├─ Alertes et notifications
└─ Actions rapides

👥 UTILISATEURS
├─ Liste tous utilisateurs (filtres, recherche)
├─ Détails utilisateur individuel
├─ Historique activités
├─ Actions: Suspendre, Activer, Supprimer
└─ Demandes de vérification en attente

🏠 PROPRIÉTÉS
├─ Toutes les propriétés (actives, brouillons, supprimées)
├─ Modération annonces en attente
├─ Mise en vedette manuelle
├─ Suppression / Masquage
└─ Statistiques par propriété

📅 RÉSERVATIONS
├─ Toutes les réservations
├─ Litiges en cours
├─ Annulations et remboursements
└─ Médiation propriétaire/locataire

💳 PAIEMENTS
├─ Transactions toutes
├─ Commissions perçues
├─ Remboursements à traiter
├─ Rapports financiers
└─ Réconciliation Mobile Money

⭐ AVIS ET MODÉRATION
├─ Avis signalés
├─ Modération contenu
├─ Bannissement utilisateurs abusifs
└─ Historique modérations

🛠️ CONFIGURATION (Super Admin)
├─ Paramètres système
├─ Taux de commission
├─ Fournisseurs Mobile Money
├─ Templates emails/SMS
├─ Mode maintenance
└─ Gestion admins
```

---

## 7. AUDIT ET TRAÇABILITÉ

### Toutes les actions admin sont loguées:

**Table**: `admin_action_logs`

```sql
CREATE TABLE admin_action_logs (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(30),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Exemples d'actions loguées**:
- Suspension d'utilisateur
- Modération de propriété
- Modification de paramètres système
- Remboursement initié
- Création/suppression d'admin

**Endpoint de consultation**:
`GET /api/admin/audit-logs`

**Rétention**: Logs conservés indéfiniment (compliance).

---

## 8. SÉCURITÉ RENFORCÉE

### Mesures spécifiques aux admins:

1. **IP Whitelisting**:
```env
ADMIN_ALLOWED_IPS=192.168.1.1,203.0.113.45
```

2. **Session timeout court**:
- 30 minutes d'inactivité → Déconnexion automatique

3. **Alertes temps réel**:
- Connexion admin → Notification Slack
- Action sensible (suppression, suspension) → Email équipe

4. **Logs séparés**:
```
logs/admin/admin-actions-2025-10-15.log
```

5. **Rate limiting strict**:
- 50 requêtes/15 min (vs 100 pour users)

6. **Permissions granulaires**:
- Principe du moindre privilège
- Revue trimestrielle des permissions

---

## 9. PROCÉDURE D'URGENCE

### En cas de compte compromis:

1. **Détection**:
- Connexion depuis IP inhabituelle
- Actions suspectes

2. **Actions immédiates**:
```bash
# CLI d'urgence
npm run lock-admin --id=<admin_id>
npm run revoke-admin-tokens --id=<admin_id>
```

3. **Investigation**:
- Consulter audit logs
- Identifier actions effectuées
- Évaluer impact

4. **Récupération**:
- Reset mot de passe forcé
- Re-vérification identité
- Réactivation manuelle par super_admin

---

## 10. FLUX COMPLET ADMIN

```
┌──────────────────────────────────────────────────┐
│    CRÉATION PAR SUPER ADMIN ou CLI               │
│  • Email + Password                              │
│  • Rôle: admin ou super_admin                    │
│  • Auto-vérifié                                  │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ Activation 2FA   │
          │ (Obligatoire)    │
          └────────┬──────────┘
                   │
                   ▼
          ┌──────────────────┐
          │   CONNEXION      │
          │ Email + Password │
          └────────┬──────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  Code 2FA        │
          │ (6 chiffres)     │
          └────────┬──────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  ACCÈS PANEL     │
          │  ADMIN           │
          └────────┬──────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
┌──────────┐ ┌──────────┐