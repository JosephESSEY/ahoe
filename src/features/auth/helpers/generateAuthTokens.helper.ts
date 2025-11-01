import {
  User,
  TokenResponse
} from '../auth.model';

import {
  generateAccessToken,
  generateRefreshToken
} from '../../../shared/utils/jwt.utils';

export function generateAuthTokens(user: User, rememberMe: boolean = false): TokenResponse{
    // Generate access token (15 minutes)
    const accessToken = generateAccessToken(user.id, user.email, user.phone, user.role);

    // Generate refresh token (7 days or 30 days if remember_me)
    const refreshToken = generateRefreshToken(user.id, rememberMe);

    // Save refresh token
    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes
      expiresAt: expiresAt,
      token_type: 'Bearer',
    };
  }