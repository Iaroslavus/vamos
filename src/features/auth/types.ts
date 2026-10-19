export type AuthUser = {
  id: string;
  email?: string | null;
  new_email?: string | null;
  is_anonymous?: boolean;
};

export type AuthSession = {
  user: AuthUser;
};

export type GatewayError = {
  message: string;
  code?: string;
  status?: number;
};

export type AuthGateway = {
  getSession: () => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  signInAnonymously: () => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  updateUserEmail: (
    email: string,
  ) => Promise<{ user: AuthUser | null; error: GatewayError | null }>;
  verifyEmailChange: (
    email: string,
    token: string,
  ) => Promise<{ session: AuthSession | null; error: GatewayError | null }>;
  signOut: () => Promise<{ error: GatewayError | null }>;
  onAuthStateChange: (listener: (session: AuthSession | null) => void) => () => void;
};
