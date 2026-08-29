/**
 * Test whether a parsed workflow subscribes to an event.
 *
 * @param {unknown} on
 * @param {string} name
 */
export function hasTrigger(on, name) {
  if (!on) return false;
  if (typeof on === 'string') return on === name;
  if (Array.isArray(on)) return on.includes(name);
  return typeof on === 'object' && Object.prototype.hasOwnProperty.call(on, name);
}
