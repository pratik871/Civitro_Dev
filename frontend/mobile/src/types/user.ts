export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  civicScore: number;
  ward: string;
  constituency: string;
  district: string;
  state: string;
  issuesReported: number;
  issuesResolved: number;
  voicesCreated: number;
  pollsVoted: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginRequest {
  phone: string;
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email?: string;
  ward: string;
  constituency: string;
}
