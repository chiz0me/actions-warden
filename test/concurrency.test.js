import { describe, expect, it } from 'vitest';
import { mapLimit } from '../src/lib/concurrency.js';

describe('mapLimit', () => {
  it('preserves result order while bounding active work', async () => {
    let active = 0;
    let peak = 0;
    const results = await mapLimit([30, 5, 20, 1], 2, async value => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, value));
      active -= 1;
      return value * 2;
    });
    expect(results).toEqual([60, 10, 40, 2]);
    expect(peak).toBe(2);
  });

  it('stops scheduling new work after the first rejection', async () => {
    const started = [];
    await expect(mapLimit([0, 1, 2, 3], 2, async value => {
      started.push(value);
      if (value === 0) throw new Error('stop');
      await new Promise(resolve => setTimeout(resolve, 10));
      return value;
    })).rejects.toThrow('stop');
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(started).not.toContain(2);
    expect(started).not.toContain(3);
  });
});
