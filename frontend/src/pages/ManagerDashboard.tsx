import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { HealthScore, AlertItem } from '@/components/DashboardComponents';
import { LoadingState } from '@/components/LoadingState';
import * as api from '@/services/api';

interface GapAlert {
  id: string;
  productName: string;
  sku: string;
  aisle: string;
  shelf: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function scoreBadgeCls(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

const SHELF_META: Record<string, { aisle: string; shelf: string }> = {
  'shelf-1': { aisle: 'Aisle 3', shelf: 'Snacks' },
  'shelf-2': { aisle: 'Aisle 1', shelf: 'Dairy' },
  'shelf-3': { aisle: 'Aisle 5', shelf: 'Beverages' },
};

function gapToPriority(severity: string, confidence: number): GapAlert['priority'] {
  if (severity === 'fully_out') return 'critical';
  if (confidence >= 0.75) return 'high';
  return 'medium';
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [healthScore, setHealthScore] = useState(0);
  const [scansToday, setScansToday] = useState(0);
  const [alerts, setAlerts] = useState<GapAlert[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [rawScans, setRawScans] = useState<any[]>([]);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const data = await api.getHistory({ limit: 50 }) as any;
      const scans: any[] = data.scans ?? [];

      setRawScans(scans);

      if (scans.length === 0) {
        setHealthScore(0);
        setScansToday(0);
        setAlerts([]);
        setRecommendations([]);
        setIsLoading(false);
        return;
      }

      // Average health score across all scans
      const scores = scans
        .map((s: any) => s.shelf_health_score)
        .filter((s: any) => s !== null && s !== undefined);
      const avgScore = scores.length
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;
      setHealthScore(avgScore);

      // Count today's scans
      setScansToday(scans.filter((s: any) => isToday(s.created_at)).length);

      // Build alerts from all gaps across all recent scans (deduplicated by product name)
      const seen = new Set<string>();
      const gapAlerts: GapAlert[] = [];

      for (const scan of scans) {
        const meta = SHELF_META[scan.shelf_id] ?? { aisle: scan.shelf_id, shelf: '—' };
        const gaps: any[] = scan.result_json?.gaps ?? [];

        for (const gap of gaps) {
          const product = gap.estimated_missing_product ?? 'Unknown product';
          if (seen.has(product)) continue;
          seen.add(product);

          gapAlerts.push({
            id: `${scan.id}-${gap.gap_id}`,
            productName: product,
            sku: product.toLowerCase().replace(/\s+/g, '-').slice(0, 12),
            aisle: meta.aisle,
            shelf: `${meta.shelf} — ${gap.location_description ?? ''}`.trim(),
            priority: gapToPriority(gap.severity, gap.confidence ?? 0),
          });
        }
      }

      // Sort by priority: critical first
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      gapAlerts.sort((a, b) => order[a.priority] - order[b.priority]);
      setAlerts(gapAlerts);

      // Use prioritized_actions from most recent scan
      const latest = scans[0];
      setRecommendations(latest?.result_json?.prioritized_actions ?? []);

    } catch (err: any) {
      setFetchError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (isLoading) {
    return (
      <Layout headerTitle="Store Dashboard">
        <div className="px-4 py-12">
          <LoadingState state="loading" message="Loading analytics..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Store Dashboard">
      <div className="px-4 py-6 space-y-6">

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {fetchError}
          </div>
        )}

        {/* Shelf Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <HealthScore score={healthScore} />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary-50 rounded-lg p-4 border border-primary-200"
          >
            <p className="text-2xl font-bold text-primary-600">{scansToday}</p>
            <p className="text-xs text-primary-700 font-medium mt-1">Scans Today</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-alert-50 rounded-lg p-4 border border-alert-200"
          >
            <p className="text-2xl font-bold text-alert-600">{alerts.filter(a => a.priority === 'critical' || a.priority === 'high').length}</p>
            <p className="text-xs text-alert-700 font-medium mt-1">Out of Stock</p>
          </motion.div>
        </div>

        {/* Out of Stock Alerts */}
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            {fetchError ? null : 'No gaps detected yet — go scan a shelf to see real alerts.'}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-alert-600" />
                Out of Stock Alerts
              </h2>
              <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                {alerts.length} active
              </span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.08 }}
                >
                  <AlertItem
                    priority={alert.priority}
                    productName={alert.productName}
                    sku={alert.sku}
                    aisle={alert.aisle}
                    shelf={alert.shelf}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations from AI */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-primary-50 border border-primary-200 rounded-lg p-4"
          >
            <h3 className="font-semibold text-neutral-900 mb-2">AI Recommendations</h3>
            <ul className="space-y-1 text-sm text-neutral-700">
              {recommendations.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Recent Scans Table */}
        {rawScans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <h2 className="font-semibold text-neutral-900 mb-3">Recent Scans</h2>
            <div className="space-y-2">
              {rawScans.slice(0, 10).map((scan: any) => (
                <div key={scan.id}>
                  <button
                    onClick={() => setExpandedScanId(expandedScanId === scan.id ? null : scan.id)}
                    className="w-full text-left bg-white border border-neutral-200 rounded-lg px-4 py-3 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-800">{scan.shelf_id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBadgeCls(scan.shelf_health_score)}`}>
                          {scan.shelf_health_score}/100
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{scan.gaps_count} gap{scan.gaps_count !== 1 ? 's' : ''}</span>
                        <span>{timeAgo(scan.created_at)}</span>
                        <span className="text-neutral-400">{expandedScanId === scan.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </button>

                  {expandedScanId === scan.id && (
                    <div className="border border-t-0 border-neutral-200 rounded-b-lg px-4 py-3 bg-neutral-50 space-y-3">
                      {(scan.result_json?.prioritized_actions ?? []).slice(0, 3).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-600 mb-1">Top Actions</p>
                          <ul className="space-y-1">
                            {(scan.result_json.prioritized_actions as string[]).slice(0, 3).map((action, i) => (
                              <li key={i} className="text-xs text-neutral-700 flex gap-1.5">
                                <span className="text-primary-600 font-bold">•</span> {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(scan.result_json?.gaps ?? []).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-600 mb-1">Detected Gaps</p>
                          <ul className="space-y-1.5">
                            {(scan.result_json.gaps as any[]).map((gap, i) => (
                              <li key={i} className="text-xs text-neutral-700">
                                <span className={gap.severity === 'fully_out'
                                  ? 'text-red-600 font-semibold'
                                  : 'text-yellow-600 font-semibold'}>
                                  {gap.severity === 'fully_out' ? '❌ Empty' : '⚠️ Low'}
                                </span>{' '}
                                {gap.estimated_missing_product ?? 'Unknown'} — {gap.location_description}
                                {(gap.substitutes ?? []).length > 0 && (
                                  <span className="text-neutral-400 ml-1">
                                    💡 {(gap.substitutes as any[]).map((s: any) => s.name).join(', ')}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={() => navigate('/scanner')}>
            Start Scan
          </Button>
          <Button variant="outline" fullWidth onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        <Button variant="outline" fullWidth onClick={() => navigate('/shelf-status')}>
          Shelf Status
        </Button>
      </div>
    </Layout>
  );
};
