import { Metadata } from "next";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.civitro.com";

interface ActionData {
  action: {
    id: string;
    title: string;
    description: string;
    status: string;
    support_count: number;
    support_goal: number;
    evidence_count: number;
    escalation_level: string;
    created_at: string;
  };
}

async function getAction(id: string): Promise<ActionData["action"] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/actions/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.action ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const action = await getAction(params.id);
  const title = action?.title ?? "Community Action on Civitro";

  return {
    title: `${title} — Civitro Community Action`,
    description: `${action?.support_count ?? 0} supporters. Join the action on Civitro.`,
    openGraph: {
      title,
      description: `${action?.support_count ?? 0} citizens supporting this action. Democracy You Shape.`,
      type: "article",
      siteName: "Civitro",
    },
  };
}

export default async function ShareActionPage({
  params,
}: {
  params: { id: string };
}) {
  const action = await getAction(params.id);

  if (!action) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Action not found</h1>
          <p className="text-gray-500 mb-6">This community action may have been removed.</p>
          <Link href="/" className="text-orange-500 font-medium hover:underline">Go to Civitro →</Link>
        </div>
      </div>
    );
  }

  const progress = action.support_goal > 0
    ? Math.min(Math.round((action.support_count / action.support_goal) * 100), 100)
    : 0;

  const date = new Date(action.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold uppercase rounded-md tracking-wide">
              Community Action
            </span>
            <span className="text-sm text-gray-500">{date}</span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">{action.title}</h1>

          {/* Description */}
          {action.description && (
            <p className="text-gray-600 leading-relaxed mb-4">{action.description}</p>
          )}

          {/* Progress */}
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm font-bold text-gray-900">{action.support_count} supporters</span>
              <span className="text-sm text-gray-500">{progress}% of goal</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <span className="font-medium">{action.evidence_count ?? 0}</span> incidents linked
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              Status: <span className="font-medium capitalize">{action.status}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm mb-3">Support this action on Civitro</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600">
            Support on Civitro
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
