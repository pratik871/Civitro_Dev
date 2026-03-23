import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Leader, GovernanceLevel } from '../types/leader';

// Backend level → frontend governanceLevel mapping
const LEVEL_MAP: Record<string, GovernanceLevel> = {
  urban_ward: 'ward_councillor',
  rural_ward: 'ward_councillor',
  municipal_corporation: 'mayor',
  municipal_council: 'mayor',
  assembly: 'mla',
  parliamentary: 'mp',
  state: 'cm',
  nation: 'pm',
};

// Party abbreviation → full name
const PARTY_FULL_NAMES: Record<string, string> = {
  BJP: 'Bharatiya Janata Party',
  INC: 'Indian National Congress',
  AAP: 'Aam Aadmi Party',
  NCP: 'Nationalist Congress Party',
  SS: 'Shiv Sena',
  JDS: 'Janata Dal (Secular)',
  TMC: 'Trinamool Congress',
  DMK: 'Dravida Munnetra Kazhagam',
};

// Backend designation → friendly label
const DESIGNATION_LABELS: Record<string, string> = {
  corporator: 'Ward Corporator',
  sarpanch: 'Sarpanch',
  mla: 'MLA',
  mp_lok_sabha: 'Member of Parliament (Lok Sabha)',
  mp_rajya_sabha: 'Member of Parliament (Rajya Sabha)',
  mayor: 'Mayor',
};

interface RawRepresentative {
  id: string;
  name: string;
  party: string;
  position: string;
  level: string;
  boundary_id: string;
  photo_url: string;
  claimed: boolean;
  claimed_by_user_id: string;
  verified: boolean;
  rating: number;
  contact_info: string;
  official_type: string;
  designation: string;
  state_designation: string;
  term_start: string;
  term_end: string;
}

function mapLeader(raw: RawRepresentative): Leader {
  return {
    id: raw.id,
    userId: raw.claimed_by_user_id || raw.id,
    name: raw.name,
    party: PARTY_FULL_NAMES[raw.party] || raw.party || '',
    partyAbbr: raw.party || '',
    avatarUrl: raw.photo_url || undefined,
    governanceLevel: LEVEL_MAP[raw.level] || 'ward_councillor',
    constituency: raw.boundary_id ? '' : '',  // Will be filled from stats
    ward: '',
    overallRating: raw.rating || 0,
    ratingBreakdown: {
      responsiveness: 0,
      transparency: 0,
      deliveryOnPromises: 0,
      accessibility: 0,
      overallImpact: 0,
    },
    totalRatings: 0,
    responseRate: 0,
    chiScore: 0,
    promisesFulfilled: 0,
    promisesTotal: 0,
    issuesResolved: 0,
    issuesTotal: 0,
    recentActivity: [],
  };
}

export function useLeaders() {
  return useQuery({
    queryKey: ['leaders'],
    queryFn: async () => {
      const raw = await api.get<RawRepresentative[]>('/api/v1/representatives/list');
      return raw.map(mapLeader);
    },
    staleTime: 60_000,
  });
}

export function useLeader(leaderId: string) {
  return useQuery({
    queryKey: ['leaders', leaderId],
    queryFn: async () => {
      const resp = await api.get<{ representative: RawRepresentative }>(`/api/v1/representatives/${leaderId}`);
      const raw = resp.representative || (resp as unknown as RawRepresentative);
      if (!raw || !raw.name) throw new Error('Leader not found');
      const leader = mapLeader(raw);

      // Fetch enriched stats
      try {
        const stats = await api.get<Record<string, any>>(`/api/v1/representatives/${leaderId}/stats`);
        leader.totalRatings = stats.total_ratings ?? 0;
        leader.issuesTotal = stats.issues_total ?? 0;
        leader.issuesResolved = stats.issues_resolved ?? 0;
        leader.responseRate = stats.response_rate ?? 0;
        leader.chiScore = stats.chi_score ?? 0;
        leader.promisesTotal = stats.promises_total ?? 0;
        leader.promisesFulfilled = stats.promises_fulfilled ?? 0;
        if (stats.boundary_name) leader.constituency = stats.boundary_name;
      } catch {
        // Stats endpoint unavailable — use defaults
      }

      return leader;
    },
    staleTime: 60_000,
    enabled: !!leaderId,
  });
}

export function useLeaderRating(repId: string) {
  return useQuery({
    queryKey: ['ratings', repId],
    queryFn: () => api.get(`/api/v1/ratings/representative/${repId}`),
    staleTime: 60_000,
    enabled: !!repId,
  });
}
