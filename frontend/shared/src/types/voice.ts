// ---------------------------------------------------------------------------
// Voice (citizen social feed) types — mirrors backend voices model
// ---------------------------------------------------------------------------

/** Reaction types a user can perform on a voice post. */
export type ReactionType = 'like' | 'share' | 'bookmark';

/** Maximum allowed character count for voice text. */
export const MAX_VOICE_TEXT_LENGTH = 500;

/** Geographic location coordinates. */
export interface Location {
  lat: number;
  lng: number;
}

/** A citizen voice post (short-form social post). */
export interface Voice {
  id: string;
  userId: string;
  text: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  location?: Location;
  /** BCP-47 language code of the original text. */
  language?: string;
  /** Map of language code to translated text. */
  translations?: Record<string, string>;
  likesCount: number;
  repliesCount: number;
  sharesCount: number;
  createdAt: string;
}

/** A user's reaction to a voice post. */
export interface VoiceReaction {
  voiceId: string;
  userId: string;
  type: ReactionType;
}

/** A translation of a voice post into another language. */
export interface Translation {
  /** Source language code. */
  sourceLanguage: string;
  /** Target language code. */
  targetLanguage: string;
  /** Translated text. */
  text: string;
}

// ---- Request DTOs ----

export interface CreateVoiceRequest {
  text: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  location?: Location;
  language?: string;
}

// ---- Response DTOs ----

export interface FeedResponse {
  voices: Voice[];
  nextCursor?: string;
}

export interface HashtagResponse {
  hashtag: string;
  voices: Voice[];
  count: number;
}
