import type { IssueCategory } from './issue';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  IssueDetail: { issueId: string };
  LeaderProfile: { leaderId: string };
  PollDetail: { pollId: string };
  Polls: undefined;
  Promises: { leaderId?: string } | undefined;
  Messages: undefined;
  Chat: { conversationId?: string; recipientId?: string; recipientName?: string };
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
  ActionsList: undefined;
  ActionDetail: { actionId: string };
  CreateAction: { patternId?: string } | undefined;
  ActionTimeline: { actionId: string };
  PromiseDetail: { promiseId: string };
  Organizations: undefined;
  OrgDetail: { orgId: string };
  OrgMembers: { orgId: string };
  CreateOrg: undefined;
  Broadcasts: { orgId: string };
  Datamine: undefined;
  Heatmap: { boundaryId: string };
  LeaderDashboard: { leaderId: string };
  ExitPoll: undefined;
  Budget: { boundaryId: string };
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
