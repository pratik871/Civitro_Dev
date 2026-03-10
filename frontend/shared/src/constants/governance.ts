import type { GovernanceLevel } from '../types';

export interface GovernanceLevelConfig {
  key: GovernanceLevel;
  label: string;
  /** Plural label for list headings. */
  labelPlural: string;
  description: string;
  /** Icon name from Feather Icons or Lucide. */
  icon: string;
  /** Hierarchy order (1 = lowest / most local). */
  order: number;
}

/** All governance levels from most local to national. */
export const GOVERNANCE_LEVELS: readonly GovernanceLevelConfig[] = [
  {
    key: 'ward',
    label: 'Ward',
    labelPlural: 'Wards',
    description: 'Municipal ward — smallest administrative division',
    icon: 'map-pin',
    order: 1,
  },
  {
    key: 'assembly',
    label: 'Assembly',
    labelPlural: 'Assembly Constituencies',
    description: 'State legislative assembly constituency (Vidhan Sabha)',
    icon: 'landmark',
    order: 2,
  },
  {
    key: 'district',
    label: 'District',
    labelPlural: 'Districts',
    description: 'Revenue district — key administrative unit',
    icon: 'map',
    order: 3,
  },
  {
    key: 'state',
    label: 'State',
    labelPlural: 'States',
    description: 'State or union territory level',
    icon: 'flag',
    order: 4,
  },
  {
    key: 'national',
    label: 'National',
    labelPlural: 'National',
    description: 'Parliamentary constituency / national level',
    icon: 'globe',
    order: 5,
  },
] as const;

/** Lookup map from governance level key to config. */
export const GOVERNANCE_LEVEL_MAP: Record<GovernanceLevel, GovernanceLevelConfig> =
  GOVERNANCE_LEVELS.reduce(
    (acc, level) => {
      acc[level.key] = level;
      return acc;
    },
    {} as Record<GovernanceLevel, GovernanceLevelConfig>,
  );
