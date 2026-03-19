import { describe, it, expect } from 'vitest';
import { mapStatus } from '../status-mapper.js';
import { TestStatus } from '@audas/shared';

describe('mapStatus', () => {
  it('maps passed → TestStatus.PASSED', () => {
    expect(mapStatus('passed')).toBe(TestStatus.PASSED);
  });

  it('maps failed → TestStatus.FAILED', () => {
    expect(mapStatus('failed')).toBe(TestStatus.FAILED);
  });

  it('maps skipped → TestStatus.SKIPPED', () => {
    expect(mapStatus('skipped')).toBe(TestStatus.SKIPPED);
  });

  it('maps timedOut → TestStatus.FAILED', () => {
    expect(mapStatus('timedOut')).toBe(TestStatus.FAILED);
  });

  it('maps interrupted → TestStatus.FAILED', () => {
    expect(mapStatus('interrupted')).toBe(TestStatus.FAILED);
  });
});
