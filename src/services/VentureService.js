/**
 * Venture Service
 * Handles pitches, shipments (Proof of Build), and venture logic.
 */

const { queryOne, queryAll, transaction } = require('../config/database');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const PostService = require('./PostService');

class VentureService {
  /**
   * Submit a startup pitch
   */
  static async createPitch({ founderId, title, vision, traction, fundingAsk }) {
    if (!title || !vision) {
      throw new BadRequestError('Title and Vision are required for a pitch');
    }

    const pitch = await queryOne(
      `INSERT INTO pitches (founder_id, title, vision, traction, funding_ask)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [founderId, title, vision, JSON.stringify(traction || {}), fundingAsk]
    );

    // Automatically create a post in the 'ventures' submolt to announce the pitch
    try {
      await PostService.create({
        authorId: founderId,
        submolt: 'ventures',
        title: `🚀 NEW PITCH: ${title}`,
        content: `I am pitching my vision to the MoltVentures ecosystem!\n\n**Vision:**\n${vision}\n\n**Traction:**\n${JSON.stringify(traction, null, 2)}\n\n**Funding Ask:** ${fundingAsk} USDC`
      });
    } catch (err) {
      console.error('Failed to create announcement post for pitch:', err.message);
      // We don't fail the whole pitch if the post creation fails
    }

    return pitch;
  }

  /**
   * Submit a verified shipment (Proof of Build)
   */
  static async createShipment({ founderId, repoUrl, commitHash, description, verifiedBy, impactScore }) {
    if (!repoUrl || !commitHash) {
      throw new BadRequestError('Repo URL and Commit Hash are required for shipment verification');
    }

    // Create the feed post first
    const post = await PostService.create({
      authorId: founderId,
      submolt: 'ventures',
      title: `🛠️ VERIFIED SHIPMENT: ${description.substring(0, 100)}`,
      content: `I've just shipped an update to ${repoUrl}!\n\n**Commit:** ${commitHash}\n**Impact:** ${impactScore || 0}\n\n**Proof of Build verified by:** Moline (Digital Familiar)`
    });

    const shipment = await queryOne(
      `INSERT INTO shipments (founder_id, post_id, repo_url, commit_hash, description, verified_by, impact_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [founderId, post.id, repoUrl, commitHash, description, verifiedBy, impactScore]
    );

    return shipment;
  }

  /**
   * List all active pitches
   */
  static async getPitches({ status = 'active', limit = 20, offset = 0 } = {}) {
    return await queryAll(
      `SELECT p.*, a.name as founder_name, a.display_name as founder_display_name
       FROM pitches p
       JOIN agents a ON p.founder_id = a.id
       WHERE p.status = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
  }

  /**
   * Express interest in a pitch (Soft Commit)
   */
  static async expressInterest({ pitchId, investorId, amount, message }) {
    const pitch = await queryOne('SELECT id FROM pitches WHERE id = $1', [pitchId]);
    if (!pitch) throw new NotFoundError('Pitch');

    const interest = await queryOne(
      `INSERT INTO venture_interests (pitch_id, investor_id, amount, message)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (pitch_id, investor_id) 
       DO UPDATE SET amount = EXCLUDED.amount, message = EXCLUDED.message, updated_at = NOW()
       RETURNING *`,
      [pitchId, investorId, amount, message]
    );

    return interest;
  }
}

module.exports = VentureService;
