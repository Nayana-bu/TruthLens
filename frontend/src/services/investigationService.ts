import type {
  ClaimDossier,
  InvestigationRecord,
  InvestigationStatistics,
  Language,
  SubmissionMode,
} from '../types';
import { apiFetchJson } from './apiClient';

export async function fetchInvestigationsAndStats(): Promise<{
  dossiers: ClaimDossier[] | null;
  statistics: InvestigationStatistics | null;
}> {
  const [invRes, statsRes] = await Promise.all([
    apiFetchJson<{ success?: boolean; investigations?: InvestigationRecord[] }>('/api/investigations'),
    apiFetchJson<{ success?: boolean; statistics?: InvestigationStatistics }>('/api/statistics'),
  ]);

  const dossiers =
    invRes.ok && invRes.data?.success && Array.isArray(invRes.data.investigations)
      ? invRes.data.investigations.map((r) => r.dossier)
      : null;

  const statistics =
    statsRes.ok && statsRes.data?.success && statsRes.data.statistics
      ? statsRes.data.statistics
      : null;

  return { dossiers, statistics };
}

export async function investigateClaimRequest(params: {
  claim: string;
  mode: SubmissionMode;
  imageBase64?: string;
  language: Language;
}): Promise<ClaimDossier | null> {
  const res = await apiFetchJson<{ success?: boolean; dossier?: ClaimDossier }>('/api/investigate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (res.ok && res.data?.success && res.data.dossier) {
    return res.data.dossier;
  }
  return null;
}

export async function updateInvestigationRequest(params: {
  id: string;
  claim: string;
  language: Language;
}): Promise<{
  success: boolean;
  dossier?: ClaimDossier;
  statistics?: InvestigationStatistics;
  error?: string;
}> {
  const res = await apiFetchJson<{
    success?: boolean;
    dossier?: ClaimDossier;
    statistics?: InvestigationStatistics;
    error?: string;
  }>(`/api/investigations/${encodeURIComponent(params.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      claim: params.claim,
      language: params.language,
    }),
  });

  if (res.ok && res.data?.success && res.data.dossier) {
    return {
      success: true,
      dossier: res.data.dossier,
      statistics: res.data.statistics,
    };
  }
  return {
    success: false,
    error: res.data?.error || 'Failed to update and re-investigate claim.',
  };
}

export async function deleteInvestigationRequest(id: string): Promise<{
  ok: boolean;
  statistics?: InvestigationStatistics;
}> {
  const res = await apiFetchJson<{
    success?: boolean;
    statistics?: InvestigationStatistics;
  }>(`/api/investigations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (res.ok) {
    return { ok: true, statistics: res.data?.statistics };
  }
  return { ok: false };
}
