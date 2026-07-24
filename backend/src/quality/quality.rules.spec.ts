import { inspectRecords, computeScore } from './quality.rules';
import type { RecordEntity } from '../records/record.entity';

const makeRecord = (
  id: number,
  partial: Partial<RecordEntity> = {}
): RecordEntity =>
  ({
    id,
    datasetId: 1,
    date: '2026-02-01',
    category: '电子产品',
    region: '华北',
    channel: '线上',
    amount: 1000,
    ...partial
  }) as RecordEntity;

describe('quality rules engine', () => {
  it('detects missing category/region/channel/date', () => {
    const records = [
      makeRecord(1),
      makeRecord(2, { category: '' }),
      makeRecord(3, { region: '' }),
      makeRecord(4, { channel: '' }),
      makeRecord(5, { date: '' })
    ];
    const issues = inspectRecords(records, new Date('2026-07-24T00:00:00Z'));
    const missing = issues.filter((i) => i.rule === 'missing_field');
    expect(missing).toHaveLength(4);
    expect(missing.map((i) => i.recordId).sort()).toEqual([2, 3, 4, 5]);
    expect(missing.find((i) => i.recordId === 2)?.field).toBe('category');
    expect(missing.find((i) => i.recordId === 5)?.field).toBe('date');
  });

  it('detects abnormal amount <=0 and >1e7', () => {
    const records = [
      makeRecord(1, { amount: 100 }),
      makeRecord(2, { amount: 0 }),
      makeRecord(3, { amount: -500 }),
      makeRecord(4, { amount: 15000000 }),
      makeRecord(5, { amount: 10000000 })
    ];
    const issues = inspectRecords(records, new Date('2026-07-24T00:00:00Z'));
    const abnormal = issues.filter((i) => i.rule === 'abnormal_amount');
    expect(abnormal.map((i) => i.recordId).sort()).toEqual([2, 3, 4]);
  });

  it('detects future dates and ignores past/today', () => {
    const records = [
      makeRecord(1, { date: '2026-07-24' }),
      makeRecord(2, { date: '2026-07-25' }),
      makeRecord(3, { date: '2099-01-01' }),
      makeRecord(4, { date: '2020-01-01' })
    ];
    const issues = inspectRecords(records, new Date('2026-07-24T00:00:00Z'));
    const future = issues.filter((i) => i.rule === 'future_date');
    expect(future.map((i) => i.recordId).sort()).toEqual([2, 3]);
  });

  it('detects duplicate composite keys keeping earliest', () => {
    const records = [
      makeRecord(1, { date: '2026-02-01', category: 'A', region: 'R1', channel: 'C1', amount: 100 }),
      makeRecord(2, { date: '2026-02-01', category: 'A', region: 'R1', channel: 'C1', amount: 200 }),
      makeRecord(3, { date: '2026-02-01', category: 'A', region: 'R1', channel: 'C1', amount: 300 }),
      makeRecord(4, { date: '2026-02-02', category: 'B', region: 'R2', channel: 'C2', amount: 400 })
    ];
    const issues = inspectRecords(records, new Date('2026-07-24T00:00:00Z'));
    const dups = issues.filter((i) => i.rule === 'duplicate_key');
    expect(dups.map((i) => i.recordId).sort()).toEqual([2, 3]);
    const detail = JSON.parse(dups[0].detail ?? '{}');
    expect(detail.duplicateOf).toBe(1);
  });

  it('computes score based on clean records ratio', () => {
    expect(computeScore(10, new Set([1, 2]))).toBe(80);
    expect(computeScore(10, new Set())).toBe(100);
    expect(computeScore(0, new Set())).toBe(0);
    expect(computeScore(4, new Set([1, 2, 3, 4]))).toBe(0);
  });
});
