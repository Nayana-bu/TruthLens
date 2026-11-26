import type { Request, Response } from 'express';
import type { SubmissionMode } from '../types.ts';
import { analyzeClaimText } from '../services/claimAnalyzer.ts';
import { runInvestigationPipeline } from '../services/investigationPipelineService.ts';
import {
  saveInvestigation,
  getInvestigation,
  listInvestigations,
  deleteInvestigation,
  updateInvestigation,
  getStatistics,
  type InvestigationRecord,
} from '../db/investigationsDb.ts';

export async function handleInvestigateClaim(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { claim, mode, imageBase64, imageName } = req.body || {};
    if (claim !== undefined && typeof claim !== 'string') {
      return res.status(400).json({ error: 'Invalid claim format.' });
    }
    if (typeof claim === 'string' && claim.length > 12000) {
      return res.status(400).json({ error: 'Claim text exceeds maximum allowed length (12,000 characters).' });
    }
    if (imageBase64 !== undefined && (typeof imageBase64 !== 'string' || imageBase64.length > 10_000_000)) {
      return res.status(400).json({ error: 'Invalid or oversized image payload.' });
    }

    const userClaimText = (typeof claim === 'string' ? claim : '').trim();
    const resolvedMode: SubmissionMode =
      mode === 'ocr' || mode === 'url' || mode === 'text' ? mode : 'text';

    console.log(`\n=============================================================`);
    console.log(`[TRUTHLENS-ENGINE] Ingested verification request:`);
    console.log(`[TRUTHLENS-ENGINE] Claim: "${userClaimText.slice(0, 120)}" (mode: ${resolvedMode})`);
    if (imageBase64) {
      console.log(`[TRUTHLENS-ENGINE] Attached image evidence detected (${imageBase64.length} chars)`);
    }

    if (!userClaimText && !imageBase64) {
      return res.status(400).json({ error: 'Please enter news or claim text to investigate.' });
    }

    const { dossier, extractedText, searchStatus } = await runInvestigationPipeline({
      rawInputText: userClaimText,
      mode: resolvedMode,
      imageBase64,
      imageName: typeof imageName === 'string' ? imageName.slice(0, 200) : undefined,
    });

    const recordToSave: InvestigationRecord = {
      id: dossier.id,
      originalInput: userClaimText || (imageName ? `Image: ${String(imageName).slice(0, 120)}` : 'Submitted image'),
      extractedText,
      inputType: resolvedMode,
      verdict: dossier.verdict,
      clearVerdictStatus: dossier.clearVerdictStatus,
      verdictLabel: dossier.verdictLabel || dossier.verdict,
      confidenceScore: dossier.confidenceScore || 42,
      evidenceStrength:
        dossier.evidenceStrength ||
        dossier.evidenceAnalysis?.evidenceStrengthLabel ||
        'Insufficient Public Data',
      language: req.body?.language === 'kn' || req.body?.language === 'hi' ? req.body.language : 'en',
      status: 'completed',
      errorMessage:
        searchStatus === 'error_reported'
          ? 'Live web retrieval encountered a temporary disruption; verification pending.'
          : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dossier,
    };
    await saveInvestigation(recordToSave);

    const durationMs = Date.now() - startTime;
    console.log(`[TRUTHLENS-ENGINE] Verification completed in ${durationMs}ms`);
    console.log(
      `[TRUTHLENS-ENGINE] Final Verdict: ${dossier.verdict} (${dossier.clearVerdictStatus}), Score: ${dossier.confidenceScore}%`
    );
    console.log(`=============================================================\n`);

    return res.json({ success: true, dossier, record: recordToSave });
  } catch (error: any) {
    console.error('[TRUTHLENS-ENGINE] Critical catch handler:', error);
    const rawClaim = typeof req.body?.claim === 'string' ? req.body.claim.slice(0, 12000) : 'News Claim';
    const fallbackMode: SubmissionMode =
      req.body?.mode === 'ocr' || req.body?.mode === 'url' || req.body?.mode === 'text' ? req.body.mode : 'text';
    const fallback = analyzeClaimText(rawClaim, fallbackMode);
    fallback.id = `TL-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fallbackRecord: InvestigationRecord = {
      id: fallback.id,
      originalInput: rawClaim,
      extractedText: rawClaim,
      inputType: fallbackMode,
      verdict: fallback.verdict,
      clearVerdictStatus: fallback.clearVerdictStatus,
      verdictLabel: fallback.verdictLabel || fallback.verdict,
      confidenceScore: fallback.confidenceScore || 42,
      evidenceStrength: 'Insufficient Public Data',
      language: req.body?.language === 'kn' || req.body?.language === 'hi' ? req.body.language : 'en',
      status: 'completed',
      errorMessage: 'Unexpected verification engine error; pending review.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dossier: fallback,
    };
    await saveInvestigation(fallbackRecord);
    return res.json({ success: true, dossier: fallback, record: fallbackRecord });
  }
}

export async function handleListInvestigations(req: Request, res: Response) {
  try {
    const search = req.query.search as string | undefined;
    const verdict = req.query.verdict as string | undefined;
    const inputType = req.query.inputType as string | undefined;
    const userId = req.query.userId as string | undefined;

    const list = await listInvestigations({ search, verdict, inputType, userId });
    return res.json({
      success: true,
      count: list.length,
      investigations: list,
    });
  } catch (error: any) {
    console.error('Error fetching investigations:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve investigations.' });
  }
}

export async function handleGetInvestigation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string | undefined;
    const record = await getInvestigation(id, userId);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Investigation record not found.' });
    }

    return res.json({
      success: true,
      investigation: record,
      dossier: record.dossier,
    });
  } catch (error: any) {
    console.error('Error fetching single investigation:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve investigation.' });
  }
}

export async function handleUpdateInvestigation(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { claim, mode, language, userId } = req.body || {};
    if (typeof claim !== 'string' || claim.length > 12000) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid claim (maximum 12,000 characters).',
      });
    }
    const userClaimText = claim.trim();

    if (!userClaimText || userClaimText.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid claim of at least 3 characters.',
      });
    }

    const existing = await getInvestigation(id, userId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Investigation record not found or does not exist.',
      });
    }

    console.log(`\n=============================================================`);
    console.log(`[TRUTHLENS-ENGINE] Re-investigating updated claim for [${id}]:`);
    console.log(`[TRUTHLENS-ENGINE] Original: "${existing.originalInput.slice(0, 80)}"`);
    console.log(`[TRUTHLENS-ENGINE] New Claim: "${userClaimText.slice(0, 80)}"`);

    const resolvedMode: SubmissionMode =
      mode === 'ocr' || mode === 'url' || mode === 'text' ? mode : existing.inputType || 'text';
    const { dossier: finalDossier, extractedText, searchStatus } = await runInvestigationPipeline({
      rawInputText: userClaimText,
      mode: resolvedMode,
      fixedId: id,
    });

    const updatedRecord: InvestigationRecord = {
      id,
      originalInput: userClaimText,
      extractedText,
      inputType: resolvedMode,
      verdict: finalDossier.verdict,
      clearVerdictStatus: finalDossier.clearVerdictStatus,
      verdictLabel: finalDossier.verdictLabel || finalDossier.verdict,
      confidenceScore: finalDossier.confidenceScore || 42,
      evidenceStrength:
        finalDossier.evidenceStrength ||
        finalDossier.evidenceAnalysis?.evidenceStrengthLabel ||
        'Insufficient Public Data',
      language:
        language === 'kn' || language === 'hi' || language === 'en' ? language : existing.language || 'en',
      status: 'completed',
      errorMessage:
        searchStatus === 'error_reported'
          ? 'Live web retrieval encountered a temporary disruption; verification pending.'
          : null,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      dossier: finalDossier,
      userId: existing.userId || userId,
    };

    const saved = await updateInvestigation(id, updatedRecord);
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Database failed to update investigation record.',
      });
    }

    const updatedStats = await getStatistics(userId);
    const durationMs = Date.now() - startTime;
    console.log(`[TRUTHLENS-ENGINE] Investigation [${id}] re-verified and updated in ${durationMs}ms`);
    console.log(
      `[TRUTHLENS-ENGINE] New Verdict: ${finalDossier.verdict} (${finalDossier.clearVerdictStatus}), Score: ${finalDossier.confidenceScore}%`
    );
    console.log(`=============================================================\n`);

    return res.json({
      success: true,
      message: 'Investigation updated and re-verified successfully.',
      investigation: saved,
      dossier: finalDossier,
      statistics: updatedStats,
    });
  } catch (err: any) {
    console.error('[TRUTHLENS-ENGINE] Error updating investigation:', err);
    return res.status(500).json({
      success: false,
      error: 'Re-verification encountered an internal verification engine error. Result needs verification.',
    });
  }
}

export async function handleDeleteInvestigation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string | undefined;

    const deleted = await deleteInvestigation(id, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Investigation not found or already deleted.' });
    }

    const updatedStats = await getStatistics(userId);
    return res.json({
      success: true,
      deletedId: id,
      message: 'Investigation permanently deleted.',
      statistics: updatedStats,
    });
  } catch (error: any) {
    console.error('Error deleting investigation:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete investigation.' });
  }
}

export async function handleGetStatistics(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string | undefined;
    const statistics = await getStatistics(userId);
    return res.json({
      success: true,
      statistics,
    });
  } catch (error: any) {
    console.error('Error calculating statistics:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate statistics.' });
  }
}
