import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Upload, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Alert } from '@/components/Alert';
import { LoadingState } from '@/components/LoadingState';
import { useImageUpload } from '@/hooks/useImageUpload';
import { AnalysisResult } from '@/types';
import * as api from '@/services/api';

export const ScannerPage = () => {
  const navigate = useNavigate();
  const { preview, file, isLoading, error, handleImageCapture, reset, setError, setLoading } =
    useImageUpload();
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'results'>(
    'idle'
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aisle, setAisle] = useState('');
  const [shelf, setShelf] = useState('');
  const [shelfId, setShelfId] = useState('shelf-1');
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [gapSubstitutes, setGapSubstitutes] = useState<string[][]>([]);
  const [baselineMsg, setBaselineMsg] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('📸 Uploading image...');

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const handleUpload = async () => {
    if (!file || !aisle || !shelf) {
      setError('Please select an image and enter aisle/shelf information');
      return;
    }

    setLoading(true);
    setProcessingState('processing');
    setLoadingMsg('📸 Uploading image...');

    try {
      const startTime = Date.now();
      const data = await api.analyzeShelf(shelfId, file) as any;
      const elapsed = (Date.now() - startTime) / 1000;

      // Map gaps → outOfStockItems strings
      const gaps: any[] = data.gaps ?? [];
      const outOfStockItems = gaps.map((gap: any) => {
        const prefix = gap.severity === 'fully_out' ? '❌ Empty' : '⚠️ Low Stock';
        const product = gap.estimated_missing_product ?? 'Unknown product';
        return `${prefix} — ${product} (${gap.location_description})`;
      });

      // Map gaps → substitutes parallel array
      const substitutes = gaps.map((gap: any) =>
        (gap.substitutes ?? []).map((s: any) => s.name).filter(Boolean)
      );

      // Map gaps → bounding boxes (bbox_relative is [x1%, y1%, x2%, y2%])
      const boundingBoxes = gaps.map((gap: any) => {
        const [x1, y1, x2, y2] = gap.bbox_relative ?? [0, 0, 10, 10];
        return {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
          label: gap.severity === 'fully_out' ? 'Out of Stock' : 'Low Stock',
          confidence: gap.confidence ?? 0,
        };
      });

      const result: AnalysisResult = {
        id: 'analysis-' + Date.now(),
        imageUrl: preview || '',
        timestamp: new Date(),
        aisle,
        shelf,
        boundingBoxes,
        outOfStockItems,
        anomalies: data.prioritized_actions ?? [],
        processingTime: elapsed,
      };

      setHealthScore(data.shelf_health_score ?? null);
      setGapSubstitutes(substitutes);
      setAnalysisResult(result);
      setProcessingState('results');
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
      setProcessingState('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleBaseline = async () => {
    if (!file) {
      setError('Please select an image first');
      return;
    }
    try {
      await api.uploadBaseline(shelfId, file);
      setBaselineMsg('✅ Baseline saved!');
      setTimeout(() => setBaselineMsg(''), 2000);
    } catch (err: any) {
      setBaselineMsg('Failed to save baseline');
      setTimeout(() => setBaselineMsg(''), 2000);
    }
  };

  const handleNewScan = () => {
    reset();
    setProcessingState('idle');
    setAnalysisResult(null);
    setAisle('');
    setShelf('');
    setHealthScore(null);
    setGapSubstitutes([]);
    setBaselineMsg('');
  };

  const LOADING_MESSAGES = [
    '📸 Uploading image...',
    '🧠 AI is comparing with baseline...',
    '🔍 Identifying gaps...',
    '💡 Finding substitutes...',
  ];

  useEffect(() => {
    if (processingState !== 'processing') return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, [processingState]);

  if (processingState === 'processing') {
    return (
      <Layout headerTitle="Scanning Shelf">
        <div className="px-4 py-12">
          <LoadingState state="loading" message={loadingMsg} />
          <div className="mt-8 space-y-3 text-center">
            <p className="text-sm text-neutral-600">
              Aisle: <span className="font-semibold">{aisle}</span>
            </p>
            <p className="text-sm text-neutral-600">
              Shelf: <span className="font-semibold">{shelf}</span>
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const healthBadge = (score: number) => {
    if (score >= 85) return { bg: 'bg-green-100 text-green-800',  label: `✅ Shelf Healthy (${score}/100)` };
    if (score >= 60) return { bg: 'bg-yellow-100 text-yellow-800', label: `⚠️ Attention Needed (${score}/100)` };
    if (score >= 35) return { bg: 'bg-orange-100 text-orange-800', label: `🔴 Critical (${score}/100)` };
    return              { bg: 'bg-red-100 text-red-800',           label: `🚨 Emergency (${score}/100)` };
  };

  if (processingState === 'results' && analysisResult) {
    const badge = healthScore !== null ? healthBadge(healthScore) : null;
    return (
      <Layout headerTitle="Analysis Results">
        <div className="px-4 py-6 space-y-6">
          {/* Health Score Badge */}
          {badge && (
            <div className={`px-4 py-3 rounded-xl font-semibold text-sm text-center ${badge.bg}`}>
              {badge.label}
            </div>
          )}

          {/* Result Image with Bounding Boxes */}
          <Card className="overflow-hidden">
            <div className="relative bg-neutral-100 aspect-video flex items-center justify-center">
              {analysisResult.imageUrl && (
                <div className="relative w-full h-full">
                  <img
                    src={analysisResult.imageUrl}
                    alt="Shelf scan"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay for bounding boxes */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ mixBlendMode: 'multiply' }}
                  >
                    {analysisResult.boundingBoxes.map((box, idx) => (
                      <g key={idx}>
                        <rect
                          x={box.x}
                          y={box.y}
                          width={box.width}
                          height={box.height}
                          fill="none"
                          stroke={box.label.includes('Out of Stock') ? '#dc2626' : '#16a34a'}
                          strokeWidth="2"
                        />
                        <rect
                          x={box.x}
                          y={Math.max(0, box.y - 6)}
                          width={box.width}
                          height="5"
                          fill={box.label.includes('Out of Stock') ? '#dc2626' : '#16a34a'}
                        />
                        <text
                          x={box.x + 0.5}
                          y={Math.max(4.5, box.y - 1.5)}
                          fontSize="3"
                          fill="white"
                          fontWeight="bold"
                        >
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
                <span className="font-semibold">Location:</span> Aisle {analysisResult.aisle},
                Shelf {analysisResult.shelf}
              </p>
              <p className="text-sm text-neutral-600 mt-2">
                <span className="font-semibold">Processing Time:</span>{' '}
                {analysisResult.processingTime.toFixed(1)}s
              </p>
            </div>
          </Card>

          {/* Out of Stock Items */}
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

          {/* Anomalies */}
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleNewScan}>
              New Scan
            </Button>
            <Button
              fullWidth
              onClick={() => navigate('/tasks')}
            >
              View Tasks
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Scanner">
      <div className="px-4 py-6 space-y-6">
        {error && (
          <Alert type="error" title="Error" message={error} onClose={() => setError(null)} />
        )}

        {/* Camera Capture Section */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6">
            <h2 className="text-white font-semibold text-lg mb-1">Capture Shelf Image</h2>
            <p className="text-primary-100 text-sm">
              Use your device camera to scan the shelf
            </p>
          </div>

          <div className="p-6">
            {!preview ? (
              <div className="space-y-4">
                {/* Camera Preview Area */}
                <div className="bg-neutral-100 rounded-lg aspect-video flex flex-col items-center justify-center border-2 border-dashed border-neutral-300">
                  <Camera className="w-12 h-12 text-neutral-400 mb-2" />
                  <p className="text-neutral-600 font-medium">Ready to capture</p>
                  <p className="text-xs text-neutral-500 mt-1">Position shelf in frame</p>
                </div>

                {/* Upload Buttons */}
                <div className="space-y-3">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <Button
                      fullWidth
                      onClick={() =>
                        (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()
                      }
                      className="cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      Take Photo
                    </Button>
                  </label>

                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() =>
                        (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()
                      }
                      className="cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Image
                    </Button>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative rounded-lg overflow-hidden bg-neutral-100">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-auto"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => reset()}
                    className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg"
                  >
                    <X className="w-5 h-5 text-neutral-900" />
                  </motion.button>
                </div>

                {/* Location Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">
                      Select Shelf
                    </label>
                    <select
                      value={shelfId}
                      onChange={(e) => setShelfId(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value="shelf-1">shelf-1 — Snacks (Aisle 3)</option>
                      <option value="shelf-2">shelf-2 — Dairy (Aisle 1)</option>
                      <option value="shelf-3">shelf-3 — Beverages (Aisle 5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">
                      Aisle Number
                    </label>
                    <input
                      type="text"
                      value={aisle}
                      onChange={(e) => setAisle(e.target.value)}
                      placeholder="e.g., A1"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1">
                      Shelf Level
                    </label>
                    <input
                      type="text"
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      placeholder="e.g., Top, Middle, Bottom"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => reset()}
                  >
                    Clear
                  </Button>
                  <Button
                    fullWidth
                    isLoading={isLoading}
                    onClick={handleUpload}
                  >
                    Analyze
                  </Button>
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleBaseline}
                >
                  Set as Baseline
                </Button>
                {baselineMsg && (
                  <p className={`text-sm text-center font-medium ${baselineMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                    {baselineMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Scans Section */}
        <div className="pb-4">
          <h3 className="font-semibold text-neutral-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => navigate('/tasks')}
              className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <svg
                className="w-6 h-6 mx-auto mb-2 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm font-semibold text-neutral-900">View Tasks</p>
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => navigate('/shelf-status')}
              className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <svg
                className="w-6 h-6 mx-auto mb-2 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <p className="text-sm font-semibold text-neutral-900">Shelf Status</p>
            </motion.button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
