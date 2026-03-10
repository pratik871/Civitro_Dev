import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendSparkline } from "@/components/charts/trend-sparkline";
import { CHIGauge } from "@/components/charts/chi-gauge";

const ENGAGEMENT_METRICS = [
  { label: "Daily Active Users", value: "8,420", change: "+12%", trend: [5200, 5800, 6400, 6800, 7200, 7800, 8420] },
  { label: "Issues Reported (Daily)", value: "42", change: "+8%", trend: [28, 30, 32, 35, 38, 40, 42] },
  { label: "Voices Posted (Daily)", value: "156", change: "+15%", trend: [90, 100, 110, 120, 130, 145, 156] },
  { label: "Poll Participation Rate", value: "34%", change: "+3%", trend: [25, 27, 28, 30, 31, 33, 34] },
  { label: "Avg Session Duration", value: "4.2 min", change: "+0.5 min", trend: [3.2, 3.4, 3.5, 3.7, 3.8, 4.0, 4.2] },
  { label: "Leader Response Rate", value: "67%", change: "+5%", trend: [55, 58, 60, 62, 64, 66, 67] },
];

const TOP_CATEGORIES = [
  { category: "Pothole", count: 342, pct: 28 },
  { category: "Garbage", count: 256, pct: 21 },
  { category: "Water Supply", count: 189, pct: 15 },
  { category: "Streetlight", count: 145, pct: 12 },
  { category: "Road Damage", count: 112, pct: 9 },
  { category: "Drainage", count: 98, pct: 8 },
  { category: "Other", count: 85, pct: 7 },
];

const TOP_CITIES = [
  { city: "Bengaluru", users: 12500, issues: 3400, chi: 68 },
  { city: "Mumbai", users: 9800, issues: 2800, chi: 62 },
  { city: "Delhi", users: 8200, issues: 2500, chi: 55 },
  { city: "Chennai", users: 5600, issues: 1800, chi: 71 },
  { city: "Hyderabad", users: 4900, issues: 1600, chi: 66 },
  { city: "Pune", users: 3800, issues: 1200, chi: 74 },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          Platform-wide metrics and engagement data
        </p>
      </div>

      {/* Engagement metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {ENGAGEMENT_METRICS.map((metric) => (
          <Card key={metric.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <p className="text-sm text-success font-medium mt-0.5">{metric.change}</p>
              </div>
              <TrendSparkline data={metric.trend} width={80} height={28} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Issue categories breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Issue Categories</CardTitle>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </CardHeader>
          <div className="space-y-3">
            {TOP_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{cat.category}</span>
                  <span className="text-gray-500">{cat.count} ({cat.pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-saffron transition-all duration-500"
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Platform CHI */}
        <Card>
          <CardHeader>
            <CardTitle>National Civic Health Index</CardTitle>
            <Badge variant="info">All India</Badge>
          </CardHeader>
          <div className="flex justify-center mb-6">
            <CHIGauge score={63} label="National Average" size={180} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center border-t border-gray-100 pt-4">
            <div>
              <p className="text-lg font-bold text-gray-900">72%</p>
              <p className="text-xs text-gray-500">Issue Resolution</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">3.7</p>
              <p className="text-xs text-gray-500">Avg Leader Rating</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">34%</p>
              <p className="text-xs text-gray-500">Civic Participation</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top cities */}
      <Card>
        <CardHeader>
          <CardTitle>Top Cities by Engagement</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Users</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Issues</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CHI Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {TOP_CITIES.map((city, i) => (
                <tr key={city.city} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{city.city}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{city.users.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{city.issues.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${city.chi >= 70 ? "text-success" : city.chi >= 60 ? "text-info" : "text-warning"}`}>
                      {city.chi}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
