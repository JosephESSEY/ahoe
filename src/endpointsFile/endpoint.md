// ===========================================
// 1. AUTHENTIFICATION ET UTILISATEURS
// ===========================================

// 1.1 Authentification de base
POST   /api/auth/register                    // Inscription utilisateur
POST   /api/auth/login                       // Connexion
POST   /api/auth/logout                      // Déconnexion  
POST   /api/auth/refresh                     // Refresh token
POST   /api/auth/forgot-password             // Mot de passe oublié
POST   /api/auth/reset-password              // Reset mot de passe
POST   /api/auth/verify-email                // Vérification email
POST   /api/auth/verify-phone                // Vérification téléphone

// 1.2 Profils utilisateurs
GET    /api/users/profile                    // Profil utilisateur connecté
PUT    /api/users/profile                    // Mise à jour profil
POST   /api/users/avatar                     // Upload avatar
GET    /api/users/:id                        // Profil public utilisateur
POST   /api/users/change-password            // Changer mot de passe

// 1.3 Rôles et vérifications
GET    /api/users/roles                      // Rôles utilisateur connecté
POST   /api/users/roles                      // Demander un nouveau rôle
POST   /api/users/verify-documents           // Soumettre documents vérification
GET    /api/users/verification-status        // Status vérification

// ===========================================
// 2. CATÉGORIES ET PROPRIÉTÉS
// ===========================================

// 2.1 Catégories
GET    /api/categories                       // Liste catégories actives
GET    /api/categories/:id                   // Détails catégorie

// 2.2 Gestion propriétés (Propriétaires)
POST   /api/properties                       // Créer propriété
GET    /api/properties/my-properties         // Mes propriétés
GET    /api/properties/:id                   // Détails propriété
PUT    /api/properties/:id                   // Modifier propriété
DELETE /api/properties/:id                   // Supprimer propriété
PUT    /api/properties/:id/status            // Changer status (draft->active)

// 2.3 Médias propriétés
POST   /api/properties/:id/media             // Upload photos/vidéos
PUT    /api/properties/:id/media/:mediaId    // Modifier média
DELETE /api/properties/:id/media/:mediaId    // Supprimer média
PUT    /api/properties/:id/media/:mediaId/primary // Définir photo principale

// 2.4 Tarification
POST   /api/properties/:id/pricing           // Définir tarification
PUT    /api/properties/:id/pricing/:pricingId // Modifier prix
GET    /api/properties/:id/pricing           // Obtenir tarification

// 2.5 Disponibilités
POST   /api/properties/:id/availability      // Définir disponibilités
PUT    /api/properties/:id/availability/:availId // Modifier disponibilité
DELETE /api/properties/:id/availability/:availId // Supprimer période
GET    /api/properties/:id/availability      // Calendrier disponibilités

// ===========================================
// 3. RECHERCHE ET DÉCOUVERTE
// ===========================================

// 3.1 Recherche de base
GET    /api/properties/search               // Recherche propriétés avec filtres
GET    /api/properties/featured             // Propriétés mises en avant
GET    /api/properties/recent               // Propriétés récentes
GET    /api/properties/popular              // Propriétés populaires

// 3.2 Détails et vues
GET    /api/properties/:slug                // Détails propriété (public)
POST   /api/properties/:id/view             // Compteur de vues
GET    /api/properties/:id/similar          // Propriétés similaires

// 3.3 Localisation
GET    /api/locations/cities                // Villes disponibles
GET    /api/locations/districts/:city       // Quartiers par ville
GET    /api/locations/search               // Recherche auto-completion lieux

// ===========================================
// 4. FAVORIS ET RECHERCHES SAUVÉES
// ===========================================

// 4.1 Favoris
GET    /api/favorites                       // Mes favoris
POST   /api/favorites/:propertyId           // Ajouter aux favoris
DELETE /api/favorites/:propertyId           // Retirer des favoris
PUT    /api/favorites/:propertyId           // Modifier notes favoris

// 4.2 Recherches sauvegardées  
GET    /api/saved-searches                  // Mes recherches sauvées
POST   /api/saved-searches                  // Sauver recherche
PUT    /api/saved-searches/:id              // Modifier recherche sauvée
DELETE /api/saved-searches/:id              // Supprimer recherche sauvée

// ===========================================
// 5. COMMUNICATION DE BASE
// ===========================================

// 5.1 Conversations
GET    /api/conversations                   // Mes conversations
POST   /api/conversations                   // Créer conversation
GET    /api/conversations/:id               // Messages conversation
PUT    /api/conversations/:id/read          // Marquer comme lu

// 5.2 Messages
POST   /api/conversations/:id/messages      // Envoyer message
POST   /api/messages/:id/read               // Marquer message lu
PUT    /api/messages/:id                    // Modifier message
DELETE /api/messages/:id                    // Supprimer message

// ===========================================
// 6. RÉSERVATIONS DE BASE
// ===========================================

// 6.1 Demandes de réservation
POST   /api/booking-requests                // Créer demande
GET    /api/booking-requests                // Mes demandes (tenant/landlord)
GET    /api/booking-requests/:id            // Détails demande
PUT    /api/booking-requests/:id/respond    // Répondre à demande (accept/reject)
PUT    /api/booking-requests/:id/cancel     // Annuler demande
// 7.4 Paiements spécifiques
POST   /api/payments/rent                   // Paiement loyer
POST   /api/payments/deposit                // Paiement caution
POST   /api/payments/mobile-money           // Paiement Mobile Money
GET    /api/payments/:id/status             // Status paiement
GET    /api/payments/:id/receipt            // Reçu de paiement

// ===========================================
// 8. ÉVALUATIONS ET AVIS
// ===========================================

// 8.1 Avis de base
GET    /api/reviews/property/:propertyId    // Avis d'une propriété
GET    /api/reviews/user/:userId            // Avis d'un utilisateur
POST   /api/reviews                         // Créer avis
PUT    /api/reviews/:id                     // Modifier avis
DELETE /api/reviews/:id                     // Supprimer avis

// 8.2 Modération avis
GET    /api/reviews/pending                 // Avis en attente (admin)
PUT    /api/reviews/:id/moderate            // Modérer avis
POST   /api/reviews/:id/report              // Signaler avis
POST   /api/reviews/:id/helpful             // Vote utilité avis

// 8.3 Réponses aux avis
POST   /api/reviews/:id/response            // Répondre à avis
PUT    /api/reviews/:id/response            // Modifier réponse
DELETE /api/reviews/:id/response            // Supprimer réponse

// ===========================================
// 9. NOTIFICATIONS
// ===========================================

// 9.1 Gestion notifications
GET    /api/notifications                   // Mes notifications
PUT    /api/notifications/:id/read          // Marquer notification lue
PUT    /api/notifications/read-all          // Marquer toutes lues
DELETE /api/notifications/:id               // Supprimer notification
GET    /api/notifications/unread-count      // Compteur non lues

// 9.2 Préférences notifications
GET    /api/notifications/preferences       // Mes préférences
PUT    /api/notifications/preferences       // Modifier préférences
POST   /api/notifications/test              // Test notification

// ===========================================
// 10. ANALYTICS PROPRIÉTAIRES
// ===========================================

// 10.1 Dashboard propriétaire
GET    /api/analytics/dashboard             // Dashboard principal
GET    /api/analytics/properties            // Stats par propriété
GET    /api/analytics/bookings              // Stats réservations
GET    /api/analytics/revenue               // Stats revenus
GET    /api/analytics/reviews               // Stats avis reçus

// 10.2 Rapports
GET    /api/reports/monthly                 // Rapport mensuel
GET    /api/reports/yearly                  // Rapport annuel
GET    /api/reports/tax                     // Rapport fiscal
POST   /api/reports/export                  // Export données


// ===========================================
// 11. ADMINISTRATION AVANCÉE
// ===========================================

// 11.1 Gestion utilisateurs (Admin)
GET    /api/admin/users                     // Liste utilisateurs
GET    /api/admin/users/:id                 // Détails utilisateur
PUT    /api/admin/users/:id/status          // Changer status utilisateur
POST   /api/admin/users/:id/verify          // Vérifier utilisateur
GET    /api/admin/users/verification-queue  // Queue vérifications

// 11.2 Gestion propriétés (Admin)
GET    /api/admin/properties                // Toutes les propriétés
PUT    /api/admin/properties/:id/moderate   // Modérer propriété
GET    /api/admin/properties/pending        // Propriétés en attente
POST   /api/admin/properties/:id/feature    // Mettre en avant

// 11.3 Gestion financière (Admin)
GET    /api/admin/transactions              // Toutes transactions
GET    /api/admin/revenue                   // Revenus plateforme
GET    /api/admin/commissions               // Commissions générées
POST   /api/admin/refunds/:id               // Autoriser remboursement

// 11.4 Paramètres système
GET    /api/admin/settings                  // Paramètres système
PUT    /api/admin/settings/:key             // Modifier paramètre
GET    /api/admin/logs                      // Logs système
GET    /api/admin/stats                     // Statistiques globales

// ===========================================
// 12. SERVICES AVANCÉS
// ===========================================

// 12.1 Services partenaires
GET    /api/services/movers                 // Déménageurs partenaires
POST   /api/services/movers/request         // Demande déménagement
GET    /api/services/cleaning               // Services nettoyage
POST   /api/services/cleaning/book          // Réserver nettoyage
GET    /api/services/insurance              // Assurances disponibles
POST   /api/services/insurance/quote        // Devis assurance

// 12.2 Inspection propriétés
POST   /api/inspections/request             // Demander inspection
GET    /api/inspections/:id                 // Rapport inspection
PUT    /api/inspections/:id/schedule        // Planifier inspection
GET    /api/inspections/history             // Historique inspections

// 12.3 Maintenance
POST   /api/maintenance/request             // Demande maintenance
GET    /api/maintenance                     // Mes demandes maintenance
PUT    /api/maintenance/:id/status          // Modifier status
POST   /api/maintenance/:id/quote           // Ajouter devis

// ===========================================
// 13. IA ET FONCTIONNALITÉS INTELLIGENTES
// ===========================================

// 13.1 Recommandations IA
GET    /api/ai/recommendations/:userId      // Recommandations personnalisées
POST   /api/ai/price-suggestion             // Suggestion prix propriété
GET    /api/ai/market-analysis/:area        // Analyse marché zone
POST   /api/ai/description-enhance          // Améliorer description IA

// 13.2 Analyse d'images
POST   /api/ai/image-analysis               // Analyse qualité photos
POST   /api/ai/object-detection             // Détection objets dans photos
POST   /api/ai/image-enhancement            // Amélioration photos

// 13.3 Détection de fraude
POST   /api/ai/fraud-check                  // Vérification fraude
GET    /api/ai/risk-score/:userId           // Score de risque utilisateur
POST   /api/ai/content-moderation           // Modération contenu automatique

// ===========================================
// 14. API PUBLIQUE ET WEBHOOKS
// ===========================================

// 14.1 API publique
GET    /api/public/properties               // Propriétés publiques
GET    /api/public/locations                // Données localisation
GET    /api/public/stats                    // Stats publiques plateforme
GET    /api/public/categories               // Catégories publiques

// 14.2 Webhooks
POST   /api/webhooks/payment-success        // Callback paiement réussi
POST   /api/webhooks/payment-failed         // Callback paiement échoué
POST   /api/webhooks/mobile-money           // Callback Mobile Money
POST   /api/webhooks/sms-delivery           // Callback SMS

// 14.3 Intégrations tierces
GET    /api/integrations/calendar           // Synchronisation calendrier
POST   /api/integrations/social-media       // Partage réseaux sociaux
GET    /api/integrations/weather            // Données météo par zone
POST   /api/integrations/maps               // Intégration cartes

// ===========================================
// 15. RECHERCHE ET FILTRES AVANCÉS
// ===========================================

// 15.1 Recherche géographique
POST   /api/search/geo                      // Recherche par coordonnées
GET    /api/search/nearby                   // Propriétés à proximité
POST   /api/search/route                    // Propriétés sur trajet
GET    /api/search/polygon                  // Recherche dans zone

// 15.2 Recherche intelligente
POST   /api/search/semantic                 // Recherche sémantique
GET    /api/search/suggestions              // Suggestions recherche
POST   /api/search/similar                  // Propriétés similaires
GET    /api/search/trending                 // Recherches tendances

// 15.3 Filtres avancés
GET    /api/search/filters                  // Tous filtres disponibles
POST   /api/search/custom-filter            // Créer filtre personnalisé
GET    /api/search/price-range              // Fourchettes prix par zone
GET    /api/search/amenities-popular        // Équipements les plus demandés

// ===========================================
// 16. MOBILE ET FONCTIONNALITÉS NATIVES
// ===========================================

// 16.1 Géolocalisation mobile
POST   /api/mobile/location                 // Enregistrer position
GET    /api/mobile/nearby-properties        // Propriétés à proximité GPS
POST   /api/mobile/check-in                 // Check-in géolocalisé
GET    /api/mobile/directions               // Itinéraires vers propriété

// 16.2 Notifications push
POST   /api/mobile/register-device          // Enregistrer device push
PUT    /api/mobile/update-token             // Mettre à jour token
POST   /api/mobile/send-push                // Envoyer notification
GET    /api/mobile/push-history             // Historique push

// 16.3 Fonctionnalités hors ligne
GET    /api/mobile/offline-data             // Données pour mode offline
POST   /api/mobile/sync                     // Synchronisation données
GET    /api/mobile/cached-searches          // Recherches en cache

// ===========================================
// 17. SUPPORT ET ASSISTANCE
// ===========================================

// 17.1 Support client
POST   /api/support/tickets                 // Créer ticket support
GET    /api/support/tickets                 // Mes tickets
GET    /api/support/tickets/:id             // Détails ticket
PUT    /api/support/tickets/:id             // Mise à jour ticket
POST   /api/support/tickets/:id/message     // Ajouter message ticket

// 17.2 Chat en direct
POST   /api/support/chat/start              // Démarrer chat
GET    /api/support/chat/:sessionId         // Messages chat
POST   /api/support/chat/:sessionId/message // Envoyer message chat
PUT    /api/support/chat/:sessionId/end     // Terminer chat

// 17.3 FAQ et aide
GET    /api/support/faq                     // Questions fréquentes
GET    /api/support/faq/categories          // Catégories FAQ
GET    /api/support/articles                // Articles d'aide
POST   /api/support/feedback                // Feedback utilisateur

// ===========================================
// 18. EXPORTS ET RAPPORTS
// ===========================================

// 18.1 Exports utilisateur
GET    /api/exports/my-data                 // Export données personnelles
POST   /api/exports/bookings                // Export réservations
POST   /api/exports/transactions            // Export transactions
POST   /api/exports/properties              // Export mes propriétés

// 18.2 Rapports avancés
POST   /api/reports/custom                  // Rapport personnalisé
GET    /api/reports/templates               // Modèles de rapports
POST   /api/reports/schedule                // Programmer rapport
GET    /api/reports/scheduled               // Rapports programmés

// ===========================================
// 19. GESTION DES MÉDIAS AVANCÉE
// ===========================================

// 19.1 Upload et traitement
POST   /api/media/upload                    // Upload avec traitement
POST   /api/media/bulk-upload               // Upload multiple
GET    /api/media/:id/variants              // Variantes d'image
POST   /api/media/compress                  // Compression images
POST   /api/media/watermark                 // Ajout filigrane

// 19.2 Galeries et albums
POST   /api/media/albums                    // Créer album
GET    /api/media/albums/:id                // Contenu album
PUT    /api/media/albums/:id/reorder        // Réorganiser album
POST   /api/media/360-tours                 // Upload visite 360°

// ===========================================
// 20. SÉCURITÉ ET AUDIT
// ===========================================

// 20.1 Audit et logs
GET    /api/audit/logs                      // Logs d'audit
GET    /api/audit/user/:userId              // Activité utilisateur
POST   /api/audit/report                    // Rapport d'incident
GET    /api/audit/suspicious-activity       // Activités suspectes

// 20.2 Sécurité utilisateur
GET    /api/security/sessions               // Sessions actives
DELETE /api/security/sessions/:id           // Fermer session
POST   /api/security/2fa/enable             // Activer 2FA
POST   /api/security/2fa/verify             // Vérifier 2FA
GET    /api/security/login-history          // Historique connexions

// 20.3 Signalements et modération
POST   /api/reports/user                    // Signaler utilisateur
POST   /api/reports/property                // Signaler propriété
GET    /api/reports/my-reports              // Mes signalements
PUT    /api/reports/:id/status              // Mise à jour signalement
```

---

## **📊 PRIORITÉS DE DÉVELOPPEMENT DÉTAILLÉES**

### **🔥 PRIORITÉ 1 - MVP ESSENTIEL (Semaines 1-8)**
```
OBJECTIF: Plateforme fonctionnelle pour location de base

ENDPOINTS CRITIQUES (40 endpoints):
├─ Authentification complète (8 endpoints)
├─ Gestion propriétés de base (12 endpoints)
├─ Recherche simple (6 endpoints)
├─ Communication basique (8 endpoints)
├─ Réservations simples (6 endpoints)

FONCTIONNALITÉS CLÉS:
✅ Inscription/Connexion sécurisée
✅ Créer et publier propriétés avec photos
✅ Rechercher et filtrer propriétés
✅ Contacter propriétaires
✅ Faire et répondre aux demandes de location
✅ Profils utilisateurs de base
✅ Favoris et recherches sauvées

TECHNOLOGIES:
├─ Backend: Node.js + Express + TypeScript
├─ DB: PostgreSQL avec migrations
├─ Auth: JWT + Refresh tokens
├─ Upload: Multer + stockage cloud
├─ Email: SendGrid ou équivalent local
```

### **⭐ PRIORITÉ 2 - FONCTIONNALITÉS BUSINESS (Semaines 9-16)**
```
OBJECTIF: Monétisation et engagement utilisateurs

ENDPOINTS INTERMÉDIAIRES (45 endpoints):
├─ Paiements et wallet (15 endpoints)
├─ Contrats et signatures (8 endpoints)
├─ Système d'avis complet (12 endpoints)
├─ Analytics propriétaires (10 endpoints)

FONCTIONNALITÉS CLÉS:
✅ Paiements Mobile Money (T-Money, Flooz)
✅ Contrats numériques avec signatures
✅ Système d'avis bidirectionnel
✅ Dashboard analytics pour propriétaires
✅ Commission et revenus plateforme
✅ Notifications push et email
✅ Modération de contenu

TECHNOLOGIES:
├─ Paiements: SDK Mobile Money
├─ PDF: jsPDF pour contrats
├─ Push: Firebase Cloud Messaging
├─ Analytics: Mixpanel ou custom
├─ Cron: node-cron pour tâches automatisées
```

### **🚀 PRIORITÉ 3 - DIFFÉRENCIATION (Semaines 17-24)**
```
OBJECTIF: Fonctionnalités uniques et expansion

ENDPOINTS AVANCÉS (60 endpoints):
├─ Administration complète (20 endpoints)
├─ Services partenaires (15 endpoints)
├─ IA et recommandations (12 endpoints)
├─ API publique (8 endpoints)
├─ Support avancé (5 endpoints)

FONCTIONNALITÉS CLÉS:
✅ Panel d'administration complet
✅ Services déménagement/nettoyage
✅ Recommandations IA personnalisées
✅ API publique pour partenaires
✅ Support client intégré
✅ Audit et sécurité avancés
✅ Rapports et exports

TECHNOLOGIES:
├─ Admin: React Admin ou custom
├─ IA: TensorFlow.js ou API OpenAI
├─ Maps: Mapbox GL JS
├─ Search: Elasticsearch
├─ Queue: Redis + Bull
```

---

## **🏗️ STRUCTURE BACKEND RECOMMANDÉE**
```
src/
├── config/
│   ├── database.ts                 # Configuration PostgreSQL
│   ├── redis.ts                    # Configuration Redis
│   ├── auth.ts                     # Configuration JWT
│   ├── upload.ts                   # Configuration stockage fichiers
│   └── constants.ts                # Constantes application
│
├── controllers/
│   ├── auth.controller.ts          # Authentification
│   ├── users.controller.ts         # Gestion utilisateurs
│   ├── properties.controller.ts    # Gestion propriétés
│   ├── search.controller.ts        # Recherche et filtres
│   ├── bookings.controller.ts      # Réservations
│   ├── payments.controller.ts      # Paiements
│   ├── messages.controller.ts      # Communication
│   ├── reviews.controller.ts       # Avis et évaluations
│   ├── notifications.controller.ts # Notifications
│   └── admin.controller.ts         # Administration
│
├── middleware/
│   ├── auth.middleware.ts          # Vérification JWT
│   ├── roles.middleware.ts         # Vérification rôles
│   ├── validation.middleware.ts    # Validation données
│   ├── ratelimit.middleware.ts     # Limitation débit
│   ├── upload.middleware.ts        # Upload fichiers
│   └── error.middleware.ts         # Gestion erreurs
│
├── models/
│   ├── User.ts                     # Modèle utilisateur
│   ├── Property.ts                 # Modèle propriété
│   ├── Booking.ts                  # Modèle réservation
│   ├── Transaction.ts              # Modèle transaction
│   ├── Message.ts                  # Modèle message
│   └── index.ts                    # Export modèles
│
├── services/
│   ├── auth.service.ts             # Services authentification
│   ├── email.service.ts            # Services email
│   ├── sms.service.ts              # Services SMS
│   ├── payment.service.ts          # Services paiement
│   ├── upload.service.ts           # Services upload
│   ├── notification.service.ts     # Services notifications
│   └── search.service.ts           # Services recherche
│
├── utils/
│   ├── database.ts                 # Utilities base données
│   ├── encryption.ts               # Chiffrement
│   ├── validation.ts               # Schémas validation
│   ├── helpers.ts                  # Fonctions utilitaires
│   └── types.ts                    # Types TypeScript
│
├── routes/
│   ├── auth.routes.ts              # Routes authentification
│   ├── users.routes.ts             # Routes utilisateurs
│   ├── properties.routes.ts        # Routes propriétés
│   ├── search.routes.ts            # Routes recherche
│   ├── bookings.routes.ts          # Routes réservations
│   ├── payments.routes.ts          # Routes paiements
│   ├── messages.routes.ts          # Routes messages
│   ├── reviews.routes.ts           # Routes avis
│   ├── admin.routes.ts             # Routes admin
│   └── index.ts                    # Routes principales
│
├── migrations/
│   ├── 001_create_users.sql        # Migration utilisateurs
│   ├── 002_create_properties.sql   # Migration propriétés
│   ├── 003_create_bookings.sql     # Migration réservations
│   └── ...                         # Autres migrations
│
├── seeds/
│   ├── categories.seed.ts          # Données catégories
│   ├── admin.seed.ts               # Utilisateur admin
│   └── settings.seed.ts            # Paramètres initiaux
│
├── tests/
│   ├── auth.test.ts                # Tests authentification
│   ├── properties.test.ts          # Tests propriétés
│   ├── bookings.test.ts            # Tests réservations
│   └── ...                         # Autres tests
│
├── docs/
│   ├── api.md                      # Documentation API
│   ├── database.md                 # Documentation DB
│   └── deployment.md               # Guide déploiement
│
├── app.ts                          # Configuration Express
├── server.ts                       # Point d'entrée serveur
└── package.json                    # Dépendances Node.js