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

interface WikipediaPageUrls {
  page: string;
  revisions: string;
  edit: string;
  talk: string;
}

export interface WikipediaPage {
  type: string;
  title: string;
  displaytitle: string;
  namespace: { id: number; text: string };
  wikibase_item: string;
  titles: { canonical: string; normalized: string; display: string };
  pageid: number;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  lang: string;
  dir: string;
  revision: string;
  tid: string;
  timestamp: string;
  description: string;
  description_source: string;
  content_urls: { desktop: WikipediaPageUrls; mobile: WikipediaPageUrls };
  extract: string;
  extract_html: string;
}

export interface WikipediaOnThisDayEvent {
  text: string;
  year: number;
  pages: WikipediaPage[];
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
  ingestSource: 'thenewsapi' | 'wikipedia' | 'newsletter';
  weirdSource?: string; // set when discovered via a weird/offbeat news scraper
  sourceArticle?: TheNewsAPIArticle;       // full raw TheNewsAPI response; absent for wikipedia candidates
  sourceEvent?: WikipediaOnThisDayEvent;   // full raw Wikipedia On This Day event; absent for thenewsapi candidates
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
