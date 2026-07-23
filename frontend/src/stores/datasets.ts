import { defineStore } from 'pinia';
import { datasetsApi } from '@/api/datasets';
import type { Dataset } from '@/types/models';

interface DatasetState {
  datasets: Dataset[];
  currentDatasetId: number | null;
  loading: boolean;
}

export const useDatasetStore = defineStore('datasets', {
  state: (): DatasetState => ({
    datasets: [],
    currentDatasetId: null,
    loading: false
  }),
  actions: {
    async fetchDatasets() {
      this.loading = true;
      try {
        this.datasets = await datasetsApi.list();
        if (!this.currentDatasetId && this.datasets.length > 0) {
          this.currentDatasetId = this.datasets[0].id;
        }
      } finally {
        this.loading = false;
      }
    },
    async createDataset(payload: { name: string; description?: string }) {
      const dataset = await datasetsApi.create(payload);
      this.datasets.unshift(dataset);
      this.currentDatasetId = dataset.id;
    },
    async deleteDataset(datasetId: number) {
      await datasetsApi.remove(datasetId);
      this.datasets = this.datasets.filter((item) => item.id !== datasetId);
      if (this.currentDatasetId === datasetId) {
        this.currentDatasetId = this.datasets[0]?.id ?? null;
      }
    }
  }
});
