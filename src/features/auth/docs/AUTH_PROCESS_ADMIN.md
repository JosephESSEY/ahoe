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
┌──────────┐ ┌──────────┐ ┌──────────┐
│Modération│ │Gestion   │ │Analytics │
│Contenu   │ │Users     │ │Plateforme│
└──────────┘ └──────────┘ └──────────┘
      │            │            │
      └────────────┼────────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  AUDIT LOG       │
          │  (Toutes actions)│
          └──────────────────┘
```

---

## 11. ENDPOINTS ADMIN COMPLETS

| Méthode | Endpoint | Permission | Description |
|---------|----------|------------|-------------|
| **GESTION UTILISATEURS** |
| GET | /admin/users | users:read:all | Liste utilisateurs |
| GET | /admin/users/:id | users:read:all | Détails utilisateur |
| PUT | /admin/users/:id/status | users:update:status | Suspendre/Activer |
| PUT | /admin/users/:id/verify-role | users:verify:identity | Vérifier rôle |
| DELETE | /admin/users/:id | users:delete | Supprimer utilisateur |
| **GESTION PROPRIÉTÉS** |
| GET | /admin/properties | properties:read:all | Toutes propriétés |
| GET | /admin/properties/pending | properties:moderate | En attente modération |
| PUT | /admin/properties/:id/moderate | properties:moderate | Approuver/Rejeter |
| PUT | /admin/properties/:id/feature | properties:feature | Mettre en vedette |
| DELETE | /admin/properties/:id | properties:delete | Supprimer |
| **GESTION RÉSERVATIONS** |
| GET | /admin/bookings | bookings:read:all | Toutes réservations |
| GET | /admin/bookings/disputes | bookings:read:all | Litiges |
| PUT | /admin/bookings/:id/cancel | bookings:cancel | Annuler |
| **MODÉRATION AVIS** |
| GET | /admin/reviews/reported | reviews:moderate | Avis signalés |
| PUT | /admin/reviews/:id/moderate | reviews:moderate | Modérer |
| DELETE | /admin/reviews/:id | reviews:delete | Supprimer |
| **GESTION PAIEMENTS** |
| GET | /admin/payments | payments:read:all | Toutes transactions |
| POST | /admin/payments/:id/refund | payments:refund | Rembourser |
| GET | /admin/reports/revenue | finance:reports:export | Rapport revenus |
| **CONFIGURATION (Super Admin)** |
| GET | /admin/settings | system:settings:read | Paramètres |
| PUT | /admin/settings/:key | system:settings:update | Modifier paramètre |
| GET | /admin/logs | system:logs:view | Logs système |
| POST | /admin/maintenance | system:maintenance:toggle | Mode maintenance |
| **GESTION ADMINS (Super Admin)** |
| POST | /auth/register-admin | admins:create | Créer admin |
| GET | /admin/admins | admins:read | Liste admins |
| DELETE | /admin/admins/:id | admins:delete | Supprimer admin |
| **AUDIT** |
| GET | /admin/audit-logs | - | Logs actions admin |
| GET | /admin/login-history | - | Historique connexions |

```

---