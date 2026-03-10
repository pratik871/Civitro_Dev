export type UserRole = "citizen" | "leader" | "official" | "admin" | "moderator";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  constituencyId?: string;
  wardId?: string;
  city?: string;
  state?: string;
  pincode?: string;
  civicScore: number;
  isVerified: boolean;
  isActive: boolean;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  state: string;
  pincode: string;
  preferredLanguage?: string;
}
