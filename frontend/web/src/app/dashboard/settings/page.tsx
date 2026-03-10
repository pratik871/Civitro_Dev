"use client";

import { useState } from "react";
import { User, Bell, Globe, Shield, Palette, Save } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "notifications" | "language" | "privacy" | "appearance";

const tabs: { value: SettingsTab; label: string; icon: typeof User }[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "language", label: "Language", icon: Globe },
  { value: "privacy", label: "Privacy", icon: Shield },
  { value: "appearance", label: "Appearance", icon: Palette },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "te", name: "Telugu" },
  { code: "mr", name: "Marathi" },
  { code: "ta", name: "Tamil" },
  { code: "gu", name: "Gujarati" },
  { code: "ur", name: "Urdu" },
  { code: "kn", name: "Kannada" },
  { code: "or", name: "Odia" },
  { code: "ml", name: "Malayalam" },
  { code: "pa", name: "Punjabi" },
  { code: "as", name: "Assamese" },
  { code: "mai", name: "Maithili" },
  { code: "sa", name: "Sanskrit" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-btn text-sm font-medium transition-colors",
                  activeTab === value
                    ? "bg-saffron text-white"
                    : "text-gray-600 hover:bg-gray-100",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Full Name" defaultValue="Aarav Mehta" />
                  <Input label="Email" type="email" defaultValue="aarav.mehta@example.com" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Phone" type="tel" defaultValue="+91 98765 43210" />
                  <Input label="City" defaultValue="Bengaluru" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="State" defaultValue="Karnataka" />
                  <Input label="Pincode" defaultValue="560001" />
                </div>
                <div className="pt-2">
                  <Button>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { label: "Issue updates", description: "Get notified when issues you follow are updated", defaultChecked: true },
                  { label: "Leader responses", description: "When a leader responds to your issue or message", defaultChecked: true },
                  { label: "Poll results", description: "When a poll you voted in has new results", defaultChecked: true },
                  { label: "Comment replies", description: "When someone replies to your comment", defaultChecked: true },
                  { label: "Upvote milestones", description: "When your posts reach upvote milestones", defaultChecked: false },
                  { label: "Promise updates", description: "When tracked promises change status", defaultChecked: true },
                  { label: "Weekly digest", description: "Weekly summary of civic activity in your area", defaultChecked: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-saffron/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-saffron" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "language" && (
            <Card>
              <CardHeader>
                <CardTitle>Language Preferences</CardTitle>
              </CardHeader>
              <p className="text-sm text-gray-600 mb-4">
                Choose your preferred language for the Civitro interface. Content may also be available in regional languages.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    className={cn(
                      "p-3 rounded-btn border-2 text-sm font-medium text-left transition-colors",
                      lang.code === "en"
                        ? "border-saffron bg-saffron-50 text-saffron-700"
                        : "border-gray-200 text-gray-700 hover:border-saffron-200",
                    )}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "privacy" && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { label: "Show my profile publicly", description: "Allow other citizens to view your profile", defaultChecked: true },
                  { label: "Allow anonymous voice posts", description: "Enable posting voices without your name", defaultChecked: true },
                  { label: "Show my civic score", description: "Display your civic score on your profile", defaultChecked: true },
                  { label: "Location sharing", description: "Share your approximate location for better issue mapping", defaultChecked: false },
                  { label: "Data analytics opt-in", description: "Help improve Civitro with anonymized usage data", defaultChecked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-saffron/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-saffron" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-3">Theme</p>
                  <div className="flex gap-4">
                    {[
                      { label: "Light", value: "light", bg: "bg-white border-2 border-saffron" },
                      { label: "Dark", value: "dark", bg: "bg-navy-600" },
                      { label: "System", value: "system", bg: "bg-gradient-to-r from-white to-navy-600" },
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className={cn("w-20 h-14 rounded-btn border border-gray-200", theme.bg)} />
                        <span className="text-xs font-medium text-gray-600">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Sidebar</p>
                  <p className="text-xs text-gray-500 mb-3">Choose your default sidebar behavior</p>
                  <div className="flex gap-3">
                    <Button size="sm" variant="outline">Expanded</Button>
                    <Button size="sm" variant="ghost">Collapsed</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
