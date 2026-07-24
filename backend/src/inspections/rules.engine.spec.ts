import { computeScore, runRules } from './rules.engine';
import { RecordEntity } from '../records/record.entity';

const make = (partial: Partial<RecordEntity>): RecordEntity =>
  ({
    id: 0,
    datasetId: 1,
    date: '2020-01-01',
    category: 'A',
    region: 'North',
    channel: 'Online',
    amount: 100,
    createdAt: new Date(),
    dataset: undefined as never,
    ...partial
  }) as RecordEntity;

describe('rules.engine', () => {
  const today = '2026-07-24';

  it('flags missing fields', () => {
    const { categoryCounts, issues } = runRules(
      [make({ id: 1, category: '' })],
      today
    );
    expect(categoryCounts.missing_field).toBe(1);
    expect(issues[0].rule).toBe('missing_field');
  });

  it('flags abnormal amounts (<=0 or >1e7)', () => {
    const { categoryCounts } = runRules(
      [
        make({ id: 1, amount: 0 }),
        make({ id: 2, amount: -5 }),
        make({ id: 3, amount: 1e7 + 1 }),
        make({ id: 4, amount: 500 })
      ],
      today
    );
    expect(categoryCounts.abnormal_amount).toBe(3);
  });

  it('flags future dates', () => {
    const { categoryCounts } = runRules(
      [make({ id: 1, date: '2999-01-01' }), make({ id: 2, date: '2020-01-01' })],
      today
    );
    expect(categoryCounts.future_date).toBe(1);
  });

  it('flags duplicates except the earliest record', () => {
    const { categoryCounts, issueRecordIds } = runRules(
      [
        make({ id: 1, date: '2020-01-01', category: 'A', region: 'N', channel: 'O' }),
        make({ id: 2, date: '2020-01-01', category: 'A', region: 'N', channel: 'O' }),
        make({ id: 3, date: '2020-01-01', category: 'A', region: 'N', channel: 'O' })
      ],
      today
    );
    expect(categoryCounts.duplicate_key).toBe(2);
    expect(issueRecordIds.has(1)).toBe(false);
    expect(issueRecordIds.has(2)).toBe(true);
    expect(issueRecordIds.has(3)).toBe(true);
  });

  it('computes score by healthy record ratio', () => {
    expect(computeScore(0, 0)).toBe(100);
    expect(computeScore(10, 0)).toBe(100);
    expect(computeScore(10, 5)).toBe(50);
    expect(computeScore(10, 10)).toBe(0);
  });
});
