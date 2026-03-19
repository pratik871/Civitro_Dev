import type { IssueCategory } from './issue';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  IssueDetail: { issueId: string };
  LeaderProfile: { leaderId: string };
  PollDetail: { pollId: string };
  Polls: undefined;
  Promises: undefined;
  Messages: undefined;
  Notifications: undefined;
  Search: undefined;
  CHI: { constituencyId?: string };
  Profile: undefined;
  IssuesList: undefined;
  VoiceDetail: { voiceId: string };
  CreateVoice: undefined;
  VoicesList: undefined;
  Language: undefined;
  NotificationSettings: undefined;
  Privacy: undefined;
  HelpSupport: undefined;
  Terms: undefined;
  About: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: { phone?: string };
  OTPVerify: { phone: string; isRegistering?: boolean };
  AadhaarVerify: { userId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Report: undefined;
  Leaders: undefined;
  Map: undefined;
  Trending: undefined;
};

export type ReportStepData = {
  photoUri?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  category?: IssueCategory;
  suggestedCategory?: IssueCategory;
  department?: string;
  description?: string;
};
