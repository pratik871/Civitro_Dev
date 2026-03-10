"use client";

import Link from "next/link";
import { ArrowLeft, Users, Calendar, Share2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber, cn } from "@/lib/utils";

const MOCK_POLL = {
  id: "p1",
  title: "Should Cubbon Park entry fee be reduced to Rs. 10?",
  description:
    "The current entry fee of Rs. 25 has reduced footfall significantly. A proposal to lower it to Rs. 10 has been raised by the Parks Committee. This poll seeks citizen input before presenting the recommendation to the BBMP council.",
  options: [
    { id: "o1", text: "Yes, reduce to Rs. 10", votes: 3420, percentage: 68 },
    { id: "o2", text: "No, keep at Rs. 25", votes: 980, percentage: 20 },
    { id: "o3", text: "Make it free", votes: 600, percentage: 12 },
  ],
  status: "active" as const,
  totalVotes: 5000,
  createdBy: { id: "l1", name: "Ward Councillor Office", role: "official" },
  scope: "city" as const,
  startDate: "2026-03-01T00:00:00Z",
  endDate: "2026-03-31T23:59:59Z",
  createdAt: "2026-03-01T00:00:00Z",
};

export default function PollDetailPage() {
  const poll = MOCK_POLL;
  const maxVotes = Math.max(...poll.options.map((o) => o.votes));

  return (
    <div>
      <Link
        href="/dashboard/polls"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-saffron mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Polls
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="success">{poll.status}</Badge>
              <Badge>{poll.scope}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{poll.title}</h1>
            <p className="text-gray-600 leading-relaxed">{poll.description}</p>
          </Card>

          {/* Voting options */}
          <Card>
            <CardHeader>
              <CardTitle>Cast Your Vote</CardTitle>
              <span className="text-sm text-gray-500">
                {formatNumber(poll.totalVotes)} votes so far
              </span>
            </CardHeader>
            <div className="space-y-4">
              {poll.options.map((option) => (
                <button
                  key={option.id}
                  className="w-full text-left p-4 rounded-btn border-2 border-gray-100 hover:border-saffron-200 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 group-hover:text-saffron transition-colors">
                      {option.text}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {option.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={cn(
                        "h-3 rounded-full transition-all duration-700",
                        option.votes === maxVotes ? "bg-saffron" : "bg-saffron-200",
                      )}
                      style={{ width: `${option.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(option.votes)} votes
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button className="flex-1">Submit Vote</Button>
              <Button variant="ghost">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Poll Details</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Created by</span>
                <span className="text-gray-700 font-medium">{poll.createdBy.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Scope</span>
                <Badge>{poll.scope}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Start Date</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(poll.startDate)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">End Date</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(poll.endDate)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Votes</span>
                <div className="flex items-center gap-1 text-gray-700">
                  <Users className="w-3.5 h-3.5" />
                  {formatNumber(poll.totalVotes)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
