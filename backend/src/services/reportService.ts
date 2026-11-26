export interface FakeNewsReport {
  ticketId: string;
  claimId?: string;
  claimTitle: string;
  originalClaim: string;
  authority: string;
  sourceNumberOrUrl?: string;
  incidentDetails?: string;
  reportedAt: string;
}

const submittedReports: FakeNewsReport[] = [];

export function createFakeNewsReport(input: {
  claimId?: string;
  claimTitle?: string;
  originalClaim?: string;
  authority?: string;
  sourceNumberOrUrl?: string;
  incidentDetails?: string;
}): FakeNewsReport {
  const ticketId = `TL-CYBER-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const newReport: FakeNewsReport = {
    ticketId,
    claimId: input.claimId,
    claimTitle: input.claimTitle || 'Reported Claim',
    originalClaim: input.originalClaim || input.claimTitle || '',
    authority: input.authority || 'cybercrime',
    sourceNumberOrUrl: input.sourceNumberOrUrl || undefined,
    incidentDetails: input.incidentDetails || undefined,
    reportedAt: new Date().toISOString(),
  };

  submittedReports.push(newReport);
  return newReport;
}

export function listSubmittedReports(): FakeNewsReport[] {
  return [...submittedReports];
}
