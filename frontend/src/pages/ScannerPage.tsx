import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Upload, X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';
import { LoadingState } from '@/components/LoadingState';
import { AnalysisResult } from '@/types';
import * as api from '@/services/api';

const LOADING_MESSAGES = [
  '📸 Uploading image...',
  '🧠 AI is comparing with baseline...',
  '🔍 Identifying gaps...',
  '💡 Finding substitutes...',
];

function methodBadge(method: string, confidence: string | null) {
  if (method === 'baseline_comparison') {
    return { bg: 'bg-blue-100 text-blue-800', label: '🔄 Baseline comparison (confidence fallback)' };
  }
  if (method === 'single_image_fallback') {
    return { bg: 'bg-orange-100 text-orange-800', label: '⚠️ Direct scan — low confidence (no baseline)' };
  }
  if (confidence === 'HIGH') {
    return { bg: 'bg-green-100 text-green-800', label: '🎯 Direct scan — HIGH confidence' };
  }
  if (confidence === 'MEDIUM') {
    return { bg: 'bg-yellow-100 text-yellow-800', label: '🎯 Direct scan — MEDIUM confidence' };
  }
  return { bg: 'bg-neutral-100 text-neutral-700', label: '🔍 Analysis complete' };
}

function healthBadge(score: number) {
  if (score >= 85) return { bg: 'bg-green-100 text-green-800', label: `✅ Shelf Healthy (${score}/100)` };
  if (score >= 60) return { bg: 'bg-yellow-100 text-yellow-800', label: `⚠️ Attention Needed (${score}/100)` };
  if (score >= 35) return { bg: 'bg-orange-100 text-orange-800', label: `🔴 Critical (${score}/100)` };
  return { bg: 'bg-red-100 text-red-800', label: `🚨 Emergency (${score}/100)` };
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function isToday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export const ScannerPage = () => {
  const navigate = useNavigate();

  // ── Shared ──────────────────────────────────────────────────────────────
  const [shelfId, setShelfId] = useState('shelf-1');
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Section A: Baseline ─────────────────────────────────────────────────
  const [baselineStatus, setBaselineStatus] = useState<api.BaselineStatus | null>(null);
  const [isCheckingBaseline, setIsCheckingBaseline] = useState(false);
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [baselinePreview, setBaselinePreview] = useState('');
  const [isUploadingBaseline, setIsUploadingBaseline] = useState(false);
  const [baselineSavedMsg, setBaselineSavedMsg] = useState('');
  const baselineInputRef = useRef<HTMLInputElement>(null);

  // ── Section B: Analysis ─────────────────────────────────────────────────
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState('');
  const [aisle, setAisle] = useState('');
  const [shelf, setShelf] = useState('');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'results'>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [gapSubstitutes, setGapSubstitutes] = useState<string[][]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [analysisMethod, setAnalysisMethod] = useState<string>('');
  const [aiConfidence, setAiConfidence] = useState<string | null>(null);
  const analysisCameraRef = useRef<HTMLInputElement>(null);
  const analysisFileRef = useRef<HTMLInputElement>(null);

  // Check baseline status when shelf changes
  const checkBaseline = async (sid: string) => {
    setIsCheckingBaseline(true);
    try {
      const status = await api.checkBaselineExists(sid);
      setBaselineStatus(status);
    } catch {
      setBaselineStatus(null);
    } finally {
      setIsCheckingBaseline(false);
    }
  };

  useEffect(() => { checkBaseline(shelfId); }, [shelfId]);

  // Rotate loading messages during analysis
  useEffect(() => {
    if (processingState !== 'processing') return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, [processingState]);

  const handleBaselineFileSelect = (file: File) => {
    setBaselineFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBaselinePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalysisFileSelect = (file: File) => {
    setAnalysisFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAnalysisPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSetBaseline = async () => {
    if (!baselineFile) return;
    setIsUploadingBaseline(true);
    setPageError(null);
    try {
      await api.uploadBaseline(shelfId, baselineFile);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      setBaselineStatus({ exists: true, captured_at: now.toISOString(), baseline_id: null });
      setBaselineSavedMsg(`✅ Baseline saved at ${timeStr}`);
      setBaselineFile(null);
      setBaselinePreview('');
    } catch (err: any) {
      setPageError(err.message || 'Failed to save baseline. Please try again.');
    } finally {
      setIsUploadingBaseline(false);
    }
  };

  const handleAnalyze = async () => {
    if (!analysisFile) return;
    setIsAnalyzing(true);
    setProcessingState('processing');
    setLoadingMsg(LOADING_MESSAGES[0]);
    setPageError(null);
    try {
      const startTime = Date.now();
      const data = await api.analyzeShelf(shelfId, analysisFile) as any;
      const elapsed = (Date.now() - startTime) / 1000;

      const gaps: any[] = data.gaps ?? [];
      const outOfStockItems = gaps.map((gap: any) => {
        const prefix = gap.severity === 'fully_out' ? '❌ Empty' : '⚠️ Low Stock';
        const product = gap.estimated_missing_product ?? 'Unknown product';
        return `${prefix} — ${product} (${gap.location_description})`;
      });
      const substitutes = gaps.map((gap: any) =>
        (gap.substitutes ?? []).map((s: any) => s.name).filter(Boolean)
      );
      const boundingBoxes = gaps.map((gap: any) => {
        const [x1, y1, x2, y2] = gap.bbox_relative ?? [0, 0, 10, 10];
        return {
          x: x1, y: y1, width: x2 - x1, height: y2 - y1,
          label: gap.severity === 'fully_out' ? 'Out of Stock' : 'Low Stock',
          confidence: gap.confidence ?? 0,
        };
      });

      setHealthScore(data.shelf_health_score ?? null);
      setAnalysisMethod(data.analysis_method ?? 'baseline_comparison');
      setAiConfidence(data.ai_confidence ?? null);
      setGapSubstitutes(substitutes);
      setAnalysisResult({
        id: 'analysis-' + Date.now(),
        imageUrl: analysisPreview,
        timestamp: new Date(),
        aisle,
        shelf,
        boundingBoxes,
        outOfStockItems,
        anomalies: data.prioritized_actions ?? [],
        processingTime: elapsed,
      });
      setProcessingState('results');
    } catch (err: any) {
      setPageError(err.message || 'Analysis failed. Please try again.');
      setProcessingState('idle');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setProcessingState('idle');
    setAnalysisResult(null);
    setAnalysisFile(null);
    setAnalysisPreview('');
    setAisle('');
    setShelf('');
    setHealthScore(null);
    setGapSubstitutes([]);
    setPageError(null);
    setAnalysisMethod('');
    setAiConfidence(null);
  };

  // ── Processing screen ──────────────────────────────────────────────────
  if (processingState === 'processing') {
    return (
      <Layout headerTitle="Scanning Shelf">
        <div className="px-4 py-12">
          <LoadingState state="loading" message={loadingMsg} />
        </div>
      </Layout>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────
  if (processingState === 'results' && analysisResult) {
    const badge = healthScore !== null ? healthBadge(healthScore) : null;
    const mBadge = methodBadge(analysisMethod, aiConfidence);
    return (
      <Layout headerTitle="Analysis Results">
        <div className="px-4 py-6 space-y-6">
          {/* Method badge — which AI path was taken */}
          <div className={`px-4 py-2 rounded-xl text-xs font-semibold text-center ${mBadge.bg}`}>
            {mBadge.label}
          </div>
          {badge && (
            <div className={`px-4 py-3 rounded-xl font-semibold text-sm text-center ${badge.bg}`}>
              {badge.label}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="relative bg-neutral-100 aspect-video flex items-center justify-center">
              {analysisResult.imageUrl && (
                <div className="relative w-full h-full">
                  <img src={analysisResult.imageUrl} alt="Shelf scan" className="w-full h-full object-cover" />
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
                    preserveAspectRatio="none" style={{ mixBlendMode: 'multiply' }}>
                    {analysisResult.boundingBoxes.map((box, idx) => (
                      <g key={idx}>
                        <rect x={box.x} y={box.y} width={box.width} height={box.height} fill="none"
                          stroke={box.label.includes('Out of Stock') ? '#dc2626' : '#16a34a'} strokeWidth="2" />
                        <rect x={box.x} y={Math.max(0, box.y - 6)} width={box.width} height="5"
                          fill={box.label.includes('Out of Stock') ? '#dc2626' : '#16a34a'} />
                        <text x={box.x + 0.5} y={Math.max(4.5, box.y - 1.5)} fontSize="3"
                          fill="white" fontWeight="bold">
                          {box.label} ({Math.round(box.confidence * 100)}%)
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-600">
                <span className="font-semibold">Shelf:</span> {shelfId}
              </p>
              <p className="text-sm text-neutral-600 mt-1">
                <span className="font-semibold">Processing Time:</span> {analysisResult.processingTime.toFixed(1)}s
              </p>
            </div>
          </Card>

          {analysisResult.outOfStockItems.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-alert-600 rounded-full" />
                <h3 className="font-semibold text-neutral-900">Out of Stock</h3>
              </div>
              <ul className="space-y-3">
                {analysisResult.outOfStockItems.map((item, idx) => (
                  <li key={idx} className="text-sm text-neutral-600">
                    <div className="flex items-start gap-2">
                      <span className="text-alert-600">•</span>
                      <span>{item}</span>
                    </div>
                    {gapSubstitutes[idx]?.length > 0 && (
                      <p className="text-xs text-neutral-400 mt-1 ml-4">
                        💡 Try: {gapSubstitutes[idx].join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {analysisResult.anomalies.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-warning-600 rounded-full" />
                <h3 className="font-semibold text-neutral-900">Detected Issues</h3>
              </div>
              <ul className="space-y-2">
                {analysisResult.anomalies.map((anomaly, idx) => (
                  <li key={idx} className="text-sm text-neutral-600 flex items-center gap-2">
                    <span className="text-warning-600">•</span>
                    {anomaly}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleNewScan}>New Scan</Button>
            <Button fullWidth onClick={() => navigate('/tasks')}>View Tasks</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Idle screen ───────────────────────────────────────────────────────
  return (
    <Layout headerTitle="Scanner">
      <div className="px-4 py-6 space-y-6">
        {pageError && (
          <Alert type="error" title="Error" message={pageError} onClose={() => setPageError(null)} />
        )}

        {/* Shared shelf selector */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Select Shelf</label>
          <select
            value={shelfId}
            onChange={(e) => { setShelfId(e.target.value); setBaselineSavedMsg(''); }}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="shelf-1">shelf-1 — Snacks (Aisle 3)</option>
            <option value="shelf-2">shelf-2 — Dairy (Aisle 1)</option>
            <option value="shelf-3">shelf-3 — Beverages (Aisle 5)</option>
          </select>
        </div>

        {/* ══ Section A: Morning Baseline ══════════════════════════════════ */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-4">
            <h2 className="text-white font-semibold text-base">☀️ Morning Baseline</h2>
            <p className="text-amber-100 text-xs mt-0.5">Upload the reference photo for this shelf</p>
          </div>
          <div className="p-4 space-y-4">

            {/* Baseline status badge */}
            {isCheckingBaseline ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Checking baseline status...
              </div>
            ) : baselineStatus?.exists ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {baselineSavedMsg || (
                  baselineStatus.captured_at && isToday(baselineStatus.captured_at)
                    ? `Baseline set today at ${formatTime(baselineStatus.captured_at)}`
                    : 'Baseline exists (set previously)'
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {baselineSavedMsg || 'No baseline set yet — upload morning photo first'}
              </div>
            )}

            {/* Baseline image upload */}
            <input
              ref={baselineInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBaselineFileSelect(f); }}
            />

            {!baselinePreview ? (
              <div className="space-y-3">
                <div className="bg-neutral-100 rounded-lg aspect-video flex flex-col items-center justify-center border-2 border-dashed border-neutral-300">
                  <Camera className="w-10 h-10 text-neutral-400 mb-2" />
                  <p className="text-neutral-500 text-sm">Upload baseline photo</p>
                </div>
                <Button variant="outline" fullWidth onClick={() => baselineInputRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Choose Photo
                </Button>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden bg-neutral-100">
                <img src={baselinePreview} alt="Baseline preview" className="w-full h-auto" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setBaselineFile(null); setBaselinePreview(''); }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-lg"
                >
                  <X className="w-4 h-4 text-neutral-900" />
                </motion.button>
              </div>
            )}

            <Button
              fullWidth
              isLoading={isUploadingBaseline}
              onClick={handleSetBaseline}
              disabled={!baselineFile || isUploadingBaseline}
            >
              📸 Set as Baseline
            </Button>
          </div>
        </Card>

        {/* ══ Section B: Shelf Analysis ════════════════════════════════════ */}
        <Card className="overflow-hidden">
          <div className="p-4 bg-gradient-to-br from-primary-600 to-primary-800">
            <h2 className="text-white font-semibold text-base">🔍 Analyze Current State</h2>
            <p className="text-primary-100 text-xs mt-0.5">
              {baselineStatus?.exists
                ? 'Baseline available — will use comparison mode if needed'
                : 'Single-image AI mode — no baseline required'}
            </p>
          </div>
          <div className="p-4 space-y-4">
            {/* Baseline hint — informational only, not a gate */}
            {!baselineStatus?.exists && !isCheckingBaseline && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                No baseline set — AI will use single-image mode. Upload a baseline for richer gap detection.
              </div>
            )}
            {true && (
              <>
                {/* Analysis image upload */}
                <input
                  ref={analysisCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAnalysisFileSelect(f); }}
                />
                <input
                  ref={analysisFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAnalysisFileSelect(f); }}
                />

                {!analysisPreview ? (
                  <div className="space-y-3">
                    <div className="bg-neutral-100 rounded-lg aspect-video flex flex-col items-center justify-center border-2 border-dashed border-neutral-300">
                      <Camera className="w-10 h-10 text-neutral-400 mb-2" />
                      <p className="text-neutral-500 text-sm">Take or upload shelf photo</p>
                    </div>
                    <div className="flex gap-2">
                      <Button fullWidth onClick={() => analysisCameraRef.current?.click()}>
                        <Camera className="w-4 h-4" /> Take Photo
                      </Button>
                      <Button variant="outline" fullWidth onClick={() => analysisFileRef.current?.click()}>
                        <Upload className="w-4 h-4" /> Upload
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden bg-neutral-100">
                    <img src={analysisPreview} alt="Analysis preview" className="w-full h-auto" />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setAnalysisFile(null); setAnalysisPreview(''); }}
                      className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-lg"
                    >
                      <X className="w-4 h-4 text-neutral-900" />
                    </motion.button>
                  </div>
                )}

                <Button
                  fullWidth
                  isLoading={isAnalyzing}
                  onClick={handleAnalyze}
                  disabled={!analysisFile || isAnalyzing}
                >
                  🔍 Analyze Now
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="pb-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => navigate('/tasks')}
              className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-semibold text-neutral-900">View Tasks</p>
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => navigate('/shelf-status')}
              className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <svg className="w-6 h-6 mx-auto mb-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-sm font-semibold text-neutral-900">Shelf Status</p>
            </motion.button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
