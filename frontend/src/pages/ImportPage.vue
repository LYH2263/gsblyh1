<template>
  <div class="page-shell import-page">
    <PageHeaderBar
      title="数据录入与导入"
      description="支持单条录入与 CSV 批量导入，快速把数据送入分析看板。"
    />

    <el-row class="import-grid" :gutter="16">
      <el-col :xs="24" :lg="10" class="import-col">
        <SectionCard title="手工录入记录" class="import-card">
          <el-form :model="recordForm" label-position="top">
            <el-form-item label="日期">
              <el-date-picker
                v-model="recordForm.date"
                class="full-width"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
              />
            </el-form-item>
            <el-form-item label="分类">
              <el-input v-model="recordForm.category" placeholder="请输入分类…" />
            </el-form-item>
            <el-form-item label="金额">
              <el-input-number v-model="recordForm.amount" class="full-width" :min="0" />
            </el-form-item>
            <el-form-item label="地区">
              <el-input v-model="recordForm.region" placeholder="请输入地区…" />
            </el-form-item>
            <el-form-item label="渠道">
              <el-input v-model="recordForm.channel" placeholder="请输入渠道…" />
            </el-form-item>
            <el-button type="primary" @click="submitRecord">保存记录</el-button>
          </el-form>
        </SectionCard>
      </el-col>

      <el-col :xs="24" :lg="14" class="import-col">
        <SectionCard title="CSV 批量导入" class="import-card">
          <p class="csv-tip">格式：date,category,amount,region,channel（支持首行表头）</p>
          <el-input
            v-model="csvText"
            type="textarea"
            :rows="12"
            placeholder="date,category,amount,region,channel"
          />
          <el-space class="bulk-actions" wrap>
            <el-button type="primary" @click="submitBulk">导入数据</el-button>
            <el-button @click="goDashboard">查看仪表盘</el-button>
          </el-space>
        </SectionCard>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useRecordStore } from '@/stores/records';

const route = useRoute();
const router = useRouter();
const recordStore = useRecordStore();

const datasetId = computed(() => Number(route.params.id));

const recordForm = reactive({
  date: '',
  category: '',
  amount: 0,
  region: '',
  channel: ''
});

const csvText = ref('');

const submitRecord = async () => {
  if (!recordForm.date || !recordForm.category || !recordForm.region || !recordForm.channel) {
    ElMessage.warning('请填写完整字段');
    return;
  }

  await recordStore.addRecord(datasetId.value, {
    date: recordForm.date,
    category: recordForm.category,
    amount: Number(recordForm.amount),
    region: recordForm.region,
    channel: recordForm.channel
  });

  ElMessage.success('录入成功');
};

const submitBulk = async () => {
  if (!csvText.value.trim()) {
    ElMessage.warning('请输入 CSV 文本');
    return;
  }

  const result = await recordStore.bulkImport(datasetId.value, csvText.value);
  ElMessage.success(`导入成功，共 ${result.insertedCount} 条`);
  csvText.value = '';
};

const goDashboard = () => {
  router.push(`/app/datasets/${datasetId.value}/dashboard`);
};
</script>

<style scoped>
.import-grid {
  margin: 0;
}

.import-col {
  display: flex;
}

.import-card {
  width: 100%;
}

.csv-tip {
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.bulk-actions {
  margin-top: var(--space-3);
}

@media (max-width: 767px) {
  .import-col + .import-col {
    margin-top: var(--space-3);
  }
}
</style>
