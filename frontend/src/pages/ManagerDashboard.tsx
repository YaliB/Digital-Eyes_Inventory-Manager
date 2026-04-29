import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { HealthScore, AlertItem } from '@/components/DashboardComponents';
import { LoadingState } from '@/components/LoadingState';
import { OutOfStockAlert, AlertPriority } from '@/types';

export const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<OutOfStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading alerts
    const timer = setTimeout(() => {
      const mockAlerts: OutOfStockAlert[] = [
        {
          id: '1',
          productId: 'PROD001',
          productName: 'Coca-Cola 2L',
          sku: 'COL-2L-001',
          aisle: 'A1',
          shelf: 'Top',
          priority: AlertPriority.CRITICAL,
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          detectedBy: 'AI Analysis',
        },
        {
          id: '2',
          productId: 'PROD002',
          productName: 'Sprite 1.5L',
          sku: 'SPR-1.5L-002',
          aisle: 'A1',
          shelf: 'Top',
          priority: AlertPriority.HIGH,
          createdAt: new Date(Date.now() - 45 * 60 * 1000),
          detectedBy: 'AI Analysis',
        },
        {
          id: '3',
          productId: 'PROD003',
          productName: 'Orange Juice 1L',
          sku: 'OJ-1L-003',
          aisle: 'B2',
          shelf: 'Middle',
          priority: AlertPriority.HIGH,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          detectedBy: 'Manual Report',
        },
        {
          id: '4',
          productId: 'PROD004',
          productName: 'Water Bottle 500ml',
          sku: 'WAT-500-004',
          aisle: 'C3',
          shelf: 'Bottom',
          priority: AlertPriority.MEDIUM,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          detectedBy: 'AI Analysis',
        },
      ];
      setAlerts(mockAlerts);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

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
        {/* Shelf Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <HealthScore score={72} />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary-50 rounded-lg p-4 border border-primary-200"
          >
            <p className="text-2xl font-bold text-primary-600">24</p>
            <p className="text-xs text-primary-700 font-medium mt-1">Scans Today</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-alert-50 rounded-lg p-4 border border-alert-200"
          >
            <p className="text-2xl font-bold text-alert-600">{alerts.length}</p>
            <p className="text-xs text-alert-700 font-medium mt-1">Out of Stock</p>
          </motion.div>
        </div>

        {/* Out of Stock Alerts */}
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
                transition={{ delay: 0.5 + idx * 0.1 }}
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

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-primary-50 border border-primary-200 rounded-lg p-4"
        >
          <h3 className="font-semibold text-neutral-900 mb-2">Recommendations</h3>
          <ul className="space-y-1 text-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              Prioritize restocking Aisle A1 (Critical: 2 items)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              Scan Aisle B2 immediately (Orange Juice shortage)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              Review shelf placement in Aisle C3
            </li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/scanner')}
          >
            Start Scan
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate('/shelf-status')}
          >
            Shelf Status
          </Button>
        </div>
      </div>
    </Layout>
  );
};
