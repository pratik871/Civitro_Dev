"use client";

import { useState } from "react";
import { Plus, TrendingUp, Clock as ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceCard } from "@/components/voices/voice-card";
import type { Voice } from "@/types";
import { cn } from "@/lib/utils";

const MOCK_VOICES: Voice[] = [
  {
    id: "v1",
    content: "The new flyover at Silk Board junction has significantly reduced my commute time. Kudos to the BBMP for completing it on schedule. This is what good governance looks like!",
    type: "appreciation",
    author: { id: "u1", name: "Priya Sharma", isVerified: true },
    tags: ["infrastructure", "traffic", "bbmp"],
    upvotes: 234,
    downvotes: 12,
    commentCount: 18,
    isAnonymous: false,
    location: { city: "Bengaluru", state: "Karnataka" },
    createdAt: "2026-03-09T14:30:00Z",
  },
  {
    id: "v2",
    content: "Why are there no public toilets near Lalbagh? Thousands of people visit every weekend but basic amenities are missing. Our leaders need to prioritize public hygiene infrastructure.",
    type: "complaint",
    author: { id: "u2", name: "Anonymous", isVerified: false },
    tags: ["hygiene", "public-facilities"],
    upvotes: 189,
    downvotes: 5,
    commentCount: 24,
    isAnonymous: true,
    location: { city: "Bengaluru", state: "Karnataka" },
    createdAt: "2026-03-08T10:00:00Z",
  },
  {
    id: "v3",
    content: "Suggestion: We should implement a rainwater harvesting mandate for all new buildings in Bengaluru. The water crisis is getting worse every summer and we need proactive solutions.",
    type: "suggestion",
    author: { id: "u3", name: "Karthik Rao", isVerified: true },
    tags: ["water", "environment", "policy"],
    upvotes: 445,
    downvotes: 23,
    commentCount: 56,
    isAnonymous: false,
    location: { city: "Bengaluru", state: "Karnataka" },
    createdAt: "2026-03-07T16:00:00Z",
  },
  {
    id: "v4",
    content: "Is there any update on the metro Phase 3 timeline? The original deadline has passed and we haven't heard anything from the authorities. Transparency matters.",
    type: "question",
    author: { id: "u4", name: "Aisha Khan", isVerified: true },
    tags: ["metro", "transport", "timeline"],
    upvotes: 312,
    downvotes: 8,
    commentCount: 34,
    isAnonymous: false,
    location: { city: "Bengaluru", state: "Karnataka" },
    createdAt: "2026-03-06T09:15:00Z",
  },
  {
    id: "v5",
    content: "In my opinion, the government should focus more on improving government school infrastructure rather than building new ones. Quality over quantity.",
    type: "opinion",
    author: { id: "u5", name: "Deepa Menon", isVerified: false },
    tags: ["education", "schools", "infrastructure"],
    upvotes: 178,
    downvotes: 45,
    commentCount: 42,
    isAnonymous: false,
    location: { city: "Kochi", state: "Kerala" },
    createdAt: "2026-03-05T11:30:00Z",
  },
];

type SortMode = "trending" | "recent";

export default function VoicesPage() {
  const [sortMode, setSortMode] = useState<SortMode>("trending");

  const sorted = [...MOCK_VOICES].sort((a, b) => {
    if (sortMode === "trending") return b.upvotes - a.upvotes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Voices</h1>
          <p className="page-subtitle">
            Share opinions, suggestions, and feedback with your community
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Raise Voice
        </Button>
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-1 bg-white rounded-btn p-1 border border-gray-200 w-fit mb-6">
        <button
          onClick={() => setSortMode("trending")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            sortMode === "trending"
              ? "bg-saffron text-white"
              : "text-gray-600 hover:bg-gray-50",
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Trending
        </button>
        <button
          onClick={() => setSortMode("recent")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            sortMode === "recent"
              ? "bg-saffron text-white"
              : "text-gray-600 hover:bg-gray-50",
          )}
        >
          <ClockIcon className="w-4 h-4" />
          Recent
        </button>
      </div>

      {/* Voices list */}
      <div className="space-y-4">
        {sorted.map((voice) => (
          <VoiceCard key={voice.id} voice={voice} />
        ))}
      </div>
    </div>
  );
}
