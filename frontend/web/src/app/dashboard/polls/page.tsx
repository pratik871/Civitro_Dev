"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PollCard } from "@/components/polls/poll-card";
import type { Poll } from "@/types";

const MOCK_POLLS: Poll[] = [
  {
    id: "p1",
    title: "Should Cubbon Park entry fee be reduced to Rs. 10?",
    description: "The current entry fee of Rs. 25 has reduced footfall significantly. A proposal to lower it to Rs. 10 has been raised.",
    options: [
      { id: "o1", text: "Yes, reduce to Rs. 10", votes: 3420, percentage: 68 },
      { id: "o2", text: "No, keep at Rs. 25", votes: 980, percentage: 20 },
      { id: "o3", text: "Make it free", votes: 600, percentage: 12 },
    ],
    status: "active",
    totalVotes: 5000,
    createdBy: { id: "l1", name: "Ward Councillor Office", role: "official" },
    category: "public_facilities",
    scope: "city",
    startDate: "2026-03-01T00:00:00Z",
    endDate: "2026-03-31T23:59:59Z",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "p2",
    title: "Priority for road repair budget: Which area first?",
    description: "The ward has received a road repair budget. Help us decide which areas should be prioritized.",
    options: [
      { id: "o1", text: "MG Road stretch", votes: 1200, percentage: 40 },
      { id: "o2", text: "Koramangala internal roads", votes: 900, percentage: 30 },
      { id: "o3", text: "HSR Layout main road", votes: 600, percentage: 20 },
      { id: "o4", text: "JP Nagar service roads", votes: 300, percentage: 10 },
    ],
    status: "active",
    totalVotes: 3000,
    createdBy: { id: "l2", name: "BBMP Roads Division", role: "official" },
    scope: "ward",
    startDate: "2026-03-05T00:00:00Z",
    endDate: "2026-03-20T23:59:59Z",
    createdAt: "2026-03-05T00:00:00Z",
  },
  {
    id: "p3",
    title: "Should street vendors be allowed on weekends at Brigade Road?",
    description: "A proposal to allow registered street vendors to set up stalls on Brigade Road every Saturday and Sunday.",
    options: [
      { id: "o1", text: "Yes, it adds vibrancy", votes: 4500, percentage: 55 },
      { id: "o2", text: "No, it causes congestion", votes: 2800, percentage: 34 },
      { id: "o3", text: "Only on Sundays", votes: 900, percentage: 11 },
    ],
    status: "results_published",
    totalVotes: 8200,
    createdBy: { id: "l3", name: "City Council", role: "official" },
    scope: "city",
    startDate: "2026-02-01T00:00:00Z",
    endDate: "2026-02-28T23:59:59Z",
    createdAt: "2026-02-01T00:00:00Z",
    hasVoted: true,
    selectedOption: "o1",
  },
];

export default function PollsPage() {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Polls</h1>
          <p className="page-subtitle">
            Vote on community decisions and see results
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Create Poll
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MOCK_POLLS.map((poll) => (
          <PollCard key={poll.id} poll={poll} />
        ))}
      </div>
    </div>
  );
}
