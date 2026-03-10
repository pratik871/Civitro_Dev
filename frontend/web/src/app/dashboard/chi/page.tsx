"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHIGauge } from "@/components/charts/chi-gauge";
import { ScoreRing } from "@/components/ui/score-ring";
import { TrendSparkline } from "@/components/charts/trend-sparkline";

const CHI_BREAKDOWN = [
  { category: "Infrastructure", score: 72, trend: [55, 58, 62, 65, 68, 70, 72] },
  { category: "Governance", score: 61, trend: [50, 52, 55, 54, 58, 60, 61] },
  { category: "Public Services", score: 74, trend: [60, 62, 65, 68, 70, 73, 74] },
  { category: "Healthcare", score: 58, trend: [48, 50, 52, 54, 55, 57, 58] },
  { category: "Education", score: 69, trend: [55, 58, 60, 63, 65, 67, 69] },
  { category: "Environment", score: 45, trend: [50, 48, 46, 45, 44, 45, 45] },
  { category: "Safety", score: 77, trend: [65, 68, 70, 72, 74, 76, 77] },
  { category: "Citizen Engagement", score: 83, trend: [60, 65, 70, 75, 78, 80, 83] },
];

const WARD_RANKING = [
  { ward: "Ward 113 - Koramangala", chi: 78, change: "+3" },
  { ward: "Ward 150 - HSR Layout", chi: 72, change: "+1" },
  { ward: "Ward 82 - Indiranagar", chi: 69, change: "-2" },
  { ward: "Ward 177 - JP Nagar", chi: 65, change: "+5" },
  { ward: "Ward 85 - Marathahalli", chi: 58, change: "-1" },
  { ward: "Ward 174 - BTM Layout", chi: 54, change: "+2" },
];

export default function CHIPage() {
  const overallScore = Math.round(
    CHI_BREAKDOWN.reduce((sum, cat) => sum + cat.score, 0) / CHI_BREAKDOWN.length,
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Civic Health Index</h1>
        <p className="page-subtitle">
          Data-driven score measuring the overall civic health of your area
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main gauge */}
        <div className="lg:col-span-1">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Your Area CHI</CardTitle>
              <Badge variant="info">Bengaluru</Badge>
            </CardHeader>
            <CHIGauge score={overallScore} size={200} />
            <p className="text-sm text-gray-500 mt-4">
              Updated daily based on issue resolution, leader performance, and citizen engagement
            </p>
          </Card>
        </div>

        {/* Category breakdown */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown by Category</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {CHI_BREAKDOWN.map((cat) => (
                <div key={cat.category} className="text-center">
                  <ScoreRing score={cat.score} size={72} strokeWidth={5} />
                  <p className="text-xs text-gray-600 font-medium mt-2">{cat.category}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Category Trends</CardTitle>
            <span className="text-xs text-gray-400">Last 7 months</span>
          </CardHeader>
          <div className="space-y-4">
            {CHI_BREAKDOWN.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{cat.category}</p>
                  <p className="text-xs text-gray-400">Score: {cat.score}/100</p>
                </div>
                <TrendSparkline
                  data={cat.trend}
                  color={cat.score >= 70 ? "#059669" : cat.score >= 50 ? "#2563EB" : "#DC2626"}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Ward ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Ward Rankings</CardTitle>
            <span className="text-xs text-gray-400">Your city</span>
          </CardHeader>
          <div className="space-y-3">
            {WARD_RANKING.map((ward, index) => (
              <div
                key={ward.ward}
                className="flex items-center gap-4 p-3 rounded-btn hover:bg-gray-50 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ward.ward}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{ward.chi}</p>
                  <p className={`text-xs font-medium ${
                    ward.change.startsWith("+") ? "text-success" : "text-error"
                  }`}>
                    {ward.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
