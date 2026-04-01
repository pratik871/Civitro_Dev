import { Metadata } from "next";
import SharePageClient from "@/components/share/SharePageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.civitro.com";

interface VoiceData {
  id: string;
  text: string;
  user_id: string;
  hashtags?: string[];
  likes_count: number;
  replies_count: number;
  created_at: string;
}

async function getVoice(id: string): Promise<VoiceData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/voices/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.voice ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const voice = await getVoice(params.id);
  const text = voice?.text ?? "Community Voice on Civitro";
  const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;
  const engagement = (voice?.likes_count ?? 0) + (voice?.replies_count ?? 0);
  const desc = engagement > 0
    ? `${engagement} people engaged with this. Join the conversation.`
    : "Shared from Civitro — Democracy You Shape.™";

  return {
    title: `${truncated} — Civitro`,
    description: desc,
    openGraph: { title: truncated, description: desc, type: "article", siteName: "Civitro" },
    twitter: { card: "summary", title: truncated, description: desc },
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function ShareVoicePage({ params }: { params: { id: string } }) {
  const voice = await getVoice(params.id);

  if (!voice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Voice not found</h1>
          <p className="text-gray-500 mb-6">This post may have been removed.</p>
        </div>
      </div>
    );
  }

  const tags = voice.hashtags ?? [];
  const totalEngagement = (voice.likes_count ?? 0) + (voice.replies_count ?? 0);

  return (
    <SharePageClient contentType="voice" contentId={voice.id} ctaLabel="Join the conversation" ctaAction="upvote">
      {/* Social proof */}
      {totalEngagement > 3 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-blue-500">💬</span>
          <p className="text-sm font-medium text-blue-800">
            {totalEngagement} people are engaging with this voice
          </p>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">Citizen</p>
              <p className="text-xs text-gray-400">{timeAgo(voice.created_at)}</p>
            </div>
          </div>

          {/* Voice text — the hook */}
          <p className="text-lg text-gray-900 leading-relaxed mb-4 font-medium">{voice.text}</p>

          {/* Hashtags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full border border-orange-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Engagement stats */}
          <div className="flex gap-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 4v10M6 7l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">{voice.likes_count ?? 0}</span>
              <span className="text-xs text-gray-400">upvotes</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M16 12a2 2 0 01-2 2H6l-4 4V4a2 2 0 012-2h10a2 2 0 012 2v8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700">{voice.replies_count ?? 0}</span>
              <span className="text-xs text-gray-400">replies</span>
            </div>
          </div>
        </div>
      </div>
    </SharePageClient>
  );
}
