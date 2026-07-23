import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import VueECharts from 'vue-echarts';
import App from './App.vue';
import router from './router';
import { pinia } from './stores';
import { useThemeStore } from './stores/theme';
import './charts/setup';
import './styles.css';

const app = createApp(App);

app.component('VChart', VueECharts);
app.use(pinia);

const themeStore = useThemeStore(pinia);
themeStore.initFromStorage();

app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.mount('#app');
