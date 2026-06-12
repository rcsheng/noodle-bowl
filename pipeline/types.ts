export interface TheNewsAPIArticle {
  uuid: string;
  title: string;
  description: string;
  snippet: string;
  url: string;
  image_url: string | null;
  language: string;
  published_at: string; // ISO 8601, e.g. "2026-05-10T12:00:00.000000Z"
  source: string;
  categories: string[];
  locale: string;
  relevance_score: number | null;
  keywords: string[] | null;
}

export interface StoryCandidate {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  ingestedAt: string;
  hasNumber: boolean;
  domain: string;
  ingestSource: 'thenewsapi' | 'scraped' | 'researched' | 'llm-historical' | 'web-historical';
  tags: string[];                          // pipeline/editorial signals e.g. "weird", "breaking"
  sourceArticle?: TheNewsAPIArticle;       // full raw TheNewsAPI response; absent for scraped candidates
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
