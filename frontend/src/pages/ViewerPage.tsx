import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw, ShieldOff } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { HealthScore } from '@/components/DashboardComponents';
import { LoadingState } from '@/components/LoadingState';
import { RecentScansWidget } from '@/components/RecentScansWidget';
import * as api from '@/services/api';


function isToday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export const ViewerPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [healthScore, setHealthScore] = useState(0);
  const [scansToday, setScansToday] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [rawScans, setRawScans] = useState<any[]>([]);

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
        setCriticalCount(0);
        setIsLoading(false);
        return;
      }

      const scores = scans
        .map((s: any) => s.shelf_health_score)
        .filter((s: any) => s != null);
      const avgScore = scores.length
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;
      setHealthScore(avgScore);
      setScansToday(scans.filter((s: any) => isToday(s.created_at)).length);

      // Count critical gaps (fully_out) across all scans
      let critical = 0;
      for (const scan of scans) {
        const gaps: any[] = scan.result_json?.gaps ?? [];
        critical += gaps.filter((g: any) => g.severity === 'fully_out').length;
      }
      setCriticalCount(critical);

    } catch (err: any) {
      setFetchError(err.message || 'Failed to load shelf status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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

        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {fetchError}
          </div>
        )}

        {/* Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <HealthScore score={healthScore} />
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-primary-50 rounded-lg p-4 border border-primary-200"
          >
            <p className="text-2xl font-bold text-primary-600">{scansToday}</p>
            <p className="text-xs text-primary-700 font-medium mt-1">Scans Today</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-alert-50 rounded-lg p-4 border border-alert-200"
          >
            <p className="text-2xl font-bold text-alert-600">{criticalCount}</p>
            <p className="text-xs text-alert-700 font-medium mt-1">Out of Stock</p>
          </motion.div>
        </div>

        {/* Scan History */}
        {rawScans.length === 0 ? (
          <p className="text-center py-8 text-neutral-500 text-sm">
            No scans yet. Scans will appear here after analysis.
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <RecentScansWidget scans={rawScans} />
          </motion.div>
        )}

        <Button variant="outline" fullWidth onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
          Refresh Status
        </Button>

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
