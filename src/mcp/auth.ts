export interface AuthToken {
  token: string;
  expiresAt?: number;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  userId?: string;
}

export interface TokenValidation {
  valid: boolean;
  tier?: 'free' | 'pro' | 'team' | 'enterprise';
  reason?: 'no_token' | 'expired' | 'invalid';
}

export interface AuthManager {
  storeToken(key: string, token: AuthToken): void;
  getToken(key: string): AuthToken | undefined | null;
  validateToken(key: string): TokenValidation;
  revokeToken(key: string): void;
  getTier(key: string): 'free' | 'pro' | 'team' | 'enterprise';
  hasToken(key: string): boolean;
  allTokens(): Record<string, AuthToken>;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface LocalServer {
  port: number;
  close(): void;
}

export interface OAuthClient {
  generateAuthUrl(): string;
  validateState(state: string): boolean;
  exchangeCode(code: string): Promise<AuthToken>;
  startLocalServer(port: number): Promise<LocalServer>;
}

export function createOAuthClient(config: OAuthConfig): OAuthClient {
  let currentState: string | undefined;

  function generateState(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  return {
    generateAuthUrl(): string {
      currentState = generateState();
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: currentState,
      });
      return `${config.authorizeUrl}?${params.toString()}`;
    },

    validateState(state: string): boolean {
      if (state === currentState) {
        currentState = undefined;
        return true;
      }
      return false;
    },

    async exchangeCode(code: string): Promise<AuthToken> {
      if (!code) throw new Error('authorization code is required');
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
      });
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Token exchange failed (${response.status}): ${text}`);
      }
      const data = await response.json() as {
        access_token: string;
        expires_in?: number;
        tier?: 'free' | 'pro' | 'team' | 'enterprise';
        user_id?: string;
      };
      if (!data.access_token) throw new Error('Token response missing access_token');
      return {
        token: data.access_token,
        tier: data.tier ?? 'free',
        userId: data.user_id,
        expiresAt: data.expires_in != null ? Date.now() + data.expires_in * 1000 : undefined,
      };
    },

    async startLocalServer(port: number): Promise<LocalServer> {
      const http = await import('http');
      return new Promise((resolve, reject) => {
        const server = http.createServer((_req, res) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Authentication complete.</h1><p>You may close this window.</p></body></html>');
          server.close();
        });
        server.on('error', (err: NodeJS.ErrnoException) => {
          reject(new Error(`Port ${port} in use: ${err.message}`));
        });
        server.listen(port, '127.0.0.1', () => {
          resolve({
            port,
            close() { server.close(); },
          });
        });
      });
    },
  };
}
export function createAuthManager(initialTokens?: Record<string, AuthToken>): AuthManager {
  const tokens = new Map<string, AuthToken>(Object.entries(initialTokens ?? {}));

  function isExpired(token: AuthToken): boolean {
    return token.expiresAt !== undefined && token.expiresAt < Date.now();
  }

  function getValidToken(key: string): AuthToken | undefined | null {
    const token = tokens.get(key);
    if (!token) return undefined;
    if (isExpired(token)) return null;
    return token;
  }

  return {
    storeToken(key: string, token: AuthToken): void {
      tokens.set(key, token);
    },

    getToken(key: string): AuthToken | undefined | null {
      return getValidToken(key);
    },

    validateToken(key: string): TokenValidation {
      const token = getValidToken(key);
      if (token === undefined) return { valid: false, reason: 'no_token' };
      if (token === null) return { valid: false, reason: 'expired' };
      return { valid: true, tier: token.tier };
    },

    revokeToken(key: string): void {
      tokens.delete(key);
    },

    getTier(key: string): 'free' | 'pro' | 'team' | 'enterprise' {
      const token = getValidToken(key);
      if (!token) return 'free';
      return token.tier;
    },

    hasToken(key: string): boolean {
      const token = getValidToken(key);
      return token !== undefined && token !== null;
    },

    allTokens(): Record<string, AuthToken> {
      const result: Record<string, AuthToken> = {};
      for (const [key, token] of tokens) {
        if (!isExpired(token)) {
          result[key] = token;
        }
      }
      return result;
    },
  };
}
