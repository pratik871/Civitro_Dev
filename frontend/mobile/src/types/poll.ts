export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  category: string;
  ward?: string;
  constituency?: string;
  options: PollOption[];
  totalVotes: number;
  hasVoted: boolean;
  selectedOptionId?: string;
  createdBy: string;
  createdByName: string;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
}
