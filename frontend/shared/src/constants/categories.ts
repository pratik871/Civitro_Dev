import type { IssueCategory } from '../types';

export interface IssueCategoryConfig {
  key: IssueCategory;
  label: string;
  /** Icon name from Feather Icons or Lucide (used by both React Native and web). */
  icon: string;
  /** Hex color for category badges and map pins. */
  color: string;
  /** Short description shown in category picker. */
  description: string;
}

/** All 12 issue categories with display metadata. */
export const ISSUE_CATEGORIES: readonly IssueCategoryConfig[] = [
  {
    key: 'roads',
    label: 'Roads',
    icon: 'alert-circle',
    color: '#DC2626',
    description: 'Potholes, road damage, and pavement issues',
  },
  {
    key: 'water',
    label: 'Water Supply',
    icon: 'droplet',
    color: '#2563EB',
    description: 'Water shortage, contamination, or pipe leaks',
  },
  {
    key: 'sanitation',
    label: 'Sanitation',
    icon: 'wind',
    color: '#7C3AED',
    description: 'Open defecation, sewage overflow, and hygiene',
  },
  {
    key: 'electricity',
    label: 'Electricity',
    icon: 'zap',
    color: '#F59E0B',
    description: 'Power outages, voltage issues, and illegal connections',
  },
  {
    key: 'street_lights',
    label: 'Street Lights',
    icon: 'sun',
    color: '#EAB308',
    description: 'Broken, flickering, or missing street lights',
  },
  {
    key: 'garbage',
    label: 'Garbage',
    icon: 'trash-2',
    color: '#EA580C',
    description: 'Garbage dumping, overflowing bins, and waste collection',
  },
  {
    key: 'drainage',
    label: 'Drainage',
    icon: 'cloud-rain',
    color: '#0891B2',
    description: 'Blocked drains, flooding, and waterlogging',
  },
  {
    key: 'public_safety',
    label: 'Public Safety',
    icon: 'shield',
    color: '#BE123C',
    description: 'Unsafe areas, missing barriers, and public hazards',
  },
  {
    key: 'parks',
    label: 'Parks & Spaces',
    icon: 'tree-pine',
    color: '#16A34A',
    description: 'Park maintenance, playground safety, and green spaces',
  },
  {
    key: 'transport',
    label: 'Transport',
    icon: 'bus',
    color: '#4F46E5',
    description: 'Bus service, traffic signals, and public transit issues',
  },
  {
    key: 'healthcare',
    label: 'Healthcare',
    icon: 'heart-pulse',
    color: '#E11D48',
    description: 'Hospital access, clinic issues, and public health concerns',
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'more-horizontal',
    color: '#6B7280',
    description: 'Issues that do not fit other categories',
  },
] as const;

/** Lookup map from category key to its config. */
export const CATEGORY_MAP: Record<IssueCategory, IssueCategoryConfig> =
  ISSUE_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.key] = cat;
      return acc;
    },
    {} as Record<IssueCategory, IssueCategoryConfig>,
  );
