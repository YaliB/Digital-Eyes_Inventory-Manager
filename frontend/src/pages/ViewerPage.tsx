import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, AlertCircle, ShieldOff } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { HealthScore, AlertItem } from '@/components/DashboardComponents';
import { LoadingState } from '@/components/LoadingState';
import { OutOfStockAlert, AlertPriority } from '@/types';

const MOCK_ALERTS: OutOfStockAlert[] = [
  {
    id: '1', productId: 'P001', productName: 'Coca-Cola 2L', sku: 'COL-2L-001',
    aisle: 'A1', shelf: 'Top', priority: AlertPriority.CRITICAL,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), detectedBy: 'AI Analysis',
  },
  {
    id: '2', productId: 'P002', productName: 'Sprite 1.5L', sku: 'SPR-1.5L-002',
    aisle: 'A1', shelf: 'Top', priority: AlertPriority.HIGH,
    createdAt: new Date(Date.now() - 45 * 60 * 1000), detectedBy: 'AI Analysis',
  },
  {
    id: '3', productId: 'P003', productName: 'Orange Juice 1L', sku: 'OJ-1L-003',
    aisle: 'B2', shelf: 'Middle', priority: AlertPriority.MEDIUM,
    createdAt: new Date(Date.now() - 60 * 60 * 1000), detectedBy: 'Manual Report',
  },
];

export const ViewerPage = () => {
  const [alerts, setAlerts] = useState<OutOfStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAlerts(MOCK_ALERTS);
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Layout headerTitle="Shelf Status">
        <div className="px-4 py-12">
          <LoadingState state="loading" message="Loading shelf status..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Shelf Status">
      <div className="px-4 py-6 space-y-6">

        {/* Read-only notice */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 bg-primary-50 border border-primary-200 rounded-xl"
        >
          <Eye className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-primary-700">
            <span className="font-semibold">Read-only view.</span>{' '}
            You can monitor shelf status but cannot scan or manage inventory.
          </p>
        </motion.div>

        {/* Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <HealthScore score={72} />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-primary-50 rounded-lg p-4 border border-primary-200"
          >
            <p className="text-2xl font-bold text-primary-600">24</p>
            <p className="text-xs text-primary-700 font-medium mt-1">Scans Today</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
                transition={{ delay: 0.4 + idx * 0.1 }}
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

        {/* Upgrade notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-start gap-3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl"
        >
          <ShieldOff className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-neutral-500">
            Need scanning or management access? Contact your store administrator to upgrade your permissions.
          </p>
        </motion.div>

      </div>
    </Layout>
  );
};
