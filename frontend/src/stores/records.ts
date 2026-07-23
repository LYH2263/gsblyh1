import { defineStore } from 'pinia';
import { recordsApi } from '@/api/records';
import type { RecordFilters, RecordItem } from '@/types/models';

interface RecordState {
  records: RecordItem[];
  total: number;
  loading: boolean;
  filters: RecordFilters;
}

const defaultFilters: RecordFilters = {
  page: 1,
  pageSize: 10
};

export const useRecordStore = defineStore('records', {
  state: (): RecordState => ({
    records: [],
    total: 0,
    loading: false,
    filters: { ...defaultFilters }
  }),
  actions: {
    async fetchRecords(datasetId: number, payload: Partial<RecordFilters> = {}) {
      this.filters = {
        ...this.filters,
        ...payload
      };

      this.loading = true;
      try {
        const result = await recordsApi.list(datasetId, this.filters);
        this.records = result.items;
        this.total = result.total;
      } finally {
        this.loading = false;
      }
    },
    async addRecord(datasetId: number, payload: Omit<RecordItem, 'id' | 'datasetId'>) {
      await recordsApi.create(datasetId, payload);
      await this.fetchRecords(datasetId, { page: 1 });
    },
    async bulkImport(datasetId: number, csvText: string) {
      const result = await recordsApi.bulkImport(datasetId, csvText);
      await this.fetchRecords(datasetId, { page: 1 });
      return result;
    },
    async removeRecord(datasetId: number, recordId: number) {
      await recordsApi.remove(recordId);
      await this.fetchRecords(datasetId);
    }
  }
});
