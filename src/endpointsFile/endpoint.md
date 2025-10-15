# **API REST - Plateforme de Location Immobilière**

## ** Sommaire**

1. [Authentification et utilisateurs](#1-authentification-et-utilisateurs)
2. [Catégories et propriétés](#2-catégories-et-propriétés)
3. [Recherche et découverte](#3-recherche-et-découverte)
4. [Favoris et recherches sauvées](#4-favoris-et-recherches-sauvées)
5. [Communication de base](#5-communication-de-base)
6. [Réservations de base](#6-réservations-de-base)
7. [Paiements spécifiques](#7-paiements-spécifiques)
8. [Évaluations et avis](#8-évaluations-et-avis)
9. [Notifications](#9-notifications)
10. [Analytics propriétaires](#10-analytics-propriétaires)
11. [Administration avancée](#11-administration-avancée)
12. [Services avancés](#12-services-avancés)
13. [IA et fonctionnalités intelligentes](#13-ia-et-fonctionnalités-intelligentes)
14. [API publique et webhooks](#14-api-publique-et-webhooks)
15. [Recherche et filtres avancés](#15-recherche-et-filtres-avancés)
16. [Mobile et fonctionnalités natives](#16-mobile-et-fonctionnalités-natives)
17. [Support et assistance](#17-support-et-assistance)
18. [Exports et rapports](#18-exports-et-rapports)
19. [Gestion des médias avancée](#19-gestion-des-médias-avancée)
20. [Sécurité et audit](#20-sécurité-et-audit)
21. [Priorités de développement](#priorités-de-développement-détaillées)
22. [Structure backend recommandée](#🏗️-structure-backend-recommandée)

---

## **1. AUTHENTIFICATION ET UTILISATEURS**

### **1.1 Authentification de base**

| Méthode | Endpoint                    | Description                |
| ------- | --------------------------- | -------------------------- |
| POST    | `/api/auth/register`        | Inscription utilisateur    |
| POST    | `/api/auth/login`           | Connexion                  |
| POST    | `/api/auth/logout`          | Déconnexion                |
| POST    | `/api/auth/refresh`         | Refresh token              |
| POST    | `/api/auth/forgot-password` | Mot de passe oublié        |
| POST    | `/api/auth/reset-password`  | Réinitialiser mot de passe |
| POST    | `/api/auth/verify-email`    | Vérification email         |
| POST    | `/api/auth/verify-phone`    | Vérification téléphone     |

### **1.2 Profils utilisateurs**

| Méthode | Endpoint                     | Description                 |
| ------- | ---------------------------- | --------------------------- |
| GET     | `/api/users/profile`         | Profil utilisateur connecté |
| PUT     | `/api/users/profile`         | Mise à jour profil          |
| POST    | `/api/users/avatar`          | Upload avatar               |
| GET     | `/api/users/:id`             | Profil public utilisateur   |
| POST    | `/api/users/change-password` | Changer mot de passe        |

### **1.3 Rôles et vérifications**

| Méthode | Endpoint                         | Description                |
| ------- | -------------------------------- | -------------------------- |
| GET     | `/api/users/roles`               | Rôles utilisateur connecté |
| POST    | `/api/users/roles`               | Demander un nouveau rôle   |
| POST    | `/api/users/verify-documents`    | Soumettre documents        |
| GET     | `/api/users/verification-status` | Statut vérification        |

---

## **2. CATÉGORIES ET PROPRIÉTÉS**

### **2.1 Catégories**

| Méthode | Endpoint              | Description              |
| ------- | --------------------- | ------------------------ |
| GET     | `/api/categories`     | Liste catégories actives |
| GET     | `/api/categories/:id` | Détails catégorie        |

### **2.2 Gestion des propriétés**

| Méthode | Endpoint                        | Description                     |
| ------- | ------------------------------- | ------------------------------- |
| POST    | `/api/properties`               | Créer propriété                 |
| GET     | `/api/properties/my-properties` | Mes propriétés                  |
| GET     | `/api/properties/:id`           | Détails propriété               |
| PUT     | `/api/properties/:id`           | Modifier propriété              |
| DELETE  | `/api/properties/:id`           | Supprimer propriété             |
| PUT     | `/api/properties/:id/status`    | Changer statut (draft → active) |

### **2.3 Médias propriétés**

| Méthode | Endpoint                                     | Description              |
| ------- | -------------------------------------------- | ------------------------ |
| POST    | `/api/properties/:id/media`                  | Upload photos/vidéos     |
| PUT     | `/api/properties/:id/media/:mediaId`         | Modifier média           |
| DELETE  | `/api/properties/:id/media/:mediaId`         | Supprimer média          |
| PUT     | `/api/properties/:id/media/:mediaId/primary` | Définir photo principale |

### **2.4 Tarification**

| Méthode | Endpoint                                 | Description          |
| ------- | ---------------------------------------- | -------------------- |
| POST    | `/api/properties/:id/pricing`            | Définir tarification |
| PUT     | `/api/properties/:id/pricing/:pricingId` | Modifier prix        |
| GET     | `/api/properties/:id/pricing`            | Obtenir tarification |

### **2.5 Disponibilités**

| Méthode | Endpoint                                    | Description                    |
| ------- | ------------------------------------------- | ------------------------------ |
| POST    | `/api/properties/:id/availability`          | Définir disponibilités         |
| PUT     | `/api/properties/:id/availability/:availId` | Modifier disponibilité         |
| DELETE  | `/api/properties/:id/availability/:availId` | Supprimer période              |
| GET     | `/api/properties/:id/availability`          | Voir calendrier disponibilités |

---

## **3. RECHERCHE ET DÉCOUVERTE**

| Méthode | Endpoint                   | Description                |
| ------- | -------------------------- | -------------------------- |
| GET     | `/api/properties/search`   | Recherche avec filtres     |
| GET     | `/api/properties/featured` | Propriétés mises en avant  |
| GET     | `/api/properties/recent`   | Propriétés récentes        |
| GET     | `/api/properties/popular`  | Propriétés populaires      |
| GET     | `/api/properties/:slug`    | Détails propriété publique |
| POST    | `/api/properties/:id/view` | Compteur de vues           |

---

## **4. FAVORIS ET RECHERCHES SAUVÉES**

| Méthode | Endpoint                     | Description                 |
| ------- | ---------------------------- | --------------------------- |
| GET     | `/api/favorites`             | Mes favoris                 |
| POST    | `/api/favorites/:propertyId` | Ajouter aux favoris         |
| DELETE  | `/api/favorites/:propertyId` | Retirer des favoris         |
| GET     | `/api/saved-searches`        | Mes recherches sauvegardées |

---

## **5. COMMUNICATION**

| Méthode | Endpoint                          | Description             |
| ------- | --------------------------------- | ----------------------- |
| GET     | `/api/conversations`              | Liste des conversations |
| POST    | `/api/conversations`              | Créer conversation      |
| GET     | `/api/conversations/:id`          | Détails conversation    |
| POST    | `/api/conversations/:id/messages` | Envoyer message         |

---

## **6. RÉSERVATIONS DE BASE**

| Méthode | Endpoint                            | Description              |
| ------- | ----------------------------------- | ------------------------ |
| POST    | `/api/booking-requests`             | Créer demande            |
| GET     | `/api/booking-requests`             | Mes demandes             |
| PUT     | `/api/booking-requests/:id/respond` | Répondre (accept/reject) |
| PUT     | `/api/booking-requests/:id/cancel`  | Annuler demande          |

---

## **7. PAIEMENTS**

| Méthode | Endpoint                     | Description           |
| ------- | ---------------------------- | --------------------- |
| POST    | `/api/payments/rent`         | Paiement loyer        |
| POST    | `/api/payments/deposit`      | Paiement caution      |
| POST    | `/api/payments/mobile-money` | Paiement Mobile Money |
| GET     | `/api/payments/:id/status`   | Statut paiement       |
| GET     | `/api/payments/:id/receipt`  | Reçu paiement         |

---

## **8. ÉVALUATIONS ET AVIS**

| Méthode | Endpoint                            | Description      |
| ------- | ----------------------------------- | ---------------- |
| GET     | `/api/reviews/property/:propertyId` | Avis propriété   |
| GET     | `/api/reviews/user/:userId`         | Avis utilisateur |
| POST    | `/api/reviews`                      | Créer avis       |
| PUT     | `/api/reviews/:id`                  | Modifier avis    |
| DELETE  | `/api/reviews/:id`                  | Supprimer avis   |

---

## **9. NOTIFICATIONS**

| Méthode | Endpoint                          | Description               |
| ------- | --------------------------------- | ------------------------- |
| GET     | `/api/notifications`              | Mes notifications         |
| PUT     | `/api/notifications/read-all`     | Marquer toutes comme lues |
| GET     | `/api/notifications/unread-count` | Compteur non lues         |
| GET     | `/api/notifications/preferences`  | Préférences notifications |

---

## **10. ANALYTICS PROPRIÉTAIRES**

| Méthode | Endpoint                   | Description          |
| ------- | -------------------------- | -------------------- |
| GET     | `/api/analytics/dashboard` | Dashboard principal  |
| GET     | `/api/analytics/revenue`   | Statistiques revenus |
| GET     | `/api/reports/monthly`     | Rapport mensuel      |
| GET     | `/api/reports/tax`         | Rapport fiscal       |

---

## **11. ADMINISTRATION**

| Méthode | Endpoint                  | Description           |
| ------- | ------------------------- | --------------------- |
| GET     | `/api/admin/users`        | Liste utilisateurs    |
| GET     | `/api/admin/properties`   | Toutes les propriétés |
| GET     | `/api/admin/transactions` | Transactions          |
| GET     | `/api/admin/settings`     | Paramètres système    |
| GET     | `/api/admin/stats`        | Statistiques globales |

---

## **12. SERVICES AVANCÉS**

| Méthode | Endpoint                   | Description |
| ------- | -------------------------- | ----------- |
| GET     | `/api/services/movers`     | Déménageurs |
| GET     | `/api/services/cleaning`   | Nettoyage   |
| GET     | `/api/services/insurance`  | Assurances  |
| POST    | `/api/inspections/request` | Inspection  |
| POST    | `/api/maintenance/request` | Maintenance |

---

## **13. IA ET ANALYSE**

| Méthode | Endpoint                          | Description           |
| ------- | --------------------------------- | --------------------- |
| GET     | `/api/ai/recommendations/:userId` | Recommandations IA    |
| POST    | `/api/ai/price-suggestion`        | Suggestion de prix    |
| POST    | `/api/ai/fraud-check`             | Vérification fraude   |
| POST    | `/api/ai/description-enhance`     | Améliorer description |

---

## **14. API PUBLIQUE & WEBHOOKS**

| Méthode | Endpoint                        | Description              |
| ------- | ------------------------------- | ------------------------ |
| GET     | `/api/public/properties`        | Données publiques        |
| POST    | `/api/webhooks/payment-success` | Callback paiement réussi |
| POST    | `/api/integrations/maps`        | Intégration cartes       |

---

## **15. SUPPORT**

| Méthode | Endpoint                | Description          |
| ------- | ----------------------- | -------------------- |
| POST    | `/api/support/tickets`  | Créer ticket support |
| GET     | `/api/support/faq`      | Foire aux questions  |
| POST    | `/api/support/feedback` | Envoyer feedback     |

---

## **📊 PRIORITÉS DE DÉVELOPPEMENT DÉTAILLÉES**

### **🔥 Priorité 1 - MVP Essentiel (Semaines 1-8)**

* Authentification complète
* Gestion propriétés de base
* Recherche simple
* Communication basique
* Réservations simples

**Technologies :**

* Node.js + Express + TypeScript
* PostgreSQL
* JWT Auth
* Multer + Cloud Storage
* SendGrid (ou équivalent)

---

### **⭐ Priorité 2 - Fonctionnalités Business (Semaines 9-16)**

* Paiements Mobile Money
* Contrats numériques
* Système d’avis
* Dashboard analytics
* Notifications push

**Technologies :**

* SDK Mobile Money
* jsPDF
* Firebase Cloud Messaging
* Mixpanel
* node-cron

---

### **🚀 Priorité 3 - Différenciation (Semaines 17-24)**

* Panel Admin complet
* Services partenaires
* Recommandations IA
* API publique
* Support client
* Audit et sécurité

**Technologies :**

* React Admin
* TensorFlow.js / OpenAI
* Mapbox GL JS
* Elasticsearch
* Redis + Bull

---

## **🏗️ STRUCTURE BACKEND RECOMMANDÉE**

```
src/
├── config/
│   ├── database.ts
│   ├── redis.ts
│   ├── auth.ts
│   ├── upload.ts
│   └── constants.ts
│
├── controllers/
│   ├── auth.controller.ts
│   ├── users.controller.ts
│   ├── properties.controller.ts
│   ├── search.controller.ts
│   ├── bookings.controller.ts
│   ├── payments.controller.ts
│   ├── messages.controller.ts
│   ├── reviews.controller.ts
│   ├── notifications.controller.ts
│   └── admin.controller.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── roles.middleware.ts
│   ├── validation.middleware.ts
│   ├── ratelimit.middleware.ts
│   ├── upload.middleware.ts
│   └── error.middleware.ts
│
├── models/
│   ├── User.ts
│   ├── Property.ts
│   ├── Booking.ts
│   ├── Transaction.ts
│   ├── Message.ts
│   └── index.ts
│
├── services/
│   ├── auth.service.ts
│   ├── email.service.ts
│   ├── sms.service.ts
│   ├── payment.service.ts
│   ├── upload.service.ts
│   ├── notification.service.ts
│   └── search.service.ts
│
├── utils/
│   ├── database.ts
│   ├── encryption.ts
│   ├── validation.ts
│   ├── helpers.ts
│   └── types.ts
│
├── routes/
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   ├── properties.routes.ts
│   ├── search.routes.ts
│   ├── bookings.routes.ts
│   ├── payments.routes.ts
│   ├── messages.routes.ts
│   ├── reviews.routes.ts
│   ├── admin.routes.ts
│   └── index.ts
│
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_properties.sql
│   ├── 003_create_bookings.sql
│   └── ...
│
├── seeds/
│   ├── categories.seed.ts
│   ├── admin.seed.ts
│   └── settings.seed.ts
│
├── tests/
│   ├── auth.test.ts
│   ├── properties.test.ts
│   ├── bookings.test.ts
│   └── ...
│
├── docs/
│   ├── api.md
│   ├── database.md
│   └── deployment.md
│
├── app.ts
├── server.ts
└── package.json
```

---