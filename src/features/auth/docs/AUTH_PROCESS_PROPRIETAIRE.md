```markdown
# Processus d'Authentification - PROPRIÉTAIRE

## Vue d'ensemble

Ce document décrit le processus d'authentification pour un **propriétaire/bailleur** sur Ahoé. Le processus diffère légèrement du locataire car le rôle nécessite une vérification supplémentaire.

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