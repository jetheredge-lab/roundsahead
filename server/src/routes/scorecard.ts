import { Router } from 'express';
import { scorecardEnabled, getFinancials, getByName, searchColleges } from '../scorecard.js';
import { requireAuth } from '../auth.js';
import { log } from '../log.js';

export const scorecardRouter = Router();

// Public: lets the client decide whether to show the net-price section.
scorecardRouter.get('/status', (_req, res) => {
  res.json({ enabled: scorecardEnabled });
});

// Search all operating U.S. colleges by name (+ optional state).
scorecardRouter.get('/search', requireAuth, async (req, res) => {
  if (!scorecardEnabled) {
    res.status(503).json({ error: 'Scorecard not configured' });
    return;
  }
  const q = String(req.query.q ?? '').trim();
  const state = req.query.state ? String(req.query.state) : undefined;
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }
  try {
    const results = await searchColleges(q, state);
    res.json({ results });
  } catch (e) {
    log.error('scorecard search failed', { error: (e as Error).message });
    res.json({ results: [] });
  }
});

// Resolve a college by name (+ optional state) and return its financials.
scorecardRouter.get('/lookup', requireAuth, async (req, res) => {
  if (!scorecardEnabled) {
    res.status(503).json({ error: 'Scorecard not configured' });
    return;
  }
  const name = String(req.query.name ?? '').trim();
  const state = req.query.state ? String(req.query.state) : undefined;
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const financials = await getByName(name, state);
  if (!financials) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ financials });
});

// Direct fetch by IPEDS UNITID.
scorecardRouter.get('/:unitId', requireAuth, async (req, res) => {
  if (!scorecardEnabled) {
    res.status(503).json({ error: 'Scorecard not configured' });
    return;
  }
  const unitId = Number(req.params.unitId);
  if (!Number.isFinite(unitId)) {
    res.status(400).json({ error: 'invalid unitId' });
    return;
  }
  const financials = await getFinancials(unitId);
  if (!financials) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ financials });
});
