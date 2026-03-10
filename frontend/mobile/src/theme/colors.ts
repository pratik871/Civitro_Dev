export const colors = {
  // Brand
  primary: '#FF6B35',
  saffron: '#FF6B35',
  navy: '#0B1426',
  navyLight: '#1A2D4A',

  // Status
  success: '#059669',
  error: '#DC2626',
  info: '#2563EB',
  warning: '#D97706',

  // Backgrounds
  background: '#FFFCF8',
  backgroundGray: '#F9FAFB',
  white: '#FFFFFF',

  // Text
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',

  // Issue category colors
  issueCategories: {
    pothole: '#DC2626',
    garbage: '#EA580C',
    streetlight: '#EAB308',
    water_supply: '#2563EB',
    road_damage: '#D97706',
    construction: '#7C3AED',
    drainage: '#0D9488',
    traffic: '#DC2626',
    healthcare: '#16A34A',
    education: '#2563EB',
    public_safety: '#1E293B',
    other: '#6B7280',
  },
} as const;

export type ColorName = keyof typeof colors;
