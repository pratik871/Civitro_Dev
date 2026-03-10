import type { CHIDimension } from '../types';

export interface CHIDimensionConfig {
  key: CHIDimension;
  label: string;
  /** Icon name from Feather Icons or Lucide. */
  icon: string;
  /** Hex color for charts and badges. */
  color: string;
  description: string;
  /** Example indicators that feed into this dimension. */
  indicators: string[];
}

/** The 8 dimensions of the Civic Health Index with display metadata. */
export const CHI_DIMENSIONS: readonly CHIDimensionConfig[] = [
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    icon: 'building',
    color: '#6366F1',
    description: 'Quality and maintenance of roads, bridges, public buildings, and utilities',
    indicators: ['Road condition', 'Building safety', 'Utility reliability'],
  },
  {
    key: 'sanitation',
    label: 'Sanitation',
    icon: 'droplets',
    color: '#0EA5E9',
    description: 'Cleanliness, waste management, and sewage systems',
    indicators: ['Waste collection rate', 'Open defecation-free status', 'Sewage treatment'],
  },
  {
    key: 'safety',
    label: 'Safety',
    icon: 'shield',
    color: '#EF4444',
    description: 'Crime rates, street lighting, emergency response, and public safety',
    indicators: ['Crime rate per capita', 'Street light coverage', 'Emergency response time'],
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    icon: 'heart-pulse',
    color: '#EC4899',
    description: 'Access to hospitals, clinics, maternal care, and disease prevention',
    indicators: ['Hospital beds per 1000', 'Immunization rate', 'Doctor availability'],
  },
  {
    key: 'education',
    label: 'Education',
    icon: 'graduation-cap',
    color: '#8B5CF6',
    description: 'School quality, teacher ratios, literacy, and educational access',
    indicators: ['Literacy rate', 'Student-teacher ratio', 'School infrastructure'],
  },
  {
    key: 'environment',
    label: 'Environment',
    icon: 'leaf',
    color: '#22C55E',
    description: 'Air quality, green cover, water body health, and noise levels',
    indicators: ['AQI average', 'Green cover percentage', 'Water body pollution index'],
  },
  {
    key: 'governance',
    label: 'Governance',
    icon: 'landmark',
    color: '#F59E0B',
    description: 'Government responsiveness, transparency, and citizen engagement',
    indicators: ['Issue resolution rate', 'Budget transparency', 'Citizen participation'],
  },
  {
    key: 'economy',
    label: 'Economy',
    icon: 'trending-up',
    color: '#14B8A6',
    description: 'Employment, local business health, and economic opportunity',
    indicators: ['Unemployment rate', 'New business registrations', 'Income levels'],
  },
] as const;

/** Lookup map from CHI dimension key to config. */
export const CHI_DIMENSION_MAP: Record<CHIDimension, CHIDimensionConfig> =
  CHI_DIMENSIONS.reduce(
    (acc, dim) => {
      acc[dim.key] = dim;
      return acc;
    },
    {} as Record<CHIDimension, CHIDimensionConfig>,
  );
