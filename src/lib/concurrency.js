/**
 * Order-preserving bounded async map.
 */
export async function mapLimit(values, limit, worker) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('concurrency limit must be positive');
  const results = new Array(values.length);
  let cursor = 0;
  let stopped = false;
  async function run() {
    for (;;) {
      if (stopped) return;
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      try {
        results[index] = await worker(values[index], index);
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => run()),
  );
  return results;
}
