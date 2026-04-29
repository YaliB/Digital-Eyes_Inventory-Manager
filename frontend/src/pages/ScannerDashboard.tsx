import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScanTask } from '@/types';
import * as api from '@/services/api';

// Map shelf_id to human-readable location
const SHELF_META: Record<string, { aisle: string; shelf: string; name: string }> = {
  'shelf-1': { aisle: 'Aisle 3', shelf: 'Snacks',    name: 'Snacks Shelf A' },
  'shelf-2': { aisle: 'Aisle 1', shelf: 'Dairy',     name: 'Dairy Shelf B' },
  'shelf-3': { aisle: 'Aisle 5', shelf: 'Beverages', name: 'Beverages Shelf C' },
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

function scanToTask(scan: any): ScanTask {
  const meta = SHELF_META[scan.shelf_id] ?? {
    aisle: scan.shelf_id,
    shelf: 'Unknown',
    name: scan.shelf_id,
  };
  const score: number | null = scan.shelf_health_score ?? null;
  const gaps: number = scan.gaps_count ?? 0;

  return {
    id: scan.id,
    aisle: meta.aisle,
    shelf: meta.shelf,
    priority: scoreToPriority(score),
    status: scoreToStatus(score),
    description: `${meta.name} — ${gaps} gap${gaps !== 1 ? 's' : ''} detected${score !== null ? ` · Health ${score}/100` : ''}`,
    lastScanned: scan.created_at ? new Date(scan.created_at) : undefined,
  };
}

export const ScannerDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ScanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const loadTasks = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const data = await api.getHistory({ limit: 20 }) as any;
      const scans: any[] = data.scans ?? [];
      if (scans.length === 0) {
        setTasks([]);
      } else {
        setTasks(scans.map(scanToTask));
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-success-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-primary-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-warning-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-alert-100 text-alert-700';
      case 'medium':
        return 'bg-warning-100 text-warning-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Layout headerTitle="Task Dashboard">
      <div className="px-4 py-6 space-y-6">

        {/* Loading / Error states */}
        {isLoading && (
          <p className="text-center text-sm text-neutral-500 py-8">Loading tasks...</p>
        )}
        {!isLoading && fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {fetchError}
          </div>
        )}
        {!isLoading && !fetchError && tasks.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-neutral-500 text-sm">No scan history yet.</p>
            <Button onClick={() => navigate('/scanner')}>Go scan a shelf</Button>
          </div>
        )}

        {!isLoading && tasks.length > 0 && <>
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-neutral-200 p-3 text-center"
          >
            <p className="text-2xl font-bold text-primary-600">{tasks.length}</p>
            <p className="text-xs text-neutral-600 mt-1">Total Tasks</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-neutral-200 p-3 text-center"
          >
            <p className="text-2xl font-bold text-warning-600">{pendingCount}</p>
            <p className="text-xs text-neutral-600 mt-1">Pending</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-neutral-200 p-3 text-center"
          >
            <p className="text-2xl font-bold text-success-600">{completedCount}</p>
            <p className="text-xs text-neutral-600 mt-1">Completed</p>
          </motion.div>
        </div>

        {/* Tasks List */}
        <div>
          <h2 className="font-semibold text-neutral-900 mb-3">Scan Tasks</h2>
          <div className="space-y-3">
            {tasks.map((task, idx) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  interactive
                  onClick={() => {
                    if (task.status !== 'completed') {
                      // Simulate starting a scan
                      navigate('/scanner');
                    }
                  }}
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="mt-1">{getStatusIcon(task.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-neutral-900">
                            {task.aisle} - {task.shelf}
                          </h3>
                          <p className="text-sm text-neutral-600 mt-1">{task.description}</p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                      {task.lastScanned && (
                        <p className="text-xs text-neutral-500 mt-2">
                          Last scanned:{' '}
                          {new Date(task.lastScanned).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pt-4 space-y-3">
          <Button
            variant="outline"
            fullWidth
            onClick={loadTasks}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Tasks
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate('/shelf-status')}
          >
            View Shelf Status
          </Button>
        </div>
        </>}
      </div>
    </Layout>
  );
};
