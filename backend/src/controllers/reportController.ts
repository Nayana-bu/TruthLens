import type { Request, Response } from 'express';
import { createFakeNewsReport } from '../services/reportService.ts';

export function handleCreateReport(req: Request, res: Response) {
  try {
    const { claimId, claimTitle, originalClaim, authority, sourceNumberOrUrl, incidentDetails } =
      req.body || {};

    if (!originalClaim && !claimTitle) {
      return res.status(400).json({ success: false, error: 'Claim details are required for reporting.' });
    }

    const report = createFakeNewsReport({
      claimId,
      claimTitle,
      originalClaim,
      authority,
      sourceNumberOrUrl,
      incidentDetails,
    });

    return res.json({
      success: true,
      ticketId: report.ticketId,
      authority: report.authority,
      reportedAt: report.reportedAt,
      message: 'Fake news report successfully registered and dispatched for official takedown review.',
    });
  } catch (error: any) {
    console.error('Error logging fake news report:', error);
    return res.status(500).json({ success: false, error: 'Internal server error while filing report.' });
  }
}
