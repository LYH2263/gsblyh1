<template>
  <div class="auth-page auth-page--login">
    <div class="auth-shell auth-shell--login">
      <section class="auth-hero">
        <div class="auth-badge-row">
          <span class="auth-badge">InsightBoard</span>
          <span class="auth-badge-caption">课程项目演示工作台</span>
        </div>

        <div class="auth-hero-copy">
          <h1 class="auth-hero-title">让数据集、仪表盘与探索分析回到一个工作台</h1>
          <p class="auth-hero-subtitle">
            登录后继续管理业务样例数据，查看 KPI 趋势与分类表现，并完成演示级下钻分析。
          </p>
        </div>

        <div class="auth-highlight-list">
          <div class="auth-highlight-item">
            <p class="auth-highlight-label">数据集管理</p>
            <p class="auth-highlight-value">新建、导入和维护演示数据</p>
          </div>
          <div class="auth-highlight-item">
            <p class="auth-highlight-label">可视化看板</p>
            <p class="auth-highlight-value">KPI、趋势、分布图表联动查看</p>
          </div>
          <div class="auth-highlight-item">
            <p class="auth-highlight-label">探索导出</p>
            <p class="auth-highlight-value">明细下钻、筛选与 CSV 导出</p>
          </div>
        </div>
      </section>

      <el-card class="auth-card auth-card--login">
        <template #header>
          <div class="auth-header">
            <p class="auth-eyebrow">欢迎回来</p>
            <h2 class="auth-title">登录洞察看板</h2>
            <p class="auth-subtitle">进入你的数据分析工作台，继续追踪趋势、占比和明细变化。</p>
          </div>
        </template>

        <div class="auth-note">
          <span class="auth-note-dot"></span>
          <p class="auth-note-text">支持使用已有账号登录，也可以先注册后再创建自己的数据分析空间。</p>
        </div>

        <el-alert
          class="auth-demo-alert"
          type="info"
          :closable="false"
          show-icon
          title="演示账号：test_user / test123456"
          description="开发环境空库启动与 Docker 首次启动都会自动恢复该账号和两份样例数据。"
        />

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="auth-form"
          status-icon
          @submit.prevent="handleSubmit"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              name="username"
              autocomplete="username"
              placeholder="请输入用户名…"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              name="password"
              autocomplete="current-password"
              show-password
              placeholder="请输入密码…"
            />
          </el-form-item>

          <div class="auth-actions">
            <el-button class="auth-submit" type="primary" native-type="submit" :loading="loading">
              登录
            </el-button>
            <div class="auth-secondary">
              <span class="auth-action-hint">登录后将默认进入数据集管理页</span>
              <el-button link type="primary" @click="router.push('/register')">
                没有账号？去注册
              </el-button>
            </div>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  username: '',
  password: ''
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: ['blur', 'change'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['blur', 'change'] }]
};

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    await formRef.value?.validateField(['username', 'password']).catch(() => undefined);
    return;
  }

  const isValid = await formRef.value?.validate().catch(() => false);

  if (!isValid) {
    return;
  }

  loading.value = true;
  try {
    await authStore.login(form);
    ElMessage.success('登录成功');
    router.push('/app/datasets');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};
</script>
