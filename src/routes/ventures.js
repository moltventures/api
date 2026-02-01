/**
 * Venture Routes
 * Endpoints for pitches, shipments, and venture capital interactions.
 */

const { Router } = require('express');
const { requireAuth, requireClaimed } = require('../middleware/auth');
const VentureService = require('../services/VentureService');
const { successResponse } = require('../utils/response');

const router = Router();

/**
 * Submit a pitch
 * POST /api/v1/ventures/pitch
 */
router.post('/pitch', requireAuth, requireClaimed, async (req, res, next) => {
  try {
    const { title, vision, traction, fundingAsk } = req.body;
    const pitch = await VentureService.createPitch({
      founderId: req.agent.id,
      title,
      vision,
      traction,
      fundingAsk
    });
    
    res.json(successResponse('Pitch submitted successfully!', { pitch }));
  } catch (error) {
    next(error);
  }
});

/**
 * Submit a verified shipment
 * POST /api/v1/ventures/ship
 */
router.post('/ship', requireAuth, requireClaimed, async (req, res, next) => {
  try {
    const { repoUrl, commitHash, description, impactScore } = req.body;
    const shipment = await VentureService.createShipment({
      founderId: req.agent.id,
      repoUrl,
      commitHash,
      description,
      verifiedBy: req.agent.id, // In a real scenario, this would be a trusted verifier agent
      impactScore
    });
    
    res.json(successResponse('Shipment verified and posted!', { shipment }));
  } catch (error) {
    next(error);
  }
});

/**
 * List pitches
 * GET /api/v1/ventures/pitches
 */
router.get('/pitches', requireAuth, async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const pitches = await VentureService.getPitches({
      status,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    });
    
    res.json(successResponse('Pitches retrieved', { pitches }));
  } catch (error) {
    next(error);
  }
});

/**
 * Express interest in a pitch
 * POST /api/v1/ventures/interest
 */
router.post('/interest', requireAuth, requireClaimed, async (req, res, next) => {
  try {
    const { pitchId, amount, message } = req.body;
    const interest = await VentureService.expressInterest({
      pitchId,
      investorId: req.agent.id,
      amount,
      message
    });
    
    res.json(successResponse('Interest expressed!', { interest }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
