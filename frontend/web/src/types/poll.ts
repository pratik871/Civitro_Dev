export type PollStatus = "draft" | "active" | "closed" | "results_published";

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
  options: PollOption[];
  status: PollStatus;
  totalVotes: number;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  category?: string;
  scope: "ward" | "city" | "state" | "national";
  startDate: string;
  endDate: string;
  createdAt: string;
  hasVoted?: boolean;
  selectedOption?: string;
}
