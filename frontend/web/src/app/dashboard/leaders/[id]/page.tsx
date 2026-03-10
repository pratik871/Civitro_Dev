"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, MapPin, Clock, Users, Handshake } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { ScoreRing } from "@/components/ui/score-ring";
import { RatingBreakdown } from "@/components/leaders/rating-breakdown";
import { CHIGauge } from "@/components/charts/chi-gauge";
import type { Leader } from "@/types";

// Mock leader detail
const MOCK_LEADER: Leader = {
  id: "l1",
  name: "Rajesh Kumar Singh",
  designation: "Municipal Corporator",
  level: "municipal",
  constituency: "Ward 113, Koramangala",
  state: "Karnataka",
  party: "BJP",
  chi: 82,
  rating: {
    overall: 4.2,
    accessibility: 4.5,
    responsiveness: 4.0,
    transparency: 4.1,
    delivery: 4.2,
    totalRatings: 1847,
  },
  issuesResolved: 156,
  issuesTotal: 198,
  promisesKept: 12,
  promisesTotal: 18,
  responseTime: "< 24 hours",
  isVerified: true,
  createdAt: "2024-01-15T00:00:00Z",
};

export default function LeaderDetailPage() {
  const leader = MOCK_LEADER;

  return (
    <div>
      <Link
        href="/dashboard/leaders"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-saffron mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leaders
      </Link>

      {/* Profile header */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar name={leader.name} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{leader.name}</h1>
              {leader.isVerified && <CheckCircle className="w-5 h-5 text-info" />}
            </div>
            <p className="text-gray-600">{leader.designation}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                {leader.constituency}, {leader.state}
              </div>
              {leader.party && <Badge variant="info">{leader.party}</Badge>}
              <Badge>{leader.level}</Badge>
            </div>
            <div className="mt-3">
              <StarRating rating={leader.rating.overall} size={18} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Message</Button>
            <Button>Rate Leader</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((leader.issuesResolved / leader.issuesTotal) * 100)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Resolution Rate</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-gray-900">{leader.responseTime}</div>
              <p className="text-xs text-gray-500 mt-1">Avg Response</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {leader.issuesResolved}/{leader.issuesTotal}
              </div>
              <p className="text-xs text-gray-500 mt-1">Issues Resolved</p>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {leader.promisesKept}/{leader.promisesTotal}
              </div>
              <p className="text-xs text-gray-500 mt-1">Promises Kept</p>
            </Card>
          </div>

          {/* Rating breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Rating Breakdown</CardTitle>
              <span className="text-sm text-gray-500">
                {leader.rating.totalRatings.toLocaleString("en-IN")} ratings
              </span>
            </CardHeader>
            <RatingBreakdown rating={leader.rating} />
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {[
                { text: "Responded to water supply complaint in JP Nagar", time: "2 hours ago", icon: Clock },
                { text: "Resolved pothole issue on MG Road", time: "1 day ago", icon: CheckCircle },
                { text: "Fulfilled promise: New bus stop at 5th Cross", time: "3 days ago", icon: Handshake },
                { text: "Attended community meeting at Ward Office", time: "1 week ago", icon: Users },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* CHI Score */}
          <Card>
            <CardHeader>
              <CardTitle>Civic Health Index</CardTitle>
            </CardHeader>
            <div className="flex justify-center">
              <CHIGauge score={leader.chi} label="Constituency CHI" />
            </div>
          </Card>

          {/* Civic Score Ring */}
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Leader Score</CardTitle>
            </CardHeader>
            <div className="flex justify-center">
              <ScoreRing score={leader.chi} label="Overall" size={100} strokeWidth={8} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
