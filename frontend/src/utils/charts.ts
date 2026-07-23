import type { EChartsOption } from 'echarts';
import type { RankItem, TrendPoint } from '@/types/models';

interface ChartThemeOptions {
  dark?: boolean;
  lineColor?: string;
  barColor?: string;
  piePalette?: string[];
}

function getThemeConfig(options?: ChartThemeOptions) {
  const dark = options?.dark ?? false;

  const baseTheme = dark
    ? {
        textColor: '#cbd5e1',
        splitLineColor: '#334155',
        tooltipBg: 'rgba(15, 23, 42, 0.95)',
        tooltipTextColor: '#e2e8f0',
        lineColor: '#60a5fa',
        barColor: '#22d3ee',
        piePalette: ['#60a5fa', '#22d3ee', '#34d399', '#fbbf24', '#f87171']
      }
    : {
        textColor: '#475569',
        splitLineColor: '#e2e8f0',
        tooltipBg: '#ffffff',
        tooltipTextColor: '#0f172a',
        lineColor: '#2563eb',
        barColor: '#0891b2',
        piePalette: ['#2563eb', '#0891b2', '#16a34a', '#f59e0b', '#ef4444']
      };

  return {
    ...baseTheme,
    lineColor: options?.lineColor ?? baseTheme.lineColor,
    barColor: options?.barColor ?? baseTheme.barColor,
    piePalette: options?.piePalette ?? baseTheme.piePalette
  };
}

export function buildTrendOption(
  data: TrendPoint[],
  options?: ChartThemeOptions
): EChartsOption {
  const theme = getThemeConfig(options);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      textStyle: { color: theme.tooltipTextColor }
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.date),
      axisLabel: { color: theme.textColor },
      axisLine: { lineStyle: { color: theme.splitLineColor } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: theme.textColor },
      splitLine: { lineStyle: { color: theme.splitLineColor } }
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: data.map((item) => item.value),
        itemStyle: { color: theme.lineColor },
        lineStyle: { color: theme.lineColor }
      }
    ]
  };
}

export function buildTopOption(
  data: RankItem[],
  options?: ChartThemeOptions
): EChartsOption {
  const theme = getThemeConfig(options);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      textStyle: { color: theme.tooltipTextColor }
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: { interval: 0, rotate: 20, color: theme.textColor },
      axisLine: { lineStyle: { color: theme.splitLineColor } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: theme.textColor },
      splitLine: { lineStyle: { color: theme.splitLineColor } }
    },
    series: [
      {
        type: 'bar',
        data: data.map((item) => item.value),
        itemStyle: { color: theme.barColor }
      }
    ]
  };
}

export function buildPieOption(
  data: RankItem[],
  options?: ChartThemeOptions
): EChartsOption {
  const theme = getThemeConfig(options);

  return {
    color: theme.piePalette,
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBg,
      textStyle: { color: theme.tooltipTextColor }
    },
    legend: {
      bottom: 0,
      textStyle: {
        color: theme.textColor
      }
    },
    series: [
      {
        type: 'pie',
        radius: '58%',
        data: data.map((item) => ({
          name: item.name,
          value: item.value
        }))
      }
    ]
  };
}
