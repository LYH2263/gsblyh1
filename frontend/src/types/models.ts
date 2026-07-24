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

export type RuleKey =
  | 'missing_field'
  | 'abnormal_amount'
  | 'future_date'
  | 'duplicate_key';

export type InspectionStatus = 'queued' | 'running' | 'done' | 'failed';

export interface InspectionTask {
  id: number;
  userId: number;
  datasetId: number;
  status: InspectionStatus;
  reportId?: number | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitInspectionResult {
  taskId: number;
  status: InspectionStatus;
}

export interface InspectionReport {
  id: number;
  datasetId: number;
  taskId: number;
  score: number;
  totalRecords: number;
  issueRecords: number;
  categoryCounts: Record<RuleKey, number>;
  issueRecordIds: number[];
  createdAt: string;
}

export interface InspectionIssue {
  recordId: number;
  rule: RuleKey;
  summary: string;
  record: RecordItem | null;
}

export interface PaginatedIssues {
  items: InspectionIssue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IssueFilters {
  rule?: RuleKey;
  page: number;
  pageSize: number;
}
