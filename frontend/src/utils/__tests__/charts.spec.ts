import { describe, expect, it } from 'vitest';
import { buildTrendOption } from '@/utils/charts';

describe('analytics chart mapping', () => {
  it('creates trend option with correct xAxis and series length', () => {
    const option = buildTrendOption([
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: 180 },
      { date: '2026-01-03', value: 260 }
    ]);

    const xAxisData = (option.xAxis as { data: string[] }).data;
    const seriesData = (option.series as Array<{ data: number[] }>)[0].data;

    expect(xAxisData).toHaveLength(3);
    expect(seriesData).toHaveLength(3);
    expect(seriesData[1]).toBe(180);
  });
});
