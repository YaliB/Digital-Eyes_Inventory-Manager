// User and Authentication Types
export type UserRole = 'manager' | 'worker' | 'supplier';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  storeId: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Shelf and Stock Types
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

export interface AnalysisResult {
  id: string;
  imageUrl: string;
  timestamp: Date;
  aisle: string;
  shelf: string;
  boundingBoxes: BoundingBox[];
  outOfStockItems: string[];
  anomalies: string[];
  processingTime: number;
}

export interface ScanTask {
  id: string;
  aisle: string;
  shelf: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  lastScanned?: Date;
  description: string;
}

// Out of Stock Alert Types
export enum AlertPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface OutOfStockAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  aisle: string;
  shelf: string;
  priority: AlertPriority;
  createdAt: Date;
  detectedBy: string;
}

// Dashboard Types
export interface ShelfHealthMetrics {
  totalShelves: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  healthScore: number;
  lastUpdated: Date;
}

export interface StoreMetrics {
  storeId: string;
  storeName: string;
  scansToday: number;
  scansThisWeek: number;
  outOfStockItemsCount: number;
  averageShelfHealth: number;
}
