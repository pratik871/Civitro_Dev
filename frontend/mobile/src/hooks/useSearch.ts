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
    queryFn: () => api.get<SearchResult[]>(`/api/v1/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });
}
