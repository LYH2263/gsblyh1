<template>
  <div class="page-shell">
    <SectionCard>
      <PageHeaderBar
        title="数据集管理"
        description="创建并管理你的分析数据集，快速进入导入、仪表盘与明细分析。"
      >
        <template #actions>
          <el-button type="primary" @click="dialogVisible = true">新建数据集</el-button>
        </template>
      </PageHeaderBar>

      <el-table class="datasets-table" :data="datasetStore.datasets" v-loading="datasetStore.loading" border>
        <el-table-column prop="id" label="ID" width="86" />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }">
            <span class="text-ellipsis" :title="row.description || '暂无描述'">
              {{ row.description || '暂无描述' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="420">
          <template #default="{ row }">
            <div class="actions-group">
              <el-button link type="primary" @click="goImport(row.id)">导入/录入</el-button>
              <el-button link type="primary" @click="goDashboard(row.id)">仪表盘</el-button>
              <el-button link type="primary" @click="goExplore(row.id)">数据探索</el-button>
              <el-button link type="warning" @click="goQuality(row.id)">质量巡检</el-button>
              <el-button link type="danger" @click="remove(row.id)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </SectionCard>

    <el-dialog v-model="dialogVisible" title="新建数据集" width="420px" class="create-dialog">
      <el-form :model="form" label-position="top">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入数据集名称…" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="3" placeholder="请输入描述（可选）…" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="actions-group dialog-footer-actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="create">创建</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useDatasetStore } from '@/stores/datasets';

const router = useRouter();
const datasetStore = useDatasetStore();

const dialogVisible = ref(false);
const form = reactive({
  name: '',
  description: ''
});

onMounted(async () => {
  await datasetStore.fetchDatasets();
});

const create = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入数据集名称');
    return;
  }

  await datasetStore.createDataset({
    name: form.name,
    description: form.description
  });

  dialogVisible.value = false;
  form.name = '';
  form.description = '';
  ElMessage.success('创建成功');
};

const remove = async (id: number) => {
  await datasetStore.deleteDataset(id);
  ElMessage.success('删除成功');
};

const goImport = (id: number) => router.push(`/app/datasets/${id}/import`);
const goDashboard = (id: number) => router.push(`/app/datasets/${id}/dashboard`);
const goExplore = (id: number) => router.push(`/app/datasets/${id}/explore`);
const goQuality = (id: number) => router.push(`/app/datasets/${id}/quality`);
</script>

<style scoped>
.datasets-table {
  margin-top: var(--space-4);
}

.text-ellipsis {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.dialog-footer-actions {
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .actions-group {
    gap: var(--space-1);
  }

  .dialog-footer-actions {
    width: 100%;
    justify-content: stretch;
  }

  .dialog-footer-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
