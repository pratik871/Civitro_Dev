"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Mock login - replace with actual API call
      await new Promise((r) => setTimeout(r, 1000));

      if (email && password) {
        login(
          {
            id: "u-mock-1",
            name: "Aarav Mehta",
            email,
            role: "citizen",
            civicScore: 78,
            isVerified: true,
            isActive: true,
            preferredLanguage: "en",
            city: "Bengaluru",
            state: "Karnataka",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            accessToken: "mock-access-token",
            refreshToken: "mock-refresh-token",
            expiresAt: Date.now() + 3600_000,
          },
        );
        router.push("/dashboard");
      } else {
        setError("Please enter your email and password.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy to-navy-light p-12 items-center justify-center">
        <div className="max-w-md">
          <div className="w-12 h-12 rounded-xl bg-saffron flex items-center justify-center mb-8">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome back</h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            Log in to track issues in your community, rate your leaders, and
            participate in shaping your city&apos;s future.
          </p>
          <div className="mt-12 p-6 rounded-card bg-white/5 border border-white/10">
            <p className="text-white text-sm italic">
              &quot;Civitro helped our ward get a long-pending road fixed in just 3 weeks.
              Transparency changes everything.&quot;
            </p>
            <p className="text-saffron text-sm font-medium mt-3">
              - Anita Desai, Citizen, Pune
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-saffron flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-navy">Civitro</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Log in to your account</h2>
          <p className="text-gray-500 mt-2">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-saffron font-medium hover:underline">
              Register
            </Link>
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-btn bg-red-50 border border-red-200 text-sm text-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-saffron focus:ring-saffron"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-saffron hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Log In
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              By logging in, you agree to Civitro&apos;s{" "}
              <a href="#" className="underline">Terms of Service</a> and{" "}
              <a href="#" className="underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
