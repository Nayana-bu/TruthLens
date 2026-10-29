export type Language = 'en' | 'kn' | 'hi';

export type TabType = 'verify' | 'investigation' | 'investigation-results' | 'explore-feed' | 'community';

export type SubmissionMode = 'text' | 'ocr' | 'url';

export type VerdictType =
  | 'verified_true'
  | 'false'
  | 'misleading'
  | 'partly_true'
  | 'unverified'
  | 'context_missing';

export type ClearVerdictStatus =
  | 'REAL'
  | 'FAKE'
  | 'MISLEADING'
  | 'PARTLY_TRUE'
  | 'UNVERIFIED'
  | 'CONTEXT_MISSING';

export interface EvidenceSource {
  name: string;
  category: string;
  status: 'refuted' | 'confirmed' | 'no_record' | 'corroborated' | 'contradicted' | 'unverified';
  details: string;
  url?: string;
  timestamp?: string;
  publicationDate?: string;
  isPrimary?: boolean;
  credibilityTier?: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web';
  detailsTranslations?: {
    en?: string;
    kn?: string;
    hi?: string;
  };
  categoryTranslations?: {
    en?: string;
    kn?: string;
    hi?: string;
  };
  nameTranslations?: {
    en?: string;
    kn?: string;
    hi?: string;
  };
}

export interface ExtractedClaim {
  id: string;
  claim: string;
  category?: string;
  entities?: string[];
  dates?: string[];
  locations?: string[];
  organizations?: string[];
  amounts?: string[];
  verdict?: VerdictType;
  clearVerdictStatus?: ClearVerdictStatus;
  statusLabel?: string;
}

export interface EvidencePoint {
  point: string;
  sourceName: string;
  url?: string;
  date?: string;
  quoteOrExcerpt?: string;
  isPrimarySource?: boolean;
}

export type EvidenceStrengthRating =
  | 'high_corroboration'
  | 'direct_contradiction'
  | 'mixed_evidence'
  | 'insufficient_data';

export interface EvidenceAnalysis {
  evidenceStrength: EvidenceStrengthRating;
  evidenceStrengthLabel: string;
  criteriaScore: number;
  supportingEvidence: EvidencePoint[];
  contradictingEvidence: EvidencePoint[];
  missingContext?: string[];
  limitationsAndUnresolved: string[];
  searchProviderStatus: 'operational' | 'fallback_archive' | 'error_reported';
  searchQueryCount: number;
  deduplicatedCount?: number;
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
  category: 'phishing' | 'governance' | 'space' | 'weather' | 'health' | 'general';
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
  clearVerdictStatus: ClearVerdictStatus;
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
  extractedClaims?: ExtractedClaim[];
  extractedEntities?: {
    dates?: string[];
    locations?: string[];
    organizations?: string[];
    amounts?: string[];
    people?: string[];
  };
  evidenceAnalysis?: EvidenceAnalysis;
  evidenceStrength?: string;
  submissionMode?: SubmissionMode;
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

export interface UserSession {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  isVerified: boolean;
  authProvider: 'google' | 'password' | 'demo';
  loginTime: string;
}

export interface VerifiedAuthority {
  id: string;
  name: string;
  agencyName: string;
  category: 'government' | 'cyber_security' | 'financial' | 'state' | 'independent_ifcn';
  officialUrl: string;
  helpline?: string;
  whatsappHelpline?: string;
  emailContact?: string;
  description: string;
  verifiedBadge: string;
  jurisdiction: string;
}

export interface InvestigationRecord {
  id: string;
  userId?: string;
  originalInput: string;
  extractedText: string;
  inputType: SubmissionMode;
  verdict: VerdictType;
  clearVerdictStatus: ClearVerdictStatus;
  verdictLabel: string;
  confidenceScore: number;
  evidenceStrength?: string;
  language: Language;
  status: 'completed' | 'failed' | 'processing';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  dossier: ClaimDossier;
}

export interface InvestigationStatistics {
  total: number;
  trueCount: number;
  truePercent: number;
  fakeCount: number;
  fakePercent: number;
  misleadingCount: number;
  misleadingPercent: number;
  partlyTrueCount: number;
  partlyTruePercent: number;
  unverifiedCount: number;
  unverifiedPercent: number;
  contextMissingCount: number;
  contextMissingPercent: number;
}
