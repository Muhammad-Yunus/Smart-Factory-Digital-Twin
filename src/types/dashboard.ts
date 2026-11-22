export type DashboardPeriod = 'today' | '7d' | 'month';

export type EquipmentCategory = 'stacker' | 'conveyor';
export type EquipmentStatus = 'Standby' | 'Running' | 'Fault' | 'Offline';
export type TaskStatusFilter = 'All' | 'Pending' | 'Running' | 'Completed';
export type NotificationFilter = 'All' | 'Alert';

export interface KpiSnapshotData {
  period: DashboardPeriod;
  totalOrders: number;
  outboundOrders: number;
  inboundOrders: number;
  todayTasks: number;
  completionRate: number;
  todayOutbound: number;
  todayInbound: number;
  ringCompletionRate: number;
  totalErrors: number;
  pendingTasks: number;
  pendingOutbound: number;
  pendingInbound: number;
  runningTasks: number;
  runningOutbound: number;
  runningInbound: number;
  rackTotal: number;
  rackNormalPct: number;
  rackOfflinePct: number;
  rackAlertPct: number;
  rackDisabledPct: number;
  totalNotifications: number;
  alertNotifications: number;
  updatedAt: string;
}

export interface OrderTrendPoint {
  timeLabel: string;
  outbound: number;
  inbound: number;
}

export interface ErrorTrendPoint {
  timeLabel: string;
  stackerErrors: number;
  conveyorErrors: number;
}

export interface EquipmentLiveStatusItem {
  category: EquipmentCategory;
  offlineCount: number;
  faultCount: number;
  idleCount: number;
  runningCount: number;
  activeTotal: number;
}

export interface EquipmentItemData {
  id: number;
  code: string;
  category: EquipmentCategory;
  totalTasks: number;
  inboundTasks: number;
  outboundTasks: number;
  runtimeHours: number;
  status: EquipmentStatus;
  statusDetail: string;
  zoneLocation: string;
  workMode: string;
  loadState: string;
  aisleProgress: number;
  liftProgress: number;
}

export interface WarehouseTaskItem {
  id: number;
  orderNo: string;
  materialNo: string;
  taskType: 'Outbound' | 'Inbound';
  location: string;
  status: 'Pending' | 'Running' | 'Completed';
  equipmentCode: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  sourceCode: string;
  severity: 'alert' | 'info';
  title: string;
  referenceCode: string;
  occurredAt: string;
}

export interface DashboardStatePayload {
  period: DashboardPeriod;
  kpi: KpiSnapshotData | null;
  orderTrends: OrderTrendPoint[];
  errorTrends: ErrorTrendPoint[];
  equipmentLiveStatus: EquipmentLiveStatusItem[];
  equipmentItems: EquipmentItemData[];
  tasks: WarehouseTaskItem[];
  notifications: NotificationItem[];
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface ApiKeySummary {
  id: number;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}
