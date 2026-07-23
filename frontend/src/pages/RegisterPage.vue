<template>
  <div class="auth-page auth-page--login auth-page--register">
    <div class="auth-shell auth-shell--login auth-shell--register">
      <section class="auth-hero auth-hero--register">
        <div class="auth-badge-row">
          <span class="auth-badge">InsightBoard</span>
          <span class="auth-badge-caption">创建你的课程项目演示空间</span>
        </div>

        <div class="auth-hero-copy">
          <h1 class="auth-hero-title">从样例数据出发，快速搭建你的分析工作台</h1>
          <p class="auth-hero-subtitle">
            注册后即可创建专属账号，继续使用数据集、仪表盘、探索分析与主题配置能力完成课程演示。
          </p>
        </div>

        <div class="auth-highlight-list">
          <div class="auth-highlight-item auth-highlight-item--register">
            <p class="auth-highlight-label">快速起步</p>
            <p class="auth-highlight-value">注册完成即可进入数据集页，马上开始导入和分析。</p>
          </div>
          <div class="auth-highlight-item auth-highlight-item--register">
            <p class="auth-highlight-label">统一工作台</p>
            <p class="auth-highlight-value">将录入、图表、明细探索放在同一个项目空间中完成。</p>
          </div>
          <div class="auth-highlight-item auth-highlight-item--register">
            <p class="auth-highlight-label">演示友好</p>
            <p class="auth-highlight-value">支持暗黑模式、主题色切换和演示数据复位。</p>
          </div>
        </div>
      </section>

      <el-card class="auth-card auth-card--login auth-card--register">
        <template #header>
          <div class="auth-header">
            <p class="auth-eyebrow">创建账号</p>
            <h2 class="auth-title">注册洞察看板</h2>
            <p class="auth-subtitle">创建账号后即可开始你的数据分析与可视化工作，并保存自己的登录状态。</p>
          </div>
        </template>

        <div class="auth-note auth-note--register">
          <span class="auth-note-dot"></span>
          <p class="auth-note-text">建议使用便于演示和记忆的账号名，密码至少 6 位，注册后会自动进入数据集管理页。</p>
        </div>

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

          <el-form-item label="密码（至少 6 位）" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              name="new-password"
              autocomplete="new-password"
              show-password
              placeholder="请输入至少 6 位密码…"
            />
          </el-form-item>

          <div class="auth-actions">
            <el-button class="auth-submit" type="primary" native-type="submit" :loading="loading">
              注册并进入工作台
            </el-button>
            <div class="auth-secondary">
              <span class="auth-action-hint">注册成功后会自动登录，无需再次输入账号密码</span>
              <el-button link type="primary" @click="router.push('/login')">已有账号？去登录</el-button>
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
  password: [
    { required: true, message: '请输入密码', trigger: ['blur', 'change'] },
    { min: 6, message: '密码至少需要 6 位', trigger: ['blur', 'change'] }
  ]
};

const handleSubmit = async () => {
  if (!form.username || !form.password || form.password.length < 6) {
    await formRef.value?.validateField(['username', 'password']).catch(() => undefined);
    return;
  }

  const isValid = await formRef.value?.validate().catch(() => false);

  if (!isValid) {
    return;
  }

  loading.value = true;
  try {
    await authStore.register(form);
    ElMessage.success('注册成功');
    router.push('/app/datasets');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '注册失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};
</script>
