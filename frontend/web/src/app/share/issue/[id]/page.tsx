import { Metadata } from "next";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.civitro.com";

interface IssueData {
  id: string;
  text: string;
  category: string;
  status: string;
  severity: string;
  upvotes_count: number;
  comment_count: number;
  gps_lat: number;
  gps_lng: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  reported: { label: "Reported", color: "#EF4444", bg: "#FEF2F2" },
  assigned: { label: "Assigned", color: "#F59E0B", bg: "#FFFBEB" },
  acknowledged: { label: "Acknowledged", color: "#F59E0B", bg: "#FFFBEB" },
  work_started: { label: "In Progress", color: "#3B82F6", bg: "#EFF6FF" },
  resolved: { label: "Resolved", color: "#10B981", bg: "#ECFDF5" },
  completed: { label: "Completed", color: "#10B981", bg: "#ECFDF5" },
};

const CATEGORY_LABELS: Record<string, string> = {
  pothole: "🕳️ Pothole",
  water_supply: "💧 Water Supply",
  streetlight: "💡 Streetlight",
  garbage: "🗑️ Garbage",
  drainage: "🌊 Drainage",
  road_damage: "🛣️ Road Damage",
  traffic: "🚦 Traffic",
  construction: "🏗️ Construction",
  healthcare: "🏥 Healthcare",
  education: "📚 Education",
  public_safety: "🛡️ Public Safety",
};

async function getIssue(id: string): Promise<IssueData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/issues/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.issue ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const issue = await getIssue(params.id);
  const text = issue?.text ?? "Civic Issue on Civitro";
  const category = CATEGORY_LABELS[issue?.category ?? ""] ?? issue?.category ?? "";
  const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;

  return {
    title: `${category}: ${truncated} — Civitro`,
    description: `${truncated} — Report and track civic issues on Civitro.`,
    openGraph: {
      title: `${category}: ${truncated}`,
      description: "Civic issue reported on Civitro — Democracy You Shape.",
      type: "article",
      siteName: "Civitro",
    },
  };
}

export default async function ShareIssuePage({
  params,
}: {
  params: { id: string };
}) {
  const issue = await getIssue(params.id);

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Issue not found</h1>
          <p className="text-gray-500 mb-6">This issue may have been removed.</p>
          <Link href="/" className="text-orange-500 font-medium hover:underline">
            Go to Civitro →
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_LABELS[issue.status] ?? { label: issue.status, color: "#6B7280", bg: "#F3F4F6" };
  const category = CATEGORY_LABELS[issue.category] ?? issue.category;
  const date = new Date(issue.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Civitro</span>
          </Link>
          <Link href="/" className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600">
            Open App
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Status bar */}
          <div className="h-1" style={{ backgroundColor: status.color }} />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: status.color, backgroundColor: status.bg, padding: "4px 12px", borderRadius: "8px" }}>
                {status.label}
              </span>
              <span className="text-sm text-gray-500">{date}</span>
            </div>

            {/* Category */}
            <p className="text-sm text-gray-500 mb-2">{category}</p>

            {/* Issue text */}
            <p className="text-lg text-gray-900 leading-relaxed mb-4">{issue.text}</p>

            {/* Stats */}
            <div className="flex gap-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M5 6l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium">{issue.upvotes_count ?? 0} upvotes</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10a1.5 1.5 0 01-1.5 1.5H5l-3 3V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V10z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-sm font-medium">{issue.comment_count ?? 0} comments</span>
              </div>
              <span className="text-sm text-gray-400">ID: {issue.id}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm mb-3">Help resolve this issue — report on Civitro</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600">
            Open in Civitro
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M10 5l3 3-3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">Democracy. You Shape.™</p>
      </div>
    </div>
  );
}
