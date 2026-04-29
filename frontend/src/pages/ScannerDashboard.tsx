import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScanTask } from '@/types';

export const ScannerDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ScanTask[]>([]);

  useEffect(() => {
    // Mock tasks data
    const mockTasks: ScanTask[] = [
      {
        id: '1',
        aisle: 'A1',
        shelf: 'Top',
        priority: 'high',
        status: 'pending',
        description: 'Beverages - Cola Section',
        lastScanned: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: '2',
        aisle: 'B3',
        shelf: 'Middle',
        priority: 'high',
        status: 'pending',
        description: 'Snacks - Chips & Cookies',
      },
      {
        id: '3',
        aisle: 'C2',
        shelf: 'Bottom',
        priority: 'medium',
        status: 'completed',
        description: 'Dairy Products',
        lastScanned: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: '4',
        aisle: 'D1',
        shelf: 'Top',
        priority: 'medium',
        status: 'in_progress',
        description: 'Cereals & Breakfast Items',
      },
      {
        id: '5',
        aisle: 'A2',
        shelf: 'Middle',
        priority: 'low',
        status: 'pending',
        description: 'Spices & Condiments',
      },
    ];
    setTasks(mockTasks);
  }, []);

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

        {/* Footer Button */}
        <div className="pt-4">
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate('/shelf-status')}
          >
            View Shelf Status
          </Button>
        </div>
      </div>
    </Layout>
  );
};
