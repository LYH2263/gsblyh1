import { describe, expect, it } from 'vitest';
import { DEFAULT_DEV_API_TARGET, resolveDevApiTarget } from '@/config/devApiTarget';

describe('resolveDevApiTarget', () => {
  it('falls back to the local backend default when env is missing', () => {
    expect(resolveDevApiTarget()).toBe(DEFAULT_DEV_API_TARGET);
    expect(resolveDevApiTarget('   ')).toBe(DEFAULT_DEV_API_TARGET);
  });

  it('uses the trimmed override value when provided', () => {
    expect(resolveDevApiTarget(' http://localhost:3200 ')).toBe('http://localhost:3200');
  });
});
