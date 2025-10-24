import { RoleType } from '../../features/auth/auth.model';

export enum Permission {
  // Propriétés
  PROPERTIES_CREATE = 'properties:create',
  PROPERTIES_READ_ALL = 'properties:read:all',
  PROPERTIES_UPDATE_OWN = 'properties:update:own',
  PROPERTIES_UPDATE_ANY = 'properties:update:any',
  PROPERTIES_DELETE = 'properties:delete',
  PROPERTIES_MODERATE = 'properties:moderate',
  
  // Utilisateurs
  USERS_READ_OWN = 'users:read:own',
  USERS_UPDATE_OWN = 'users:update:own',
  USERS_READ_ALL = 'users:read:all',
  USERS_UPDATE_ANY = 'users:update:any',
  USERS_DELETE = 'users:delete',
  
  // Réservations
  BOOKINGS_CREATE = 'bookings:create',
  BOOKINGS_READ_OWN = 'bookings:read:own',
  BOOKINGS_READ_ALL = 'bookings:read:all',
  BOOKINGS_CANCEL = 'bookings:cancel',
  
  // Admin
  ADMIN_ACCESS = 'admin:access',
  ADMIN_MODERATE = 'admin:moderate',
  ADMIN_SETTINGS = 'admin:settings',
}

// Mapping des permissions par rôle
export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  [RoleType.TENANT]: [
    Permission.PROPERTIES_CREATE, // Pour brouillons (cas utilisateur mixte)
    Permission.USERS_READ_OWN,
    Permission.USERS_UPDATE_OWN,
    Permission.BOOKINGS_CREATE,
    Permission.BOOKINGS_READ_OWN,
  ],
  
  [RoleType.LANDLORD]: [
    Permission.PROPERTIES_CREATE,
    Permission.PROPERTIES_UPDATE_OWN,
    Permission.PROPERTIES_DELETE,
    Permission.USERS_READ_OWN,
    Permission.USERS_UPDATE_OWN,
    Permission.BOOKINGS_READ_OWN, // Reçus
  ],
  
  [RoleType.AGENT]: [
    Permission.PROPERTIES_CREATE,
    Permission.PROPERTIES_UPDATE_ANY, // Peut modifier propriétés clients
    Permission.USERS_READ_ALL, // Pour gérer clients
    Permission.BOOKINGS_READ_ALL,
  ],
  
  [RoleType.ADMIN]: [
    Permission.PROPERTIES_READ_ALL,
    Permission.PROPERTIES_MODERATE,
    Permission.USERS_READ_ALL,
    Permission.USERS_UPDATE_ANY,
    Permission.BOOKINGS_READ_ALL,
    Permission.ADMIN_ACCESS,
    Permission.ADMIN_MODERATE,
  ],
  
  [RoleType.SUPER_ADMIN]: [
    ...Object.values(Permission), // TOUTES les permissions
  ],
};