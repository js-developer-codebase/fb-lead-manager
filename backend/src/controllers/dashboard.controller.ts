import { Request, Response } from 'express';
import { Lead } from '../models/Lead.js';
import { FormMapping } from '../models/FormMapping.js';
import { leadQueue } from '../queues/queue.connection.js';

export class DashboardController {
  /**
   * Aggregates key system metrics for the dashboard
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const totalLeads = await Lead.countDocuments();
      const syncedLeads = await Lead.countDocuments({ 'crmSync.status': 'SYNCED' });
      const failedLeads = await Lead.countDocuments({ 'crmSync.status': 'FAILED' });
      const pendingLeads = await Lead.countDocuments({ 'crmSync.status': 'PENDING' });
      const capiSentCount = await Lead.countDocuments({ 'capiSync.sent': true });

      // Leads by Project Name
      const projectStats = await Lead.aggregate([
        { $match: { projectName: { $exists: true, $ne: '' } } },
        { $group: { _id: '$projectName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Leads by Location [Place]
      const locationStats = await Lead.aggregate([
        { $match: { location: { $exists: true, $ne: '' } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Queue metrics
      let queueStats = { waiting: 0, active: 0, failed: 0, completed: 0 };
      try {
        const [waiting, active, failed, completed] = await Promise.all([
          leadQueue.getWaitingCount(),
          leadQueue.getActiveCount(),
          leadQueue.getFailedCount(),
          leadQueue.getCompletedCount()
        ]);
        queueStats = { waiting, active, failed, completed };
      } catch (qErr: any) {
        console.warn('[Dashboard] Queue metric check warning:', qErr.message);
      }

      res.json({
        success: true,
        stats: {
          totalLeads,
          syncedLeads,
          failedLeads,
          pendingLeads,
          capiSentCount,
          successRate: totalLeads > 0 ? Math.round((syncedLeads / totalLeads) * 100) : 100,
          projectStats: projectStats.map((p) => ({ projectName: p._id, count: p.count })),
          locationStats: locationStats.map((l) => ({ location: l._id, count: l.count })),
          queue: queueStats
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats', message: err.message });
    }
  }
}
