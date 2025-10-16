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