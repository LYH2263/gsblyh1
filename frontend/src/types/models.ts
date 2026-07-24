export interface User {
  id: number;
  username: string;
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface RecordItem {
  id: number;
  datasetId: number;
  date: string;
  category: string;
  region: string;
  channel: string;
  amount: number;
}

export interface RecordFilters {
  from?: string;
  to?: string;
  category?: string;
  region?: string;
  channel?: string;
  page: number;
  pageSize: number;
}

export interface SummaryDTO {
  totalAmount: number;
  count: number;
  avg: number;
  compareValue: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface RankItem {
  name: string;
  value: number;
}

export interface PaginatedRecords {
  items: RecordItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type QualityTaskStatus = 'queued' | 'running' | 'done' | 'failed';
export type QualityRule =
  | 'missing_field'
  | 'abnormal_amount'
  | 'future_date'
  | 'duplicate_key';
export type QualityIssueStatus = 'open' | 'fixed';

export interface QualityTask {
  id: number;
  userId: number;
  datasetId: number;
  status: QualityTaskStatus;
  error?: string | null;
  reportId?: number | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface QualityReport {
  id: number;
  userId: number;
  datasetId: number;
  taskId: number;
  score: number;
  totalRecords: number;
  countMissing: number;
  countAbnormalAmount: number;
  countFutureDate: number;
  countDuplicate: number;
  createdAt: string;
}

export interface QualityIssue {
  id: number;
  reportId: number;
  userId: number;
  datasetId: number;
  recordId: number;
  rule: QualityRule;
  field?: string | null;
  summary: string;
  status: QualityIssueStatus;
  detail?: string | null;
  createdAt: string;
  fixedAt?: string | null;
}

export interface PaginatedQualityIssues {
  items: QualityIssue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QualityWarnings {
  reportId: number | null;
  issues: QualityIssue[];
}
