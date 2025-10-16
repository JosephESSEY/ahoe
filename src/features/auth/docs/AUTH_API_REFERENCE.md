
### **9.4 AUTH_API_REFERENCE.md**

```markdown
# API Reference - Authentification

Documentation complète des endpoints d'authentification de TogoLocation.

---

## BASE URL

```
Production: https://api.togolocation.tg
Staging: https://api-staging.togolocation.tg
Development: http://localhost:5000
```

## AUTHENTIFICATION

Les endpoints protégés nécessitent un token JWT dans l'en-tête:

```http
Authorization: Bearer <access_token>
```

---

## ENDPOINTS

### 1. INSCRIPTION

#### `POST /api/auth/register`

Créer un nouveau compte utilisateur.

**Headers:**
```http
Content-Type: application/json
```

**Body:**
```json
{
  "email": "string (required)",
  "phone": "string (required, format: +22890123456)",
  "password": "string (required, min: 8)",
  "first_name": "string (required, min: 2)",
  "last_name": "string (required, min: 2)",
  "role_type": "string (required, enum: tenant|landlord|agent)",
  "preferred_language": "string (optional, enum: fr|en|ee|kbp, default: fr)",
  "referral_code": "string (optional)"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Inscription réussie. Vérifiez votre email et téléphone.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+22890123456",
      "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "preferred_language": "fr"
      },
      "roles": [
        {
          "role_type": "tenant",
          "is_verified": true
        }
      ],
      "email_verified": false,
      "phone_verified": false,
      "status": "pending_verification"
    }
  }
}
```

**Response 400:**
```json
{
  "success": false,
  "message": "Cet email est déjà utilisé"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

### 2. CONNEXION

#### `POST /api/auth/login`

Authentifier un utilisateur existant.

**Body:**
```json
{
  "identifier": "string (required, email or phone)",
  "password": "string (required)",
  "remember_me": "boolean (optional, default: false)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+22890123456",
      "profile": {...},
      "roles": [...],
      "email_verified": true,
      "phone_verified": true,
      "status": "active"
    }
  }
}
```

**Note:** Le `refresh_token` est retourné dans un cookie httpOnly.

**Response 401:**
```json
{
  "success": false,
  "message": "Identifiants invalides"
}
```

**Response 423:**
```json
{
  "success": false,
  "message": "Trop de tentatives échouées. Compte bloqué pour 30 minutes"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

### 3. AUTHENTIFICATION SOCIALE

#### `POST /api/auth/social`

Connexion via Google ou Facebook.

**Body:**
```json
{
  "provider": "string (required, enum: google|facebook)",
  "access_token": "string (required)",
  "id_token": "string (optional, Google only)"
}
```

**Response 200:** Identique à `/auth/login`

**Rate Limit:** 5 requêtes / 15 minutes

---

### 4. RAFRAÎCHIR TOKEN

#### `POST /api/auth/refresh`

Obtenir un nouveau access token.

**Body (optionnel si cookie):**
```json
{
  "refresh_token": "string (optional)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Token rafraîchi",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "token_type": "Bearer"
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "message": "Refresh token invalide"
}
```

**Rate Limit:** 100 requêtes / 15 minutes

---

### 5. DÉCONNEXION

#### `POST /api/auth/logout`

Déconnecter l'appareil actuel.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

#### `POST /api/auth/logout-all`

Déconnecter tous les appareils.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "success": true,
  "message": "Déconnexion de tous les appareils réussie"
}
```

---

### 6. VÉRIFICATION EMAIL

#### `GET /api/auth/verify-email`

Vérifier l'adresse email.

**Query Parameters:**
```
token: string (required)
```

**Example:**
```
GET /api/auth/verify-email?token=abc123def456
```

**Response 200:**
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

**Response 400:**
```json
{
  "success": false,
  "message": "Token de vérification invalide ou expiré"
}
```

---

#### `POST /api/auth/resend-email-verification`

Renvoyer l'email de vérification.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "success": true,
  "message": "Email de vérification renvoyé"
}
```

**Response 400:**
```json
{
  "success": false,
  "message": "Email déjà vérifié"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

### 7. VÉRIFICATION TÉLÉPHONE

#### `POST /api/auth/send-phone-verification`

Envoyer un code OTP par SMS.

**Body:**
```json
{
  "phone": "string (required, format: +22890123456)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Code de vérification envoyé par SMS"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

#### `POST /api/auth/verify-phone`

Vérifier le téléphone avec le code OTP.

**Body:**
```json
{
  "phone": "string (required)",
  "code": "string (required, 6 digits)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Téléphone vérifié avec succès"
}
```

**Response 400:**
```json
{
  "success": false,
  "message": "Code incorrect. 2 tentatives restantes"
}
```

**Response 429:**
```json
{
  "success": false,
  "message": "Trop de tentatives. Demandez un nouveau code"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

#### `POST /api/auth/resend-phone-verification`

Renvoyer le code SMS.

**Body:**
```json
{
  "phone": "string (required)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Code de vérification renvoyé par SMS"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

### 8. MOT DE PASSE OUBLIÉ

#### `POST /api/auth/forgot-password`

Demander la réinitialisation du mot de passe.

**Body:**
```json
{
  "identifier": "string (required, email or phone)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Si ce compte existe, vous recevrez un lien/code de réinitialisation"
}
```

**Note:** La réponse est identique que le compte existe ou non (sécurité).

**Rate Limit:** 5 requêtes / 15 minutes

---

### 9. RÉINITIALISATION MOT DE PASSE

#### `POST /api/auth/reset-password`

Réinitialiser le mot de passe avec le token.

**Body:**
```json
{
  "token": "string (required)",
  "new_password": "string (required, min: 8)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

**Response 400:**
```json
{
  "success": false,
  "message": "Lien de réinitialisation invalide ou expiré"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

### 10. CHANGER MOT DE PASSE

#### `POST /api/auth/change-password`

Changer le mot de passe (utilisateur connecté).

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "current_password": "string (required)",
  "new_password": "string (required, min: 8)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Mot de passe modifié avec succès"
}
```

**Response 401:**
```json
{
  "success": false,
  "message": "Mot de passe actuel incorrect"
}
```

**Rate Limit:** 5 requêtes / 15 minutes

---

### 11. INFORMATIONS UTILISATEUR

#### `GET /api/auth/me`

Obtenir les informations de l'utilisateur connecté.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "phone": "+22890123456",
    "profile": {
      "id": "...",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://cdn.togolocation.tg/avatars/...",
      "date_of_birth": null,
      "gender": null,
      "profession": null,
      "bio": null,
      "preferred_language": "fr",
      "notification_preferences": {
        "email": true,
        "sms": false,
        "push": true,
        "marketing": false
      }
    },
    "roles": [
      {
        "role_type": "tenant",
        "is_verified": true
      },
      {
        "role_type": "landlord",
        "is_verified": false
      }
    ],
    "email_verified": true,
    "phone_verified": true,
    "status": "active"
  }
}
```

---

### 12. METTRE À JOUR FCM TOKEN

#### `PATCH /api/auth/fcm-token`

Mettre à jour le token pour les notifications push.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Body:**
```json
{
  "fcm_token": "string (required)"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "FCM token mis à jour"
}
```

---

### 13. HISTORIQUE CONNEXIONS

#### `GET /api/auth/login-history`

Obtenir l'historique des connexions.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
limit: integer (optional, default: 10, max: 50)
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "device_info": {
        "platform": "android",
        "app_version": "1.0.0"
      },
      "location": {
        "country": "TG",
        "city": "Lomé"
      },
      "success": true,
      "created_at": "2025-10-15T10:30:00Z"
    },
    {
      "id": "...",
      "ip_address": "203.0.113.45",
      "success": false,
      "failure_reason": "Mot de passe incorrect",
      "created_at": "2025-10-14T08:15:00Z"
    }
  ]
}
```

---

## CODES D'ERREUR

| Code | Description |
|------|-------------|
| 400 | Bad Request - Données invalides |
| 401 | Unauthorized - Non authentifié ou token invalide |
| 403 | Forbidden - Permissions insuffisantes |
| 404 | Not Found - Ressource introuvable |
| 423 | Locked - Compte bloqué temporairement |
| 429 | Too Many Requests - Rate limit dépassé |
| 500 | Internal Server Error - Erreur serveur |

---

## FORMAT RÉPONSE ERREUR

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "errors": [
    {
      "field": "email",
      "message": "Format email invalide"
    }
  ]
}
```

---

## RATE LIMITING

| Endpoint | Limite |
|----------|--------|
| /auth/register | 5 req / 15 min |
| /auth/login | 5 req / 15 min |
| /auth/forgot-password | 5 req / 15 min |
| /auth/send-phone-verification | 5 req / 15 min |
| Autres endpoints auth | 100 req / 15 min |

**Headers de réponse:**
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1634299200
```

---

## ENVIRONNEMENTS

### Variables d'environnement requises:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/togolocation

# JWT
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@togolocation.tg
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@togolocation.tg

# SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+228XXXXXXXX

# Frontend
FRONTEND_URL=https://ahoe.tg

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Admin (optional)
ADMIN_ALLOWED_IPS=192.168.1.1,203.0.113.45
WHITELISTED_IPS=
```

---

## EXEMPLES CURL

### Inscription:
```bash
curl -X POST https://api.ahoe.tg/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+22890123456",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "role_type": "tenant"
  }'
```

### Connexion:
```bash
curl -X POST https://api.ahoe.tg/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Obtenir profil:
```bash
curl -X GET https://api.ahoe.tg/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## SUPPORT

Pour toute question sur l'API:
- Email: dev@ahoe.tg
- Documentation complète: https://docs.ahoe.tg
- Status page: https://status.ahoe.tg
```

---

