import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface SearchResult {
  id: string;
  type: 'issue' | 'leader' | 'poll' | 'voice';
  title: string;
  description: string;
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      // Try dedicated search service first, fall back to simple DB search
      try {
        const res = await api.get<SearchResult[] | { results: SearchResult[] }>(`/api/v1/search?q=${encodeURIComponent(query)}`);
        return Array.isArray(res) ? res : (res.results ?? []);
      } catch {
        // Fallback: search issues and representatives via identity service
        const results: SearchResult[] = [];
        try {
          const issues = await api.get<{ issues: any[] }>(`/api/v1/issues?search=${encodeURIComponent(query)}`);
          (issues.issues ?? []).slice(0, 5).forEach((i: any) => {
            results.push({ id: i.id, type: 'issue', title: i.text || i.title || '', description: i.category || '' });
          });
        } catch {}
        try {
          const reps = await api.get<any[]>('/api/v1/representatives/list');
          (reps ?? []).filter((r: any) => r.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 5).forEach((r: any) => {
            results.push({ id: r.id, type: 'leader', title: r.name, description: r.position || r.party || '' });
          });
        } catch {}
        return results;
      }
    },
    enabled: query.length >= 2,
    staleTime: 10_000,
  });
}
