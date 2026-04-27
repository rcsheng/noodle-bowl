export type GameId = 'lede' | 'spread' | 'sof' | 'wave' | 'quip';

export interface HelpCreateInput {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  askerPushToken: string | null;
}

export interface HelpCreateOutput {
  token: string;
  url: string;
  expiresAt: string;
}

export interface HelpGetResponse {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  expiresAt: string;
}

export interface HelpRespondInput {
  token: string;
  helperAnswer: string;
}

export interface HelpRespondOutput {
  gameId: string;
  questionIndex: number;
  askerName: string | null;
  helperAnswer: string;
}

export interface ChallengeCreateInput {
  gameId: string;
  questionIndex: number;
  senderPrediction: string;
  senderAnswer: string;
  senderName: string;
  senderPushToken: string | null;
}

export interface ChallengeCreateOutput {
  token: string;
  url: string;
  expiresAt: string;
}

export interface ChallengeGetResponse {
  gameId: string;
  questionIndex: number;
  senderName: string;
  senderPrediction: string;
  expiresAt: string;
}

export interface ChallengeRespondInput {
  token: string;
  friendAnswer: string;
}

export interface ChallengeRespondOutput {
  gameId: string;
  questionIndex: number;
  senderName: string;
  senderAnswer: string;
  senderPrediction: string;
  friendAnswer: string;
}
