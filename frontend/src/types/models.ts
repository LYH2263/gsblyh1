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

export type InspectionStatus = 'queued' | 'running' | 'done' | 'failed';
export type IssueRule = 'missing' | 'abnormal_amount' | 'future_date' | 'duplicate';

export interface QualityIssue {
  recordId: number;
  rule: IssueRule;
  summary: string;
  field?: string;
}

export interface IssueCounts {
  missing: number;
  abnormalAmount: number;
  futureDate: number;
  duplicate: number;
}

export interface InspectionTask {
  id: number;
  userId: number;
  datasetId: number;
  status: InspectionStatus;
  errorMessage?: string;
  reportId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionReport {
  id: number;
  userId: number;
  datasetId: number;
  taskId: number;
  qualityScore: number;
  totalRecords: number;
  issueCounts: IssueCounts;
  issues: QualityIssue[];
  createdAt: string;
}

export interface PaginatedIssues {
  items: QualityIssue[];
  total: number;
  page: number;
  pageSize: number;
}
