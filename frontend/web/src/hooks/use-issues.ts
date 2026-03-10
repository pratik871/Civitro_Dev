"use client";

import { useQuery } from "@tanstack/react-query";
import type { Issue, IssueCategory, IssueStatus } from "@/types";

// --- Mock Data ---
const MOCK_ISSUES: Issue[] = [
  {
    id: "ISS-001",
    title: "Large pothole on MG Road near Central Mall",
    description:
      "A dangerous pothole approximately 2 feet wide has formed on the main carriageway of MG Road, right before the Central Mall junction. Multiple vehicles have been damaged. This needs urgent repair before the monsoon season makes it worse.",
    category: "pothole",
    status: "work_started",
    priority: "high",
    location: {
      lat: 12.9716,
      lng: 77.5946,
      address: "MG Road, near Central Mall, Bengaluru",
      ward: "Ward 113",
      pincode: "560001",
    },
    images: [],
    reportedBy: { id: "u1", name: "Priya Sharma", avatar: undefined },
    assignedTo: { id: "o1", name: "BBMP Roads Dept", department: "Roads & Infrastructure" },
    upvotes: 234,
    commentCount: 18,
    ledger: [
      { step: "reported", label: "Reported", timestamp: "2026-02-15T09:30:00Z", actor: "Priya Sharma", actorRole: "citizen" },
      { step: "acknowledged", label: "Acknowledged", timestamp: "2026-02-15T14:00:00Z", actor: "System", note: "Auto-acknowledged after 50 upvotes" },
      { step: "assigned", label: "Assigned", timestamp: "2026-02-16T10:00:00Z", actor: "Ward Officer", actorRole: "official", note: "Assigned to BBMP Roads Division" },
      { step: "work_started", label: "Work Started", timestamp: "2026-02-20T08:00:00Z", actor: "BBMP Roads Dept", actorRole: "official", note: "Crew dispatched for repair" },
    ],
    createdAt: "2026-02-15T09:30:00Z",
    updatedAt: "2026-02-20T08:00:00Z",
  },
  {
    id: "ISS-002",
    title: "Garbage not collected for 5 days in Koramangala",
    description:
      "The garbage collection truck has not visited our area in Koramangala 4th Block for the past 5 days. Waste is piling up at the community bin and starting to attract stray animals and insects.",
    category: "garbage",
    status: "acknowledged",
    priority: "medium",
    location: {
      lat: 12.9352,
      lng: 77.6245,
      address: "4th Block, Koramangala, Bengaluru",
      ward: "Ward 150",
      pincode: "560034",
    },
    images: [],
    reportedBy: { id: "u2", name: "Rahul Verma" },
    upvotes: 89,
    commentCount: 7,
    ledger: [
      { step: "reported", label: "Reported", timestamp: "2026-03-01T07:00:00Z", actor: "Rahul Verma", actorRole: "citizen" },
      { step: "acknowledged", label: "Acknowledged", timestamp: "2026-03-01T11:30:00Z", actor: "Ward Supervisor", actorRole: "official" },
    ],
    createdAt: "2026-03-01T07:00:00Z",
    updatedAt: "2026-03-01T11:30:00Z",
  },
  {
    id: "ISS-003",
    title: "Streetlight out on 5th Cross Road, Indiranagar",
    description:
      "The streetlight at the corner of 5th Cross Road and 12th Main has been non-functional for over 2 weeks. The area is very dark at night, making it unsafe for pedestrians.",
    category: "streetlight",
    status: "reported",
    priority: "medium",
    location: {
      lat: 12.9784,
      lng: 77.6408,
      address: "5th Cross Rd, Indiranagar, Bengaluru",
      ward: "Ward 82",
      pincode: "560038",
    },
    images: [],
    reportedBy: { id: "u3", name: "Ananya Patel" },
    upvotes: 42,
    commentCount: 3,
    ledger: [
      { step: "reported", label: "Reported", timestamp: "2026-03-05T18:00:00Z", actor: "Ananya Patel", actorRole: "citizen" },
    ],
    createdAt: "2026-03-05T18:00:00Z",
    updatedAt: "2026-03-05T18:00:00Z",
  },
  {
    id: "ISS-004",
    title: "Water supply disruption in JP Nagar Phase 2",
    description:
      "No water supply since yesterday morning. The entire Phase 2 area is affected. We were not given any prior notice about maintenance or disruption.",
    category: "water_supply",
    status: "assigned",
    priority: "critical",
    location: {
      lat: 12.9081,
      lng: 77.5854,
      address: "JP Nagar Phase 2, Bengaluru",
      ward: "Ward 177",
      pincode: "560078",
    },
    images: [],
    reportedBy: { id: "u4", name: "Meena Kumari" },
    assignedTo: { id: "o2", name: "BWSSB", department: "Water Supply" },
    upvotes: 567,
    commentCount: 45,
    ledger: [
      { step: "reported", label: "Reported", timestamp: "2026-03-08T06:00:00Z", actor: "Meena Kumari", actorRole: "citizen" },
      { step: "acknowledged", label: "Acknowledged", timestamp: "2026-03-08T07:30:00Z", actor: "BWSSB Helpdesk", actorRole: "official" },
      { step: "assigned", label: "Assigned", timestamp: "2026-03-08T09:00:00Z", actor: "BWSSB Manager", actorRole: "official", note: "Pipeline maintenance crew assigned" },
    ],
    createdAt: "2026-03-08T06:00:00Z",
    updatedAt: "2026-03-08T09:00:00Z",
  },
  {
    id: "ISS-005",
    title: "Drainage overflow causing flooding in HSR Layout",
    description:
      "The storm drain near Sector 1 is overflowing and causing waterlogging on the main road. This happens every time it rains and has not been permanently fixed despite multiple complaints.",
    category: "drainage",
    status: "completed",
    priority: "high",
    location: {
      lat: 12.9116,
      lng: 77.6389,
      address: "Sector 1, HSR Layout, Bengaluru",
      ward: "Ward 174",
      pincode: "560102",
    },
    images: [],
    reportedBy: { id: "u5", name: "Karthik Rao" },
    assignedTo: { id: "o3", name: "BBMP SWD", department: "Storm Water Drains" },
    upvotes: 312,
    commentCount: 24,
    ledger: [
      { step: "reported", label: "Reported", timestamp: "2026-01-10T10:00:00Z", actor: "Karthik Rao", actorRole: "citizen" },
      { step: "acknowledged", label: "Acknowledged", timestamp: "2026-01-10T15:00:00Z", actor: "Ward Engineer", actorRole: "official" },
      { step: "assigned", label: "Assigned", timestamp: "2026-01-12T09:00:00Z", actor: "BBMP SWD Head", actorRole: "official" },
      { step: "work_started", label: "Work Started", timestamp: "2026-01-20T08:00:00Z", actor: "BBMP SWD", actorRole: "official" },
      { step: "completed", label: "Completed", timestamp: "2026-02-28T16:00:00Z", actor: "BBMP SWD", actorRole: "official", note: "Drain cleaned and capacity expanded" },
    ],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-02-28T16:00:00Z",
    resolvedAt: "2026-02-28T16:00:00Z",
  },
  {
    id: "ISS-006",
    title: "Dangerous road damage on Outer Ring Road near Marathahalli",
    description:
      "A large section of the road surface has caved in near the Marathahalli bridge. The crater is approximately 3 feet deep and spans half the lane. Two-wheelers are especially at risk.",
    category: "road_damage",
    status: "citizen_verified",
    priority: "critical",
    location: {
      lat: 12.9567,
      lng: 77.7011,
      address: "Outer Ring Road, Marathahalli, Bengaluru",
      ward: "Ward 85",
      pincode: "560037",
    },
    images: [],
    reportedBy: { id: "u6", name: "Vikram Singh" },
    assignedTo: { id: "o4", name: "BBMP Roads (East)", department: "Roads & Infrastructure" },
    upvotes: 891,
    commentCount: 62,
    ledger: [
      { step: "reported", label: "Reported", timestamp: "2025-12-20T08:00:00Z", actor: "Vikram Singh", actorRole: "citizen" },
      { step: "acknowledged", label: "Acknowledged", timestamp: "2025-12-20T10:00:00Z", actor: "System", note: "Auto-priority: Critical" },
      { step: "assigned", label: "Assigned", timestamp: "2025-12-21T09:00:00Z", actor: "Chief Engineer", actorRole: "official" },
      { step: "work_started", label: "Work Started", timestamp: "2025-12-28T07:00:00Z", actor: "BBMP Roads (East)", actorRole: "official" },
      { step: "completed", label: "Completed", timestamp: "2026-01-15T17:00:00Z", actor: "BBMP Roads (East)", actorRole: "official" },
      { step: "citizen_verified", label: "Citizen Verified", timestamp: "2026-01-18T12:00:00Z", actor: "Vikram Singh", actorRole: "citizen", note: "Road fully repaired. Good quality work." },
    ],
    createdAt: "2025-12-20T08:00:00Z",
    updatedAt: "2026-01-18T12:00:00Z",
    resolvedAt: "2026-01-15T17:00:00Z",
  },
];

interface UseIssuesOptions {
  category?: IssueCategory;
  status?: IssueStatus;
  search?: string;
}

export function useIssues(options?: UseIssuesOptions) {
  return useQuery<Issue[]>({
    queryKey: ["issues", options],
    queryFn: async () => {
      // In production, replace with: return apiGet<Issue[]>('/issues', { params: options });
      await new Promise((r) => setTimeout(r, 500)); // Simulate network delay
      let filtered = [...MOCK_ISSUES];
      if (options?.category) {
        filtered = filtered.filter((i) => i.category === options.category);
      }
      if (options?.status) {
        filtered = filtered.filter((i) => i.status === options.status);
      }
      if (options?.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q),
        );
      }
      return filtered;
    },
    staleTime: 30_000,
  });
}

export function useIssue(id: string) {
  return useQuery<Issue | undefined>({
    queryKey: ["issue", id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_ISSUES.find((i) => i.id === id);
    },
    staleTime: 30_000,
  });
}
