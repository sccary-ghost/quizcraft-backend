export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  role: "ADMIN" | "CANDIDATE";
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
