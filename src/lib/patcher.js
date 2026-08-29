/**
 * Apply non-overlapping source patches from right to left.
 *
 * @param {string} source
 * @param {Array<{start: number, end: number, text: string, expected?: string}>} patches
 */
export function applyPatches(source, patches) {
  const ordered = [...patches].sort((a, b) => b.start - a.start || b.end - a.end);
  let previousStart = source.length + 1;
  let output = source;

  for (const patch of ordered) {
    if (
      !Number.isInteger(patch.start)
      || !Number.isInteger(patch.end)
      || patch.start < 0
      || patch.end < patch.start
      || patch.end > source.length
    ) {
      throw new Error('invalid source patch range');
    }
    if (patch.end > previousStart) {
      throw new Error('overlapping source patches');
    }
    if (
      patch.expected !== undefined
      && source.slice(patch.start, patch.end) !== patch.expected
    ) {
      throw new Error('workflow changed while planning; refusing to apply stale patch');
    }
    output = output.slice(0, patch.start) + patch.text + output.slice(patch.end);
    previousStart = patch.start;
  }
  return output;
}

/**
 * Locate a parsed action reference when callers constructed it without ranges.
 *
 * @param {string} source
 * @param {{raw: string, line: number, start?: number, end?: number, lineStart?: number, lineEnd?: number}} ref
 */
export function locateActionRef(source, ref) {
  if (
    Number.isInteger(ref.start)
    && Number.isInteger(ref.end)
    && ref.end > ref.start
    && (
      source.slice(ref.start, ref.end).includes(ref.raw)
      || ref.alias === true
    )
  ) {
    const lineStart = (
      Number.isInteger(ref.lineStart)
      && ref.lineStart <= ref.start
      && !source.slice(ref.lineStart, ref.start).includes('\n')
    )
      ? ref.lineStart
      : source.lastIndexOf('\n', Math.max(ref.start - 1, 0)) + 1;
    const newline = source.indexOf('\n', ref.end);
    const computedLineEnd = newline === -1 ? source.length : newline;
    const lineEnd = Number.isInteger(ref.lineEnd) && ref.lineEnd >= ref.end
      ? ref.lineEnd
      : computedLineEnd;
    return {
      ...ref,
      lineStart,
      lineEnd,
      column: Number.isInteger(ref.column) && ref.column > 0
        ? ref.column
        : ref.start - lineStart + 1,
    };
  }

  const lines = source.split('\n');
  const lineIndex = Math.max((ref.line || 1) - 1, 0);
  let lineStart = 0;
  for (let i = 0; i < lineIndex; i += 1) lineStart += lines[i].length + 1;
  const lineText = lines[lineIndex] ?? '';
  const relativeStart = lineText.indexOf(ref.raw);
  if (relativeStart === -1) {
    throw new Error(`could not locate uses reference on line ${ref.line}`);
  }
  let start = lineStart + relativeStart;
  let end = start + ref.raw.length;
  const before = source[start - 1];
  const after = source[end];
  if ((before === '"' || before === "'") && after === before) {
    start -= 1;
    end += 1;
  }
  return {
    ...ref,
    start,
    end,
    lineStart,
    lineEnd: lineStart + lineText.length,
    column: start - lineStart + 1,
  };
}

/**
 * Build exact patches for one `uses:` scalar and its version metadata.
 *
 * @param {string} source
 * @param {object} ref
 * @param {string} ref.raw
 * @param {string} ref.owner
 * @param {string} ref.repo
 * @param {string|null} ref.subpath
 * @param {number} ref.start
 * @param {number} ref.end
 * @param {number} ref.lineEnd
 * @param {string} newRef
 * @param {string} versionLabel
 */
export function planUsesPatches(source, ref, newRef, versionLabel) {
  const located = locateActionRef(source, ref);
  const left = located.subpath
    ? `${located.owner}/${located.repo}/${located.subpath}`
    : `${located.owner}/${located.repo}`;
  const nextValue = `${left}@${newRef}`;
  const originalScalar = source.slice(located.start, located.end);
  const quote = originalScalar[0] === '"' || originalScalar[0] === "'"
    ? originalScalar[0]
    : '';
  const scalarText = quote ? `${quote}${nextValue}${quote}` : nextValue;
  const patches = [{
    start: located.start,
    end: located.end,
    text: scalarText,
    expected: originalScalar,
  }];

  if (versionLabel) {
    const commentPatch = planVersionCommentPatch(source, located, versionLabel);
    if (commentPatch) patches.push(commentPatch);
  }
  return patches;
}

/**
 * Read version metadata from either the new marker or the legacy `# v1.2.3`
 * comment format.
 *
 * @param {string} source
 * @param {object} ref
 */
export function readVersionComment(source, ref) {
  const located = locateActionRef(source, ref);
  const trailing = source.slice(located.end, located.lineEnd);
  const marker = trailing.match(/\bactions-warden-ref:\s*([^\s;#]+)/i);
  if (marker) return marker[1];
  const legacy = trailing.match(/^\s*#\s*(v?\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?)\s*$/);
  return legacy ? legacy[1] : null;
}

function planVersionCommentPatch(source, ref, versionLabel) {
  const trailing = source.slice(ref.end, ref.lineEnd);
  const marker = /\bactions-warden-ref:\s*([^\s;#]+)/i.exec(trailing);
  if (marker) {
    const valueOffset = marker.index + marker[0].lastIndexOf(marker[1]);
    return {
      start: ref.end + valueOffset,
      end: ref.end + valueOffset + marker[1].length,
      text: versionLabel,
      expected: marker[1],
    };
  }

  const legacy = /^(\s*#\s*)(v?\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?)(\s*)$/.exec(trailing);
  if (legacy) {
    const valueOffset = legacy[1].length;
    return {
      start: ref.end + valueOffset,
      end: ref.end + valueOffset + legacy[2].length,
      text: versionLabel,
      expected: legacy[2],
    };
  }

  const hashOffset = trailing.indexOf('#');
  if (hashOffset === -1) {
    return {
      start: ref.end,
      end: ref.end,
      text: ` # actions-warden-ref: ${versionLabel}`,
      expected: '',
    };
  }

  const insertAt = ref.end + hashOffset + 1;
  return {
    start: insertAt,
    end: insertAt,
    text: ` actions-warden-ref: ${versionLabel};`,
    expected: '',
  };
}
