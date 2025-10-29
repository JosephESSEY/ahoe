import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleUserData {
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
}

/**
 * Vérifie le token Google et retourne les infos de l'utilisateur
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserData> {
  if (!idToken) {
    throw { statusCode: 400, message: 'Token Google manquant' };
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw { statusCode: 400, message: 'Token Google invalide' };
  }

  return {
    email: payload.email,
    first_name: payload.given_name || '',
    last_name: payload.family_name || '',
    avatar_url: payload.picture || null,
  };
}
