import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SHELF_META: Record<string, { name: string; location: string }> = {
  'shelf-1': { name: 'Snacks Shelf', location: 'Aisle 3' },
  'shelf-2': { name: 'Dairy Shelf',  location: 'Aisle 1' },
  'shelf-3': { name: 'Beverages Shelf', location: 'Aisle 5' },
};

function scoreBadgeCls(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
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

function methodLabel(method: string): string | null {
  if (method === 'baseline_comparison') return '🔄 Baseline';
  if (method === 'single_image') return '🎯 Direct';
  if (method === 'single_image_fallback') return '⚠️ Fallback';
  return null;
}

interface Props {
  scans: any[];
  maxItems?: number;
}

export const RecentScansWidget = ({ scans, maxItems = 10 }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (scans.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold text-neutral-900 mb-3">Recent Scans</h2>
      <div className="space-y-1.5">
        {scans.slice(0, maxItems).map((scan: any) => {
          const score: number = scan.shelf_health_score ?? 0;
          const gaps: any[] = scan.result_json?.gaps ?? [];
          const actions: string[] = scan.result_json?.prioritized_actions ?? [];
          const summary: string = scan.result_json?.overall_summary ?? '';
          const method: string = scan.result_json?.analysis_method ?? '';
          const shelf = SHELF_META[scan.shelf_id] ?? { name: scan.shelf_id, location: '' };
          const isExpanded = expandedId === scan.id;
          const mLabel = methodLabel(method);

          return (
            <div key={scan.id} className="rounded-xl overflow-hidden border border-neutral-200">

              {/* ── Header row ── */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : scan.id)}
                className="w-full text-left bg-white px-4 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-800">{shelf.name}</span>
                    {shelf.location && (
                      <span className="text-xs text-neutral-400">{shelf.location}</span>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBadgeCls(score)}`}>
                      {score}/100
                    </span>
                    {gaps.length > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                        {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-neutral-500">
                    {mLabel && <span className="hidden sm:inline">{mLabel}</span>}
                    <span>{timeAgo(scan.created_at)}</span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                      : <ChevronDown className="w-4 h-4 text-neutral-400" />
                    }
                  </div>
                </div>
              </button>

              {/* ── Expanded detail ── */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-neutral-200 bg-neutral-50"
                  >
                    <div className="px-4 py-3 space-y-3">

                      {/* AI summary */}
                      {summary && (
                        <p className="text-xs text-neutral-500 italic">"{summary}"</p>
                      )}

                      {/* Gaps */}
                      {gaps.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-neutral-700 mb-2">
                            Products to Restock ({gaps.length})
                          </p>
                          <ul className="space-y-2">
                            {gaps.map((gap: any, i: number) => (
                              <li
                                key={i}
                                className="bg-white border border-neutral-100 rounded-lg px-3 py-2 text-xs"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="flex-shrink-0 text-base leading-none">
                                    {gap.severity === 'fully_out' ? '❌' : '⚠️'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-neutral-800">
                                      {gap.estimated_missing_product ?? 'Unknown product'}
                                    </p>
                                    {gap.location_description && (
                                      <p className="text-neutral-500 mt-0.5">{gap.location_description}</p>
                                    )}
                                    {gap.visual_evidence && (
                                      <p className="text-neutral-400 mt-0.5 italic">{gap.visual_evidence}</p>
                                    )}
                                    {(gap.substitutes ?? []).length > 0 && (
                                      <p className="text-primary-600 mt-1 font-medium">
                                        💡 Try: {(gap.substitutes as any[]).map((s: any) => s.name).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                                    gap.severity === 'fully_out'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {gap.severity === 'fully_out' ? 'EMPTY' : 'LOW'}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-green-600">
                          ✅ No gaps detected — shelf is healthy
                        </p>
                      )}

                      {/* Prioritized actions */}
                      {actions.slice(0, 3).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-neutral-700 mb-1">
                            Recommended Actions
                          </p>
                          <ul className="space-y-1">
                            {actions.slice(0, 3).map((action: string, i: number) => (
                              <li key={i} className="text-xs text-neutral-600 flex gap-1.5">
                                <span className="text-primary-600 font-bold flex-shrink-0">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
