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
