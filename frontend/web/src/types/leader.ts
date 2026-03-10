export type LeaderLevel = "ward" | "municipal" | "state" | "national";

export interface LeaderRating {
  overall: number;
  accessibility: number;
  responsiveness: number;
  transparency: number;
  delivery: number;
  totalRatings: number;
}

export interface Leader {
  id: string;
  name: string;
  avatar?: string;
  party?: string;
  designation: string;
  level: LeaderLevel;
  constituency: string;
  state: string;
  chi: number;
  rating: LeaderRating;
  issuesResolved: number;
  issuesTotal: number;
  promisesKept: number;
  promisesTotal: number;
  responseTime: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Promise {
  id: string;
  leaderId: string;
  leaderName: string;
  title: string;
  description: string;
  category: string;
  status: "pending" | "in_progress" | "fulfilled" | "broken" | "partially_fulfilled";
  deadline?: string;
  evidence?: string[];
  citizenVerifications: number;
  createdAt: string;
  updatedAt: string;
}
