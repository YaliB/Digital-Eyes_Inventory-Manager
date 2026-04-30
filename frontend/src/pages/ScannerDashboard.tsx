import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { ScanTask } from '@/types';
import * as api from '@/services/api';

const SHELF_META: Record<string, { aisle: string; shelf: string; name: string }> = {
  'shelf-1': { aisle: 'Aisle 3', shelf: 'Snacks',    name: 'Snacks Shelf' },
  'shelf-2': { aisle: 'Aisle 1', shelf: 'Dairy',     name: 'Dairy Shelf' },
  'shelf-3': { aisle: 'Aisle 5', shelf: 'Beverages', name: 'Beverages Shelf' },
};

function scoreToPriority(score: number | null): ScanTask['priority'] {
  if (score === null || score < 50) return 'high';
  if (score < 75) return 'medium';
  return 'low';
}

function scoreToStatus(score: number | null): ScanTask['status'] {
  if (score === null || score < 60) return 'pending';
  if (score < 85) return 'in_progress';
  return 'completed';
}

function timeAgo(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
}

export const ScannerDashboard = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTasks = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const data = await api.getHistory({ limit: 20 }) as any;
      setScans(data.scans ?? []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (scanId: string) => {
    setDeletingId(scanId);
    try {
      await api.deleteScan(scanId);
      setScans(prev => prev.filter(s => s.id !== scanId));
      if (expandedId === scanId) setExpandedId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const getStatusIcon = (score: number | null) => {
    const status = scoreToStatus(score);
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'in_progress') return <Clock className="w-5 h-5 text-primary-600" />;
    return <AlertCircle className="w-5 h-5 text-orange-500" />;
  };

  const getPriorityBadge = (score: number | null) => {
    const p = scoreToPriority(score);
    if (p === 'high') return 'bg-red-100 text-red-700';
    if (p === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-neutral-100 text-neutral-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const pendingCount = scans.filter(s => scoreToStatus(s.shelf_health_score) === 'pending').length;
  const completedCount = scans.filter(s => scoreToStatus(s.shelf_health_score) === 'completed').length;

  return (
    <Layout headerTitle="Task Dashboard">
      <div className="px-4 py-6 space-y-6">

        {isLoading && (
          <p className="text-center text-sm text-neutral-500 py-8">Loading tasks...</p>
        )}

        {!isLoading && fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {fetchError}
          </div>
        )}

        {!isLoading && !fetchError && scans.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-neutral-500 text-sm">No scan history yet.</p>
            <Button onClick={() => navigate('/scanner')}>Go scan a shelf</Button>
          </div>
        )}

        {!isLoading && scans.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: scans.length, label: 'Total Scans', color: 'text-primary-600' },
                { value: pendingCount, label: 'Need Restock', color: 'text-orange-500' },
                { value: completedCount, label: 'Healthy', color: 'text-green-600' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-lg border border-neutral-200 p-3 text-center"
                >
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-neutral-600 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Scan / Task list */}
            <div>
              <h2 className="font-semibold text-neutral-900 mb-3">Scan History</h2>
              <div className="space-y-2">
                {scans.map((scan: any, idx: number) => {
                  const score: number = scan.shelf_health_score ?? 0;
                  const meta = SHELF_META[scan.shelf_id] ?? { aisle: scan.shelf_id, shelf: '—', name: scan.shelf_id };
                  const gaps: any[] = scan.result_json?.gaps ?? [];
                  const actions: string[] = scan.result_json?.prioritized_actions ?? [];
                  const summary: string = scan.result_json?.overall_summary ?? '';
                  const method: string = scan.result_json?.analysis_method ?? '';
                  const isExpanded = expandedId === scan.id;

                  return (
                    <motion.div
                      key={scan.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                    >
                      {/* Task header row */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : scan.id)}
                        className="w-full text-left bg-white border border-neutral-200 rounded-t-lg px-4 py-3 hover:bg-neutral-50 transition-colors"
                        style={{ borderRadius: isExpanded ? '8px 8px 0 0' : '8px' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">{getStatusIcon(score)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-neutral-900 text-sm">
                                  {meta.aisle} — {meta.shelf}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreBadge(score)}`}>
                                  {score}/100
                                </span>
                                {gaps.length > 0 && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                                    {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs font-semibold px-2 py-1 rounded ${getPriorityBadge(score)}`}>
                                  {scoreToPriority(score).toUpperCase()}
                                </span>
                                {isExpanded
                                  ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                                  : <ChevronDown className="w-4 h-4 text-neutral-400" />
                                }
                              </div>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              {timeAgo(scan.created_at)}
                              {method === 'baseline_comparison' && ' · 🔄 Baseline'}
                              {method === 'single_image' && ' · 🎯 Direct'}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            key="detail"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border border-t-0 border-neutral-200 rounded-b-lg bg-neutral-50"
                          >
                            <div className="px-4 py-3 space-y-3">

                              {summary && (
                                <p className="text-xs text-neutral-600 italic">"{summary}"</p>
                              )}

                              {/* Gaps */}
                              {gaps.length > 0 ? (
                                <div>
                                  <p className="text-xs font-semibold text-neutral-700 mb-1.5">
                                    Detected Gaps ({gaps.length})
                                  </p>
                                  <ul className="space-y-2">
                                    {gaps.map((gap: any, i: number) => (
                                      <li key={i} className="text-xs text-neutral-700 bg-white rounded-lg px-3 py-2 border border-neutral-100">
                                        <div className="flex items-start gap-2">
                                          <span className={`font-bold flex-shrink-0 ${gap.severity === 'fully_out' ? 'text-red-600' : 'text-yellow-600'}`}>
                                            {gap.severity === 'fully_out' ? '❌' : '⚠️'}
                                          </span>
                                          <div>
                                            <span className="font-semibold">
                                              {gap.estimated_missing_product ?? 'Unknown product'}
                                            </span>
                                            {gap.location_description && (
                                              <span className="text-neutral-500"> — {gap.location_description}</span>
                                            )}
                                            {gap.visual_evidence && (
                                              <p className="text-neutral-400 mt-0.5">{gap.visual_evidence}</p>
                                            )}
                                            {(gap.substitutes ?? []).length > 0 && (
                                              <p className="text-primary-600 mt-0.5">
                                                💡 Try: {(gap.substitutes as any[]).map((s: any) => s.name).join(', ')}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p className="text-xs text-green-600 font-medium">✅ No gaps detected — shelf is healthy</p>
                              )}

                              {/* Top actions */}
                              {actions.slice(0, 3).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-neutral-700 mb-1">Recommended Actions</p>
                                  <ul className="space-y-1">
                                    {actions.slice(0, 3).map((a: string, i: number) => (
                                      <li key={i} className="text-xs text-neutral-600 flex gap-1.5">
                                        <span className="text-primary-600 font-bold">•</span> {a}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2 pt-1">
                                {scoreToStatus(score) !== 'completed' && (
                                  <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => navigate('/scanner')}
                                  >
                                    Rescan This Shelf
                                  </Button>
                                )}
                                <button
                                  onClick={() => deleteTask(scan.id)}
                                  disabled={deletingId === scan.id}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {deletingId === scan.id ? 'Deleting…' : 'Mark Restocked'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <Button variant="outline" fullWidth onClick={loadTasks}>
              <RefreshCw className="w-4 h-4" />
              Refresh Tasks
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
};
