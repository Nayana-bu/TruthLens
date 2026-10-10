export type Language = 'en' | 'kn' | 'hi';

export type TabType = 'verify' | 'investigation' | 'explore-feed' | 'community';

export type SubmissionMode = 'text' | 'ocr' | 'url';

export type VerdictType = 'false' | 'misleading' | 'verified_true' | 'partly_true' | 'context_missing';

export interface EvidenceSource {
  name: string;
  category: string;
  status: 'refuted' | 'confirmed' | 'no_record' | 'corroborated';
  details: string;
  url?: string;
  timestamp?: string;
}

export interface ClaimDossier {
  id: string;
  title: string;
  originalClaim: string;
  verdict: VerdictType;
  verdictLabel: string;
  verdictSubtitle: string;
  confidenceScore: number;
  timeAgo: string;
  category: 'phishing' | 'governance' | 'space' | 'weather' | 'health';
  sourceEntity: string;
  languages: ('en' | 'kn' | 'hi')[];
  summary: {
    en: string;
    kn: string;
    hi: string;
  };
  debunkExplanation: {
    en: string;
    kn: string;
    hi: string;
  };
  spokenAudioScript: {
    kn: string;
    hi: string;
    en: string;
  };
  clearVerdictStatus: 'FAKE' | 'MISLEADING' | 'REAL';
  whatsappDebunkNote: {
    en: string;
    kn: string;
    hi: string;
  };
  sources: EvidenceSource[];
  redFlags: string[];
  timeline: {
    time: string;
    event: string;
    source: string;
  }[];
  originVector: string;
  officialRefId?: string;
  groundingInfo?: {
    isGrounded: boolean;
    queries?: string[];
    sources?: { title: string; uri: string }[];
  };
}

export interface CommunitySubmission {
  id: string;
  claimText: string;
  submittedBy: string;
  submittedAt: string;
  platform: 'WhatsApp' | 'Telegram' | 'X/Twitter' | 'Facebook';
  category: string;
  language: Language;
  upvotes: number;
  verdictVotes: {
    falseVotes: number;
    trueVotes: number;
    needsDataVotes: number;
  };
  status: 'under_investigation' | 'debunked' | 'verified';
}
