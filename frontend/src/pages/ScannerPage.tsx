import { useState } from 'react';
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

    // Simulate API call with processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock analysis result with bounding boxes
    const mockResult: AnalysisResult = {
      id: 'analysis-' + Date.now(),
      imageUrl: preview || '',
      timestamp: new Date(),
      aisle,
      shelf,
      boundingBoxes: [
        {
          x: 50,
          y: 100,
          width: 80,
          height: 120,
          label: 'Cola - Stock',
          confidence: 0.95,
        },
        {
          x: 150,
          y: 100,
          width: 80,
          height: 120,
          label: 'Cola - Out of Stock',
          confidence: 0.92,
        },
        {
          x: 250,
          y: 100,
          width: 80,
          height: 120,
          label: 'Sprite - Stock',
          confidence: 0.88,
        },
      ],
      outOfStockItems: ['Cola (Position 2)', 'Orange Juice'],
      anomalies: ['Damaged packaging detected', 'Expiration date approaching'],
      processingTime: 3.2,
    };

    setAnalysisResult(mockResult);
    setProcessingState('results');
    setLoading(false);
  };

  const handleNewScan = () => {
    reset();
    setProcessingState('idle');
    setAnalysisResult(null);
    setAisle('');
    setShelf('');
  };

  if (processingState === 'processing') {
    return (
      <Layout headerTitle="Scanning Shelf">
        <div className="px-4 py-12">
          <LoadingState state="loading" message="Analyzing shelf with AI..." />
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

  if (processingState === 'results' && analysisResult) {
    return (
      <Layout headerTitle="Analysis Results">
        <div className="px-4 py-6 space-y-6">
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
                          y={box.y - 24}
                          width={150}
                          height="20"
                          fill={box.label.includes('Out of Stock') ? '#dc2626' : '#16a34a'}
                        />
                        <text
                          x={box.x + 4}
                          y={box.y - 8}
                          fontSize="12"
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
              <ul className="space-y-2">
                {analysisResult.outOfStockItems.map((item, idx) => (
                  <li key={idx} className="text-sm text-neutral-600 flex items-center gap-2">
                    <span className="text-alert-600">•</span>
                    {item}
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
