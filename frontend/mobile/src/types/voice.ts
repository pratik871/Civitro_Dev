export type VoiceSentiment = 'positive' | 'negative' | 'neutral';

export interface Voice {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  content: string;
  category: string;
  sentiment: VoiceSentiment;
  ward: string;
  constituency: string;
  upvotes: number;
  commentCount: number;
  hasUpvoted: boolean;
  tags: string[];
  createdAt: string;
}
