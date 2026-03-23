import { Metadata } from "next";
import Link from "next/link";

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
    const res = await fetch(`${API_URL}/api/v1/voices/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.voice ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const voice = await getVoice(params.id);
  const text = voice?.text ?? "Community Voice on Civitro";
  const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;

  return {
    title: `${truncated} — Civitro`,
    description: truncated,
    openGraph: {
      title: truncated,
      description: "Shared from Civitro — Democracy You Shape.",
      type: "article",
      siteName: "Civitro",
    },
    twitter: {
      card: "summary",
      title: truncated,
      description: "Shared from Civitro — Democracy You Shape.",
    },
  };
}

export default async function ShareVoicePage({
  params,
}: {
  params: { id: string };
}) {
  const voice = await getVoice(params.id);

  if (!voice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Voice not found</h1>
          <p className="text-gray-500 mb-6">This post may have been removed.</p>
          <Link href="/" className="text-orange-500 font-medium hover:underline">
            Go to Civitro →
          </Link>
        </div>
      </div>
    );
  }

  const tags = voice.hashtags ?? [];
  const date = new Date(voice.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Civitro</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Voice Card */}
      <div className="max-w-2xl mx-auto p-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-500 font-bold">C</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Citizen</p>
              <p className="text-sm text-gray-500">{date}</p>
            </div>
          </div>

          {/* Text */}
          <p className="text-lg text-gray-900 leading-relaxed mb-4">{voice.text}</p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-orange-50 text-orange-600 text-sm font-medium rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M5 6l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium">{voice.likes_count ?? 0} upvotes</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 10a1.5 1.5 0 01-1.5 1.5H5l-3 3V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V10z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-sm font-medium">{voice.replies_count ?? 0} comments</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm mb-3">Join the conversation on Civitro</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600"
          >
            Open in Civitro
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M10 5l3 3-3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        {/* Tagline */}
        <p className="text-center text-gray-400 text-xs mt-8">
          Democracy. You Shape.™
        </p>
      </div>
    </div>
  );
}
