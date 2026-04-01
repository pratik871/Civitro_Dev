import { Metadata } from "next";
import SharePageClient from "@/components/share/SharePageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.civitro.com";

interface IssueData {
  id: string;
  text: string;
  category: string;
  status: string;
  severity: string;
  upvotes_count: number;
  comment_count: number;
  confirmations_count?: number;
  gps_lat: number;
  gps_lng: number;
  created_at: string;
  boundary_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reported: { label: "Reported", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  assigned: { label: "Assigned", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  acknowledged: { label: "Acknowledged", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  work_started: { label: "In Progress", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  resolved: { label: "Resolved", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  completed: { label: "Completed", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
};

const CATEGORY_LABELS: Record<string, { emoji: string; name: string }> = {
  pothole: { emoji: "🕳️", name: "Pothole" },
  water_supply: { emoji: "💧", name: "Water Supply" },
  streetlight: { emoji: "💡", name: "Streetlight" },
  garbage: { emoji: "🗑️", name: "Garbage" },
  drainage: { emoji: "🌊", name: "Drainage" },
  road_damage: { emoji: "🛣️", name: "Road Damage" },
  traffic: { emoji: "🚦", name: "Traffic" },
  construction: { emoji: "🏗️", name: "Construction" },
  healthcare: { emoji: "🏥", name: "Healthcare" },
  education: { emoji: "📚", name: "Education" },
  public_safety: { emoji: "🛡️", name: "Public Safety" },
};

async function getIssue(id: string): Promise<IssueData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/issues/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.issue ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const issue = await getIssue(params.id);
  const cat = CATEGORY_LABELS[issue?.category ?? ""];
  const title = issue?.text
    ? `${cat?.emoji ?? "📍"} ${issue.text.slice(0, 60)}${issue.text.length > 60 ? "..." : ""}`
    : "Civic Issue on Civitro";
  const desc = issue
    ? `${issue.upvotes_count ?? 0} people have upvoted this. Help fix this issue.`
    : "Report and track civic issues on Civitro.";

  return {
    title: `${title} — Civitro`,
    description: desc,
    openGraph: { title, description: desc, type: "article", siteName: "Civitro" },
    twitter: { card: "summary_large_image", title, description: desc },
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

export default async function ShareIssuePage({ params }: { params: { id: string } }) {
  const issue = await getIssue(params.id);

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Issue not found</h1>
          <p className="text-gray-500 mb-6">This issue may have been removed or resolved.</p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[issue.status] ?? { label: issue.status, color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" };
  const cat = CATEGORY_LABELS[issue.category] ?? { emoji: "📍", name: issue.category };
  const totalEngagement = (issue.upvotes_count ?? 0) + (issue.comment_count ?? 0);

  return (
    <SharePageClient contentType="issue" contentId={issue.id} ctaLabel="Help fix this issue" ctaAction="upvote">
      {/* Urgency / Social Proof Banner */}
      {totalEngagement > 5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-amber-600 text-sm">🔥</span>
          <p className="text-sm font-medium text-amber-800">
            {issue.upvotes_count} people have flagged this issue
          </p>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Status stripe */}
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${status.color}, ${status.color}88)` }} />

        <div className="p-5">
          {/* Top row: category + status + time */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.emoji}</span>
              <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ color: status.color, backgroundColor: status.bg, border: `1px solid ${status.border}` }}
              >
                {status.label}
              </span>
            </div>
          </div>

          {/* Issue text — the hook */}
          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{issue.text}</h1>

          {/* Location + time */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-5">
            {issue.boundary_name && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1C4.07 1 2.5 2.57 2.5 4.5C2.5 7.25 6 11 6 11s3.5-3.75 3.5-6.5C9.5 2.57 7.93 1 6 1z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1"/></svg>
                {issue.boundary_name}
              </span>
            )}
            <span>{timeAgo(issue.created_at)}</span>
          </div>

          {/* Social proof stats */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{issue.upvotes_count ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium">upvotes</p>
            </div>
            <div className="text-center border-x border-gray-200">
              <p className="text-xl font-bold text-gray-900">{issue.comment_count ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium">comments</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{issue.confirmations_count ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium">confirmed</p>
            </div>
          </div>
        </div>
      </div>
    </SharePageClient>
  );
}
