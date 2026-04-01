import { Metadata } from "next";
import SharePageClient from "@/components/share/SharePageClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.civitro.com";

interface ActionData {
  id: string;
  title: string;
  description: string;
  status: string;
  support_count: number;
  support_goal: number;
  evidence_count: number;
  escalation_level: string;
  economic_impact?: number;
  created_at: string;
  ward_name?: string;
}

async function getAction(id: string): Promise<ActionData | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/actions/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.action ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const action = await getAction(params.id);
  const title = action?.title ?? "Community Action on Civitro";
  const supporters = action?.support_count ?? 0;
  const desc = `${supporters} citizens already supporting this. Join them.`;

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

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export default async function ShareActionPage({ params }: { params: { id: string } }) {
  const action = await getAction(params.id);

  if (!action) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Action not found</h1>
          <p className="text-gray-500 mb-6">This community action may have been removed.</p>
        </div>
      </div>
    );
  }

  const progress = action.support_goal > 0
    ? Math.min(Math.round((action.support_count / action.support_goal) * 100), 100)
    : 0;
  const remaining = Math.max(0, action.support_goal - action.support_count);

  return (
    <SharePageClient contentType="action" contentId={action.id} ctaLabel={`Support this — ${remaining} more needed`} ctaAction="support">
      {/* Urgency Banner */}
      {action.support_count > 10 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-orange-500">⚡</span>
          <p className="text-sm font-medium text-orange-800">
            {action.support_count} citizens already supporting this action
          </p>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Gradient stripe */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />

        <div className="p-5">
          {/* Badge + time */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold uppercase rounded-md tracking-wider border border-orange-100">
              Community Action
            </span>
            <span className="text-xs text-gray-400 font-medium">{timeAgo(action.created_at)}</span>
          </div>

          {/* Title — the hook */}
          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{action.title}</h1>

          {/* Description preview */}
          {action.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-5 line-clamp-3">{action.description}</p>
          )}

          {/* Progress bar — visual urgency */}
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold text-gray-900">{action.support_count} supporters</span>
              <span className="text-gray-500">{progress}% of goal</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: progress >= 75
                    ? "linear-gradient(90deg, #10B981, #34D399)"
                    : "linear-gradient(90deg, #FF6B35, #F59E0B)",
                }}
              />
            </div>
            {remaining > 0 && (
              <p className="text-xs text-gray-500 mt-1.5 font-medium">
                {remaining} more supporters needed to reach the next milestone
              </p>
            )}
          </div>

          {/* Impact stats */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{action.evidence_count ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium">incidents</p>
            </div>
            <div className="text-center border-x border-gray-200">
              <p className="text-xl font-bold text-gray-900 capitalize">{action.escalation_level ?? "ward"}</p>
              <p className="text-xs text-gray-500 font-medium">level</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">
                {action.economic_impact ? formatCurrency(action.economic_impact) : "—"}
              </p>
              <p className="text-xs text-gray-500 font-medium">est. impact</p>
            </div>
          </div>
        </div>
      </div>
    </SharePageClient>
  );
}
