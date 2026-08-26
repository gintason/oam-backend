/** The authenticated user, as returned by /auth/me/ and the auth endpoints. */
export type User = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  preferred_language: string;
  auth_provider: string;
  is_verified: boolean;
};

export type AuthTokens = { access: string; refresh: string };

/** register / verify-otp / login all return this envelope. */
export type AuthResult = { user: User; tokens: AuthTokens };
