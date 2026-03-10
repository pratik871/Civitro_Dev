export type VoiceType = "opinion" | "suggestion" | "complaint" | "appreciation" | "question";

export interface Voice {
  id: string;
  content: string;
  type: VoiceType;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  category?: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  commentCount: number;
  isAnonymous: boolean;
  location?: {
    city: string;
    state: string;
  };
  createdAt: string;
}
