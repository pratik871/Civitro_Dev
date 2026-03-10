import Link from "next/link";
import {
  AlertTriangle,
  Users,
  BarChart3,
  Shield,
  ArrowRight,
  Eye,
  Vote,
  Megaphone,
} from "lucide-react";

const features = [
  {
    icon: AlertTriangle,
    title: "Track Issues",
    description: "Report civic issues and track them through a transparent 6-step ledger from reporting to citizen verification.",
  },
  {
    icon: Users,
    title: "Rate Leaders",
    description: "Evaluate your elected representatives on accessibility, responsiveness, transparency, and delivery.",
  },
  {
    icon: BarChart3,
    title: "Civic Health Index",
    description: "Every constituency gets a data-driven CHI score. See how your area compares at a glance.",
  },
  {
    icon: Vote,
    title: "Participate in Polls",
    description: "Vote on issues that matter to your community. Your voice shapes local governance decisions.",
  },
  {
    icon: Megaphone,
    title: "Raise Your Voice",
    description: "Share opinions, suggestions, and feedback. Engage in constructive civic discourse.",
  },
  {
    icon: Shield,
    title: "Promise Tracker",
    description: "Hold leaders accountable by tracking their promises and verifying their delivery.",
  },
];

const stats = [
  { label: "Citizens", value: "2.5L+" },
  { label: "Issues Tracked", value: "45,000+" },
  { label: "Leaders Rated", value: "1,200+" },
  { label: "Cities Covered", value: "150+" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-saffron flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold text-navy">Civitro</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-saffron transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 text-sm font-medium bg-saffron text-white rounded-btn hover:bg-saffron-600 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron-50 text-saffron-600 text-sm font-medium mb-6">
            <Eye className="w-4 h-4" />
            Democracy you can see
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy leading-tight">
            Your city. Your voice.{" "}
            <span className="text-saffron">Your power.</span>
          </h1>
          <p className="text-lg text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            Civitro brings transparency to Indian governance. Track civic issues, rate your
            leaders, and participate in building the India you want to see.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-saffron text-white rounded-btn font-medium hover:bg-saffron-600 transition-colors inline-flex items-center justify-center gap-2"
            >
              Join as Citizen
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 border-2 border-navy text-navy rounded-btn font-medium hover:bg-navy hover:text-white transition-colors inline-flex items-center justify-center gap-2"
            >
              Explore Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-navy">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-saffron">{stat.value}</p>
                <p className="text-sm text-gray-300 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-navy">
              Everything you need for civic engagement
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">
              A complete platform to bridge the gap between citizens and government.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-card border border-gray-100 hover:border-saffron-200 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-saffron-50 text-saffron flex items-center justify-center mb-4 group-hover:bg-saffron group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-navy mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-navy to-navy-light">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to make democracy transparent?
          </h2>
          <p className="text-gray-300 mb-8">
            Join thousands of citizens across India who are already using Civitro
            to hold their leaders accountable.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-saffron text-white rounded-btn font-medium hover:bg-saffron-600 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-saffron flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="text-sm text-gray-600">
              Civitro &copy; {new Date().getFullYear()}. Democracy you can see.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-saffron transition-colors">About</a>
            <a href="#" className="hover:text-saffron transition-colors">Privacy</a>
            <a href="#" className="hover:text-saffron transition-colors">Terms</a>
            <a href="#" className="hover:text-saffron transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
