import { create } from 'zustand';

interface UIState {
  isRefreshing: boolean;
  activeTab: string;
  searchQuery: string;
  notificationCount: number;

  // Actions
  setRefreshing: (refreshing: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setNotificationCount: (count: number) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isRefreshing: false,
  activeTab: 'Home',
  searchQuery: '',
  notificationCount: 3,

  setRefreshing: (isRefreshing: boolean) => set({ isRefreshing }),
  setActiveTab: (activeTab: string) => set({ activeTab }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setNotificationCount: (notificationCount: number) => set({ notificationCount }),
  incrementNotifications: () => set({ notificationCount: get().notificationCount + 1 }),
  clearNotifications: () => set({ notificationCount: 0 }),
}));
