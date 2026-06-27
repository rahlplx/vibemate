import type { AuthManager, AuthToken } from './auth.js';

export interface AuthCheck {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
  userId?: string;
  tier?: string;
}

export interface AuthMiddleware {
  requireTier(minTier: AuthToken['tier'], tokenKey?: string): AuthCheck;
  requireAuth(tokenKey?: string): AuthCheck;
  getTierDisplay(tier: AuthToken['tier']): string;
}

const TIER_RANK: Record<AuthToken['tier'], number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

const TIER_LABELS: Record<AuthToken['tier'], string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
};

export function createAuthMiddleware(auth: AuthManager): AuthMiddleware {
  function getTokenKey(key?: string): string {
    return key ?? 'default';
  }

  return {
    requireTier(minTier: AuthToken['tier'], tokenKey?: string): AuthCheck {
      const key = getTokenKey(tokenKey);
      if (minTier === 'free') return { allowed: true };

      const token = auth.getToken(key);
      if (token === undefined) {
        return {
          allowed: false,
          reason: `Pro feature. Run \`vibemate auth login\` to upgrade.`,
          upgradeUrl: 'https://vibemate.dev/auth/login',
          tier: minTier,
        };
      }
      if (token === null) {
        return {
          allowed: false,
          reason: `Token expired. Run \`vibemate auth login\` to re-authenticate.`,
          upgradeUrl: 'https://vibemate.dev/auth/login',
          tier: minTier,
        };
      }

      const userRank = TIER_RANK[token.tier] ?? 0;
      const requiredRank = TIER_RANK[minTier] ?? 0;

      if (userRank < requiredRank) {
        return {
          allowed: false,
          reason: `Upgrade from ${TIER_LABELS[token.tier]} to ${TIER_LABELS[minTier]} to use this feature.`,
          upgradeUrl: `https://vibemate.dev/upgrade?from=${token.tier}&to=${minTier}`,
          tier: minTier,
        };
      }

      return { allowed: true, userId: token.userId };
    },

    requireAuth(tokenKey?: string): AuthCheck {
      const key = getTokenKey(tokenKey);
      const token = auth.getToken(key);
      if (token === undefined) {
        return { allowed: false, reason: 'Not authenticated. Run `vibemate auth login`.' };
      }
      if (token === null) {
        return { allowed: false, reason: 'Token expired. Run `vibemate auth login` to re-authenticate.' };
      }
      return { allowed: true, userId: token.userId };
    },

    getTierDisplay(tier: AuthToken['tier']): string {
      return TIER_LABELS[tier];
    },
  };
}
