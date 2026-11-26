import { apiFetchJson } from './apiClient';

export async function submitFakeNewsReport(payload: {
  claimId: string;
  claimTitle: string;
  originalClaim: string;
  authority: string;
  sourceNumberOrUrl?: string;
  incidentDetails?: string;
}): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  const res = await apiFetchJson<{ success?: boolean; ticketId?: string; error?: string }>('/api/report', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Server returned HTTP ${res.status}`);
  }
  if (res.data?.success && res.data.ticketId) {
    return { success: true, ticketId: res.data.ticketId };
  }
  throw new Error(res.data?.error || 'Failed to file report');
}
