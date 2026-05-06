export interface StoryCandidate {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  ingestedAt: string;
  hasNumber: boolean;
  domain: string;
  ingestSource: 'thenewsapi' | 'wikipedia' | 'newsletter';
}

export interface SofCluster {
  domain: string;
  stories: StoryCandidate[];
}

export interface CandidatesFile {
  date: string;
  candidates: StoryCandidate[];
}

export interface SelectedFile {
  date: string;
  lede: StoryCandidate[];
  spread: StoryCandidate[];
  sofClusters: SofCluster[];
}
