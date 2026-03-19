export type VoiceSentiment = 'positive' | 'negative' | 'neutral';

export interface Voice {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  content: string;
  text?: string;
  category: string;
  sentiment: VoiceSentiment;
  ward: string;
  constituency: string;
  upvotes: number;
  commentCount: number;
  hasUpvoted: boolean;
  hasBookmarked?: boolean;
  tags: string[];
  hashtags?: string[];
  mediaUrls?: string[];
  language?: string;
  likesCount?: number;
  repliesCount?: number;
  sharesCount?: number;
  createdAt: string;
}
