#!/usr/bin/env node
import { createRequire as __WEBPACK_EXTERNAL_createRequire } from "module";
/******/ var __webpack_modules__ = ({

/***/ 4006:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const pico = __nccwpck_require__(8016);
const utils = __nccwpck_require__(4059);

function picomatch(glob, options, returnState = false) {
  // default to os.platform()
  if (options && (options.windows === null || options.windows === undefined)) {
    // don't mutate the original options object
    options = { ...options, windows: utils.isWindows() };
  }

  return pico(glob, options, returnState);
}

Object.assign(picomatch, pico);
module.exports = picomatch;


/***/ }),

/***/ 5595:
/***/ ((module) => {



const WIN_SLASH = '\\\\/';
const WIN_NO_SLASH = `[^${WIN_SLASH}]`;

const DEFAULT_MAX_EXTGLOB_RECURSION = 0;

/**
 * Posix glob regex
 */

const DOT_LITERAL = '\\.';
const PLUS_LITERAL = '\\+';
const QMARK_LITERAL = '\\?';
const SLASH_LITERAL = '\\/';
const ONE_CHAR = '(?=.)';
const QMARK = '[^/]';
const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
const NO_DOT = `(?!${DOT_LITERAL})`;
const NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
const NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
const NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
const QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
const STAR = `${QMARK}*?`;
const SEP = '/';

const POSIX_CHARS = {
  DOT_LITERAL,
  PLUS_LITERAL,
  QMARK_LITERAL,
  SLASH_LITERAL,
  ONE_CHAR,
  QMARK,
  END_ANCHOR,
  DOTS_SLASH,
  NO_DOT,
  NO_DOTS,
  NO_DOT_SLASH,
  NO_DOTS_SLASH,
  QMARK_NO_DOT,
  STAR,
  START_ANCHOR,
  SEP
};

/**
 * Windows glob regex
 */

const WINDOWS_CHARS = {
  ...POSIX_CHARS,

  SLASH_LITERAL: `[${WIN_SLASH}]`,
  QMARK: WIN_NO_SLASH,
  STAR: `${WIN_NO_SLASH}*?`,
  DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
  NO_DOT: `(?!${DOT_LITERAL})`,
  NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
  NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
  QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
  START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
  END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
  SEP: '\\'
};

/**
 * POSIX Bracket Regex
 */

const POSIX_REGEX_SOURCE = {
  __proto__: null,
  alnum: 'a-zA-Z0-9',
  alpha: 'a-zA-Z',
  ascii: '\\x00-\\x7F',
  blank: ' \\t',
  cntrl: '\\x00-\\x1F\\x7F',
  digit: '0-9',
  graph: '\\x21-\\x7E',
  lower: 'a-z',
  print: '\\x20-\\x7E ',
  punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
  space: ' \\t\\r\\n\\v\\f',
  upper: 'A-Z',
  word: 'A-Za-z0-9_',
  xdigit: 'A-Fa-f0-9'
};

module.exports = {
  DEFAULT_MAX_EXTGLOB_RECURSION,
  MAX_LENGTH: 1024 * 64,
  POSIX_REGEX_SOURCE,

  // regular expressions
  REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
  REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
  REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
  REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
  REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
  REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,

  // Replace globs with equivalent patterns to reduce parsing time.
  REPLACEMENTS: {
    __proto__: null,
    '***': '*',
    '**/**': '**',
    '**/**/**': '**'
  },

  // Digits
  CHAR_0: 48, /* 0 */
  CHAR_9: 57, /* 9 */

  // Alphabet chars.
  CHAR_UPPERCASE_A: 65, /* A */
  CHAR_LOWERCASE_A: 97, /* a */
  CHAR_UPPERCASE_Z: 90, /* Z */
  CHAR_LOWERCASE_Z: 122, /* z */

  CHAR_LEFT_PARENTHESES: 40, /* ( */
  CHAR_RIGHT_PARENTHESES: 41, /* ) */

  CHAR_ASTERISK: 42, /* * */

  // Non-alphabetic chars.
  CHAR_AMPERSAND: 38, /* & */
  CHAR_AT: 64, /* @ */
  CHAR_BACKWARD_SLASH: 92, /* \ */
  CHAR_CARRIAGE_RETURN: 13, /* \r */
  CHAR_CIRCUMFLEX_ACCENT: 94, /* ^ */
  CHAR_COLON: 58, /* : */
  CHAR_COMMA: 44, /* , */
  CHAR_DOT: 46, /* . */
  CHAR_DOUBLE_QUOTE: 34, /* " */
  CHAR_EQUAL: 61, /* = */
  CHAR_EXCLAMATION_MARK: 33, /* ! */
  CHAR_FORM_FEED: 12, /* \f */
  CHAR_FORWARD_SLASH: 47, /* / */
  CHAR_GRAVE_ACCENT: 96, /* ` */
  CHAR_HASH: 35, /* # */
  CHAR_HYPHEN_MINUS: 45, /* - */
  CHAR_LEFT_ANGLE_BRACKET: 60, /* < */
  CHAR_LEFT_CURLY_BRACE: 123, /* { */
  CHAR_LEFT_SQUARE_BRACKET: 91, /* [ */
  CHAR_LINE_FEED: 10, /* \n */
  CHAR_NO_BREAK_SPACE: 160, /* \u00A0 */
  CHAR_PERCENT: 37, /* % */
  CHAR_PLUS: 43, /* + */
  CHAR_QUESTION_MARK: 63, /* ? */
  CHAR_RIGHT_ANGLE_BRACKET: 62, /* > */
  CHAR_RIGHT_CURLY_BRACE: 125, /* } */
  CHAR_RIGHT_SQUARE_BRACKET: 93, /* ] */
  CHAR_SEMICOLON: 59, /* ; */
  CHAR_SINGLE_QUOTE: 39, /* ' */
  CHAR_SPACE: 32, /*   */
  CHAR_TAB: 9, /* \t */
  CHAR_UNDERSCORE: 95, /* _ */
  CHAR_VERTICAL_LINE: 124, /* | */
  CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, /* \uFEFF */

  /**
   * Create EXTGLOB_CHARS
   */

  extglobChars(chars) {
    return {
      '!': { type: 'negate', open: '(?:(?!(?:', close: `))${chars.STAR})` },
      '?': { type: 'qmark', open: '(?:', close: ')?' },
      '+': { type: 'plus', open: '(?:', close: ')+' },
      '*': { type: 'star', open: '(?:', close: ')*' },
      '@': { type: 'at', open: '(?:', close: ')' }
    };
  },

  /**
   * Create GLOB_CHARS
   */

  globChars(win32) {
    return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
  }
};


/***/ }),

/***/ 8265:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const constants = __nccwpck_require__(5595);
const utils = __nccwpck_require__(4059);

/**
 * Constants
 */

const {
  MAX_LENGTH,
  POSIX_REGEX_SOURCE,
  REGEX_NON_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_BACKREF,
  REPLACEMENTS
} = constants;

/**
 * Helpers
 */

const expandRange = (args, options) => {
  if (typeof options.expandRange === 'function') {
    return options.expandRange(...args, options);
  }

  args.sort();
  const value = `[${args.join('-')}]`;

  try {
    /* eslint-disable-next-line no-new */
    new RegExp(value);
  } catch (ex) {
    return args.map(v => utils.escapeRegex(v)).join('..');
  }

  return value;
};

/**
 * Create the message for a syntax error
 */

const syntaxError = (type, char) => {
  return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
};

const splitTopLevel = input => {
  const parts = [];
  let bracket = 0;
  let paren = 0;
  let quote = 0;
  let value = '';
  let escaped = false;

  for (const ch of input) {
    if (escaped === true) {
      value += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      value += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      quote = quote === 1 ? 0 : 1;
      value += ch;
      continue;
    }

    if (quote === 0) {
      if (ch === '[') {
        bracket++;
      } else if (ch === ']' && bracket > 0) {
        bracket--;
      } else if (bracket === 0) {
        if (ch === '(') {
          paren++;
        } else if (ch === ')' && paren > 0) {
          paren--;
        } else if (ch === '|' && paren === 0) {
          parts.push(value);
          value = '';
          continue;
        }
      }
    }

    value += ch;
  }

  parts.push(value);
  return parts;
};

const isPlainBranch = branch => {
  let escaped = false;

  for (const ch of branch) {
    if (escaped === true) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (/[?*+@!()[\]{}]/.test(ch)) {
      return false;
    }
  }

  return true;
};

const normalizeSimpleBranch = branch => {
  let value = branch.trim();
  let changed = true;

  while (changed === true) {
    changed = false;

    if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
      value = value.slice(2, -1);
      changed = true;
    }
  }

  if (!isPlainBranch(value)) {
    return;
  }

  return value.replace(/\\(.)/g, '$1');
};

const hasRepeatedCharPrefixOverlap = branches => {
  const values = branches.map(normalizeSimpleBranch).filter(Boolean);

  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const a = values[i];
      const b = values[j];
      const char = a[0];

      if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) {
        continue;
      }

      if (a === b || a.startsWith(b) || b.startsWith(a)) {
        return true;
      }
    }
  }

  return false;
};

const parseRepeatedExtglob = (pattern, requireEnd = true) => {
  if ((pattern[0] !== '+' && pattern[0] !== '*') || pattern[1] !== '(') {
    return;
  }

  let bracket = 0;
  let paren = 0;
  let quote = 0;
  let escaped = false;

  for (let i = 1; i < pattern.length; i++) {
    const ch = pattern[i];

    if (escaped === true) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      quote = quote === 1 ? 0 : 1;
      continue;
    }

    if (quote === 1) {
      continue;
    }

    if (ch === '[') {
      bracket++;
      continue;
    }

    if (ch === ']' && bracket > 0) {
      bracket--;
      continue;
    }

    if (bracket > 0) {
      continue;
    }

    if (ch === '(') {
      paren++;
      continue;
    }

    if (ch === ')') {
      paren--;

      if (paren === 0) {
        if (requireEnd === true && i !== pattern.length - 1) {
          return;
        }

        return {
          type: pattern[0],
          body: pattern.slice(2, i),
          end: i
        };
      }
    }
  }
};

const buildCharClassStar = chars => {
  const source = chars.length === 1
    ? utils.escapeRegex(chars[0])
    : `[${chars.map(ch => utils.escapeRegex(ch)).join('')}]`;

  return `${source}*`;
};

const getStarExtglobSequenceChars = pattern => {
  let index = 0;
  const chars = [];

  while (index < pattern.length) {
    const match = parseRepeatedExtglob(pattern.slice(index), false);

    if (!match || match.type !== '*') {
      return;
    }

    const branches = splitTopLevel(match.body).map(branch => branch.trim());
    if (branches.length !== 1) {
      return;
    }

    const branch = normalizeSimpleBranch(branches[0]);
    if (!branch || branch.length !== 1) {
      return;
    }

    chars.push(branch);
    index += match.end + 1;
  }

  if (chars.length < 1) {
    return;
  }

  return chars;
};

const repeatedExtglobRecursion = pattern => {
  let depth = 0;
  let value = pattern.trim();
  let match = parseRepeatedExtglob(value);

  while (match) {
    depth++;
    value = match.body.trim();
    match = parseRepeatedExtglob(value);
  }

  return depth;
};

const analyzeRepeatedExtglob = (body, options) => {
  if (options.maxExtglobRecursion === false) {
    return { risky: false };
  }

  const max =
    typeof options.maxExtglobRecursion === 'number'
      ? options.maxExtglobRecursion
      : constants.DEFAULT_MAX_EXTGLOB_RECURSION;

  const branches = splitTopLevel(body).map(branch => branch.trim());

  if (branches.length > 1) {
    if (
      branches.some(branch => branch === '') ||
      branches.some(branch => /^[*?]+$/.test(branch)) ||
      hasRepeatedCharPrefixOverlap(branches)
    ) {
      return { risky: true };
    }
  }

  // A repeated extglob is "risky" (prone to catastrophic backtracking) when a
  // branch is itself a `*(...)` sequence, since that nests an unbounded quantifier
  // inside the outer `+(...)`/`*(...)`. When *every* branch reduces to single
  // characters we can emit one flat, ReDoS-safe character class that preserves the
  // meaning of ALL branches (e.g. `+(*(a)|*(b))` -> `[ab]*`), rather than dropping
  // every branch but the first.
  const safeChars = [];
  let sawStarSequence = false;
  let combinable = true;

  for (const branch of branches) {
    const chars = getStarExtglobSequenceChars(branch);
    if (chars) {
      sawStarSequence = true;
      safeChars.push(...chars);
      continue;
    }

    const literal = normalizeSimpleBranch(branch);
    if (literal && literal.length === 1) {
      safeChars.push(literal);
      continue;
    }

    combinable = false;

    if (repeatedExtglobRecursion(branch) > max) {
      return { risky: true };
    }
  }

  if (sawStarSequence) {
    return combinable
      ? { risky: true, safeOutput: buildCharClassStar([...new Set(safeChars)]) }
      : { risky: true };
  }

  return { risky: false };
};

/**
 * Parse the given input string.
 * @param {String} input
 * @param {Object} options
 * @return {Object}
 */

const parse = (input, options) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected a string');
  }

  input = REPLACEMENTS[input] || input;

  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;

  let len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  const bos = { type: 'bos', value: '', output: opts.prepend || '' };
  const tokens = [bos];

  const capture = opts.capture ? '' : '?:';

  // create constants based on platform, for windows or posix
  const PLATFORM_CHARS = constants.globChars(opts.windows);
  const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);

  const {
    DOT_LITERAL,
    PLUS_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOT_SLASH,
    NO_DOTS_SLASH,
    QMARK,
    QMARK_NO_DOT,
    STAR,
    START_ANCHOR
  } = PLATFORM_CHARS;

  const globstar = opts => {
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const nodot = opts.dot ? '' : NO_DOT;
  const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
  let star = opts.bash === true ? globstar(opts) : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  // minimatch options support
  if (typeof opts.noext === 'boolean') {
    opts.noextglob = opts.noext;
  }

  const state = {
    input,
    index: -1,
    start: 0,
    dot: opts.dot === true,
    consumed: '',
    output: '',
    prefix: '',
    backtrack: false,
    negated: false,
    brackets: 0,
    braces: 0,
    parens: 0,
    quotes: 0,
    globstar: false,
    tokens
  };

  input = utils.removePrefix(input, state);
  len = input.length;

  const extglobs = [];
  const braces = [];
  const stack = [];
  let prev = bos;
  let value;

  /**
   * Tokenizing helpers
   */

  const eos = () => state.index === len - 1;
  const peek = state.peek = (n = 1) => input[state.index + n];
  const advance = state.advance = () => input[++state.index] || '';
  const remaining = () => input.slice(state.index + 1);
  const consume = (value = '', num = 0) => {
    state.consumed += value;
    state.index += num;
  };

  const append = token => {
    state.output += token.output != null ? token.output : token.value;
    consume(token.value);
  };

  const negate = () => {
    let count = 1;

    while (peek() === '!' && (peek(2) !== '(' || peek(3) === '?')) {
      advance();
      state.start++;
      count++;
    }

    if (count % 2 === 0) {
      return false;
    }

    state.negated = true;
    state.start++;
    return true;
  };

  const increment = type => {
    state[type]++;
    stack.push(type);
  };

  const decrement = type => {
    state[type]--;
    stack.pop();
  };

  /**
   * Push tokens onto the tokens array. This helper speeds up
   * tokenizing by 1) helping us avoid backtracking as much as possible,
   * and 2) helping us avoid creating extra tokens when consecutive
   * characters are plain text. This improves performance and simplifies
   * lookbehinds.
   */

  const push = tok => {
    if (prev.type === 'globstar') {
      const isBrace = state.braces > 0 && (tok.type === 'comma' || tok.type === 'brace');
      const isExtglob = tok.extglob === true || (extglobs.length && (tok.type === 'pipe' || tok.type === 'paren'));

      if (tok.type !== 'slash' && tok.type !== 'paren' && !isBrace && !isExtglob) {
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = 'star';
        prev.value = '*';
        prev.output = star;
        state.output += prev.output;
      }
    }

    if (extglobs.length && tok.type !== 'paren') {
      extglobs[extglobs.length - 1].inner += tok.value;
    }

    if (tok.value || tok.output) append(tok);
    if (prev && prev.type === 'text' && tok.type === 'text') {
      prev.output = (prev.output || prev.value) + tok.value;
      prev.value += tok.value;
      return;
    }

    tok.prev = prev;
    tokens.push(tok);
    prev = tok;
  };

  const extglobOpen = (type, value) => {
    const token = { ...EXTGLOB_CHARS[value], conditions: 1, inner: '' };

    token.prev = prev;
    token.parens = state.parens;
    token.output = state.output;
    token.startIndex = state.index;
    token.tokensIndex = tokens.length;
    const output = (opts.capture ? '(' : '') + token.open;

    increment('parens');
    push({ type, value, output: state.output ? '' : ONE_CHAR });
    push({ type: 'paren', extglob: true, value: advance(), output });
    extglobs.push(token);
  };

  const extglobClose = token => {
    const literal = input.slice(token.startIndex, state.index + 1);
    const body = input.slice(token.startIndex + 2, state.index);
    const analysis = analyzeRepeatedExtglob(body, opts);

    if ((token.type === 'plus' || token.type === 'star') && analysis.risky) {
      const safeOutput = analysis.safeOutput
        ? (token.output ? '' : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput)
        : undefined;
      const open = tokens[token.tokensIndex];

      open.type = 'text';
      open.value = literal;
      open.output = safeOutput || utils.escapeRegex(literal);

      for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
        tokens[i].value = '';
        tokens[i].output = '';
        delete tokens[i].suffix;
      }

      state.output = token.output + open.output;
      state.backtrack = true;

      push({ type: 'paren', extglob: true, value, output: '' });
      decrement('parens');
      return;
    }

    let output = token.close + (opts.capture ? ')' : '');
    let rest;

    if (token.type === 'negate') {
      let extglobStar = star;

      if (token.inner && token.inner.length > 1 && token.inner.includes('/')) {
        extglobStar = globstar(opts);
      }

      if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
        output = token.close = `)$))${extglobStar}`;
      }

      if (token.inner.includes('*') && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
        // Any non-magical string (`.ts`) or even nested expression (`.{ts,tsx}`) can follow after the closing parenthesis.
        // In this case, we need to parse the string and use it in the output of the original pattern.
        // Suitable patterns: `/!(*.d).ts`, `/!(*.d).{ts,tsx}`, `**/!(*-dbg).@(js)`.
        //
        // Disabling the `fastpaths` option due to a problem with parsing strings as `.ts` in the pattern like `**/!(*.d).ts`.
        const expression = parse(rest, { ...options, fastpaths: false }).output;

        output = token.close = `)${expression})${extglobStar})`;
      }

      if (token.prev.type === 'bos') {
        state.negatedExtglob = true;
      }
    }

    push({ type: 'paren', extglob: true, value, output });
    decrement('parens');
  };

  /**
   * Fast paths
   */

  if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
    let backslashes = false;

    let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
      if (first === '\\') {
        backslashes = true;
        return m;
      }

      if (first === '?') {
        if (esc) {
          return esc + first + (rest ? QMARK.repeat(rest.length) : '');
        }
        if (index === 0) {
          return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : '');
        }
        return QMARK.repeat(chars.length);
      }

      if (first === '.') {
        return DOT_LITERAL.repeat(chars.length);
      }

      if (first === '*') {
        if (esc) {
          return esc + first + (rest ? star : '');
        }
        return star;
      }
      return esc ? m : `\\${m}`;
    });

    if (backslashes === true) {
      if (opts.unescape === true) {
        output = output.replace(/\\/g, '');
      } else {
        output = output.replace(/\\+/g, m => {
          return m.length % 2 === 0 ? '\\\\' : (m ? '\\' : '');
        });
      }
    }

    if (output === input && opts.contains === true) {
      state.output = input;
      return state;
    }

    state.output = utils.wrapOutput(output, state, options);
    return state;
  }

  /**
   * Tokenize input until we reach end-of-string
   */

  while (!eos()) {
    value = advance();

    if (value === '\u0000') {
      continue;
    }

    /**
     * Escaped characters
     */

    if (value === '\\') {
      const next = peek();

      if (next === '/' && opts.bash !== true) {
        continue;
      }

      if (next === '.' || next === ';') {
        continue;
      }

      if (!next) {
        value += '\\';
        push({ type: 'text', value });
        continue;
      }

      // collapse slashes to reduce potential for exploits
      const match = /^\\+/.exec(remaining());
      let slashes = 0;

      if (match && match[0].length > 2) {
        slashes = match[0].length;
        state.index += slashes;
        if (slashes % 2 !== 0) {
          value += '\\';
        }
      }

      if (opts.unescape === true) {
        value = advance();
      } else {
        value += advance();
      }

      if (state.brackets === 0) {
        push({ type: 'text', value });
        continue;
      }
    }

    /**
     * If we're inside a regex character class, continue
     * until we reach the closing bracket.
     */

    if (state.brackets > 0 && (value !== ']' || prev.value === '[' || prev.value === '[^')) {
      if (opts.posix !== false && value === ':') {
        const inner = prev.value.slice(1);
        if (inner.includes('[')) {
          prev.posix = true;

          if (inner.includes(':')) {
            const idx = prev.value.lastIndexOf('[');
            const pre = prev.value.slice(0, idx);
            const rest = prev.value.slice(idx + 2);
            const posix = POSIX_REGEX_SOURCE[rest];
            if (posix) {
              prev.value = pre + posix;
              state.backtrack = true;
              advance();

              if (!bos.output && tokens.indexOf(prev) === 1) {
                bos.output = ONE_CHAR;
              }
              continue;
            }
          }
        }
      }

      if ((value === '[' && peek() !== ':') || (value === '-' && peek() === ']')) {
        value = `\\${value}`;
      }

      if (value === ']' && (prev.value === '[' || prev.value === '[^')) {
        value = `\\${value}`;
      }

      if (opts.posix === true && value === '!' && prev.value === '[') {
        value = '^';
      }

      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * If we're inside a quoted string, continue
     * until we reach the closing double quote.
     */

    if (state.quotes === 1 && value !== '"') {
      value = utils.escapeRegex(value);
      prev.value += value;
      append({ value });
      continue;
    }

    /**
     * Double quotes
     */

    if (value === '"') {
      state.quotes = state.quotes === 1 ? 0 : 1;
      if (opts.keepQuotes === true) {
        push({ type: 'text', value });
      }
      continue;
    }

    /**
     * Parentheses
     */

    if (value === '(') {
      increment('parens');
      push({ type: 'paren', value });
      continue;
    }

    if (value === ')') {
      if (state.parens === 0 && opts.strictBrackets === true) {
        throw new SyntaxError(syntaxError('opening', '('));
      }

      const extglob = extglobs[extglobs.length - 1];
      if (extglob && state.parens === extglob.parens + 1) {
        extglobClose(extglobs.pop());
        continue;
      }

      push({ type: 'paren', value, output: state.parens ? ')' : '\\)' });
      decrement('parens');
      continue;
    }

    /**
     * Square brackets
     */

    if (value === '[') {
      if (opts.nobracket === true || !remaining().includes(']')) {
        if (opts.nobracket !== true && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('closing', ']'));
        }

        value = `\\${value}`;
      } else {
        increment('brackets');
      }

      push({ type: 'bracket', value });
      continue;
    }

    if (value === ']') {
      if (opts.nobracket === true || (prev && prev.type === 'bracket' && prev.value.length === 1)) {
        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      if (state.brackets === 0) {
        if (opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError('opening', '['));
        }

        push({ type: 'text', value, output: `\\${value}` });
        continue;
      }

      decrement('brackets');

      const prevValue = prev.value.slice(1);
      if (prev.posix !== true && prevValue[0] === '^' && !prevValue.includes('/')) {
        value = `/${value}`;
      }

      prev.value += value;
      append({ value });

      // when literal brackets are explicitly disabled
      // assume we should match with a regex character class
      if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
        continue;
      }

      const escaped = utils.escapeRegex(prev.value);
      state.output = state.output.slice(0, -prev.value.length);

      // when literal brackets are explicitly enabled
      // assume we should escape the brackets to match literal characters
      if (opts.literalBrackets === true) {
        state.output += escaped;
        prev.value = escaped;
        continue;
      }

      // when the user specifies nothing, try to match both
      prev.value = `(${capture}${escaped}|${prev.value})`;
      state.output += prev.value;
      continue;
    }

    /**
     * Braces
     */

    if (value === '{' && opts.nobrace !== true) {
      increment('braces');

      const open = {
        type: 'brace',
        value,
        output: '(',
        outputIndex: state.output.length,
        tokensIndex: state.tokens.length
      };

      braces.push(open);
      push(open);
      continue;
    }

    if (value === '}') {
      const brace = braces[braces.length - 1];

      if (opts.nobrace === true || !brace) {
        push({ type: 'text', value, output: value });
        continue;
      }

      let output = ')';

      if (brace.dots === true) {
        const arr = tokens.slice();
        const range = [];

        for (let i = arr.length - 1; i >= 0; i--) {
          tokens.pop();
          if (arr[i].type === 'brace') {
            break;
          }
          if (arr[i].type !== 'dots') {
            range.unshift(arr[i].value);
          }
        }

        output = expandRange(range, opts);
        state.backtrack = true;
      }

      if (brace.comma !== true && brace.dots !== true) {
        const out = state.output.slice(0, brace.outputIndex);
        const toks = state.tokens.slice(brace.tokensIndex);
        brace.value = brace.output = '\\{';
        value = output = '\\}';
        state.output = out;
        for (const t of toks) {
          state.output += (t.output || t.value);
        }
      }

      push({ type: 'brace', value, output });
      decrement('braces');
      braces.pop();
      continue;
    }

    /**
     * Pipes
     */

    if (value === '|') {
      if (extglobs.length > 0) {
        extglobs[extglobs.length - 1].conditions++;
      }
      push({ type: 'text', value });
      continue;
    }

    /**
     * Commas
     */

    if (value === ',') {
      let output = value;

      const brace = braces[braces.length - 1];
      if (brace && stack[stack.length - 1] === 'braces') {
        brace.comma = true;
        output = '|';
      }

      push({ type: 'comma', value, output });
      continue;
    }

    /**
     * Slashes
     */

    if (value === '/') {
      // if the beginning of the glob is "./", advance the start
      // to the current index, and don't add the "./" characters
      // to the state. This greatly simplifies lookbehinds when
      // checking for BOS characters like "!" and "." (not "./")
      if (prev.type === 'dot' && state.index === state.start + 1) {
        state.start = state.index + 1;
        state.consumed = '';
        state.output = '';
        tokens.pop();
        prev = bos; // reset "prev" to the first token
        continue;
      }

      push({ type: 'slash', value, output: SLASH_LITERAL });
      continue;
    }

    /**
     * Dots
     */

    if (value === '.') {
      if (state.braces > 0 && prev.type === 'dot') {
        if (prev.value === '.') prev.output = DOT_LITERAL;
        const brace = braces[braces.length - 1];
        prev.type = 'dots';
        prev.output += value;
        prev.value += value;
        brace.dots = true;
        continue;
      }

      if ((state.braces + state.parens) === 0 && prev.type !== 'bos' && prev.type !== 'slash') {
        push({ type: 'text', value, output: DOT_LITERAL });
        continue;
      }

      push({ type: 'dot', value, output: DOT_LITERAL });
      continue;
    }

    /**
     * Question marks
     */

    if (value === '?') {
      const isGroup = prev && prev.value === '(';
      if (!isGroup && opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('qmark', value);
        continue;
      }

      if (prev && prev.type === 'paren') {
        const next = peek();
        let output = value;

        if ((prev.value === '(' && !/[!=<:]/.test(next)) || (next === '<' && !/<([!=]|\w+>)/.test(remaining()))) {
          output = `\\${value}`;
        }

        push({ type: 'text', value, output });
        continue;
      }

      if (opts.dot !== true && (prev.type === 'slash' || prev.type === 'bos')) {
        push({ type: 'qmark', value, output: QMARK_NO_DOT });
        continue;
      }

      push({ type: 'qmark', value, output: QMARK });
      continue;
    }

    /**
     * Exclamation
     */

    if (value === '!') {
      if (opts.noextglob !== true && peek() === '(') {
        if (peek(2) !== '?' || !/[!=<:]/.test(peek(3))) {
          extglobOpen('negate', value);
          continue;
        }
      }

      if (opts.nonegate !== true && state.index === 0) {
        negate();
        continue;
      }
    }

    /**
     * Plus
     */

    if (value === '+') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        extglobOpen('plus', value);
        continue;
      }

      if ((prev && prev.value === '(') || opts.regex === false) {
        push({ type: 'plus', value, output: PLUS_LITERAL });
        continue;
      }

      if ((prev && (prev.type === 'bracket' || prev.type === 'paren' || prev.type === 'brace')) || state.parens > 0) {
        push({ type: 'plus', value });
        continue;
      }

      push({ type: 'plus', value: PLUS_LITERAL });
      continue;
    }

    /**
     * Plain text
     */

    if (value === '@') {
      if (opts.noextglob !== true && peek() === '(' && peek(2) !== '?') {
        push({ type: 'at', extglob: true, value, output: '' });
        continue;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Plain text
     */

    if (value !== '*') {
      if (value === '$' || value === '^') {
        value = `\\${value}`;
      }

      const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
      if (match) {
        value += match[0];
        state.index += match[0].length;
      }

      push({ type: 'text', value });
      continue;
    }

    /**
     * Stars
     */

    if (prev && (prev.type === 'globstar' || prev.star === true)) {
      prev.type = 'star';
      prev.star = true;
      prev.value += value;
      prev.output = star;
      state.backtrack = true;
      state.globstar = true;
      consume(value);
      continue;
    }

    let rest = remaining();
    if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
      extglobOpen('star', value);
      continue;
    }

    if (prev.type === 'star') {
      if (opts.noglobstar === true) {
        consume(value);
        continue;
      }

      const prior = prev.prev;
      const before = prior.prev;
      const isStart = prior.type === 'slash' || prior.type === 'bos';
      const afterStar = before && (before.type === 'star' || before.type === 'globstar');

      if (opts.bash === true && (!isStart || (rest[0] && rest[0] !== '/'))) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      const isBrace = state.braces > 0 && (prior.type === 'comma' || prior.type === 'brace');
      const isExtglob = extglobs.length && (prior.type === 'pipe' || prior.type === 'paren');
      if (!isStart && prior.type !== 'paren' && !isBrace && !isExtglob) {
        push({ type: 'star', value, output: '' });
        continue;
      }

      // strip consecutive `/**/`
      while (rest.slice(0, 3) === '/**') {
        const after = input[state.index + 4];
        if (after && after !== '/') {
          break;
        }
        rest = rest.slice(3);
        consume('/**', 3);
      }

      if (prior.type === 'bos' && eos()) {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = globstar(opts);
        state.output = prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && !afterStar && eos()) {
        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = globstar(opts) + (opts.strictSlashes ? ')' : '|$)');
        prev.value += value;
        state.globstar = true;
        state.output += prior.output + prev.output;
        consume(value);
        continue;
      }

      if (prior.type === 'slash' && prior.prev.type !== 'bos' && rest[0] === '/') {
        const end = rest[1] !== void 0 ? '|$' : '';

        state.output = state.output.slice(0, -(prior.output + prev.output).length);
        prior.output = `(?:${prior.output}`;

        prev.type = 'globstar';
        prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
        prev.value += value;

        state.output += prior.output + prev.output;
        state.globstar = true;

        consume(value + advance());

        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      if (prior.type === 'bos' && rest[0] === '/') {
        prev.type = 'globstar';
        prev.value += value;
        prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
        state.output = prev.output;
        state.globstar = true;
        consume(value + advance());
        push({ type: 'slash', value: '/', output: '' });
        continue;
      }

      // remove single star from output
      state.output = state.output.slice(0, -prev.output.length);

      // reset previous token to globstar
      prev.type = 'globstar';
      prev.output = globstar(opts);
      prev.value += value;

      // reset output with globstar
      state.output += prev.output;
      state.globstar = true;
      consume(value);
      continue;
    }

    const token = { type: 'star', value, output: star };

    if (opts.bash === true) {
      token.output = '.*?';
      if (prev.type === 'bos' || prev.type === 'slash') {
        token.output = nodot + token.output;
      }
      push(token);
      continue;
    }

    if (prev && (prev.type === 'bracket' || prev.type === 'paren') && opts.regex === true) {
      token.output = value;
      push(token);
      continue;
    }

    if (state.index === state.start || prev.type === 'slash' || prev.type === 'dot') {
      if (prev.type === 'dot') {
        state.output += NO_DOT_SLASH;
        prev.output += NO_DOT_SLASH;

      } else if (opts.dot === true) {
        state.output += NO_DOTS_SLASH;
        prev.output += NO_DOTS_SLASH;

      } else {
        state.output += nodot;
        prev.output += nodot;
      }

      if (peek() !== '*') {
        state.output += ONE_CHAR;
        prev.output += ONE_CHAR;
      }
    }

    push(token);
  }

  while (state.brackets > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ']'));
    state.output = utils.escapeLast(state.output, '[');
    decrement('brackets');
  }

  while (state.parens > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', ')'));
    state.output = utils.escapeLast(state.output, '(');
    decrement('parens');
  }

  while (state.braces > 0) {
    if (opts.strictBrackets === true) throw new SyntaxError(syntaxError('closing', '}'));
    state.output = utils.escapeLast(state.output, '{');
    decrement('braces');
  }

  if (opts.strictSlashes !== true && (prev.type === 'star' || prev.type === 'bracket')) {
    push({ type: 'maybe_slash', value: '', output: `${SLASH_LITERAL}?` });
  }

  // rebuild the output if we had to backtrack at any point
  if (state.backtrack === true) {
    state.output = '';

    for (const token of state.tokens) {
      state.output += token.output != null ? token.output : token.value;

      if (token.suffix) {
        state.output += token.suffix;
      }
    }
  }

  return state;
};

/**
 * Fast paths for creating regular expressions for common glob patterns.
 * This can significantly speed up processing and has very little downside
 * impact when none of the fast paths match.
 */

parse.fastpaths = (input, options) => {
  const opts = { ...options };
  const max = typeof opts.maxLength === 'number' ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
  const len = input.length;
  if (len > max) {
    throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
  }

  input = REPLACEMENTS[input] || input;

  // create constants based on platform, for windows or posix
  const {
    DOT_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOTS,
    NO_DOTS_SLASH,
    STAR,
    START_ANCHOR
  } = constants.globChars(opts.windows);

  const nodot = opts.dot ? NO_DOTS : NO_DOT;
  const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
  const capture = opts.capture ? '' : '?:';
  const state = { negated: false, prefix: '' };
  let star = opts.bash === true ? '.*?' : STAR;

  if (opts.capture) {
    star = `(${star})`;
  }

  const globstar = opts => {
    if (opts.noglobstar === true) return star;
    return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
  };

  const create = str => {
    switch (str) {
      case '*':
        return `${nodot}${ONE_CHAR}${star}`;

      case '.*':
        return `${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*.*':
        return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '*/*':
        return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;

      case '**':
        return nodot + globstar(opts);

      case '**/*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;

      case '**/*.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;

      case '**/.*':
        return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;

      default: {
        const match = /^(.*?)\.(\w+)$/.exec(str);
        if (!match) return;

        const source = create(match[1]);
        if (!source) return;

        return source + DOT_LITERAL + match[2];
      }
    }
  };

  const output = utils.removePrefix(input, state);
  let source = create(output);

  if (source && opts.strictSlashes !== true) {
    source += `${SLASH_LITERAL}?`;
  }

  return source;
};

module.exports = parse;


/***/ }),

/***/ 8016:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const scan = __nccwpck_require__(1781);
const parse = __nccwpck_require__(8265);
const utils = __nccwpck_require__(4059);
const constants = __nccwpck_require__(5595);
const isObject = val => val && typeof val === 'object' && !Array.isArray(val);

/**
 * Creates a matcher function from one or more glob patterns. The
 * returned function takes a string to match as its first argument,
 * and returns true if the string is a match. The returned matcher
 * function also takes a boolean as the second argument that, when true,
 * returns an object with additional information.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch(glob[, options]);
 *
 * const isMatch = picomatch('*.!(*a)');
 * console.log(isMatch('a.a')); //=> false
 * console.log(isMatch('a.b')); //=> true
 *
 * // For environments without `node.js`, `picomatch/posix` provides you a dependency-free matcher, without automatic OS detection.
 * const picomatch = require('picomatch/posix');
 * // the same API, defaulting to posix paths
 * const isMatch = picomatch('a/*');
 * console.log(isMatch('a\\b')); //=> false
 * console.log(isMatch('a/b')); //=> true
 *
 * // you can still configure the matcher function to accept windows paths
 * const isMatch = picomatch('a/*', { options: windows });
 * console.log(isMatch('a\\b')); //=> true
 * console.log(isMatch('a/b')); //=> true
 * ```
 * @name picomatch
 * @param {String|Array} `globs` One or more glob patterns.
 * @param {Object=} `options`
 * @return {Function=} Returns a matcher function.
 * @api public
 */

const picomatch = (glob, options, returnState = false) => {
  if (Array.isArray(glob)) {
    const fns = glob.map(input => picomatch(input, options, returnState));
    const arrayMatcher = str => {
      for (const isMatch of fns) {
        const state = isMatch(str);
        if (state) return state;
      }
      return false;
    };
    return arrayMatcher;
  }

  const isState = isObject(glob) && glob.tokens && glob.input;

  if (glob === '' || (typeof glob !== 'string' && !isState)) {
    throw new TypeError('Expected pattern to be a non-empty string');
  }

  const opts = options || {};
  const posix = opts.windows;
  const regex = isState
    ? picomatch.compileRe(glob, options)
    : picomatch.makeRe(glob, options, false, true);

  const state = regex.state;
  delete regex.state;

  let isIgnored = () => false;
  if (opts.ignore) {
    const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
    isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
  }

  const matcher = (input, returnObject = false) => {
    const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
    const result = { glob, state, regex, posix, input, output, match, isMatch };

    if (typeof opts.onResult === 'function') {
      opts.onResult(result);
    }

    if (isMatch === false) {
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (isIgnored(input)) {
      if (typeof opts.onIgnore === 'function') {
        opts.onIgnore(result);
      }
      result.isMatch = false;
      return returnObject ? result : false;
    }

    if (typeof opts.onMatch === 'function') {
      opts.onMatch(result);
    }
    return returnObject ? result : true;
  };

  if (returnState) {
    matcher.state = state;
  }

  return matcher;
};

/**
 * Test `input` with the given `regex`. This is used by the main
 * `picomatch()` function to test the input string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.test(input, regex[, options]);
 *
 * console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
 * // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp} `regex`
 * @return {Object} Returns an object with matching info.
 * @api public
 */

picomatch.test = (input, regex, options, { glob, posix } = {}) => {
  if (typeof input !== 'string') {
    throw new TypeError('Expected input to be a string');
  }

  if (input === '') {
    return { isMatch: false, output: '' };
  }

  const opts = options || {};
  const format = opts.format || (posix ? utils.toPosixSlashes : null);
  let match = input === glob;
  let output = (match && format) ? format(input) : input;

  if (match === false) {
    output = format ? format(input) : input;
    match = output === glob;
  }

  if (match === false || opts.capture === true) {
    if (opts.matchBase === true || opts.basename === true) {
      match = picomatch.matchBase(input, regex, options, posix);
    } else {
      match = regex.exec(output);
    }
  }

  return { isMatch: Boolean(match), match, output };
};

/**
 * Match the basename of a filepath.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.matchBase(input, glob[, options]);
 * console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
 * ```
 * @param {String} `input` String to test.
 * @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
 * @return {Boolean}
 * @api public
 */

picomatch.matchBase = (input, glob, options, posix = options && options.windows) => {
  const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
  return regex.test(utils.basename(input, { windows: posix }));
};

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.isMatch(string, patterns[, options]);
 *
 * console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
 * console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
 * ```
 * @param {String|Array} str The string to test.
 * @param {String|Array} patterns One or more glob patterns to use for matching.
 * @param {Object} [options] See available [options](#options).
 * @return {Boolean} Returns true if any patterns match `str`
 * @api public
 */

picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);

/**
 * Parse a glob pattern to create the source string for a regular
 * expression.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const result = picomatch.parse(pattern[, options]);
 * ```
 * @param {String} `pattern`
 * @param {Object} `options`
 * @return {Object} Returns an object with useful properties and output to be used as a regex source string.
 * @api public
 */

picomatch.parse = (pattern, options) => {
  if (Array.isArray(pattern)) return pattern.map(p => picomatch.parse(p, options));
  return parse(pattern, { ...options, fastpaths: false });
};

/**
 * Scan a glob pattern to separate the pattern into segments.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.scan(input[, options]);
 *
 * const result = picomatch.scan('!./foo/*.js');
 * console.log(result);
 * { prefix: '!./',
 *   input: '!./foo/*.js',
 *   start: 3,
 *   base: 'foo',
 *   glob: '*.js',
 *   isBrace: false,
 *   isBracket: false,
 *   isGlob: true,
 *   isExtglob: false,
 *   isGlobstar: false,
 *   negated: true }
 * ```
 * @param {String} `input` Glob pattern to scan.
 * @param {Object} `options`
 * @return {Object} Returns an object with
 * @api public
 */

picomatch.scan = (input, options) => scan(input, options);

/**
 * Compile a regular expression from the `state` object returned by the
 * [parse()](#parse) method.
 *
 * ```js
 * const picomatch = require('picomatch');
 * const state = picomatch.parse('*.js');
 * // picomatch.compileRe(state[, options]);
 *
 * console.log(picomatch.compileRe(state));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {Object} `state`
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
 * @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
 * @return {RegExp}
 * @api public
 */

picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
  if (returnOutput === true) {
    return state.output;
  }

  const opts = options || {};
  const prepend = opts.contains ? '' : '^';
  const append = opts.contains ? '' : '$';

  let source = `${prepend}(?:${state.output})${append}`;
  if (state && state.negated === true) {
    source = `^(?!${source}).*$`;
  }

  const regex = picomatch.toRegex(source, options);
  if (returnState === true) {
    regex.state = state;
  }

  return regex;
};

/**
 * Create a regular expression from a parsed glob pattern.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.makeRe(state[, options]);
 *
 * const result = picomatch.makeRe('*.js');
 * console.log(result);
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `state` The object returned from the `.parse` method.
 * @param {Object} `options`
 * @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
 * @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
 * @return {RegExp} Returns a regex created from the given pattern.
 * @api public
 */

picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
  if (!input || typeof input !== 'string') {
    throw new TypeError('Expected a non-empty string');
  }

  let parsed = { negated: false, fastpaths: true };

  if (options.fastpaths !== false && (input[0] === '.' || input[0] === '*')) {
    parsed.output = parse.fastpaths(input, options);
  }

  if (!parsed.output) {
    parsed = parse(input, options);
  }

  return picomatch.compileRe(parsed, options, returnOutput, returnState);
};

/**
 * Create a regular expression from the given regex source string.
 *
 * ```js
 * const picomatch = require('picomatch');
 * // picomatch.toRegex(source[, options]);
 *
 * const { output } = picomatch.parse('*.js');
 * console.log(picomatch.toRegex(output));
 * //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
 * ```
 * @param {String} `source` Regular expression source string.
 * @param {Object} `options`
 * @return {RegExp}
 * @api public
 */

picomatch.toRegex = (source, options) => {
  try {
    const opts = options || {};
    return new RegExp(source, opts.flags || (opts.nocase ? 'i' : ''));
  } catch (err) {
    if (options && options.debug === true) throw err;
    return /$^/;
  }
};

/**
 * Picomatch constants.
 * @return {Object}
 */

picomatch.constants = constants;

/**
 * Expose "picomatch"
 */

module.exports = picomatch;


/***/ }),

/***/ 1781:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const utils = __nccwpck_require__(4059);
const {
  CHAR_ASTERISK,             /* * */
  CHAR_AT,                   /* @ */
  CHAR_BACKWARD_SLASH,       /* \ */
  CHAR_COMMA,                /* , */
  CHAR_DOT,                  /* . */
  CHAR_EXCLAMATION_MARK,     /* ! */
  CHAR_FORWARD_SLASH,        /* / */
  CHAR_LEFT_CURLY_BRACE,     /* { */
  CHAR_LEFT_PARENTHESES,     /* ( */
  CHAR_LEFT_SQUARE_BRACKET,  /* [ */
  CHAR_PLUS,                 /* + */
  CHAR_QUESTION_MARK,        /* ? */
  CHAR_RIGHT_CURLY_BRACE,    /* } */
  CHAR_RIGHT_PARENTHESES,    /* ) */
  CHAR_RIGHT_SQUARE_BRACKET  /* ] */
} = __nccwpck_require__(5595);

const isPathSeparator = code => {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
};

const depth = token => {
  if (token.isPrefix !== true) {
    token.depth = token.isGlobstar ? Infinity : 1;
  }
};

/**
 * Quickly scans a glob pattern and returns an object with a handful of
 * useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
 * `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
 * with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
 *
 * ```js
 * const pm = require('picomatch');
 * console.log(pm.scan('foo/bar/*.js'));
 * { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
 * ```
 * @param {String} `str`
 * @param {Object} `options`
 * @return {Object} Returns an object with tokens and regex source string.
 * @api public
 */

const scan = (input, options) => {
  const opts = options || {};

  const length = input.length - 1;
  const scanToEnd = opts.parts === true || opts.scanToEnd === true;
  const slashes = [];
  const tokens = [];
  const parts = [];

  let str = input;
  let index = -1;
  let start = 0;
  let lastIndex = 0;
  let isBrace = false;
  let isBracket = false;
  let isGlob = false;
  let isExtglob = false;
  let isGlobstar = false;
  let braceEscaped = false;
  let backslashes = false;
  let negated = false;
  let negatedExtglob = false;
  let finished = false;
  let braces = 0;
  let prev;
  let code;
  let token = { value: '', depth: 0, isGlob: false };

  const eos = () => index >= length;
  const peek = () => str.charCodeAt(index + 1);
  const advance = () => {
    prev = code;
    return str.charCodeAt(++index);
  };

  while (index < length) {
    code = advance();
    let next;

    if (code === CHAR_BACKWARD_SLASH) {
      backslashes = token.backslashes = true;
      code = advance();

      if (code === CHAR_LEFT_CURLY_BRACE) {
        braceEscaped = true;
      }
      continue;
    }

    if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
      braces++;

      while (eos() !== true && (code = advance())) {
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          continue;
        }

        if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (braceEscaped !== true && code === CHAR_COMMA) {
          isBrace = token.isBrace = true;
          isGlob = token.isGlob = true;
          finished = true;

          if (scanToEnd === true) {
            continue;
          }

          break;
        }

        if (code === CHAR_RIGHT_CURLY_BRACE) {
          braces--;

          if (braces === 0) {
            braceEscaped = false;
            isBrace = token.isBrace = true;
            finished = true;
            break;
          }
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (code === CHAR_FORWARD_SLASH) {
      slashes.push(index);
      tokens.push(token);
      token = { value: '', depth: 0, isGlob: false };

      if (finished === true) continue;
      if (prev === CHAR_DOT && index === (start + 1)) {
        start += 2;
        continue;
      }

      lastIndex = index + 1;
      continue;
    }

    if (opts.noext !== true) {
      const isExtglobChar = code === CHAR_PLUS
        || code === CHAR_AT
        || code === CHAR_ASTERISK
        || code === CHAR_QUESTION_MARK
        || code === CHAR_EXCLAMATION_MARK;

      if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        isExtglob = token.isExtglob = true;
        finished = true;
        if (code === CHAR_EXCLAMATION_MARK && index === start) {
          negatedExtglob = true;
        }

        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }

            if (code === CHAR_RIGHT_PARENTHESES) {
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
    }

    if (code === CHAR_ASTERISK) {
      if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_QUESTION_MARK) {
      isGlob = token.isGlob = true;
      finished = true;

      if (scanToEnd === true) {
        continue;
      }
      break;
    }

    if (code === CHAR_LEFT_SQUARE_BRACKET) {
      while (eos() !== true && (next = advance())) {
        if (next === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          advance();
          continue;
        }

        if (next === CHAR_RIGHT_SQUARE_BRACKET) {
          isBracket = token.isBracket = true;
          isGlob = token.isGlob = true;
          finished = true;
          break;
        }
      }

      if (scanToEnd === true) {
        continue;
      }

      break;
    }

    if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
      negated = token.negated = true;
      start++;
      continue;
    }

    if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
      isGlob = token.isGlob = true;

      if (scanToEnd === true) {
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_LEFT_PARENTHESES) {
            backslashes = token.backslashes = true;
            code = advance();
            continue;
          }

          if (code === CHAR_RIGHT_PARENTHESES) {
            finished = true;
            break;
          }
        }
        continue;
      }
      break;
    }

    if (isGlob === true) {
      finished = true;

      if (scanToEnd === true) {
        continue;
      }

      break;
    }
  }

  if (opts.noext === true) {
    isExtglob = false;
    isGlob = false;
  }

  let base = str;
  let prefix = '';
  let glob = '';

  if (start > 0) {
    prefix = str.slice(0, start);
    str = str.slice(start);
    lastIndex -= start;
  }

  if (base && isGlob === true && lastIndex > 0) {
    base = str.slice(0, lastIndex);
    glob = str.slice(lastIndex);
  } else if (isGlob === true) {
    base = '';
    glob = str;
  } else {
    base = str;
  }

  if (base && base !== '' && base !== '/' && base !== str) {
    if (isPathSeparator(base.charCodeAt(base.length - 1))) {
      base = base.slice(0, -1);
    }
  }

  if (opts.unescape === true) {
    if (glob) glob = utils.removeBackslashes(glob);

    if (base && backslashes === true) {
      base = utils.removeBackslashes(base);
    }
  }

  const state = {
    prefix,
    input,
    start,
    base,
    glob,
    isBrace,
    isBracket,
    isGlob,
    isExtglob,
    isGlobstar,
    negated,
    negatedExtglob
  };

  if (opts.tokens === true) {
    state.maxDepth = 0;
    if (!isPathSeparator(code)) {
      tokens.push(token);
    }
    state.tokens = tokens;
  }

  if (opts.parts === true || opts.tokens === true) {
    let prevIndex;

    for (let idx = 0; idx < slashes.length; idx++) {
      const n = prevIndex ? prevIndex + 1 : start;
      const i = slashes[idx];
      const value = input.slice(n, i);
      if (opts.tokens) {
        if (idx === 0 && start !== 0) {
          tokens[idx].isPrefix = true;
          tokens[idx].value = prefix;
        } else {
          tokens[idx].value = value;
        }
        depth(tokens[idx]);
        state.maxDepth += tokens[idx].depth;
      }
      if (idx !== 0 || value !== '') {
        parts.push(value);
      }
      prevIndex = i;
    }

    if (prevIndex && prevIndex + 1 < input.length) {
      const value = input.slice(prevIndex + 1);
      parts.push(value);

      if (opts.tokens) {
        tokens[tokens.length - 1].value = value;
        depth(tokens[tokens.length - 1]);
        state.maxDepth += tokens[tokens.length - 1].depth;
      }
    }

    state.slashes = slashes;
    state.parts = parts;
  }

  return state;
};

module.exports = scan;


/***/ }),

/***/ 4059:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

/*global navigator*/


const {
  REGEX_BACKSLASH,
  REGEX_REMOVE_BACKSLASH,
  REGEX_SPECIAL_CHARS,
  REGEX_SPECIAL_CHARS_GLOBAL
} = __nccwpck_require__(5595);

exports.isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
exports.hasRegexChars = str => REGEX_SPECIAL_CHARS.test(str);
exports.isRegexChar = str => str.length === 1 && exports.hasRegexChars(str);
exports.escapeRegex = str => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, '\\$1');
exports.toPosixSlashes = str => str.replace(REGEX_BACKSLASH, '/');

exports.isWindows = () => {
  if (typeof navigator !== 'undefined' && navigator.platform) {
    const platform = navigator.platform.toLowerCase();
    return platform === 'win32' || platform === 'windows';
  }

  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32';
  }

  return false;
};

exports.removeBackslashes = str => {
  return str.replace(REGEX_REMOVE_BACKSLASH, match => {
    return match === '\\' ? '' : match;
  });
};

exports.escapeLast = (input, char, lastIdx) => {
  const idx = input.lastIndexOf(char, lastIdx);
  if (idx === -1) return input;
  if (input[idx - 1] === '\\') return exports.escapeLast(input, char, idx - 1);
  return `${input.slice(0, idx)}\\${input.slice(idx)}`;
};

exports.removePrefix = (input, state = {}) => {
  let output = input;
  if (output.startsWith('./')) {
    output = output.slice(2);
    state.prefix = './';
  }
  return output;
};

exports.wrapOutput = (input, state = {}, options = {}) => {
  const prepend = options.contains ? '' : '^';
  const append = options.contains ? '' : '$';

  let output = `${prepend}(?:${input})${append}`;
  if (state.negated === true) {
    output = `(?:^(?!${output}).*$)`;
  }
  return output;
};

exports.basename = (path, { windows } = {}) => {
  const segs = path.split(windows ? /[\\/]/ : '/');
  const last = segs[segs.length - 1];

  if (last === '') {
    return segs[segs.length - 2];
  }

  return last;
};


/***/ }),

/***/ 9379:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const ANY = Symbol('SemVer ANY')
// hoisted class for cyclic dependency
class Comparator {
  static get ANY () {
    return ANY
  }

  constructor (comp, options) {
    options = parseOptions(options)

    if (comp instanceof Comparator) {
      if (comp.loose === !!options.loose) {
        return comp
      } else {
        comp = comp.value
      }
    }

    comp = comp.trim().split(/\s+/).join(' ')
    debug('comparator', comp, options)
    this.options = options
    this.loose = !!options.loose
    this.parse(comp)

    if (this.semver === ANY) {
      this.value = ''
    } else {
      this.value = this.operator + this.semver.version
    }

    debug('comp', this)
  }

  parse (comp) {
    const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR]
    const m = comp.match(r)

    if (!m) {
      throw new TypeError(`Invalid comparator: ${comp}`)
    }

    this.operator = m[1] !== undefined ? m[1] : ''
    if (this.operator === '=') {
      this.operator = ''
    }

    // if it literally is just '>' or '' then allow anything.
    if (!m[2]) {
      this.semver = ANY
    } else {
      this.semver = new SemVer(m[2], this.options.loose)
    }
  }

  toString () {
    return this.value
  }

  test (version) {
    debug('Comparator.test', version, this.options.loose)

    if (this.semver === ANY || version === ANY) {
      return true
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    return cmp(version, this.operator, this.semver, this.options)
  }

  intersects (comp, options) {
    if (!(comp instanceof Comparator)) {
      throw new TypeError('a Comparator is required')
    }

    if (this.operator === '') {
      if (this.value === '') {
        return true
      }
      return new Range(comp.value, options).test(this.value)
    } else if (comp.operator === '') {
      if (comp.value === '') {
        return true
      }
      return new Range(this.value, options).test(comp.semver)
    }

    options = parseOptions(options)

    // Special cases where nothing can possibly be lower
    if (options.includePrerelease &&
      (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
      return false
    }
    if (!options.includePrerelease &&
      (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
      return false
    }

    // Same direction increasing (> or >=)
    if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
      return true
    }
    // Same direction decreasing (< or <=)
    if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
      return true
    }
    // same SemVer and both sides are inclusive (<= or >=)
    if (
      (this.semver.version === comp.semver.version) &&
      this.operator.includes('=') && comp.operator.includes('=')) {
      return true
    }
    // opposite directions less than
    if (cmp(this.semver, '<', comp.semver, options) &&
      this.operator.startsWith('>') && comp.operator.startsWith('<')) {
      return true
    }
    // opposite directions greater than
    if (cmp(this.semver, '>', comp.semver, options) &&
      this.operator.startsWith('<') && comp.operator.startsWith('>')) {
      return true
    }
    return false
  }
}

module.exports = Comparator

const parseOptions = __nccwpck_require__(356)
const { safeRe: re, t } = __nccwpck_require__(5471)
const cmp = __nccwpck_require__(8646)
const debug = __nccwpck_require__(1159)
const SemVer = __nccwpck_require__(7163)
const Range = __nccwpck_require__(6782)


/***/ }),

/***/ 6782:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SPACE_CHARACTERS = /\s+/g

// hoisted class for cyclic dependency
class Range {
  constructor (range, options) {
    options = parseOptions(options)

    if (range instanceof Range) {
      if (
        range.loose === !!options.loose &&
        range.includePrerelease === !!options.includePrerelease
      ) {
        return range
      } else {
        return new Range(range.raw, options)
      }
    }

    if (range instanceof Comparator) {
      // just put it in the set and return
      this.raw = range.value
      this.set = [[range]]
      this.formatted = undefined
      return this
    }

    this.options = options
    this.loose = !!options.loose
    this.includePrerelease = !!options.includePrerelease

    // First reduce all whitespace as much as possible so we do not have to rely
    // on potentially slow regexes like \s*. This is then stored and used for
    // future error messages as well.
    this.raw = range.trim().replace(SPACE_CHARACTERS, ' ')

    // First, split on ||
    this.set = this.raw
      .split('||')
      // map the range to a 2d array of comparators
      .map(r => this.parseRange(r.trim()))
      // throw out any comparator lists that are empty
      // this generally means that it was not a valid range, which is allowed
      // in loose mode, but will still throw if the WHOLE range is invalid.
      .filter(c => c.length)

    if (!this.set.length) {
      throw new TypeError(`Invalid SemVer Range: ${this.raw}`)
    }

    // if we have any that are not the null set, throw out null sets.
    if (this.set.length > 1) {
      // keep the first one, in case they're all null sets
      const first = this.set[0]
      this.set = this.set.filter(c => !isNullSet(c[0]))
      if (this.set.length === 0) {
        this.set = [first]
      } else if (this.set.length > 1) {
        // if we have any that are *, then the range is just *
        for (const c of this.set) {
          if (c.length === 1 && isAny(c[0])) {
            this.set = [c]
            break
          }
        }
      }
    }

    this.formatted = undefined
  }

  get range () {
    if (this.formatted === undefined) {
      this.formatted = ''
      for (let i = 0; i < this.set.length; i++) {
        if (i > 0) {
          this.formatted += '||'
        }
        const comps = this.set[i]
        for (let k = 0; k < comps.length; k++) {
          if (k > 0) {
            this.formatted += ' '
          }
          this.formatted += comps[k].toString().trim()
        }
      }
    }
    return this.formatted
  }

  format () {
    return this.range
  }

  toString () {
    return this.range
  }

  parseRange (range) {
    // strip build metadata so it can't bleed into the version
    range = range.replace(BUILDSTRIPRE, '')

    // memoize range parsing for performance.
    // this is a very hot path, and fully deterministic.
    const memoOpts =
      (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
      (this.options.loose && FLAG_LOOSE)
    const memoKey = memoOpts + ':' + range
    const cached = cache.get(memoKey)
    if (cached) {
      return cached
    }

    const loose = this.options.loose
    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
    const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE]
    range = range.replace(hr, hyphenReplace(this.options.includePrerelease))
    debug('hyphen replace', range)

    // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
    range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace)
    debug('comparator trim', range)

    // `~ 1.2.3` => `~1.2.3`
    range = range.replace(re[t.TILDETRIM], tildeTrimReplace)
    debug('tilde trim', range)

    // `^ 1.2.3` => `^1.2.3`
    range = range.replace(re[t.CARETTRIM], caretTrimReplace)
    debug('caret trim', range)

    // At this point, the range is completely trimmed and
    // ready to be split into comparators.

    let rangeList = range
      .split(' ')
      .map(comp => parseComparator(comp, this.options))
      .join(' ')
      .split(/\s+/)
      // >=0.0.0 is equivalent to *
      .map(comp => replaceGTE0(comp, this.options))

    if (loose) {
      // in loose mode, throw out any that are not valid comparators
      rangeList = rangeList.filter(comp => {
        debug('loose invalid filter', comp, this.options)
        return !!comp.match(re[t.COMPARATORLOOSE])
      })
    }
    debug('range list', rangeList)

    // if any comparators are the null set, then replace with JUST null set
    // if more than one comparator, remove any * comparators
    // also, don't include the same comparator more than once
    const rangeMap = new Map()
    const comparators = rangeList.map(comp => new Comparator(comp, this.options))
    for (const comp of comparators) {
      if (isNullSet(comp)) {
        return [comp]
      }
      rangeMap.set(comp.value, comp)
    }
    if (rangeMap.size > 1 && rangeMap.has('')) {
      rangeMap.delete('')
    }

    const result = [...rangeMap.values()]
    cache.set(memoKey, result)
    return result
  }

  intersects (range, options) {
    if (!(range instanceof Range)) {
      throw new TypeError('a Range is required')
    }

    return this.set.some((thisComparators) => {
      return (
        isSatisfiable(thisComparators, options) &&
        range.set.some((rangeComparators) => {
          return (
            isSatisfiable(rangeComparators, options) &&
            thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options)
              })
            })
          )
        })
      )
    })
  }

  // if ANY of the sets match ALL of its comparators, then pass
  test (version) {
    if (!version) {
      return false
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    for (let i = 0; i < this.set.length; i++) {
      if (testSet(this.set[i], version, this.options)) {
        return true
      }
    }
    return false
  }
}

module.exports = Range

const LRU = __nccwpck_require__(1383)
const cache = new LRU()

const parseOptions = __nccwpck_require__(356)
const Comparator = __nccwpck_require__(9379)
const debug = __nccwpck_require__(1159)
const SemVer = __nccwpck_require__(7163)
const {
  safeRe: re,
  src,
  t,
  comparatorTrimReplace,
  tildeTrimReplace,
  caretTrimReplace,
} = __nccwpck_require__(5471)
const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = __nccwpck_require__(5101)

// unbounded global build-metadata stripper used by parseRange
const BUILDSTRIPRE = new RegExp(src[t.BUILD], 'g')

const isNullSet = c => c.value === '<0.0.0-0'
const isAny = c => c.value === ''

// take a set of comparators and determine whether there
// exists a version which can satisfy it
const isSatisfiable = (comparators, options) => {
  let result = true
  const remainingComparators = comparators.slice()
  let testComparator = remainingComparators.pop()

  while (result && remainingComparators.length) {
    result = remainingComparators.every((otherComparator) => {
      return testComparator.intersects(otherComparator, options)
    })

    testComparator = remainingComparators.pop()
  }

  return result
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
const parseComparator = (comp, options) => {
  comp = comp.replace(re[t.BUILD], '')
  debug('comp', comp, options)
  comp = replaceCarets(comp, options)
  debug('caret', comp)
  comp = replaceTildes(comp, options)
  debug('tildes', comp)
  comp = replaceXRanges(comp, options)
  debug('xrange', comp)
  comp = replaceStars(comp, options)
  debug('stars', comp)
  return comp
}

const isX = id => !id || id.toLowerCase() === 'x' || id === '*'

const invalidXRangeOrder = (M, m, p) => (
  (isX(M) && !isX(m)) ||
  (isX(m) && p && !isX(p))
)

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
// ~0.0.1 --> >=0.0.1 <0.1.0-0
const replaceTildes = (comp, options) => {
  return comp
    .trim()
    .split(/\s+/)
    .map((c) => replaceTilde(c, options))
    .join(' ')
}

const replaceTilde = (comp, options) => {
  const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE]
  // if we're including prereleases in the match, then the lower bound is
  // -0, the lowest possible prerelease value, just like x-ranges and carets.
  // this keeps `~1.2` equivalent to the `1.2.x` x-range it's documented as.
  const z = options.includePrerelease ? '-0' : ''
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('tilde', comp, _, M, m, p, pr)
    let ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
    } else if (isX(p)) {
      // ~1.2 == >=1.2.0 <1.3.0-0
      ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
    } else if (pr) {
      debug('replaceTilde pr', pr)
      ret = `>=${M}.${m}.${p}-${pr
      } <${M}.${+m + 1}.0-0`
    } else {
      // ~1.2.3 == >=1.2.3 <1.3.0-0
      ret = `>=${M}.${m}.${p
      } <${M}.${+m + 1}.0-0`
    }

    debug('tilde return', ret)
    return ret
  })
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
// ^1.2.3 --> >=1.2.3 <2.0.0-0
// ^1.2.0 --> >=1.2.0 <2.0.0-0
// ^0.0.1 --> >=0.0.1 <0.0.2-0
// ^0.1.0 --> >=0.1.0 <0.2.0-0
const replaceCarets = (comp, options) => {
  return comp
    .trim()
    .split(/\s+/)
    .map((c) => replaceCaret(c, options))
    .join(' ')
}

const replaceCaret = (comp, options) => {
  debug('caret', comp, options)
  const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET]
  const z = options.includePrerelease ? '-0' : ''
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('caret', comp, _, M, m, p, pr)
    let ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
    } else if (isX(p)) {
      if (M === '0') {
        ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
      } else {
        ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`
      }
    } else if (pr) {
      debug('replaceCaret pr', pr)
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p}-${pr
          } <${M}.${m}.${+p + 1}-0`
        } else {
          ret = `>=${M}.${m}.${p}-${pr
          } <${M}.${+m + 1}.0-0`
        }
      } else {
        ret = `>=${M}.${m}.${p}-${pr
        } <${+M + 1}.0.0-0`
      }
    } else {
      debug('no pr')
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p
          } <${M}.${m}.${+p + 1}-0`
        } else {
          ret = `>=${M}.${m}.${p
          } <${M}.${+m + 1}.0-0`
        }
      } else {
        ret = `>=${M}.${m}.${p
        } <${+M + 1}.0.0-0`
      }
    }

    debug('caret return', ret)
    return ret
  })
}

const replaceXRanges = (comp, options) => {
  debug('replaceXRanges', comp, options)
  return comp
    .split(/\s+/)
    .map((c) => replaceXRange(c, options))
    .join(' ')
}

const replaceXRange = (comp, options) => {
  comp = comp.trim()
  const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE]
  return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
    debug('xRange', comp, ret, gtlt, M, m, p, pr)
    if (invalidXRangeOrder(M, m, p)) {
      return comp
    }

    const xM = isX(M)
    const xm = xM || isX(m)
    const xp = xm || isX(p)
    const anyX = xp

    if (gtlt === '=' && anyX) {
      gtlt = ''
    }

    // if we're including prereleases in the match, then we need
    // to fix this to -0, the lowest possible prerelease value
    pr = options.includePrerelease ? '-0' : ''

    if (xM) {
      if (gtlt === '>' || gtlt === '<') {
        // nothing is allowed
        ret = '<0.0.0-0'
      } else {
        // nothing is forbidden
        ret = '*'
      }
    } else if (gtlt && anyX) {
      // we know patch is an x, because we have any x at all.
      // replace X with 0
      if (xm) {
        m = 0
      }
      p = 0

      if (gtlt === '>') {
        // >1 => >=2.0.0
        // >1.2 => >=1.3.0
        gtlt = '>='
        if (xm) {
          M = +M + 1
          m = 0
          p = 0
        } else {
          m = +m + 1
          p = 0
        }
      } else if (gtlt === '<=') {
        // <=0.7.x is actually <0.8.0, since any 0.7.x should
        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
        gtlt = '<'
        if (xm) {
          M = +M + 1
        } else {
          m = +m + 1
        }
      }

      if (gtlt === '<') {
        pr = '-0'
      }

      ret = `${gtlt + M}.${m}.${p}${pr}`
    } else if (xm) {
      ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`
    } else if (xp) {
      ret = `>=${M}.${m}.0${pr
      } <${M}.${+m + 1}.0-0`
    }

    debug('xRange return', ret)

    return ret
  })
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
const replaceStars = (comp, options) => {
  debug('replaceStars', comp, options)
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp
    .trim()
    .replace(re[t.STAR], '')
}

const replaceGTE0 = (comp, options) => {
  debug('replaceGTE0', comp, options)
  return comp
    .trim()
    .replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '')
}

// This function is passed to string.replace(re[t.HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0-0
// TODO build?
const hyphenReplace = incPr => ($0,
  from, fM, fm, fp, fpr, fb,
  to, tM, tm, tp, tpr) => {
  if (isX(fM)) {
    from = ''
  } else if (isX(fm)) {
    from = `>=${fM}.0.0${incPr ? '-0' : ''}`
  } else if (isX(fp)) {
    from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`
  } else if (fpr) {
    from = `>=${from}`
  } else {
    from = `>=${from}${incPr ? '-0' : ''}`
  }

  if (isX(tM)) {
    to = ''
  } else if (isX(tm)) {
    to = `<${+tM + 1}.0.0-0`
  } else if (isX(tp)) {
    to = `<${tM}.${+tm + 1}.0-0`
  } else if (tpr) {
    to = `<=${tM}.${tm}.${tp}-${tpr}`
  } else if (incPr) {
    to = `<${tM}.${tm}.${+tp + 1}-0`
  } else {
    to = `<=${to}`
  }

  return `${from} ${to}`.trim()
}

const testSet = (set, version, options) => {
  for (let i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }

  if (version.prerelease.length && !options.includePrerelease) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (let i = 0; i < set.length; i++) {
      debug(set[i].semver)
      if (set[i].semver === Comparator.ANY) {
        continue
      }

      if (set[i].semver.prerelease.length > 0) {
        const allowed = set[i].semver
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch) {
          return true
        }
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false
  }

  return true
}


/***/ }),

/***/ 7163:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const debug = __nccwpck_require__(1159)
const { MAX_LENGTH, MAX_SAFE_INTEGER } = __nccwpck_require__(5101)
const { safeRe: re, t } = __nccwpck_require__(5471)

const parseOptions = __nccwpck_require__(356)
const { compareIdentifiers } = __nccwpck_require__(3348)

const isPrereleaseIdentifier = (prerelease, identifier) => {
  const identifiers = identifier.split('.')
  if (identifiers.length > prerelease.length) {
    return false
  }

  for (let i = 0; i < identifiers.length; i++) {
    if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
      return false
    }
  }

  return true
}

class SemVer {
  constructor (version, options) {
    options = parseOptions(options)

    if (version instanceof SemVer) {
      if (version.loose === !!options.loose &&
        version.includePrerelease === !!options.includePrerelease) {
        return version
      } else {
        version = version.version
      }
    } else if (typeof version !== 'string') {
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`)
    }

    if (version.length > MAX_LENGTH) {
      throw new TypeError(
        `version is longer than ${MAX_LENGTH} characters`
      )
    }

    debug('SemVer', version, options)
    this.options = options
    this.loose = !!options.loose
    // this isn't actually relevant for versions, but keep it so that we
    // don't run into trouble passing this.options around.
    this.includePrerelease = !!options.includePrerelease

    const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL])

    if (!m) {
      throw new TypeError(`Invalid Version: ${version}`)
    }

    this.raw = version

    // these are actually numbers
    this.major = +m[1]
    this.minor = +m[2]
    this.patch = +m[3]

    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
      throw new TypeError('Invalid major version')
    }

    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
      throw new TypeError('Invalid minor version')
    }

    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
      throw new TypeError('Invalid patch version')
    }

    // numberify any prerelease numeric ids
    if (!m[4]) {
      this.prerelease = []
    } else {
      this.prerelease = m[4].split('.').map((id) => {
        if (/^[0-9]+$/.test(id)) {
          const num = +id
          if (num >= 0 && num < MAX_SAFE_INTEGER) {
            return num
          }
        }
        return id
      })
    }

    this.build = m[5] ? m[5].split('.') : []
    this.format()
  }

  format () {
    this.version = `${this.major}.${this.minor}.${this.patch}`
    if (this.prerelease.length) {
      this.version += `-${this.prerelease.join('.')}`
    }
    return this.version
  }

  toString () {
    return this.version
  }

  compare (other) {
    debug('SemVer.compare', this.version, this.options, other)
    if (!(other instanceof SemVer)) {
      if (typeof other === 'string' && other === this.version) {
        return 0
      }
      other = new SemVer(other, this.options)
    }

    if (other.version === this.version) {
      return 0
    }

    return this.compareMain(other) || this.comparePre(other)
  }

  compareMain (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    if (this.major < other.major) {
      return -1
    }
    if (this.major > other.major) {
      return 1
    }
    if (this.minor < other.minor) {
      return -1
    }
    if (this.minor > other.minor) {
      return 1
    }
    if (this.patch < other.patch) {
      return -1
    }
    if (this.patch > other.patch) {
      return 1
    }
    return 0
  }

  comparePre (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    // NOT having a prerelease is > having one
    if (this.prerelease.length && !other.prerelease.length) {
      return -1
    } else if (!this.prerelease.length && other.prerelease.length) {
      return 1
    } else if (!this.prerelease.length && !other.prerelease.length) {
      return 0
    }

    let i = 0
    do {
      const a = this.prerelease[i]
      const b = other.prerelease[i]
      debug('prerelease compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
  }

  compareBuild (other) {
    if (!(other instanceof SemVer)) {
      other = new SemVer(other, this.options)
    }

    let i = 0
    do {
      const a = this.build[i]
      const b = other.build[i]
      debug('build compare', i, a, b)
      if (a === undefined && b === undefined) {
        return 0
      } else if (b === undefined) {
        return 1
      } else if (a === undefined) {
        return -1
      } else if (a === b) {
        continue
      } else {
        return compareIdentifiers(a, b)
      }
    } while (++i)
  }

  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc (release, identifier, identifierBase) {
    if (release.startsWith('pre')) {
      if (!identifier && identifierBase === false) {
        throw new Error('invalid increment argument: identifier is empty')
      }
      // Avoid an invalid semver results
      if (identifier) {
        const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE])
        if (!match || match[1] !== identifier) {
          throw new Error(`invalid identifier: ${identifier}`)
        }
      }
    }

    switch (release) {
      case 'premajor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor = 0
        this.major++
        this.inc('pre', identifier, identifierBase)
        break
      case 'preminor':
        this.prerelease.length = 0
        this.patch = 0
        this.minor++
        this.inc('pre', identifier, identifierBase)
        break
      case 'prepatch':
        // If this is already a prerelease, it will bump to the next version
        // drop any prereleases that might already exist, since they are not
        // relevant at this point.
        this.prerelease.length = 0
        this.inc('patch', identifier, identifierBase)
        this.inc('pre', identifier, identifierBase)
        break
      // If the input is a non-prerelease version, this acts the same as
      // prepatch.
      case 'prerelease':
        if (this.prerelease.length === 0) {
          this.inc('patch', identifier, identifierBase)
        }
        this.inc('pre', identifier, identifierBase)
        break
      case 'release':
        if (this.prerelease.length === 0) {
          throw new Error(`version ${this.raw} is not a prerelease`)
        }
        this.prerelease.length = 0
        break

      case 'major':
        // If this is a pre-major version, bump up to the same major version.
        // Otherwise increment major.
        // 1.0.0-5 bumps to 1.0.0
        // 1.1.0 bumps to 2.0.0
        if (
          this.minor !== 0 ||
          this.patch !== 0 ||
          this.prerelease.length === 0
        ) {
          this.major++
        }
        this.minor = 0
        this.patch = 0
        this.prerelease = []
        break
      case 'minor':
        // If this is a pre-minor version, bump up to the same minor version.
        // Otherwise increment minor.
        // 1.2.0-5 bumps to 1.2.0
        // 1.2.1 bumps to 1.3.0
        if (this.patch !== 0 || this.prerelease.length === 0) {
          this.minor++
        }
        this.patch = 0
        this.prerelease = []
        break
      case 'patch':
        // If this is not a pre-release version, it will increment the patch.
        // If it is a pre-release it will bump up to the same patch version.
        // 1.2.0-5 patches to 1.2.0
        // 1.2.0 patches to 1.2.1
        if (this.prerelease.length === 0) {
          this.patch++
        }
        this.prerelease = []
        break
      // This probably shouldn't be used publicly.
      // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
      case 'pre': {
        const base = Number(identifierBase) ? 1 : 0

        if (this.prerelease.length === 0) {
          this.prerelease = [base]
        } else {
          let i = this.prerelease.length
          while (--i >= 0) {
            if (typeof this.prerelease[i] === 'number') {
              this.prerelease[i]++
              i = -2
            }
          }
          if (i === -1) {
            // didn't increment anything
            if (identifier === this.prerelease.join('.') && identifierBase === false) {
              throw new Error('invalid increment argument: identifier already exists')
            }
            this.prerelease.push(base)
          }
        }
        if (identifier) {
          // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
          // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
          let prerelease = [identifier, base]
          if (identifierBase === false) {
            prerelease = [identifier]
          }
          if (isPrereleaseIdentifier(this.prerelease, identifier)) {
            const prereleaseBase = this.prerelease[identifier.split('.').length]
            if (isNaN(prereleaseBase)) {
              this.prerelease = prerelease
            }
          } else {
            this.prerelease = prerelease
          }
        }
        break
      }
      default:
        throw new Error(`invalid increment argument: ${release}`)
    }
    this.raw = this.format()
    if (this.build.length) {
      this.raw += `+${this.build.join('.')}`
    }
    return this
  }
}

module.exports = SemVer


/***/ }),

/***/ 1799:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const parse = __nccwpck_require__(6353)
const clean = (version, options) => {
  const s = parse(version.trim().replace(/^[=v]+/, ''), options)
  return s ? s.version : null
}
module.exports = clean


/***/ }),

/***/ 8646:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const eq = __nccwpck_require__(5082)
const neq = __nccwpck_require__(4974)
const gt = __nccwpck_require__(6599)
const gte = __nccwpck_require__(1236)
const lt = __nccwpck_require__(3872)
const lte = __nccwpck_require__(6717)

const cmp = (a, op, b, loose) => {
  switch (op) {
    case '===':
      if (typeof a === 'object') {
        a = a.version
      }
      if (typeof b === 'object') {
        b = b.version
      }
      return a === b

    case '!==':
      if (typeof a === 'object') {
        a = a.version
      }
      if (typeof b === 'object') {
        b = b.version
      }
      return a !== b

    case '':
    case '=':
    case '==':
      return eq(a, b, loose)

    case '!=':
      return neq(a, b, loose)

    case '>':
      return gt(a, b, loose)

    case '>=':
      return gte(a, b, loose)

    case '<':
      return lt(a, b, loose)

    case '<=':
      return lte(a, b, loose)

    default:
      throw new TypeError(`Invalid operator: ${op}`)
  }
}
module.exports = cmp


/***/ }),

/***/ 5385:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const parse = __nccwpck_require__(6353)
const { safeRe: re, t } = __nccwpck_require__(5471)

const coerce = (version, options) => {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version === 'number') {
    version = String(version)
  }

  if (typeof version !== 'string') {
    return null
  }

  options = options || {}

  let match = null
  if (!options.rtl) {
    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE])
  } else {
    // Find the right-most coercible string that does not share
    // a terminus with a more left-ward coercible string.
    // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
    // With includePrerelease option set, '1.2.3.4-rc' wants to coerce '2.3.4-rc', not '2.3.4'
    //
    // Walk through the string checking with a /g regexp
    // Manually set the index so as to pick up overlapping matches.
    // Stop when we get a match that ends at the string end, since no
    // coercible string can be more right-ward without the same terminus.
    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL]
    let next
    while ((next = coerceRtlRegex.exec(version)) &&
        (!match || match.index + match[0].length !== version.length)
    ) {
      if (!match ||
            next.index + next[0].length !== match.index + match[0].length) {
        match = next
      }
      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length
    }
    // leave it in a clean state
    coerceRtlRegex.lastIndex = -1
  }

  if (match === null) {
    return null
  }

  const major = match[2]
  const minor = match[3] || '0'
  const patch = match[4] || '0'
  const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : ''
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : ''

  return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options)
}
module.exports = coerce


/***/ }),

/***/ 7648:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const compareBuild = (a, b, loose) => {
  const versionA = new SemVer(a, loose)
  const versionB = new SemVer(b, loose)
  return versionA.compare(versionB) || versionA.compareBuild(versionB)
}
module.exports = compareBuild


/***/ }),

/***/ 6874:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const compareLoose = (a, b) => compare(a, b, true)
module.exports = compareLoose


/***/ }),

/***/ 8469:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const compare = (a, b, loose) =>
  new SemVer(a, loose).compare(new SemVer(b, loose))

module.exports = compare


/***/ }),

/***/ 711:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const parse = __nccwpck_require__(6353)

const diff = (version1, version2) => {
  const v1 = parse(version1, null, true)
  const v2 = parse(version2, null, true)
  const comparison = v1.compare(v2)

  if (comparison === 0) {
    return null
  }

  const v1Higher = comparison > 0
  const highVersion = v1Higher ? v1 : v2
  const lowVersion = v1Higher ? v2 : v1
  const highHasPre = !!highVersion.prerelease.length
  const lowHasPre = !!lowVersion.prerelease.length

  if (lowHasPre && !highHasPre) {
    // Going from prerelease -> no prerelease requires some special casing

    // If the low version has only a major, then it will always be a major
    // Some examples:
    // 1.0.0-1 -> 1.0.0
    // 1.0.0-1 -> 1.1.1
    // 1.0.0-1 -> 2.0.0
    if (!lowVersion.patch && !lowVersion.minor) {
      return 'major'
    }

    // If the main part has no difference
    if (lowVersion.compareMain(highVersion) === 0) {
      if (lowVersion.minor && !lowVersion.patch) {
        return 'minor'
      }
      return 'patch'
    }
  }

  // add the `pre` prefix if we are going to a prerelease version
  const prefix = highHasPre ? 'pre' : ''

  if (v1.major !== v2.major) {
    return prefix + 'major'
  }

  if (v1.minor !== v2.minor) {
    return prefix + 'minor'
  }

  if (v1.patch !== v2.patch) {
    return prefix + 'patch'
  }

  // high and low are prereleases
  return 'prerelease'
}

module.exports = diff


/***/ }),

/***/ 5082:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const eq = (a, b, loose) => compare(a, b, loose) === 0
module.exports = eq


/***/ }),

/***/ 6599:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const gt = (a, b, loose) => compare(a, b, loose) > 0
module.exports = gt


/***/ }),

/***/ 1236:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const gte = (a, b, loose) => compare(a, b, loose) >= 0
module.exports = gte


/***/ }),

/***/ 2338:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)

const inc = (version, release, options, identifier, identifierBase) => {
  if (typeof (options) === 'string') {
    identifierBase = identifier
    identifier = options
    options = undefined
  }

  try {
    return new SemVer(
      version instanceof SemVer ? version.version : version,
      options
    ).inc(release, identifier, identifierBase).version
  } catch (er) {
    return null
  }
}
module.exports = inc


/***/ }),

/***/ 3872:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const lt = (a, b, loose) => compare(a, b, loose) < 0
module.exports = lt


/***/ }),

/***/ 6717:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const lte = (a, b, loose) => compare(a, b, loose) <= 0
module.exports = lte


/***/ }),

/***/ 8511:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const major = (a, loose) => new SemVer(a, loose).major
module.exports = major


/***/ }),

/***/ 2603:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const minor = (a, loose) => new SemVer(a, loose).minor
module.exports = minor


/***/ }),

/***/ 4974:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const neq = (a, b, loose) => compare(a, b, loose) !== 0
module.exports = neq


/***/ }),

/***/ 6353:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const parse = (version, options, throwErrors = false) => {
  if (version instanceof SemVer) {
    return version
  }
  try {
    return new SemVer(version, options)
  } catch (er) {
    if (!throwErrors) {
      return null
    }
    throw er
  }
}

module.exports = parse


/***/ }),

/***/ 8756:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const patch = (a, loose) => new SemVer(a, loose).patch
module.exports = patch


/***/ }),

/***/ 5714:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const parse = __nccwpck_require__(6353)
const prerelease = (version, options) => {
  const parsed = parse(version, options)
  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
}
module.exports = prerelease


/***/ }),

/***/ 2173:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compare = __nccwpck_require__(8469)
const rcompare = (a, b, loose) => compare(b, a, loose)
module.exports = rcompare


/***/ }),

/***/ 7192:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compareBuild = __nccwpck_require__(7648)
const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose))
module.exports = rsort


/***/ }),

/***/ 8011:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const Range = __nccwpck_require__(6782)
const satisfies = (version, range, options) => {
  try {
    range = new Range(range, options)
  } catch (er) {
    return false
  }
  return range.test(version)
}
module.exports = satisfies


/***/ }),

/***/ 9872:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const compareBuild = __nccwpck_require__(7648)
const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose))
module.exports = sort


/***/ }),

/***/ 6114:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const parse = __nccwpck_require__(6353)
const constants = __nccwpck_require__(5101)
const SemVer = __nccwpck_require__(7163)

const truncate = (version, truncation, options) => {
  if (!constants.RELEASE_TYPES.includes(truncation)) {
    return null
  }

  const clonedVersion = cloneInputVersion(version, options)
  return clonedVersion && doTruncation(clonedVersion, truncation)
}

const cloneInputVersion = (version, options) => {
  const versionStringToParse = (
    version instanceof SemVer ? version.version : version
  )

  return parse(versionStringToParse, options)
}

const doTruncation = (version, truncation) => {
  if (isPrerelease(truncation)) {
    return version.version
  }

  version.prerelease = []

  switch (truncation) {
    case 'major':
      version.minor = 0
      version.patch = 0
      break
    case 'minor':
      version.patch = 0
      break
  }

  return version.format()
}

const isPrerelease = (type) => {
  return type.startsWith('pre')
}

module.exports = truncate


/***/ }),

/***/ 8780:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const parse = __nccwpck_require__(6353)
const valid = (version, options) => {
  const v = parse(version, options)
  return v ? v.version : null
}
module.exports = valid


/***/ }),

/***/ 2088:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



// just pre-load all the stuff that index.js lazily exports
const internalRe = __nccwpck_require__(5471)
const constants = __nccwpck_require__(5101)
const SemVer = __nccwpck_require__(7163)
const identifiers = __nccwpck_require__(3348)
const parse = __nccwpck_require__(6353)
const valid = __nccwpck_require__(8780)
const clean = __nccwpck_require__(1799)
const inc = __nccwpck_require__(2338)
const diff = __nccwpck_require__(711)
const major = __nccwpck_require__(8511)
const minor = __nccwpck_require__(2603)
const patch = __nccwpck_require__(8756)
const prerelease = __nccwpck_require__(5714)
const compare = __nccwpck_require__(8469)
const rcompare = __nccwpck_require__(2173)
const compareLoose = __nccwpck_require__(6874)
const compareBuild = __nccwpck_require__(7648)
const sort = __nccwpck_require__(9872)
const rsort = __nccwpck_require__(7192)
const gt = __nccwpck_require__(6599)
const lt = __nccwpck_require__(3872)
const eq = __nccwpck_require__(5082)
const neq = __nccwpck_require__(4974)
const gte = __nccwpck_require__(1236)
const lte = __nccwpck_require__(6717)
const cmp = __nccwpck_require__(8646)
const coerce = __nccwpck_require__(5385)
const truncate = __nccwpck_require__(6114)
const Comparator = __nccwpck_require__(9379)
const Range = __nccwpck_require__(6782)
const satisfies = __nccwpck_require__(8011)
const toComparators = __nccwpck_require__(4750)
const maxSatisfying = __nccwpck_require__(3193)
const minSatisfying = __nccwpck_require__(8595)
const minVersion = __nccwpck_require__(1866)
const validRange = __nccwpck_require__(4737)
const outside = __nccwpck_require__(280)
const gtr = __nccwpck_require__(2276)
const ltr = __nccwpck_require__(5213)
const intersects = __nccwpck_require__(3465)
const simplifyRange = __nccwpck_require__(2028)
const subset = __nccwpck_require__(1489)
module.exports = {
  parse,
  valid,
  clean,
  inc,
  diff,
  major,
  minor,
  patch,
  prerelease,
  compare,
  rcompare,
  compareLoose,
  compareBuild,
  sort,
  rsort,
  gt,
  lt,
  eq,
  neq,
  gte,
  lte,
  cmp,
  coerce,
  truncate,
  Comparator,
  Range,
  satisfies,
  toComparators,
  maxSatisfying,
  minSatisfying,
  minVersion,
  validRange,
  outside,
  gtr,
  ltr,
  intersects,
  simplifyRange,
  subset,
  SemVer,
  re: internalRe.re,
  src: internalRe.src,
  tokens: internalRe.t,
  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: constants.RELEASE_TYPES,
  compareIdentifiers: identifiers.compareIdentifiers,
  rcompareIdentifiers: identifiers.rcompareIdentifiers,
}


/***/ }),

/***/ 5101:
/***/ ((module) => {



// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
const SEMVER_SPEC_VERSION = '2.0.0'

const MAX_LENGTH = 256
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
/* istanbul ignore next */ 9007199254740991

// Max safe segment length for coercion.
const MAX_SAFE_COMPONENT_LENGTH = 16

// Max safe length for a build identifier. The max length minus 6 characters for
// the shortest version with a build 0.0.0+BUILD.
const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6

const RELEASE_TYPES = [
  'major',
  'premajor',
  'minor',
  'preminor',
  'patch',
  'prepatch',
  'prerelease',
]

module.exports = {
  MAX_LENGTH,
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_SAFE_INTEGER,
  RELEASE_TYPES,
  SEMVER_SPEC_VERSION,
  FLAG_INCLUDE_PRERELEASE: 0b001,
  FLAG_LOOSE: 0b010,
}


/***/ }),

/***/ 1159:
/***/ ((module) => {



const debug = (
  typeof process === 'object' &&
  process.env &&
  process.env.NODE_DEBUG &&
  /\bsemver\b/i.test(process.env.NODE_DEBUG)
) ? (...args) => console.error('SEMVER', ...args)
  : () => {}

module.exports = debug


/***/ }),

/***/ 3348:
/***/ ((module) => {



const numeric = /^[0-9]+$/
const compareIdentifiers = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a < b ? -1 : 1
  }

  const anum = numeric.test(a)
  const bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  return a === b ? 0
    : (anum && !bnum) ? -1
    : (bnum && !anum) ? 1
    : a < b ? -1
    : 1
}

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  rcompareIdentifiers,
}


/***/ }),

/***/ 1383:
/***/ ((module) => {



class LRUCache {
  constructor () {
    this.max = 1000
    this.map = new Map()
  }

  get (key) {
    const value = this.map.get(key)
    if (value === undefined) {
      return undefined
    } else {
      // Remove the key from the map and add it to the end
      this.map.delete(key)
      this.map.set(key, value)
      return value
    }
  }

  delete (key) {
    return this.map.delete(key)
  }

  set (key, value) {
    const deleted = this.delete(key)

    if (!deleted && value !== undefined) {
      // If cache is full, delete the least recently used item
      if (this.map.size >= this.max) {
        const firstKey = this.map.keys().next().value
        this.delete(firstKey)
      }

      this.map.set(key, value)
    }

    return this
  }
}

module.exports = LRUCache


/***/ }),

/***/ 356:
/***/ ((module) => {



// parse out just the options we care about
const looseOption = Object.freeze({ loose: true })
const emptyOpts = Object.freeze({ })
const parseOptions = options => {
  if (!options) {
    return emptyOpts
  }

  if (typeof options !== 'object') {
    return looseOption
  }

  return options
}
module.exports = parseOptions


/***/ }),

/***/ 5471:
/***/ ((module, exports, __nccwpck_require__) => {



const {
  MAX_SAFE_COMPONENT_LENGTH,
  MAX_SAFE_BUILD_LENGTH,
  MAX_LENGTH,
} = __nccwpck_require__(5101)
const debug = __nccwpck_require__(1159)
exports = module.exports = {}

// The actual regexps go on exports.re
const re = exports.re = []
const safeRe = exports.safeRe = []
const src = exports.src = []
const safeSrc = exports.safeSrc = []
const t = exports.t = {}
let R = 0

const LETTERDASHNUMBER = '[a-zA-Z0-9-]'

// Replace some greedy regex tokens to prevent regex dos issues. These regex are
// used internally via the safeRe object since all inputs in this library get
// normalized first to trim and collapse all extra whitespace. The original
// regexes are exported for userland consumption and lower level usage. A
// future breaking change could export the safer regex only with a note that
// all input should have extra whitespace removed.
const safeRegexReplacements = [
  ['\\s', 1],
  ['\\d', MAX_LENGTH],
  [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
]

const makeSafeRegex = (value) => {
  for (const [token, max] of safeRegexReplacements) {
    value = value
      .split(`${token}*`).join(`${token}{0,${max}}`)
      .split(`${token}+`).join(`${token}{1,${max}}`)
  }
  return value
}

const createToken = (name, value, isGlobal) => {
  const safe = makeSafeRegex(value)
  const index = R++
  debug(name, index, value)
  t[name] = index
  src[index] = value
  safeSrc[index] = safe
  re[index] = new RegExp(value, isGlobal ? 'g' : undefined)
  safeRe[index] = new RegExp(safe, isGlobal ? 'g' : undefined)
}

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*')
createToken('NUMERICIDENTIFIERLOOSE', '\\d+')

// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

createToken('NONNUMERICIDENTIFIER', `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`)

// ## Main Version
// Three dot-separated numeric identifiers.

createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` +
                   `(${src[t.NUMERICIDENTIFIER]})\\.` +
                   `(${src[t.NUMERICIDENTIFIER]})`)

createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
                        `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
                        `(${src[t.NUMERICIDENTIFIERLOOSE]})`)

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.
// Non-numeric identifiers include numeric identifiers but can be longer.
// Therefore non-numeric identifiers must go first.

createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NONNUMERICIDENTIFIER]
}|${src[t.NUMERICIDENTIFIER]})`)

createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NONNUMERICIDENTIFIER]
}|${src[t.NUMERICIDENTIFIERLOOSE]})`)

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]
}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`)

createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]
}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`)

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

createToken('BUILDIDENTIFIER', `${LETTERDASHNUMBER}+`)

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]
}(?:\\.${src[t.BUILDIDENTIFIER]})*))`)

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

createToken('FULLPLAIN', `v?${src[t.MAINVERSION]
}${src[t.PRERELEASE]}?${
  src[t.BUILD]}?`)

createToken('FULL', `^${src[t.FULLPLAIN]}$`)

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]
}${src[t.PRERELEASELOOSE]}?${
  src[t.BUILD]}?`)

createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`)

createToken('GTLT', '((?:<|>)?=?)')

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifier, meaning "any version"
// Only the first item is strictly required.
createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`)
createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`)

createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
                   `(?:${src[t.PRERELEASE]})?${
                     src[t.BUILD]}?` +
                   `)?)?`)

createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
                        `(?:${src[t.PRERELEASELOOSE]})?${
                          src[t.BUILD]}?` +
                        `)?)?`)

createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`)
createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`)

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
createToken('COERCEPLAIN', `${'(^|[^\\d])' +
              '(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})` +
              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`)
createToken('COERCE', `${src[t.COERCEPLAIN]}(?:$|[^\\d])`)
createToken('COERCEFULL', src[t.COERCEPLAIN] +
              `(?:${src[t.PRERELEASE]})?` +
              `(?:${src[t.BUILD]})?` +
              `(?:$|[^\\d])`)
createToken('COERCERTL', src[t.COERCE], true)
createToken('COERCERTLFULL', src[t.COERCEFULL], true)

// Tilde ranges.
// Meaning is "reasonably at or greater than"
createToken('LONETILDE', '(?:~>?)')

createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true)
exports.tildeTrimReplace = '$1~'

createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`)
createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`)

// Caret ranges.
// Meaning is "at least and backwards compatible with"
createToken('LONECARET', '(?:\\^)')

createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true)
exports.caretTrimReplace = '$1^'

createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`)
createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`)

// A simple gt/lt/eq thing, or just "" to indicate "any version"
createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`)
createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`)

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]
}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true)
exports.comparatorTrimReplace = '$1$2$3'

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` +
                   `\\s+-\\s+` +
                   `(${src[t.XRANGEPLAIN]})` +
                   `\\s*$`)

createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` +
                        `\\s+-\\s+` +
                        `(${src[t.XRANGEPLAINLOOSE]})` +
                        `\\s*$`)

// Star ranges basically just allow anything at all.
createToken('STAR', '(<|>)?=?\\s*\\*')
// >=0.0.0 is like a star
createToken('GTE0', '^\\s*>=\\s*0\\.0\\.0\\s*$')
createToken('GTE0PRE', '^\\s*>=\\s*0\\.0\\.0-0\\s*$')


/***/ }),

/***/ 2276:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



// Determine if version is greater than all the versions possible in the range.
const outside = __nccwpck_require__(280)
const gtr = (version, range, options) => outside(version, range, '>', options)
module.exports = gtr


/***/ }),

/***/ 3465:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const Range = __nccwpck_require__(6782)
const intersects = (r1, r2, options) => {
  r1 = new Range(r1, options)
  r2 = new Range(r2, options)
  return r1.intersects(r2, options)
}
module.exports = intersects


/***/ }),

/***/ 5213:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const outside = __nccwpck_require__(280)
// Determine if version is less than all the versions possible in the range
const ltr = (version, range, options) => outside(version, range, '<', options)
module.exports = ltr


/***/ }),

/***/ 3193:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const Range = __nccwpck_require__(6782)

const maxSatisfying = (versions, range, options) => {
  let max = null
  let maxSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!max || maxSV.compare(v) === -1) {
        // compare(max, v, true)
        max = v
        maxSV = new SemVer(max, options)
      }
    }
  })
  return max
}
module.exports = maxSatisfying


/***/ }),

/***/ 8595:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const Range = __nccwpck_require__(6782)
const minSatisfying = (versions, range, options) => {
  let min = null
  let minSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!min || minSV.compare(v) === 1) {
        // compare(min, v, true)
        min = v
        minSV = new SemVer(min, options)
      }
    }
  })
  return min
}
module.exports = minSatisfying


/***/ }),

/***/ 1866:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const Range = __nccwpck_require__(6782)
const gt = __nccwpck_require__(6599)

const minVersion = (range, loose) => {
  range = new Range(range, loose)

  let minver = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    let setMin = null
    comparators.forEach((comparator) => {
      // Clone to avoid manipulating the comparator's semver object.
      const compver = new SemVer(comparator.semver.version)
      switch (comparator.operator) {
        case '>':
          if (compver.prerelease.length === 0) {
            compver.patch++
          } else {
            compver.prerelease.push(0)
          }
          compver.raw = compver.format()
          /* fallthrough */
        case '':
        case '>=':
          if (!setMin || gt(compver, setMin)) {
            setMin = compver
          }
          break
        case '<':
        case '<=':
          /* Ignore maximum versions */
          break
        /* istanbul ignore next */
        default:
          throw new Error(`Unexpected operation: ${comparator.operator}`)
      }
    })
    if (setMin && (!minver || gt(minver, setMin))) {
      minver = setMin
    }
  }

  if (minver && range.test(minver)) {
    return minver
  }

  return null
}
module.exports = minVersion


/***/ }),

/***/ 280:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const SemVer = __nccwpck_require__(7163)
const Comparator = __nccwpck_require__(9379)
const { ANY } = Comparator
const Range = __nccwpck_require__(6782)
const satisfies = __nccwpck_require__(8011)
const gt = __nccwpck_require__(6599)
const lt = __nccwpck_require__(3872)
const lte = __nccwpck_require__(6717)
const gte = __nccwpck_require__(1236)

const outside = (version, range, hilo, options) => {
  version = new SemVer(version, options)
  range = new Range(range, options)

  let gtfn, ltefn, ltfn, comp, ecomp
  switch (hilo) {
    case '>':
      gtfn = gt
      ltefn = lte
      ltfn = lt
      comp = '>'
      ecomp = '>='
      break
    case '<':
      gtfn = lt
      ltefn = gte
      ltfn = gt
      comp = '<'
      ecomp = '<='
      break
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisfies the range it is not outside
  if (satisfies(version, range, options)) {
    return false
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    let high = null
    let low = null

    comparators.forEach((comparator) => {
      if (comparator.semver === ANY) {
        comparator = new Comparator('>=0.0.0')
      }
      high = high || comparator
      low = low || comparator
      if (gtfn(comparator.semver, high.semver, options)) {
        high = comparator
      } else if (ltfn(comparator.semver, low.semver, options)) {
        low = comparator
      }
    })

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false
    }
  }
  return true
}

module.exports = outside


/***/ }),

/***/ 2028:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



// given a set of versions and a range, create a "simplified" range
// that includes the same versions that the original range does
// If the original range is shorter than the simplified one, return that.
const satisfies = __nccwpck_require__(8011)
const compare = __nccwpck_require__(8469)
module.exports = (versions, range, options) => {
  const set = []
  let first = null
  let prev = null
  const v = versions.sort((a, b) => compare(a, b, options))
  for (const version of v) {
    const included = satisfies(version, range, options)
    if (included) {
      prev = version
      if (!first) {
        first = version
      }
    } else {
      if (prev) {
        set.push([first, prev])
      }
      prev = null
      first = null
    }
  }
  if (first) {
    set.push([first, null])
  }

  const ranges = []
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min)
    } else if (!max && min === v[0]) {
      ranges.push('*')
    } else if (!max) {
      ranges.push(`>=${min}`)
    } else if (min === v[0]) {
      ranges.push(`<=${max}`)
    } else {
      ranges.push(`${min} - ${max}`)
    }
  }
  const simplified = ranges.join(' || ')
  const original = typeof range.raw === 'string' ? range.raw : String(range)
  return simplified.length < original.length ? simplified : range
}


/***/ }),

/***/ 1489:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const Range = __nccwpck_require__(6782)
const Comparator = __nccwpck_require__(9379)
const { ANY } = Comparator
const satisfies = __nccwpck_require__(8011)
const compare = __nccwpck_require__(8469)

// Complex range `r1 || r2 || ...` is a subset of `R1 || R2 || ...` iff:
// - Every simple range `r1, r2, ...` is a null set, OR
// - Every simple range `r1, r2, ...` which is not a null set is a subset of
//   some `R1, R2, ...`
//
// Simple range `c1 c2 ...` is a subset of simple range `C1 C2 ...` iff:
// - If c is only the ANY comparator
//   - If C is only the ANY comparator, return true
//   - Else if in prerelease mode, return false
//   - else replace c with `[>=0.0.0]`
// - If C is only the ANY comparator
//   - if in prerelease mode, return true
//   - else replace C with `[>=0.0.0]`
// - Let EQ be the set of = comparators in c
// - If EQ is more than one, return true (null set)
// - Let GT be the highest > or >= comparator in c
// - Let LT be the lowest < or <= comparator in c
// - If GT and LT, and GT.semver > LT.semver, return true (null set)
// - If any C is a = range, and GT or LT are set, return false
// - If EQ
//   - If GT, and EQ does not satisfy GT, return true (null set)
//   - If LT, and EQ does not satisfy LT, return true (null set)
//   - If EQ satisfies every C, return true
//   - Else return false
// - If GT
//   - If GT.semver is lower than any > or >= comp in C, return false
//   - If GT is >=, and GT.semver does not satisfy every C, return false
//   - If GT.semver has a prerelease, and not in prerelease mode
//     - If no C has a prerelease and the GT.semver tuple, return false
// - If LT
//   - If LT.semver is greater than any < or <= comp in C, return false
//   - If LT is <=, and LT.semver does not satisfy every C, return false
//   - If LT.semver has a prerelease, and not in prerelease mode
//     - If no C has a prerelease and the LT.semver tuple, return false
// - Else return true

const subset = (sub, dom, options = {}) => {
  if (sub === dom) {
    return true
  }

  sub = new Range(sub, options)
  dom = new Range(dom, options)
  let sawNonNull = false

  OUTER: for (const simpleSub of sub.set) {
    for (const simpleDom of dom.set) {
      const isSub = simpleSubset(simpleSub, simpleDom, options)
      sawNonNull = sawNonNull || isSub !== null
      if (isSub) {
        continue OUTER
      }
    }
    // the null set is a subset of everything, but null simple ranges in
    // a complex range should be ignored.  so if we saw a non-null range,
    // then we know this isn't a subset, but if EVERY simple range was null,
    // then it is a subset.
    if (sawNonNull) {
      return false
    }
  }
  return true
}

const minimumVersionWithPreRelease = [new Comparator('>=0.0.0-0')]
const minimumVersion = [new Comparator('>=0.0.0')]

const simpleSubset = (sub, dom, options) => {
  if (sub === dom) {
    return true
  }

  if (sub.length === 1 && sub[0].semver === ANY) {
    if (dom.length === 1 && dom[0].semver === ANY) {
      return true
    } else if (options.includePrerelease) {
      sub = minimumVersionWithPreRelease
    } else {
      sub = minimumVersion
    }
  }

  if (dom.length === 1 && dom[0].semver === ANY) {
    if (options.includePrerelease) {
      return true
    } else {
      dom = minimumVersion
    }
  }

  const eqSet = new Set()
  let gt, lt
  for (const c of sub) {
    if (c.operator === '>' || c.operator === '>=') {
      gt = higherGT(gt, c, options)
    } else if (c.operator === '<' || c.operator === '<=') {
      lt = lowerLT(lt, c, options)
    } else {
      eqSet.add(c.semver)
    }
  }

  if (eqSet.size > 1) {
    return null
  }

  let gtltComp
  if (gt && lt) {
    gtltComp = compare(gt.semver, lt.semver, options)
    if (gtltComp > 0) {
      return null
    } else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<=')) {
      return null
    }
  }

  // will iterate one or zero times
  for (const eq of eqSet) {
    if (gt && !satisfies(eq, String(gt), options)) {
      return null
    }

    if (lt && !satisfies(eq, String(lt), options)) {
      return null
    }

    for (const c of dom) {
      if (!satisfies(eq, String(c), options)) {
        return false
      }
    }

    return true
  }

  let higher, lower
  let hasDomLT, hasDomGT
  // if the subset has a prerelease, we need a comparator in the superset
  // with the same tuple and a prerelease, or it's not a subset
  let needDomLTPre = lt &&
    !options.includePrerelease &&
    lt.semver.prerelease.length ? lt.semver : false
  let needDomGTPre = gt &&
    !options.includePrerelease &&
    gt.semver.prerelease.length ? gt.semver : false
  // exception: <1.2.3-0 is the same as <1.2.3
  if (needDomLTPre && needDomLTPre.prerelease.length === 1 &&
      lt.operator === '<' && needDomLTPre.prerelease[0] === 0) {
    needDomLTPre = false
  }

  for (const c of dom) {
    hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>='
    hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<='
    if (gt) {
      if (needDomGTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length &&
            c.semver.major === needDomGTPre.major &&
            c.semver.minor === needDomGTPre.minor &&
            c.semver.patch === needDomGTPre.patch) {
          needDomGTPre = false
        }
      }
      if (c.operator === '>' || c.operator === '>=') {
        higher = higherGT(gt, c, options)
        if (higher === c && higher !== gt) {
          return false
        }
      } else if (gt.operator === '>=' && !c.test(gt.semver)) {
        return false
      }
    }
    if (lt) {
      if (needDomLTPre) {
        if (c.semver.prerelease && c.semver.prerelease.length &&
            c.semver.major === needDomLTPre.major &&
            c.semver.minor === needDomLTPre.minor &&
            c.semver.patch === needDomLTPre.patch) {
          needDomLTPre = false
        }
      }
      if (c.operator === '<' || c.operator === '<=') {
        lower = lowerLT(lt, c, options)
        if (lower === c && lower !== lt) {
          return false
        }
      } else if (lt.operator === '<=' && !c.test(lt.semver)) {
        return false
      }
    }
    if (!c.operator && (lt || gt) && gtltComp !== 0) {
      return false
    }
  }

  // if there was a < or >, and nothing in the dom, then must be false
  // UNLESS it was limited by another range in the other direction.
  // Eg, >1.0.0 <1.0.1 is still a subset of <2.0.0
  if (gt && hasDomLT && !lt && gtltComp !== 0) {
    return false
  }

  if (lt && hasDomGT && !gt && gtltComp !== 0) {
    return false
  }

  // we needed a prerelease range in a specific tuple, but didn't get one
  // then this isn't a subset.  eg >=1.2.3-pre is not a subset of >=1.0.0,
  // because it includes prereleases in the 1.2.3 tuple
  if (needDomGTPre || needDomLTPre) {
    return false
  }

  return true
}

// >=1.2.3 is lower than >1.2.3
const higherGT = (a, b, options) => {
  if (!a) {
    return b
  }
  const comp = compare(a.semver, b.semver, options)
  return comp > 0 ? a
    : comp < 0 ? b
    : b.operator === '>' && a.operator === '>=' ? b
    : a
}

// <=1.2.3 is higher than <1.2.3
const lowerLT = (a, b, options) => {
  if (!a) {
    return b
  }
  const comp = compare(a.semver, b.semver, options)
  return comp < 0 ? a
    : comp > 0 ? b
    : b.operator === '<' && a.operator === '<=' ? b
    : a
}

module.exports = subset


/***/ }),

/***/ 4750:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const Range = __nccwpck_require__(6782)

// Mostly just for testing and legacy API reasons
const toComparators = (range, options) =>
  new Range(range, options).set
    .map(comp => comp.map(c => c.value).join(' ').trim().split(' '))

module.exports = toComparators


/***/ }),

/***/ 4737:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {



const Range = __nccwpck_require__(6782)
const validRange = (range, options) => {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, options).range || '*'
  } catch (er) {
    return null
  }
}
module.exports = validRange


/***/ }),

/***/ 181:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("buffer");

/***/ }),

/***/ 932:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("process");

/***/ }),

/***/ 7349:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Scalar = __nccwpck_require__(3301);
var YAMLMap = __nccwpck_require__(4454);
var YAMLSeq = __nccwpck_require__(2223);
var resolveBlockMap = __nccwpck_require__(7103);
var resolveBlockSeq = __nccwpck_require__(334);
var resolveFlowCollection = __nccwpck_require__(3142);

function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === 'block-map'
        ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag)
        : token.type === 'block-seq'
            ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag)
            : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    // If we got a tagName matching the class, or the tag name is '!',
    // then use the tagName from the node class used to create it.
    if (tagName === '!' || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
    }
    if (tagName)
        coll.tag = tagName;
    return coll;
}
function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken
        ? null
        : ctx.directives.tagName(tagToken.source, msg => onError(tagToken, 'TAG_RESOLVE_FAILED', msg));
    if (token.type === 'block-seq') {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken
            ? anchor.offset > tagToken.offset
                ? anchor
                : tagToken
            : (anchor ?? tagToken);
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
            const message = 'Missing newline after block sequence props';
            onError(lastProp, 'MISSING_CHAR', message);
        }
    }
    const expType = token.type === 'block-map'
        ? 'map'
        : token.type === 'block-seq'
            ? 'seq'
            : token.start.source === '{'
                ? 'map'
                : 'seq';
    // shortcut: check if it's a generic YAMLMap or YAMLSeq
    // before jumping into the custom tag logic.
    if (!tagToken ||
        !tagName ||
        tagName === '!' ||
        (tagName === YAMLMap.YAMLMap.tagName && expType === 'map') ||
        (tagName === YAMLSeq.YAMLSeq.tagName && expType === 'seq')) {
        return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find(t => t.tag === tagName && t.collection === expType);
    if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
            ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
            tag = kt;
        }
        else {
            if (kt) {
                onError(tagToken, 'BAD_COLLECTION_TYPE', `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? 'scalar'}`, true);
            }
            else {
                onError(tagToken, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${tagName}`, true);
            }
            return resolveCollection(CN, ctx, token, onError, tagName);
        }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, msg => onError(tagToken, 'TAG_RESOLVE_FAILED', msg), ctx.options) ?? coll;
    const node = identity.isNode(res)
        ? res
        : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
        node.format = tag.format;
    return node;
}

exports.composeCollection = composeCollection;


/***/ }),

/***/ 3683:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Document = __nccwpck_require__(3021);
var composeNode = __nccwpck_require__(5937);
var resolveEnd = __nccwpck_require__(7788);
var resolveProps = __nccwpck_require__(4631);

function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
        indicator: 'doc-start',
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
    });
    if (props.found) {
        doc.directives.docStart = true;
        if (value &&
            (value.type === 'block-map' || value.type === 'block-seq') &&
            !props.hasNewline)
            onError(props.end, 'MISSING_CHAR', 'Block collection cannot start on same line with directives-end marker');
    }
    // @ts-expect-error If Contents is set, let's trust the user
    doc.contents = value
        ? composeNode.composeNode(ctx, value, props, onError)
        : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
        doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
}

exports.composeDoc = composeDoc;


/***/ }),

/***/ 5937:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Alias = __nccwpck_require__(4065);
var identity = __nccwpck_require__(1127);
var composeCollection = __nccwpck_require__(7349);
var composeScalar = __nccwpck_require__(5413);
var resolveEnd = __nccwpck_require__(7788);
var utilEmptyScalarPosition = __nccwpck_require__(2599);

const CN = { composeNode, composeEmptyNode };
function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
        case 'alias':
            node = composeAlias(ctx, token, onError);
            if (anchor || tag)
                onError(token, 'ALIAS_PROPS', 'An alias node must not specify any properties');
            break;
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
        case 'block-scalar':
            node = composeScalar.composeScalar(ctx, token, tag, onError);
            if (anchor)
                node.anchor = anchor.source.substring(1);
            break;
        case 'block-map':
        case 'block-seq':
        case 'flow-collection':
            try {
                node = composeCollection.composeCollection(CN, ctx, token, props, onError);
                if (anchor)
                    node.anchor = anchor.source.substring(1);
            }
            catch (error) {
                // Almost certainly here due to a stack overflow
                const message = error instanceof Error ? error.message : String(error);
                onError(token, 'RESOURCE_EXHAUSTION', message);
            }
            break;
        default: {
            const message = token.type === 'error'
                ? token.message
                : `Unsupported token (type: ${token.type})`;
            onError(token, 'UNEXPECTED_TOKEN', message);
            isSrcToken = false;
        }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === '')
        onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
    if (atKey &&
        ctx.options.stringKeys &&
        (!identity.isScalar(node) ||
            typeof node.value !== 'string' ||
            (node.tag && node.tag !== 'tag:yaml.org,2002:str'))) {
        const msg = 'With stringKeys, all keys must be strings';
        onError(tag ?? token, 'NON_STRING_KEY', msg);
    }
    if (spaceBefore)
        node.spaceBefore = true;
    if (comment) {
        if (token.type === 'scalar' && token.source === '')
            node.comment = comment;
        else
            node.commentBefore = comment;
    }
    // @ts-expect-error Type checking misses meaning of isSrcToken
    if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
    return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
        type: 'scalar',
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ''
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === '')
            onError(anchor, 'BAD_ALIAS', 'Anchor cannot be an empty string');
    }
    if (spaceBefore)
        node.spaceBefore = true;
    if (comment) {
        node.comment = comment;
        node.range[2] = end;
    }
    return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === '')
        onError(offset, 'BAD_ALIAS', 'Alias cannot be an empty string');
    if (alias.source.endsWith(':'))
        onError(offset + source.length - 1, 'BAD_ALIAS', 'Alias ending in : is ambiguous', true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
        alias.comment = re.comment;
    return alias;
}

exports.composeEmptyNode = composeEmptyNode;
exports.composeNode = composeNode;


/***/ }),

/***/ 5413:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Scalar = __nccwpck_require__(3301);
var resolveBlockScalar = __nccwpck_require__(8913);
var resolveFlowScalar = __nccwpck_require__(6842);

function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === 'block-scalar'
        ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError)
        : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken
        ? ctx.directives.tagName(tagToken.source, msg => onError(tagToken, 'TAG_RESOLVE_FAILED', msg))
        : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
    }
    else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === 'scalar')
        tag = findScalarTagByTest(ctx, value, token, onError);
    else
        tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
        const res = tag.resolve(value, msg => onError(tagToken ?? token, 'TAG_RESOLVE_FAILED', msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, 'TAG_RESOLVE_FAILED', msg);
        scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
        scalar.type = type;
    if (tagName)
        scalar.tag = tagName;
    if (tag.format)
        scalar.format = tag.format;
    if (comment)
        scalar.comment = comment;
    return scalar;
}
function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === '!')
        return schema[identity.SCALAR]; // non-specific tag
    const matchWithTest = [];
    for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
            if (tag.default && tag.test)
                matchWithTest.push(tag);
            else
                return tag;
        }
    }
    for (const tag of matchWithTest)
        if (tag.test?.test(value))
            return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
        // Ensure that the known tag is available for stringifying,
        // but does not get used by default.
        schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
        return kt;
    }
    onError(tagToken, 'TAG_RESOLVE_FAILED', `Unresolved tag: ${tagName}`, tagName !== 'tag:yaml.org,2002:str');
    return schema[identity.SCALAR];
}
function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find(tag => (tag.default === true || (atKey && tag.default === 'key')) &&
        tag.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
        const compat = schema.compat.find(tag => tag.default && tag.test?.test(value)) ??
            schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
            const ts = directives.tagString(tag.tag);
            const cs = directives.tagString(compat.tag);
            const msg = `Value may be parsed as either ${ts} or ${cs}`;
            onError(token, 'TAG_RESOLVE_FAILED', msg, true);
        }
    }
    return tag;
}

exports.composeScalar = composeScalar;


/***/ }),

/***/ 9984:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var node_process = __nccwpck_require__(932);
var directives = __nccwpck_require__(1342);
var Document = __nccwpck_require__(3021);
var errors = __nccwpck_require__(1464);
var identity = __nccwpck_require__(1127);
var composeDoc = __nccwpck_require__(3683);
var resolveEnd = __nccwpck_require__(7788);

function getErrorPos(src) {
    if (typeof src === 'number')
        return [src, src + 1];
    if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === 'string' ? source.length : 1)];
}
function parsePrelude(prelude) {
    let comment = '';
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
            case '#':
                comment +=
                    (comment === '' ? '' : afterEmptyLine ? '\n\n' : '\n') +
                        (source.substring(1) || ' ');
                atComment = true;
                afterEmptyLine = false;
                break;
            case '%':
                if (prelude[i + 1]?.[0] !== '#')
                    i += 1;
                atComment = false;
                break;
            default:
                // This may be wrong after doc-end, but in that case it doesn't matter
                if (!atComment)
                    afterEmptyLine = true;
                atComment = false;
        }
    }
    return { comment, afterEmptyLine };
}
/**
 * Compose a stream of CST nodes into a stream of YAML Documents.
 *
 * ```ts
 * import { Composer, Parser } from 'yaml'
 *
 * const src: string = ...
 * const tokens = new Parser().parse(src)
 * const docs = new Composer().compose(tokens)
 * ```
 */
class Composer {
    constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
            const pos = getErrorPos(source);
            if (warning)
                this.warnings.push(new errors.YAMLWarning(pos, code, message));
            else
                this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        this.directives = new directives.Directives({ version: options.version || '1.2' });
        this.options = options;
    }
    decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        //console.log({ dc: doc.comment, prelude, comment })
        if (comment) {
            const dc = doc.contents;
            if (afterDoc) {
                doc.comment = doc.comment ? `${doc.comment}\n${comment}` : comment;
            }
            else if (afterEmptyLine || doc.directives.docStart || !dc) {
                doc.commentBefore = comment;
            }
            else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
                let it = dc.items[0];
                if (identity.isPair(it))
                    it = it.key;
                const cb = it.commentBefore;
                it.commentBefore = cb ? `${comment}\n${cb}` : comment;
            }
            else {
                const cb = dc.commentBefore;
                dc.commentBefore = cb ? `${comment}\n${cb}` : comment;
            }
        }
        if (afterDoc) {
            for (let i = 0; i < this.errors.length; ++i)
                doc.errors.push(this.errors[i]);
            for (let i = 0; i < this.warnings.length; ++i)
                doc.warnings.push(this.warnings[i]);
        }
        else {
            doc.errors = this.errors;
            doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
    }
    /**
     * Current stream status information.
     *
     * Mostly useful at the end of input for an empty stream.
     */
    streamInfo() {
        return {
            comment: parsePrelude(this.prelude).comment,
            directives: this.directives,
            errors: this.errors,
            warnings: this.warnings
        };
    }
    /**
     * Compose tokens into documents.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
            yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
    }
    /** Advance the composer by one CST token. */
    *next(token) {
        if (node_process.env.LOG_STREAM)
            console.dir(token, { depth: null });
        switch (token.type) {
            case 'directive':
                this.directives.add(token.source, (offset, message, warning) => {
                    const pos = getErrorPos(token);
                    pos[0] += offset;
                    this.onError(pos, 'BAD_DIRECTIVE', message, warning);
                });
                this.prelude.push(token.source);
                this.atDirectives = true;
                break;
            case 'document': {
                const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
                if (this.atDirectives && !doc.directives.docStart)
                    this.onError(token, 'MISSING_CHAR', 'Missing directives-end/doc-start indicator line');
                this.decorate(doc, false);
                if (this.doc)
                    yield this.doc;
                this.doc = doc;
                this.atDirectives = false;
                break;
            }
            case 'byte-order-mark':
            case 'space':
                break;
            case 'comment':
            case 'newline':
                this.prelude.push(token.source);
                break;
            case 'error': {
                const msg = token.source
                    ? `${token.message}: ${JSON.stringify(token.source)}`
                    : token.message;
                const error = new errors.YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', msg);
                if (this.atDirectives || !this.doc)
                    this.errors.push(error);
                else
                    this.doc.errors.push(error);
                break;
            }
            case 'doc-end': {
                if (!this.doc) {
                    const msg = 'Unexpected doc-end without preceding document';
                    this.errors.push(new errors.YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', msg));
                    break;
                }
                this.doc.directives.docEnd = true;
                const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
                this.decorate(this.doc, true);
                if (end.comment) {
                    const dc = this.doc.comment;
                    this.doc.comment = dc ? `${dc}\n${end.comment}` : end.comment;
                }
                this.doc.range[2] = end.offset;
                break;
            }
            default:
                this.errors.push(new errors.YAMLParseError(getErrorPos(token), 'UNEXPECTED_TOKEN', `Unsupported token ${token.type}`));
        }
    }
    /**
     * Call at end of input to yield any remaining document.
     *
     * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
     * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
     */
    *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
            this.decorate(this.doc, true);
            yield this.doc;
            this.doc = null;
        }
        else if (forceDoc) {
            const opts = Object.assign({ _directives: this.directives }, this.options);
            const doc = new Document.Document(undefined, opts);
            if (this.atDirectives)
                this.onError(endOffset, 'MISSING_CHAR', 'Missing directives-end indicator line');
            doc.range = [0, endOffset, endOffset];
            this.decorate(doc, false);
            yield doc;
        }
    }
}

exports.Composer = Composer;


/***/ }),

/***/ 7103:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Pair = __nccwpck_require__(7165);
var YAMLMap = __nccwpck_require__(4454);
var resolveProps = __nccwpck_require__(4631);
var utilContainsNewline = __nccwpck_require__(9499);
var utilFlowIndentCheck = __nccwpck_require__(4051);
var utilMapIncludes = __nccwpck_require__(1187);

const startColMsg = 'All mapping items must start at the same column';
function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
        ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        // key properties
        const keyProps = resolveProps.resolveProps(start, {
            indicator: 'explicit-key-ind',
            next: key ?? sep?.[0],
            offset,
            onError,
            parentIndent: bm.indent,
            startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
            if (key) {
                if (key.type === 'block-seq')
                    onError(offset, 'BLOCK_AS_IMPLICIT_KEY', 'A block sequence may not be used as an implicit map key');
                else if ('indent' in key && key.indent !== bm.indent)
                    onError(offset, 'BAD_INDENT', startColMsg);
            }
            if (!keyProps.anchor && !keyProps.tag && !sep) {
                commentEnd = keyProps.end;
                if (keyProps.comment) {
                    if (map.comment)
                        map.comment += '\n' + keyProps.comment;
                    else
                        map.comment = keyProps.comment;
                }
                continue;
            }
            if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
                onError(key ?? start[start.length - 1], 'MULTILINE_IMPLICIT_KEY', 'Implicit keys need to be on a single line');
            }
        }
        else if (keyProps.found?.indent !== bm.indent) {
            onError(offset, 'BAD_INDENT', startColMsg);
        }
        // key value
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key
            ? composeNode(ctx, key, keyProps, onError)
            : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
        // value properties
        const valueProps = resolveProps.resolveProps(sep ?? [], {
            indicator: 'map-value-ind',
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: bm.indent,
            startOnNewline: !key || key.type === 'block-scalar'
        });
        offset = valueProps.end;
        if (valueProps.found) {
            if (implicitKey) {
                if (value?.type === 'block-map' && !valueProps.hasNewline)
                    onError(offset, 'BLOCK_AS_IMPLICIT_KEY', 'Nested mappings are not allowed in compact mappings');
                if (ctx.options.strict &&
                    keyProps.start < valueProps.found.offset - 1024)
                    onError(keyNode.range, 'KEY_OVER_1024_CHARS', 'The : indicator must be at most 1024 chars after the start of an implicit block mapping key');
            }
            // value value
            const valueNode = value
                ? composeNode(ctx, value, valueProps, onError)
                : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
            if (ctx.schema.compat)
                utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
            offset = valueNode.range[2];
            const pair = new Pair.Pair(keyNode, valueNode);
            if (ctx.options.keepSourceTokens)
                pair.srcToken = collItem;
            map.items.push(pair);
        }
        else {
            // key with no value
            if (implicitKey)
                onError(keyNode.range, 'MISSING_CHAR', 'Implicit map keys need to be followed by map values');
            if (valueProps.comment) {
                if (keyNode.comment)
                    keyNode.comment += '\n' + valueProps.comment;
                else
                    keyNode.comment = valueProps.comment;
            }
            const pair = new Pair.Pair(keyNode);
            if (ctx.options.keepSourceTokens)
                pair.srcToken = collItem;
            map.items.push(pair);
        }
    }
    if (commentEnd && commentEnd < offset)
        onError(commentEnd, 'IMPOSSIBLE', 'Map comment with trailing content');
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
}

exports.resolveBlockMap = resolveBlockMap;


/***/ }),

/***/ 8913:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);

function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
        return { value: '', type: null, comment: '', range: [start, start, start] };
    const type = header.mode === '>' ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    // determine the end of content & start of chomping
    let chompStart = lines.length;
    for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === '' || content === '\r')
            chompStart = i;
        else
            break;
    }
    // shortcut for empty contents
    if (chompStart === 0) {
        const value = header.chomp === '+' && lines.length > 0
            ? '\n'.repeat(Math.max(1, lines.length - 1))
            : '';
        let end = start + header.length;
        if (scalar.source)
            end += scalar.source.length;
        return { value, type, comment: header.comment, range: [start, end, end] };
    }
    // find the indentation level to trim from start
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === '' || content === '\r') {
            if (header.indent === 0 && indent.length > trimIndent)
                trimIndent = indent.length;
        }
        else {
            if (indent.length < trimIndent) {
                const message = 'Block scalars with more-indented leading empty lines must use an explicit indentation indicator';
                onError(offset + indent.length, 'MISSING_CHAR', message);
            }
            if (header.indent === 0)
                trimIndent = indent.length;
            contentStart = i;
            if (trimIndent === 0 && !ctx.atRoot) {
                const message = 'Block scalar values in collections must be indented';
                onError(offset, 'BAD_INDENT', message);
            }
            break;
        }
        offset += indent.length + content.length + 1;
    }
    // include trailing more-indented empty lines in content
    for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
            chompStart = i + 1;
    }
    let value = '';
    let sep = '';
    let prevMoreIndented = false;
    // leading whitespace is kept intact
    for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + '\n';
    for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === '\r';
        if (crlf)
            content = content.slice(0, -1);
        /* istanbul ignore if already caught in lexer */
        if (content && indent.length < trimIndent) {
            const src = header.indent
                ? 'explicit indentation indicator'
                : 'first line';
            const message = `Block scalar lines must not be less indented than their ${src}`;
            onError(offset - content.length - (crlf ? 2 : 1), 'BAD_INDENT', message);
            indent = '';
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
            value += sep + indent.slice(trimIndent) + content;
            sep = '\n';
        }
        else if (indent.length > trimIndent || content[0] === '\t') {
            // more-indented content within a folded block
            if (sep === ' ')
                sep = '\n';
            else if (!prevMoreIndented && sep === '\n')
                sep = '\n\n';
            value += sep + indent.slice(trimIndent) + content;
            sep = '\n';
            prevMoreIndented = true;
        }
        else if (content === '') {
            // empty line
            if (sep === '\n')
                value += '\n';
            else
                sep = '\n';
        }
        else {
            value += sep + content;
            sep = ' ';
            prevMoreIndented = false;
        }
    }
    switch (header.chomp) {
        case '-':
            break;
        case '+':
            for (let i = chompStart; i < lines.length; ++i)
                value += '\n' + lines[i][0].slice(trimIndent);
            if (value[value.length - 1] !== '\n')
                value += '\n';
            break;
        default:
            value += '\n';
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
    /* istanbul ignore if should not happen */
    if (props[0].type !== 'block-scalar-header') {
        onError(props[0], 'IMPOSSIBLE', 'Block scalar header not found');
        return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = '';
    let error = -1;
    for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === '-' || ch === '+'))
            chomp = ch;
        else {
            const n = Number(ch);
            if (!indent && n)
                indent = n;
            else if (error === -1)
                error = offset + i;
        }
    }
    if (error !== -1)
        onError(error, 'UNEXPECTED_TOKEN', `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = '';
    let length = source.length;
    for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
            case 'space':
                hasSpace = true;
            // fallthrough
            case 'newline':
                length += token.source.length;
                break;
            case 'comment':
                if (strict && !hasSpace) {
                    const message = 'Comments must be separated from other tokens by white space characters';
                    onError(token, 'MISSING_CHAR', message);
                }
                length += token.source.length;
                comment = token.source.substring(1);
                break;
            case 'error':
                onError(token, 'UNEXPECTED_TOKEN', token.message);
                length += token.source.length;
                break;
            /* istanbul ignore next should not happen */
            default: {
                const message = `Unexpected token in block scalar header: ${token.type}`;
                onError(token, 'UNEXPECTED_TOKEN', message);
                const ts = token.source;
                if (ts && typeof ts === 'string')
                    length += ts.length;
            }
        }
    }
    return { mode, indent, chomp, comment, length };
}
/** @returns Array of lines split up as `[indent, content]` */
function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1]
        ? [m[1], first.slice(m[1].length)]
        : ['', first];
    const lines = [line0];
    for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
    return lines;
}

exports.resolveBlockScalar = resolveBlockScalar;


/***/ }),

/***/ 334:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var YAMLSeq = __nccwpck_require__(2223);
var resolveProps = __nccwpck_require__(4631);
var utilFlowIndentCheck = __nccwpck_require__(4051);

function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
        ctx.atRoot = false;
    if (ctx.atKey)
        ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
            indicator: 'seq-item-ind',
            next: value,
            offset,
            onError,
            parentIndent: bs.indent,
            startOnNewline: true
        });
        if (!props.found) {
            if (props.anchor || props.tag || value) {
                if (value?.type === 'block-seq')
                    onError(props.end, 'BAD_INDENT', 'All sequence items must start at the same column');
                else
                    onError(offset, 'MISSING_CHAR', 'Sequence item without - indicator');
            }
            else {
                commentEnd = props.end;
                if (props.comment)
                    seq.comment = props.comment;
                continue;
            }
        }
        const node = value
            ? composeNode(ctx, value, props, onError)
            : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
}

exports.resolveBlockSeq = resolveBlockSeq;


/***/ }),

/***/ 7788:
/***/ ((__unused_webpack_module, exports) => {



function resolveEnd(end, offset, reqSpace, onError) {
    let comment = '';
    if (end) {
        let hasSpace = false;
        let sep = '';
        for (const token of end) {
            const { source, type } = token;
            switch (type) {
                case 'space':
                    hasSpace = true;
                    break;
                case 'comment': {
                    if (reqSpace && !hasSpace)
                        onError(token, 'MISSING_CHAR', 'Comments must be separated from other tokens by white space characters');
                    const cb = source.substring(1) || ' ';
                    if (!comment)
                        comment = cb;
                    else
                        comment += sep + cb;
                    sep = '';
                    break;
                }
                case 'newline':
                    if (comment)
                        sep += source;
                    hasSpace = true;
                    break;
                default:
                    onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${type} at node end`);
            }
            offset += source.length;
        }
    }
    return { comment, offset };
}

exports.resolveEnd = resolveEnd;


/***/ }),

/***/ 3142:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Pair = __nccwpck_require__(7165);
var YAMLMap = __nccwpck_require__(4454);
var YAMLSeq = __nccwpck_require__(2223);
var resolveEnd = __nccwpck_require__(7788);
var resolveProps = __nccwpck_require__(4631);
var utilContainsNewline = __nccwpck_require__(9499);
var utilMapIncludes = __nccwpck_require__(1187);

const blockMsg = 'Block collections are not allowed within flow collections';
const isBlock = (token) => token && (token.type === 'block-map' || token.type === 'block-seq');
function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === '{';
    const fcName = isMap ? 'flow map' : 'flow sequence';
    const NodeClass = (tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq));
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
        ctx.atRoot = false;
    if (ctx.atKey)
        ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
            flow: fcName,
            indicator: 'explicit-key-ind',
            next: key ?? sep?.[0],
            offset,
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
        });
        if (!props.found) {
            if (!props.anchor && !props.tag && !sep && !value) {
                if (i === 0 && props.comma)
                    onError(props.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${fcName}`);
                else if (i < fc.items.length - 1)
                    onError(props.start, 'UNEXPECTED_TOKEN', `Unexpected empty item in ${fcName}`);
                if (props.comment) {
                    if (coll.comment)
                        coll.comment += '\n' + props.comment;
                    else
                        coll.comment = props.comment;
                }
                offset = props.end;
                continue;
            }
            if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
                onError(key, // checked by containsNewline()
                'MULTILINE_IMPLICIT_KEY', 'Implicit keys of flow sequence pairs need to be on a single line');
        }
        if (i === 0) {
            if (props.comma)
                onError(props.comma, 'UNEXPECTED_TOKEN', `Unexpected , in ${fcName}`);
        }
        else {
            if (!props.comma)
                onError(props.start, 'MISSING_CHAR', `Missing , between ${fcName} items`);
            if (props.comment) {
                let prevItemComment = '';
                loop: for (const st of start) {
                    switch (st.type) {
                        case 'comma':
                        case 'space':
                            break;
                        case 'comment':
                            prevItemComment = st.source.substring(1);
                            break loop;
                        default:
                            break loop;
                    }
                }
                if (prevItemComment) {
                    let prev = coll.items[coll.items.length - 1];
                    if (identity.isPair(prev))
                        prev = prev.value ?? prev.key;
                    if (prev.comment)
                        prev.comment += '\n' + prevItemComment;
                    else
                        prev.comment = prevItemComment;
                    props.comment = props.comment.substring(prevItemComment.length + 1);
                }
            }
        }
        if (!isMap && !sep && !props.found) {
            // item is a value in a seq
            // → key & sep are empty, start does not include ? or :
            const valueNode = value
                ? composeNode(ctx, value, props, onError)
                : composeEmptyNode(ctx, props.end, sep, null, props, onError);
            coll.items.push(valueNode);
            offset = valueNode.range[2];
            if (isBlock(value))
                onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
        }
        else {
            // item is a key+value pair
            // key value
            ctx.atKey = true;
            const keyStart = props.end;
            const keyNode = key
                ? composeNode(ctx, key, props, onError)
                : composeEmptyNode(ctx, keyStart, start, null, props, onError);
            if (isBlock(key))
                onError(keyNode.range, 'BLOCK_IN_FLOW', blockMsg);
            ctx.atKey = false;
            // value properties
            const valueProps = resolveProps.resolveProps(sep ?? [], {
                flow: fcName,
                indicator: 'map-value-ind',
                next: value,
                offset: keyNode.range[2],
                onError,
                parentIndent: fc.indent,
                startOnNewline: false
            });
            if (valueProps.found) {
                if (!isMap && !props.found && ctx.options.strict) {
                    if (sep)
                        for (const st of sep) {
                            if (st === valueProps.found)
                                break;
                            if (st.type === 'newline') {
                                onError(st, 'MULTILINE_IMPLICIT_KEY', 'Implicit keys of flow sequence pairs need to be on a single line');
                                break;
                            }
                        }
                    if (props.start < valueProps.found.offset - 1024)
                        onError(valueProps.found, 'KEY_OVER_1024_CHARS', 'The : indicator must be at most 1024 chars after the start of an implicit flow sequence key');
                }
            }
            else if (value) {
                if ('source' in value && value.source?.[0] === ':')
                    onError(value, 'MISSING_CHAR', `Missing space after : in ${fcName}`);
                else
                    onError(valueProps.start, 'MISSING_CHAR', `Missing , or : between ${fcName} items`);
            }
            // value value
            const valueNode = value
                ? composeNode(ctx, value, valueProps, onError)
                : valueProps.found
                    ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError)
                    : null;
            if (valueNode) {
                if (isBlock(value))
                    onError(valueNode.range, 'BLOCK_IN_FLOW', blockMsg);
            }
            else if (valueProps.comment) {
                if (keyNode.comment)
                    keyNode.comment += '\n' + valueProps.comment;
                else
                    keyNode.comment = valueProps.comment;
            }
            const pair = new Pair.Pair(keyNode, valueNode);
            if (ctx.options.keepSourceTokens)
                pair.srcToken = collItem;
            if (isMap) {
                const map = coll;
                if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
                    onError(keyStart, 'DUPLICATE_KEY', 'Map keys must be unique');
                map.items.push(pair);
            }
            else {
                const map = new YAMLMap.YAMLMap(ctx.schema);
                map.flow = true;
                map.items.push(pair);
                const endRange = (valueNode ?? keyNode).range;
                map.range = [keyNode.range[0], endRange[1], endRange[2]];
                coll.items.push(map);
            }
            offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
    }
    const expectedEnd = isMap ? '}' : ']';
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
    else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot
            ? `${name} must end with a ${expectedEnd}`
            : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? 'MISSING_CHAR' : 'BAD_INDENT', msg);
        if (ce && ce.source.length !== 1)
            ee.unshift(ce);
    }
    if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
            if (coll.comment)
                coll.comment += '\n' + end.comment;
            else
                coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
    }
    else {
        coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
}

exports.resolveFlowCollection = resolveFlowCollection;


/***/ }),

/***/ 6842:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);
var resolveEnd = __nccwpck_require__(7788);

function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
        case 'scalar':
            _type = Scalar.Scalar.PLAIN;
            value = plainValue(source, _onError);
            break;
        case 'single-quoted-scalar':
            _type = Scalar.Scalar.QUOTE_SINGLE;
            value = singleQuotedValue(source, _onError);
            break;
        case 'double-quoted-scalar':
            _type = Scalar.Scalar.QUOTE_DOUBLE;
            value = doubleQuotedValue(source, _onError);
            break;
        /* istanbul ignore next should not happen */
        default:
            onError(scalar, 'UNEXPECTED_TOKEN', `Expected a flow scalar value, but found: ${type}`);
            return {
                value: '',
                type: null,
                comment: '',
                range: [offset, offset + source.length, offset + source.length]
            };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
    };
}
function plainValue(source, onError) {
    let badChar = '';
    switch (source[0]) {
        /* istanbul ignore next should not happen */
        case '\t':
            badChar = 'a tab character';
            break;
        case ',':
            badChar = 'flow indicator character ,';
            break;
        case '%':
            badChar = 'directive indicator character %';
            break;
        case '|':
        case '>': {
            badChar = `block scalar indicator ${source[0]}`;
            break;
        }
        case '@':
        case '`': {
            badChar = `reserved character ${source[0]}`;
            break;
        }
    }
    if (badChar)
        onError(0, 'BAD_SCALAR_START', `Plain value cannot start with ${badChar}`);
    return foldLines(source);
}
function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, 'MISSING_CHAR', "Missing closing 'quote");
    return foldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function foldLines(source) {
    /**
     * The negative lookbehind here and in the `re` RegExp is to
     * prevent causing a polynomial search time in certain cases.
     *
     * The try-catch is for Safari, which doesn't support this yet:
     * https://caniuse.com/js-regexp-lookbehind
     */
    let first, line;
    try {
        first = new RegExp('(.*?)(?<![ \t])[ \t]*\r?\n', 'sy');
        line = new RegExp('[ \t]*(.*?)(?:(?<![ \t])[ \t]*)?\r?\n', 'sy');
    }
    catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
    }
    let match = first.exec(source);
    if (!match)
        return source;
    let res = match[1];
    let sep = ' ';
    let pos = first.lastIndex;
    line.lastIndex = pos;
    while ((match = line.exec(source))) {
        if (match[1] === '') {
            if (sep === '\n')
                res += sep;
            else
                sep = '\n';
        }
        else {
            res += sep + match[1];
            sep = ' ';
        }
        pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? '');
}
function doubleQuotedValue(source, onError) {
    let res = '';
    for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === '\r' && source[i + 1] === '\n')
            continue;
        if (ch === '\n') {
            const { fold, offset } = foldNewline(source, i);
            res += fold;
            i = offset;
        }
        else if (ch === '\\') {
            let next = source[++i];
            const cc = escapeCodes[next];
            if (cc)
                res += cc;
            else if (next === '\n') {
                // skip escaped newlines, but still trim the following line
                next = source[i + 1];
                while (next === ' ' || next === '\t')
                    next = source[++i + 1];
            }
            else if (next === '\r' && source[i + 1] === '\n') {
                // skip escaped CRLF newlines, but still trim the following line
                next = source[++i + 1];
                while (next === ' ' || next === '\t')
                    next = source[++i + 1];
            }
            else if (next === 'x' || next === 'u' || next === 'U') {
                const length = next === 'x' ? 2 : next === 'u' ? 4 : 8;
                res += parseCharCode(source, i + 1, length, onError);
                i += length;
            }
            else {
                const raw = source.substr(i - 1, 2);
                onError(i - 1, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${raw}`);
                res += raw;
            }
        }
        else if (ch === ' ' || ch === '\t') {
            // trim trailing whitespace
            const wsStart = i;
            let next = source[i + 1];
            while (next === ' ' || next === '\t')
                next = source[++i + 1];
            if (next !== '\n' && !(next === '\r' && source[i + 2] === '\n'))
                res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        }
        else {
            res += ch;
        }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, 'MISSING_CHAR', 'Missing closing "quote');
    return res;
}
/**
 * Fold a single newline into a space, multiple newlines to N - 1 newlines.
 * Presumes `source[offset] === '\n'`
 */
function foldNewline(source, offset) {
    let fold = '';
    let ch = source[offset + 1];
    while (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        if (ch === '\r' && source[offset + 2] !== '\n')
            break;
        if (ch === '\n')
            fold += '\n';
        offset += 1;
        ch = source[offset + 1];
    }
    if (!fold)
        fold = ' ';
    return { fold, offset };
}
const escapeCodes = {
    '0': '\0', // null character
    a: '\x07', // bell character
    b: '\b', // backspace
    e: '\x1b', // escape character
    f: '\f', // form feed
    n: '\n', // line feed
    r: '\r', // carriage return
    t: '\t', // horizontal tab
    v: '\v', // vertical tab
    N: '\u0085', // Unicode next line
    _: '\u00a0', // Unicode non-breaking space
    L: '\u2028', // Unicode line separator
    P: '\u2029', // Unicode paragraph separator
    ' ': ' ',
    '"': '"',
    '/': '/',
    '\\': '\\',
    '\t': '\t'
};
function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    try {
        return String.fromCodePoint(code);
    }
    catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, 'BAD_DQ_ESCAPE', `Invalid escape sequence ${raw}`);
        return raw;
    }
}

exports.resolveFlowScalar = resolveFlowScalar;


/***/ }),

/***/ 4631:
/***/ ((__unused_webpack_module, exports) => {



function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = '';
    let commentSep = '';
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
        if (reqSpace) {
            if (token.type !== 'space' &&
                token.type !== 'newline' &&
                token.type !== 'comma')
                onError(token.offset, 'MISSING_CHAR', 'Tags and anchors must be separated from the next token by white space');
            reqSpace = false;
        }
        if (tab) {
            if (atNewline && token.type !== 'comment' && token.type !== 'newline') {
                onError(tab, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation');
            }
            tab = null;
        }
        switch (token.type) {
            case 'space':
                // At the doc level, tabs at line start may be parsed
                // as leading white space rather than indentation.
                // In a flow collection, only the parser handles indent.
                if (!flow &&
                    (indicator !== 'doc-start' || next?.type !== 'flow-collection') &&
                    token.source.includes('\t')) {
                    tab = token;
                }
                hasSpace = true;
                break;
            case 'comment': {
                if (!hasSpace)
                    onError(token, 'MISSING_CHAR', 'Comments must be separated from other tokens by white space characters');
                const cb = token.source.substring(1) || ' ';
                if (!comment)
                    comment = cb;
                else
                    comment += commentSep + cb;
                commentSep = '';
                atNewline = false;
                break;
            }
            case 'newline':
                if (atNewline) {
                    if (comment)
                        comment += token.source;
                    else if (!found || indicator !== 'seq-item-ind')
                        spaceBefore = true;
                }
                else
                    commentSep += token.source;
                atNewline = true;
                hasNewline = true;
                if (anchor || tag)
                    newlineAfterProp = token;
                hasSpace = true;
                break;
            case 'anchor':
                if (anchor)
                    onError(token, 'MULTIPLE_ANCHORS', 'A node can have at most one anchor');
                if (token.source.endsWith(':'))
                    onError(token.offset + token.source.length - 1, 'BAD_ALIAS', 'Anchor ending in : is ambiguous', true);
                anchor = token;
                start ?? (start = token.offset);
                atNewline = false;
                hasSpace = false;
                reqSpace = true;
                break;
            case 'tag': {
                if (tag)
                    onError(token, 'MULTIPLE_TAGS', 'A node can have at most one tag');
                tag = token;
                start ?? (start = token.offset);
                atNewline = false;
                hasSpace = false;
                reqSpace = true;
                break;
            }
            case indicator:
                // Could here handle preceding comments differently
                if (anchor || tag)
                    onError(token, 'BAD_PROP_ORDER', `Anchors and tags must be after the ${token.source} indicator`);
                if (found)
                    onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${token.source} in ${flow ?? 'collection'}`);
                found = token;
                atNewline =
                    indicator === 'seq-item-ind' || indicator === 'explicit-key-ind';
                hasSpace = false;
                break;
            case 'comma':
                if (flow) {
                    if (comma)
                        onError(token, 'UNEXPECTED_TOKEN', `Unexpected , in ${flow}`);
                    comma = token;
                    atNewline = false;
                    hasSpace = false;
                    break;
                }
            // else fallthrough
            default:
                onError(token, 'UNEXPECTED_TOKEN', `Unexpected ${token.type} token`);
                atNewline = false;
                hasSpace = false;
        }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace &&
        next &&
        next.type !== 'space' &&
        next.type !== 'newline' &&
        next.type !== 'comma' &&
        (next.type !== 'scalar' || next.source !== '')) {
        onError(next.offset, 'MISSING_CHAR', 'Tags and anchors must be separated from the next token by white space');
    }
    if (tab &&
        ((atNewline && tab.indent <= parentIndent) ||
            next?.type === 'block-map' ||
            next?.type === 'block-seq'))
        onError(tab, 'TAB_AS_INDENT', 'Tabs are not allowed as indentation');
    return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
    };
}

exports.resolveProps = resolveProps;


/***/ }),

/***/ 9499:
/***/ ((__unused_webpack_module, exports) => {



function containsNewline(key) {
    if (!key)
        return null;
    switch (key.type) {
        case 'alias':
        case 'scalar':
        case 'double-quoted-scalar':
        case 'single-quoted-scalar':
            if (key.source.includes('\n'))
                return true;
            if (key.end)
                for (const st of key.end)
                    if (st.type === 'newline')
                        return true;
            return false;
        case 'flow-collection':
            for (const it of key.items) {
                for (const st of it.start)
                    if (st.type === 'newline')
                        return true;
                if (it.sep)
                    for (const st of it.sep)
                        if (st.type === 'newline')
                            return true;
                if (containsNewline(it.key) || containsNewline(it.value))
                    return true;
            }
            return false;
        default:
            return true;
    }
}

exports.containsNewline = containsNewline;


/***/ }),

/***/ 2599:
/***/ ((__unused_webpack_module, exports) => {



function emptyScalarPosition(offset, before, pos) {
    if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
            let st = before[i];
            switch (st.type) {
                case 'space':
                case 'comment':
                case 'newline':
                    offset -= st.source.length;
                    continue;
            }
            // Technically, an empty scalar is immediately after the last non-empty
            // node, but it's more useful to place it after any whitespace.
            st = before[++i];
            while (st?.type === 'space') {
                offset += st.source.length;
                st = before[++i];
            }
            break;
        }
    }
    return offset;
}

exports.emptyScalarPosition = emptyScalarPosition;


/***/ }),

/***/ 4051:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var utilContainsNewline = __nccwpck_require__(9499);

function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === 'flow-collection') {
        const end = fc.end[0];
        if (end.indent === indent &&
            (end.source === ']' || end.source === '}') &&
            utilContainsNewline.containsNewline(fc)) {
            const msg = 'Flow end indicator should be more indented than parent';
            onError(end, 'BAD_INDENT', msg, true);
        }
    }
}

exports.flowIndentCheck = flowIndentCheck;


/***/ }),

/***/ 1187:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);

function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
        return false;
    const isEqual = typeof uniqueKeys === 'function'
        ? uniqueKeys
        : (a, b) => a === b || (identity.isScalar(a) && identity.isScalar(b) && a.value === b.value);
    return items.some(pair => isEqual(pair.key, search));
}

exports.mapIncludes = mapIncludes;


/***/ }),

/***/ 3021:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Alias = __nccwpck_require__(4065);
var Collection = __nccwpck_require__(101);
var identity = __nccwpck_require__(1127);
var Pair = __nccwpck_require__(7165);
var toJS = __nccwpck_require__(4043);
var Schema = __nccwpck_require__(5840);
var stringifyDocument = __nccwpck_require__(6829);
var anchors = __nccwpck_require__(1596);
var applyReviver = __nccwpck_require__(3661);
var createNode = __nccwpck_require__(2404);
var directives = __nccwpck_require__(1342);

class Document {
    constructor(value, replacer, options) {
        /** A comment before this Document */
        this.commentBefore = null;
        /** A comment immediately after this Document */
        this.comment = null;
        /** Errors encountered during parsing. */
        this.errors = [];
        /** Warnings encountered during parsing. */
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === 'function' || Array.isArray(replacer)) {
            _replacer = replacer;
        }
        else if (options === undefined && replacer) {
            options = replacer;
            replacer = undefined;
        }
        const opt = Object.assign({
            intAsBigInt: false,
            keepSourceTokens: false,
            logLevel: 'warn',
            prettyErrors: true,
            strict: true,
            stringKeys: false,
            uniqueKeys: true,
            version: '1.2'
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
            this.directives = options._directives.atDocument();
            if (this.directives.yaml.explicit)
                version = this.directives.yaml.version;
        }
        else
            this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        // @ts-expect-error We can't really know that this matches Contents.
        this.contents =
            value === undefined ? null : this.createNode(value, _replacer, options);
    }
    /**
     * Create a deep copy of this Document and its contents.
     *
     * Custom Node values that inherit from `Object` still refer to their original instances.
     */
    clone() {
        const copy = Object.create(Document.prototype, {
            [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
            copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        // @ts-expect-error We can't really know that this matches Contents.
        copy.contents = identity.isNode(this.contents)
            ? this.contents.clone(copy.schema)
            : this.contents;
        if (this.range)
            copy.range = this.range.slice();
        return copy;
    }
    /** Adds a value to the document. */
    add(value) {
        if (assertCollection(this.contents))
            this.contents.add(value);
    }
    /** Adds a value to the document. */
    addIn(path, value) {
        if (assertCollection(this.contents))
            this.contents.addIn(path, value);
    }
    /**
     * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
     *
     * If `node` already has an anchor, `name` is ignored.
     * Otherwise, the `node.anchor` value will be set to `name`,
     * or if an anchor with that name is already present in the document,
     * `name` will be used as a prefix for a new unique anchor.
     * If `name` is undefined, the generated anchor will use 'a' as a prefix.
     */
    createAlias(node, name) {
        if (!node.anchor) {
            const prev = anchors.anchorNames(this);
            node.anchor =
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                !name || prev.has(name) ? anchors.findNewAnchor(name || 'a', prev) : name;
        }
        return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
        let _replacer = undefined;
        if (typeof replacer === 'function') {
            value = replacer.call({ '': value }, '', value);
            _replacer = replacer;
        }
        else if (Array.isArray(replacer)) {
            const keyToStr = (v) => typeof v === 'number' || v instanceof String || v instanceof Number;
            const asStr = replacer.filter(keyToStr).map(String);
            if (asStr.length > 0)
                replacer = replacer.concat(asStr);
            _replacer = replacer;
        }
        else if (options === undefined && replacer) {
            options = replacer;
            replacer = undefined;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, 
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        anchorPrefix || 'a');
        const ctx = {
            aliasDuplicateObjects: aliasDuplicateObjects ?? true,
            keepUndefined: keepUndefined ?? false,
            onAnchor,
            onTagObj,
            replacer: _replacer,
            schema: this.schema,
            sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
            node.flow = true;
        setAnchors();
        return node;
    }
    /**
     * Convert a key and a value into a `Pair` using the current schema,
     * recursively wrapping all values as `Scalar` or `Collection` nodes.
     */
    createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    /**
     * Removes a value from the document.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
            if (this.contents == null)
                return false;
            // @ts-expect-error Presumed impossible if Strict extends false
            this.contents = null;
            return true;
        }
        return assertCollection(this.contents)
            ? this.contents.deleteIn(path)
            : false;
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    get(key, keepScalar) {
        return identity.isCollection(this.contents)
            ? this.contents.get(key, keepScalar)
            : undefined;
    }
    /**
     * Returns item at `path`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
            return !keepScalar && identity.isScalar(this.contents)
                ? this.contents.value
                : this.contents;
        return identity.isCollection(this.contents)
            ? this.contents.getIn(path, keepScalar)
            : undefined;
    }
    /**
     * Checks if the document includes a value with the key `key`.
     */
    has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    /**
     * Checks if the document includes a value at `path`.
     */
    hasIn(path) {
        if (Collection.isEmptyPath(path))
            return this.contents !== undefined;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    set(key, value) {
        if (this.contents == null) {
            // @ts-expect-error We can't really know that this matches Contents.
            this.contents = Collection.collectionFromPath(this.schema, [key], value);
        }
        else if (assertCollection(this.contents)) {
            this.contents.set(key, value);
        }
    }
    /**
     * Sets a value in this document. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path, value) {
        if (Collection.isEmptyPath(path)) {
            // @ts-expect-error We can't really know that this matches Contents.
            this.contents = value;
        }
        else if (this.contents == null) {
            // @ts-expect-error We can't really know that this matches Contents.
            this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
        }
        else if (assertCollection(this.contents)) {
            this.contents.setIn(path, value);
        }
    }
    /**
     * Change the YAML version and schema used by the document.
     * A `null` version disables support for directives, explicit tags, anchors, and aliases.
     * It also requires the `schema` option to be given as a `Schema` instance value.
     *
     * Overrides all previously set schema options.
     */
    setSchema(version, options = {}) {
        if (typeof version === 'number')
            version = String(version);
        let opt;
        switch (version) {
            case '1.1':
                if (this.directives)
                    this.directives.yaml.version = '1.1';
                else
                    this.directives = new directives.Directives({ version: '1.1' });
                opt = { resolveKnownTags: false, schema: 'yaml-1.1' };
                break;
            case '1.2':
            case 'next':
                if (this.directives)
                    this.directives.yaml.version = version;
                else
                    this.directives = new directives.Directives({ version });
                opt = { resolveKnownTags: true, schema: 'core' };
                break;
            case null:
                if (this.directives)
                    delete this.directives;
                opt = null;
                break;
            default: {
                const sv = JSON.stringify(version);
                throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
            }
        }
        // Not using `instanceof Schema` to allow for duck typing
        if (options.schema instanceof Object)
            this.schema = options.schema;
        else if (opt)
            this.schema = new Schema.Schema(Object.assign(opt, options));
        else
            throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    // json & jsonArg are only used from toJSON()
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
            anchors: new Map(),
            doc: this,
            keep: !json,
            mapAsMap: mapAsMap === true,
            mapKeyWarned: false,
            maxAliasCount: typeof maxAliasCount === 'number' ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? '', ctx);
        if (typeof onAnchor === 'function')
            for (const { count, res } of ctx.anchors.values())
                onAnchor(res, count);
        return typeof reviver === 'function'
            ? applyReviver.applyReviver(reviver, { '': res }, '', res)
            : res;
    }
    /**
     * A JSON representation of the document `contents`.
     *
     * @param jsonArg Used by `JSON.stringify` to indicate the array index or
     *   property name.
     */
    toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    /** A YAML representation of the document. */
    toString(options = {}) {
        if (this.errors.length > 0)
            throw new Error('Document with errors cannot be stringified');
        if ('indent' in options &&
            (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
            const s = JSON.stringify(options.indent);
            throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
    }
}
function assertCollection(contents) {
    if (identity.isCollection(contents))
        return true;
    throw new Error('Expected a YAML collection as document contents');
}

exports.Document = Document;


/***/ }),

/***/ 1596:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var visit = __nccwpck_require__(204);

/**
 * Verify that the input string is a valid anchor.
 *
 * Will throw on errors.
 */
function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
    }
    return true;
}
function anchorNames(root) {
    const anchors = new Set();
    visit.visit(root, {
        Value(_key, node) {
            if (node.anchor)
                anchors.add(node.anchor);
        }
    });
    return anchors;
}
/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */
function findNewAnchor(prefix, exclude) {
    for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
            return name;
    }
}
function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map();
    let prevAnchors = null;
    return {
        onAnchor: (source) => {
            aliasObjects.push(source);
            prevAnchors ?? (prevAnchors = anchorNames(doc));
            const anchor = findNewAnchor(prefix, prevAnchors);
            prevAnchors.add(anchor);
            return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
            for (const source of aliasObjects) {
                const ref = sourceObjects.get(source);
                if (typeof ref === 'object' &&
                    ref.anchor &&
                    (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
                    ref.node.anchor = ref.anchor;
                }
                else {
                    const error = new Error('Failed to resolve repeated object (this should not happen)');
                    error.source = source;
                    throw error;
                }
            }
        },
        sourceObjects
    };
}

exports.anchorIsValid = anchorIsValid;
exports.anchorNames = anchorNames;
exports.createNodeAnchors = createNodeAnchors;
exports.findNewAnchor = findNewAnchor;


/***/ }),

/***/ 3661:
/***/ ((__unused_webpack_module, exports) => {



/**
 * Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
 * in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
 * 2021 edition: https://tc39.es/ecma262/#sec-json.parse
 *
 * Includes extensions for handling Map and Set objects.
 */
function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
            for (let i = 0, len = val.length; i < len; ++i) {
                const v0 = val[i];
                const v1 = applyReviver(reviver, val, String(i), v0);
                // eslint-disable-next-line @typescript-eslint/no-array-delete
                if (v1 === undefined)
                    delete val[i];
                else if (v1 !== v0)
                    val[i] = v1;
            }
        }
        else if (val instanceof Map) {
            for (const k of Array.from(val.keys())) {
                const v0 = val.get(k);
                const v1 = applyReviver(reviver, val, k, v0);
                if (v1 === undefined)
                    val.delete(k);
                else if (v1 !== v0)
                    val.set(k, v1);
            }
        }
        else if (val instanceof Set) {
            for (const v0 of Array.from(val)) {
                const v1 = applyReviver(reviver, val, v0, v0);
                if (v1 === undefined)
                    val.delete(v0);
                else if (v1 !== v0) {
                    val.delete(v0);
                    val.add(v1);
                }
            }
        }
        else {
            for (const [k, v0] of Object.entries(val)) {
                const v1 = applyReviver(reviver, val, k, v0);
                if (v1 === undefined)
                    delete val[k];
                else if (v1 !== v0)
                    val[k] = v1;
            }
        }
    }
    return reviver.call(obj, key, val);
}

exports.applyReviver = applyReviver;


/***/ }),

/***/ 2404:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Alias = __nccwpck_require__(4065);
var identity = __nccwpck_require__(1127);
var Scalar = __nccwpck_require__(3301);

const defaultTagPrefix = 'tag:yaml.org,2002:';
function findTagObject(value, tagName, tags) {
    if (tagName) {
        const match = tags.filter(t => t.tag === tagName);
        const tagObj = match.find(t => !t.format) ?? match[0];
        if (!tagObj)
            throw new Error(`Tag ${tagName} not found`);
        return tagObj;
    }
    return tags.find(t => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
        value = value.contents;
    if (identity.isNode(value))
        return value;
    if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
    }
    if (value instanceof String ||
        value instanceof Number ||
        value instanceof Boolean ||
        (typeof BigInt !== 'undefined' && value instanceof BigInt) // not supported everywhere
    ) {
        // https://tc39.es/ecma262/#sec-serializejsonproperty
        value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    // Detect duplicate references to the same object & use Alias nodes for all
    // after first. The `ref` wrapper allows for circular references to resolve.
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === 'object') {
        ref = sourceObjects.get(value);
        if (ref) {
            ref.anchor ?? (ref.anchor = onAnchor(value));
            return new Alias.Alias(ref.anchor);
        }
        else {
            ref = { anchor: null, node: null };
            sourceObjects.set(value, ref);
        }
    }
    if (tagName?.startsWith('!!'))
        tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
        if (value && typeof value.toJSON === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            value = value.toJSON();
        }
        if (!value || typeof value !== 'object') {
            const node = new Scalar.Scalar(value);
            if (ref)
                ref.node = node;
            return node;
        }
        tagObj =
            value instanceof Map
                ? schema[identity.MAP]
                : Symbol.iterator in Object(value)
                    ? schema[identity.SEQ]
                    : schema[identity.MAP];
    }
    if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
    }
    const node = tagObj?.createNode
        ? tagObj.createNode(ctx.schema, value, ctx)
        : typeof tagObj?.nodeClass?.from === 'function'
            ? tagObj.nodeClass.from(ctx.schema, value, ctx)
            : new Scalar.Scalar(value);
    if (tagName)
        node.tag = tagName;
    else if (!tagObj.default)
        node.tag = tagObj.tag;
    if (ref)
        ref.node = node;
    return node;
}

exports.createNode = createNode;


/***/ }),

/***/ 1342:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var visit = __nccwpck_require__(204);

const escapeChars = {
    '!': '%21',
    ',': '%2C',
    '[': '%5B',
    ']': '%5D',
    '{': '%7B',
    '}': '%7D'
};
const escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, ch => escapeChars[ch]);
class Directives {
    constructor(yaml, tags) {
        /**
         * The directives-end/doc-start marker `---`. If `null`, a marker may still be
         * included in the document's stringified representation.
         */
        this.docStart = null;
        /** The doc-end marker `...`.  */
        this.docEnd = false;
        this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
        const copy = new Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
    }
    /**
     * During parsing, get a Directives instance for the current document and
     * update the stream state according to the current version's spec.
     */
    atDocument() {
        const res = new Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
            case '1.1':
                this.atNextDocument = true;
                break;
            case '1.2':
                this.atNextDocument = false;
                this.yaml = {
                    explicit: Directives.defaultYaml.explicit,
                    version: '1.2'
                };
                this.tags = Object.assign({}, Directives.defaultTags);
                break;
        }
        return res;
    }
    /**
     * @param onError - May be called even if the action was successful
     * @returns `true` on success
     */
    add(line, onError) {
        if (this.atNextDocument) {
            this.yaml = { explicit: Directives.defaultYaml.explicit, version: '1.1' };
            this.tags = Object.assign({}, Directives.defaultTags);
            this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
            case '%TAG': {
                if (parts.length !== 2) {
                    onError(0, '%TAG directive should contain exactly two parts');
                    if (parts.length < 2)
                        return false;
                }
                const [handle, prefix] = parts;
                this.tags[handle] = prefix;
                return true;
            }
            case '%YAML': {
                this.yaml.explicit = true;
                if (parts.length !== 1) {
                    onError(0, '%YAML directive should contain exactly one part');
                    return false;
                }
                const [version] = parts;
                if (version === '1.1' || version === '1.2') {
                    this.yaml.version = version;
                    return true;
                }
                else {
                    const isValid = /^\d+\.\d+$/.test(version);
                    onError(6, `Unsupported YAML version ${version}`, isValid);
                    return false;
                }
            }
            default:
                onError(0, `Unknown directive ${name}`, true);
                return false;
        }
    }
    /**
     * Resolves a tag, matching handles to those defined in %TAG directives.
     *
     * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
     *   `'!local'` tag, or `null` if unresolvable.
     */
    tagName(source, onError) {
        if (source === '!')
            return '!'; // non-specific tag
        if (source[0] !== '!') {
            onError(`Not a valid tag: ${source}`);
            return null;
        }
        if (source[1] === '<') {
            const verbatim = source.slice(2, -1);
            if (verbatim === '!' || verbatim === '!!') {
                onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
                return null;
            }
            if (source[source.length - 1] !== '>')
                onError('Verbatim tags must end with a >');
            return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
            onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
            try {
                return prefix + decodeURIComponent(suffix);
            }
            catch (error) {
                onError(String(error));
                return null;
            }
        }
        if (handle === '!')
            return source; // local tag
        onError(`Could not resolve tag: ${source}`);
        return null;
    }
    /**
     * Given a fully resolved tag, returns its printable string form,
     * taking into account current tag prefixes and defaults.
     */
    tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
            if (tag.startsWith(prefix))
                return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === '!' ? tag : `!<${tag}>`;
    }
    toString(doc) {
        const lines = this.yaml.explicit
            ? [`%YAML ${this.yaml.version || '1.2'}`]
            : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
            const tags = {};
            visit.visit(doc.contents, (_key, node) => {
                if (identity.isNode(node) && node.tag)
                    tags[node.tag] = true;
            });
            tagNames = Object.keys(tags);
        }
        else
            tagNames = [];
        for (const [handle, prefix] of tagEntries) {
            if (handle === '!!' && prefix === 'tag:yaml.org,2002:')
                continue;
            if (!doc || tagNames.some(tn => tn.startsWith(prefix)))
                lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join('\n');
    }
}
Directives.defaultYaml = { explicit: false, version: '1.2' };
Directives.defaultTags = { '!!': 'tag:yaml.org,2002:' };

exports.Directives = Directives;


/***/ }),

/***/ 1464:
/***/ ((__unused_webpack_module, exports) => {



class YAMLError extends Error {
    constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
    }
}
class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
        super('YAMLParseError', pos, code, message);
    }
}
class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
        super('YAMLWarning', pos, code, message);
    }
}
const prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
        return;
    error.linePos = error.pos.map(pos => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src
        .substring(lc.lineStarts[line - 1], lc.lineStarts[line])
        .replace(/[\n\r]+$/, '');
    // Trim to max 80 chars, keeping col position near the middle
    if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = '…' + lineStr.substring(trimStart);
        ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + '…';
    // Include previous line in context if pointing at line start
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        // Regexp won't match if start is trimmed
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
            prev = prev.substring(0, 79) + '…\n';
        lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
            count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = ' '.repeat(ci) + '^'.repeat(count);
        error.message += `:\n\n${lineStr}\n${pointer}\n`;
    }
};

exports.YAMLError = YAMLError;
exports.YAMLParseError = YAMLParseError;
exports.YAMLWarning = YAMLWarning;
exports.prettifyError = prettifyError;


/***/ }),

/***/ 8815:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

var __webpack_unused_export__;


var composer = __nccwpck_require__(9984);
var Document = __nccwpck_require__(3021);
var Schema = __nccwpck_require__(5840);
var errors = __nccwpck_require__(1464);
var Alias = __nccwpck_require__(4065);
var identity = __nccwpck_require__(1127);
var Pair = __nccwpck_require__(7165);
var Scalar = __nccwpck_require__(3301);
var YAMLMap = __nccwpck_require__(4454);
var YAMLSeq = __nccwpck_require__(2223);
var cst = __nccwpck_require__(3461);
var lexer = __nccwpck_require__(361);
var lineCounter = __nccwpck_require__(6628);
var parser = __nccwpck_require__(3456);
var publicApi = __nccwpck_require__(4047);
var visit = __nccwpck_require__(204);



__webpack_unused_export__ = composer.Composer;
__webpack_unused_export__ = Document.Document;
__webpack_unused_export__ = Schema.Schema;
__webpack_unused_export__ = errors.YAMLError;
__webpack_unused_export__ = errors.YAMLParseError;
__webpack_unused_export__ = errors.YAMLWarning;
__webpack_unused_export__ = Alias.Alias;
exports.Vj = identity.isAlias;
__webpack_unused_export__ = identity.isCollection;
__webpack_unused_export__ = identity.isDocument;
exports.jh = identity.isMap;
__webpack_unused_export__ = identity.isNode;
exports.tO = identity.isPair;
exports.jn = identity.isScalar;
exports.oP = identity.isSeq;
__webpack_unused_export__ = Pair.Pair;
__webpack_unused_export__ = Scalar.Scalar;
__webpack_unused_export__ = YAMLMap.YAMLMap;
__webpack_unused_export__ = YAMLSeq.YAMLSeq;
__webpack_unused_export__ = cst;
__webpack_unused_export__ = lexer.Lexer;
__webpack_unused_export__ = lineCounter.LineCounter;
__webpack_unused_export__ = parser.Parser;
__webpack_unused_export__ = publicApi.parse;
__webpack_unused_export__ = publicApi.parseAllDocuments;
exports.Tp = publicApi.parseDocument;
__webpack_unused_export__ = publicApi.stringify;
__webpack_unused_export__ = visit.visit;
__webpack_unused_export__ = visit.visitAsync;


/***/ }),

/***/ 7249:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var node_process = __nccwpck_require__(932);

function debug(logLevel, ...messages) {
    if (logLevel === 'debug')
        console.log(...messages);
}
function warn(logLevel, warning) {
    if (logLevel === 'debug' || logLevel === 'warn') {
        if (typeof node_process.emitWarning === 'function')
            node_process.emitWarning(warning);
        else
            console.warn(warning);
    }
}

exports.debug = debug;
exports.warn = warn;


/***/ }),

/***/ 4065:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var anchors = __nccwpck_require__(1596);
var visit = __nccwpck_require__(204);
var identity = __nccwpck_require__(1127);
var Node = __nccwpck_require__(6673);
var toJS = __nccwpck_require__(4043);

class Alias extends Node.NodeBase {
    constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, 'tag', {
            set() {
                throw new Error('Alias nodes cannot have tags');
            }
        });
    }
    /**
     * Resolve the value of this alias within `doc`, finding the last
     * instance of the `source` anchor before this node.
     */
    resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
            throw new ReferenceError('Alias resolution is disabled');
        let nodes;
        if (ctx?.aliasResolveCache) {
            nodes = ctx.aliasResolveCache;
        }
        else {
            nodes = [];
            visit.visit(doc, {
                Node: (_key, node) => {
                    if (identity.isAlias(node) || identity.hasAnchor(node))
                        nodes.push(node);
                }
            });
            if (ctx)
                ctx.aliasResolveCache = nodes;
        }
        let found = undefined;
        for (const node of nodes) {
            if (node === this)
                break;
            if (node.anchor === this.source)
                found = node;
        }
        return found;
    }
    toJSON(_arg, ctx) {
        if (!ctx)
            return { source: this.source };
        const { anchors, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new ReferenceError(msg);
        }
        let data = anchors.get(source);
        if (!data) {
            // Resolve anchors for Node.prototype.toJS()
            toJS.toJS(source, null, ctx);
            data = anchors.get(source);
        }
        /* istanbul ignore if */
        if (data?.res === undefined) {
            const msg = 'This should not happen: Alias anchor was not resolved?';
            throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
                data.aliasCount = getAliasCount(doc, source, anchors);
            if (data.count * data.aliasCount > maxAliasCount) {
                const msg = 'Excessive alias count indicates a resource exhaustion attack';
                throw new ReferenceError(msg);
            }
        }
        return data.res;
    }
    toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
            anchors.anchorIsValid(this.source);
            if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
                const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
                throw new Error(msg);
            }
            if (ctx.implicitKey)
                return `${src} `;
        }
        return src;
    }
}
function getAliasCount(doc, node, anchors) {
    if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors && source && anchors.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
    }
    else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
            const c = getAliasCount(doc, item, anchors);
            if (c > count)
                count = c;
        }
        return count;
    }
    else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors);
        const vc = getAliasCount(doc, node.value, anchors);
        return Math.max(kc, vc);
    }
    return 1;
}

exports.Alias = Alias;


/***/ }),

/***/ 101:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var createNode = __nccwpck_require__(2404);
var identity = __nccwpck_require__(1127);
var Node = __nccwpck_require__(6673);

function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === 'number' && Number.isInteger(k) && k >= 0) {
            const a = [];
            a[k] = v;
            v = a;
        }
        else {
            v = new Map([[k, v]]);
        }
    }
    return createNode.createNode(v, undefined, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
            throw new Error('This should not happen, please report a bug.');
        },
        schema,
        sourceObjects: new Map()
    });
}
// Type guard is intentionally a little wrong so as to be more useful,
// as it does not cover untypable empty non-string iterables (e.g. []).
const isEmptyPath = (path) => path == null ||
    (typeof path === 'object' && !!path[Symbol.iterator]().next().done);
class Collection extends Node.NodeBase {
    constructor(type, schema) {
        super(type);
        Object.defineProperty(this, 'schema', {
            value: schema,
            configurable: true,
            enumerable: false,
            writable: true
        });
    }
    /**
     * Create a copy of this collection.
     *
     * @param schema - If defined, overwrites the original's schema
     */
    clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
            copy.schema = schema;
        copy.items = copy.items.map(it => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
            copy.range = this.range.slice();
        return copy;
    }
    /**
     * Adds a value to the collection. For `!!map` and `!!omap` the value must
     * be a Pair instance or a `{ key, value }` object, which may not have a key
     * that already exists in the map.
     */
    addIn(path, value) {
        if (isEmptyPath(path))
            this.add(value);
        else {
            const [key, ...rest] = path;
            const node = this.get(key, true);
            if (identity.isCollection(node))
                node.addIn(rest, value);
            else if (node === undefined && this.schema)
                this.set(key, collectionFromPath(this.schema, rest, value));
            else
                throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
    }
    /**
     * Removes a value from the collection.
     * @returns `true` if the item was found and removed.
     */
    deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
            return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
            return node.deleteIn(rest);
        else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    /**
     * Returns item at `key`, or `undefined` if not found. By default unwraps
     * scalar values from their surrounding node; to disable set `keepScalar` to
     * `true` (collections are always returned intact).
     */
    getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
            return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
            return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
        return this.items.every(node => {
            if (!identity.isPair(node))
                return false;
            const n = node.value;
            return (n == null ||
                (allowScalar &&
                    identity.isScalar(n) &&
                    n.value == null &&
                    !n.commentBefore &&
                    !n.comment &&
                    !n.tag));
        });
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     */
    hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
            return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     */
    setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
            this.set(key, value);
        }
        else {
            const node = this.get(key, true);
            if (identity.isCollection(node))
                node.setIn(rest, value);
            else if (node === undefined && this.schema)
                this.set(key, collectionFromPath(this.schema, rest, value));
            else
                throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
    }
}

exports.Collection = Collection;
exports.collectionFromPath = collectionFromPath;
exports.isEmptyPath = isEmptyPath;


/***/ }),

/***/ 6673:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var applyReviver = __nccwpck_require__(3661);
var identity = __nccwpck_require__(1127);
var toJS = __nccwpck_require__(4043);

class NodeBase {
    constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    /** Create a copy of this node.  */
    clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
            copy.range = this.range.slice();
        return copy;
    }
    /** A plain JavaScript representation of this node. */
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
            throw new TypeError('A document argument is required');
        const ctx = {
            anchors: new Map(),
            doc,
            keep: true,
            mapAsMap: mapAsMap === true,
            mapKeyWarned: false,
            maxAliasCount: typeof maxAliasCount === 'number' ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, '', ctx);
        if (typeof onAnchor === 'function')
            for (const { count, res } of ctx.anchors.values())
                onAnchor(res, count);
        return typeof reviver === 'function'
            ? applyReviver.applyReviver(reviver, { '': res }, '', res)
            : res;
    }
}

exports.NodeBase = NodeBase;


/***/ }),

/***/ 7165:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var createNode = __nccwpck_require__(2404);
var stringifyPair = __nccwpck_require__(9748);
var addPairToJSMap = __nccwpck_require__(7104);
var identity = __nccwpck_require__(1127);

function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
}
class Pair {
    constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
    }
    clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
            key = key.clone(schema);
        if (identity.isNode(value))
            value = value.clone(schema);
        return new Pair(key, value);
    }
    toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
        return ctx?.doc
            ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep)
            : JSON.stringify(this);
    }
}

exports.Pair = Pair;
exports.createPair = createPair;


/***/ }),

/***/ 3301:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Node = __nccwpck_require__(6673);
var toJS = __nccwpck_require__(4043);

const isScalarValue = (value) => !value || (typeof value !== 'function' && typeof value !== 'object');
class Scalar extends Node.NodeBase {
    constructor(value) {
        super(identity.SCALAR);
        this.value = value;
    }
    toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
        return String(this.value);
    }
}
Scalar.BLOCK_FOLDED = 'BLOCK_FOLDED';
Scalar.BLOCK_LITERAL = 'BLOCK_LITERAL';
Scalar.PLAIN = 'PLAIN';
Scalar.QUOTE_DOUBLE = 'QUOTE_DOUBLE';
Scalar.QUOTE_SINGLE = 'QUOTE_SINGLE';

exports.Scalar = Scalar;
exports.isScalarValue = isScalarValue;


/***/ }),

/***/ 4454:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var stringifyCollection = __nccwpck_require__(1212);
var addPairToJSMap = __nccwpck_require__(7104);
var Collection = __nccwpck_require__(101);
var identity = __nccwpck_require__(1127);
var Pair = __nccwpck_require__(7165);
var Scalar = __nccwpck_require__(3301);

function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
        if (identity.isPair(it)) {
            if (it.key === key || it.key === k)
                return it;
            if (identity.isScalar(it.key) && it.key.value === k)
                return it;
        }
    }
    return undefined;
}
class YAMLMap extends Collection.Collection {
    static get tagName() {
        return 'tag:yaml.org,2002:map';
    }
    constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
    }
    /**
     * A generic collection parsing method that can be extended
     * to other node classes that inherit from YAMLMap
     */
    static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
            if (typeof replacer === 'function')
                value = replacer.call(obj, key, value);
            else if (Array.isArray(replacer) && !replacer.includes(key))
                return;
            if (value !== undefined || keepUndefined)
                map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
            for (const [key, value] of obj)
                add(key, value);
        }
        else if (obj && typeof obj === 'object') {
            for (const key of Object.keys(obj))
                add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === 'function') {
            map.items.sort(schema.sortMapEntries);
        }
        return map;
    }
    /**
     * Adds a value to the collection.
     *
     * @param overwrite - If not set `true`, using a key that is already in the
     *   collection will throw. Otherwise, overwrites the previous value.
     */
    add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
            _pair = pair;
        else if (!pair || typeof pair !== 'object' || !('key' in pair)) {
            // In TypeScript, this never happens.
            _pair = new Pair.Pair(pair, pair?.value);
        }
        else
            _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
            if (!overwrite)
                throw new Error(`Key ${_pair.key} already set`);
            // For scalars, keep the old node & its comments and anchors
            if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
                prev.value.value = _pair.value;
            else
                prev.value = _pair.value;
        }
        else if (sortEntries) {
            const i = this.items.findIndex(item => sortEntries(_pair, item) < 0);
            if (i === -1)
                this.items.push(_pair);
            else
                this.items.splice(i, 0, _pair);
        }
        else {
            this.items.push(_pair);
        }
    }
    delete(key) {
        const it = findPair(this.items, key);
        if (!it)
            return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
    }
    get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
        return !!findPair(this.items, key);
    }
    set(key, value) {
        this.add(new Pair.Pair(key, value), true);
    }
    /**
     * @param ctx - Conversion context, originally set in Document#toJS()
     * @param {Class} Type - If set, forces the returned collection type
     * @returns Instance of Type, Map, or Object
     */
    toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? new Map() : {};
        if (ctx?.onCreate)
            ctx.onCreate(map);
        for (const item of this.items)
            addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
    }
    toString(ctx, onComment, onChompKeep) {
        if (!ctx)
            return JSON.stringify(this);
        for (const item of this.items) {
            if (!identity.isPair(item))
                throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
            ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
            blockItemPrefix: '',
            flowChars: { start: '{', end: '}' },
            itemIndent: ctx.indent || '',
            onChompKeep,
            onComment
        });
    }
}

exports.YAMLMap = YAMLMap;
exports.findPair = findPair;


/***/ }),

/***/ 2223:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var createNode = __nccwpck_require__(2404);
var stringifyCollection = __nccwpck_require__(1212);
var Collection = __nccwpck_require__(101);
var identity = __nccwpck_require__(1127);
var Scalar = __nccwpck_require__(3301);
var toJS = __nccwpck_require__(4043);

class YAMLSeq extends Collection.Collection {
    static get tagName() {
        return 'tag:yaml.org,2002:seq';
    }
    constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
    }
    add(value) {
        this.items.push(value);
    }
    /**
     * Removes a value from the collection.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     *
     * @returns `true` if the item was found and removed.
     */
    delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== 'number')
            return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
    }
    get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== 'number')
            return undefined;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    /**
     * Checks if the collection includes a value with the key `key`.
     *
     * `key` must contain a representation of an integer for this to succeed.
     * It may be wrapped in a `Scalar`.
     */
    has(key) {
        const idx = asItemIndex(key);
        return typeof idx === 'number' && idx < this.items.length;
    }
    /**
     * Sets a value in this collection. For `!!set`, `value` needs to be a
     * boolean to add/remove the item from the set.
     *
     * If `key` does not contain a representation of an integer, this will throw.
     * It may be wrapped in a `Scalar`.
     */
    set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== 'number')
            throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
            prev.value = value;
        else
            this.items[idx] = value;
    }
    toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
            ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
            seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
    }
    toString(ctx, onComment, onChompKeep) {
        if (!ctx)
            return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
            blockItemPrefix: '- ',
            flowChars: { start: '[', end: ']' },
            itemIndent: (ctx.indent || '') + '  ',
            onChompKeep,
            onComment
        });
    }
    static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
            let i = 0;
            for (let it of obj) {
                if (typeof replacer === 'function') {
                    const key = obj instanceof Set ? it : String(i++);
                    it = replacer.call(obj, key, it);
                }
                seq.items.push(createNode.createNode(it, undefined, ctx));
            }
        }
        return seq;
    }
}
function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === 'string')
        idx = Number(idx);
    return typeof idx === 'number' && Number.isInteger(idx) && idx >= 0
        ? idx
        : null;
}

exports.YAMLSeq = YAMLSeq;


/***/ }),

/***/ 7104:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var log = __nccwpck_require__(7249);
var merge = __nccwpck_require__(452);
var stringify = __nccwpck_require__(2148);
var identity = __nccwpck_require__(1127);
var toJS = __nccwpck_require__(4043);

function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
    // TODO: Should drop this special case for bare << handling
    else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
    else {
        const jsKey = toJS.toJS(key, '', ctx);
        if (map instanceof Map) {
            map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        }
        else if (map instanceof Set) {
            map.add(jsKey);
        }
        else {
            const stringKey = stringifyKey(key, jsKey, ctx);
            const jsValue = toJS.toJS(value, stringKey, ctx);
            if (stringKey in map)
                Object.defineProperty(map, stringKey, {
                    value: jsValue,
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            else
                map[stringKey] = jsValue;
        }
    }
    return map;
}
function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
        return '';
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (typeof jsKey !== 'object')
        return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = new Set();
        for (const node of ctx.anchors.keys())
            strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
            let jsonStr = JSON.stringify(strKey);
            if (jsonStr.length > 40)
                jsonStr = jsonStr.substring(0, 36) + '..."';
            log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
            ctx.mapKeyWarned = true;
        }
        return strKey;
    }
    return JSON.stringify(jsKey);
}

exports.addPairToJSMap = addPairToJSMap;


/***/ }),

/***/ 1127:
/***/ ((__unused_webpack_module, exports) => {



const ALIAS = Symbol.for('yaml.alias');
const DOC = Symbol.for('yaml.document');
const MAP = Symbol.for('yaml.map');
const PAIR = Symbol.for('yaml.pair');
const SCALAR = Symbol.for('yaml.scalar');
const SEQ = Symbol.for('yaml.seq');
const NODE_TYPE = Symbol.for('yaml.node.type');
const isAlias = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === ALIAS;
const isDocument = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === DOC;
const isMap = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === MAP;
const isPair = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === PAIR;
const isScalar = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === SCALAR;
const isSeq = (node) => !!node && typeof node === 'object' && node[NODE_TYPE] === SEQ;
function isCollection(node) {
    if (node && typeof node === 'object')
        switch (node[NODE_TYPE]) {
            case MAP:
            case SEQ:
                return true;
        }
    return false;
}
function isNode(node) {
    if (node && typeof node === 'object')
        switch (node[NODE_TYPE]) {
            case ALIAS:
            case MAP:
            case SCALAR:
            case SEQ:
                return true;
        }
    return false;
}
const hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;

exports.ALIAS = ALIAS;
exports.DOC = DOC;
exports.MAP = MAP;
exports.NODE_TYPE = NODE_TYPE;
exports.PAIR = PAIR;
exports.SCALAR = SCALAR;
exports.SEQ = SEQ;
exports.hasAnchor = hasAnchor;
exports.isAlias = isAlias;
exports.isCollection = isCollection;
exports.isDocument = isDocument;
exports.isMap = isMap;
exports.isNode = isNode;
exports.isPair = isPair;
exports.isScalar = isScalar;
exports.isSeq = isSeq;


/***/ }),

/***/ 4043:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);

/**
 * Recursively convert any node or its contents to native JavaScript
 *
 * @param value - The input value
 * @param arg - If `value` defines a `toJSON()` method, use this
 *   as its first argument
 * @param ctx - Conversion context, originally set in Document#toJS(). If
 *   `{ keep: true }` is not set, output should be suitable for JSON
 *   stringification.
 */
function toJS(value, arg, ctx) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (!ctx || !identity.hasAnchor(value))
            return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: undefined };
        ctx.anchors.set(value, data);
        ctx.onCreate = res => {
            data.res = res;
            delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
            ctx.onCreate(res);
        return res;
    }
    if (typeof value === 'bigint' && !ctx?.keep)
        return Number(value);
    return value;
}

exports.toJS = toJS;


/***/ }),

/***/ 110:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var resolveBlockScalar = __nccwpck_require__(8913);
var resolveFlowScalar = __nccwpck_require__(6842);
var errors = __nccwpck_require__(1464);
var stringifyString = __nccwpck_require__(3069);

function resolveAsScalar(token, strict = true, onError) {
    if (token) {
        const _onError = (pos, code, message) => {
            const offset = typeof pos === 'number' ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
            if (onError)
                onError(offset, code, message);
            else
                throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
            case 'scalar':
            case 'single-quoted-scalar':
            case 'double-quoted-scalar':
                return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
            case 'block-scalar':
                return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
    }
    return null;
}
/**
 * Create a new scalar token with `value`
 *
 * Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
 * as this function does not support any schema operations and won't check for such conflicts.
 *
 * @param value The string representation of the value, which will have its content properly indented.
 * @param context.end Comments and whitespace after the end of the value, or after the block scalar header. If undefined, a newline will be added.
 * @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
 * @param context.indent The indent level of the token.
 * @param context.inFlow Is this scalar within a flow collection? This may affect the resolved type of the token's value.
 * @param context.offset The offset position of the token.
 * @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
 */
function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = 'PLAIN' } = context;
    const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? ' '.repeat(indent) : '',
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
        { type: 'newline', offset: -1, indent, source: '\n' }
    ];
    switch (source[0]) {
        case '|':
        case '>': {
            const he = source.indexOf('\n');
            const head = source.substring(0, he);
            const body = source.substring(he + 1) + '\n';
            const props = [
                { type: 'block-scalar-header', offset, indent, source: head }
            ];
            if (!addEndtoBlockProps(props, end))
                props.push({ type: 'newline', offset: -1, indent, source: '\n' });
            return { type: 'block-scalar', offset, indent, props, source: body };
        }
        case '"':
            return { type: 'double-quoted-scalar', offset, indent, source, end };
        case "'":
            return { type: 'single-quoted-scalar', offset, indent, source, end };
        default:
            return { type: 'scalar', offset, indent, source, end };
    }
}
/**
 * Set the value of `token` to the given string `value`, overwriting any previous contents and type that it may have.
 *
 * Best efforts are made to retain any comments previously associated with the `token`,
 * though all contents within a collection's `items` will be overwritten.
 *
 * Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
 * as this function does not support any schema operations and won't check for such conflicts.
 *
 * @param token Any token. If it does not include an `indent` value, the value will be stringified as if it were an implicit key.
 * @param value The string representation of the value, which will have its content properly indented.
 * @param context.afterKey In most cases, values after a key should have an additional level of indentation.
 * @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
 * @param context.inFlow Being within a flow collection may affect the resolved type of the token's value.
 * @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
 */
function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = 'indent' in token ? token.indent : null;
    if (afterKey && typeof indent === 'number')
        indent += 2;
    if (!type)
        switch (token.type) {
            case 'single-quoted-scalar':
                type = 'QUOTE_SINGLE';
                break;
            case 'double-quoted-scalar':
                type = 'QUOTE_DOUBLE';
                break;
            case 'block-scalar': {
                const header = token.props[0];
                if (header.type !== 'block-scalar-header')
                    throw new Error('Invalid block scalar header');
                type = header.source[0] === '>' ? 'BLOCK_FOLDED' : 'BLOCK_LITERAL';
                break;
            }
            default:
                type = 'PLAIN';
        }
    const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? ' '.repeat(indent) : '',
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
        case '|':
        case '>':
            setBlockScalarValue(token, source);
            break;
        case '"':
            setFlowScalarValue(token, source, 'double-quoted-scalar');
            break;
        case "'":
            setFlowScalarValue(token, source, 'single-quoted-scalar');
            break;
        default:
            setFlowScalarValue(token, source, 'scalar');
    }
}
function setBlockScalarValue(token, source) {
    const he = source.indexOf('\n');
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + '\n';
    if (token.type === 'block-scalar') {
        const header = token.props[0];
        if (header.type !== 'block-scalar-header')
            throw new Error('Invalid block scalar header');
        header.source = head;
        token.source = body;
    }
    else {
        const { offset } = token;
        const indent = 'indent' in token ? token.indent : -1;
        const props = [
            { type: 'block-scalar-header', offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, 'end' in token ? token.end : undefined))
            props.push({ type: 'newline', offset: -1, indent, source: '\n' });
        for (const key of Object.keys(token))
            if (key !== 'type' && key !== 'offset')
                delete token[key];
        Object.assign(token, { type: 'block-scalar', indent, props, source: body });
    }
}
/** @returns `true` if last token is a newline */
function addEndtoBlockProps(props, end) {
    if (end)
        for (const st of end)
            switch (st.type) {
                case 'space':
                case 'comment':
                    props.push(st);
                    break;
                case 'newline':
                    props.push(st);
                    return true;
            }
    return false;
}
function setFlowScalarValue(token, source, type) {
    switch (token.type) {
        case 'scalar':
        case 'double-quoted-scalar':
        case 'single-quoted-scalar':
            token.type = type;
            token.source = source;
            break;
        case 'block-scalar': {
            const end = token.props.slice(1);
            let oa = source.length;
            if (token.props[0].type === 'block-scalar-header')
                oa -= token.props[0].source.length;
            for (const tok of end)
                tok.offset += oa;
            delete token.props;
            Object.assign(token, { type, source, end });
            break;
        }
        case 'block-map':
        case 'block-seq': {
            const offset = token.offset + source.length;
            const nl = { type: 'newline', offset, indent: token.indent, source: '\n' };
            delete token.items;
            Object.assign(token, { type, source, end: [nl] });
            break;
        }
        default: {
            const indent = 'indent' in token ? token.indent : -1;
            const end = 'end' in token && Array.isArray(token.end)
                ? token.end.filter(st => st.type === 'space' ||
                    st.type === 'comment' ||
                    st.type === 'newline')
                : [];
            for (const key of Object.keys(token))
                if (key !== 'type' && key !== 'offset')
                    delete token[key];
            Object.assign(token, { type, indent, source, end });
        }
    }
}

exports.createScalarToken = createScalarToken;
exports.resolveAsScalar = resolveAsScalar;
exports.setScalarValue = setScalarValue;


/***/ }),

/***/ 1733:
/***/ ((__unused_webpack_module, exports) => {



/**
 * Stringify a CST document, token, or collection item
 *
 * Fair warning: This applies no validation whatsoever, and
 * simply concatenates the sources in their logical order.
 */
const stringify = (cst) => 'type' in cst ? stringifyToken(cst) : stringifyItem(cst);
function stringifyToken(token) {
    switch (token.type) {
        case 'block-scalar': {
            let res = '';
            for (const tok of token.props)
                res += stringifyToken(tok);
            return res + token.source;
        }
        case 'block-map':
        case 'block-seq': {
            let res = '';
            for (const item of token.items)
                res += stringifyItem(item);
            return res;
        }
        case 'flow-collection': {
            let res = token.start.source;
            for (const item of token.items)
                res += stringifyItem(item);
            for (const st of token.end)
                res += st.source;
            return res;
        }
        case 'document': {
            let res = stringifyItem(token);
            if (token.end)
                for (const st of token.end)
                    res += st.source;
            return res;
        }
        default: {
            let res = token.source;
            if ('end' in token && token.end)
                for (const st of token.end)
                    res += st.source;
            return res;
        }
    }
}
function stringifyItem({ start, key, sep, value }) {
    let res = '';
    for (const st of start)
        res += st.source;
    if (key)
        res += stringifyToken(key);
    if (sep)
        for (const st of sep)
            res += st.source;
    if (value)
        res += stringifyToken(value);
    return res;
}

exports.stringify = stringify;


/***/ }),

/***/ 7715:
/***/ ((__unused_webpack_module, exports) => {



const BREAK = Symbol('break visit');
const SKIP = Symbol('skip children');
const REMOVE = Symbol('remove item');
/**
 * Apply a visitor to a CST document or item.
 *
 * Walks through the tree (depth-first) starting from the root, calling a
 * `visitor` function with two arguments when entering each item:
 *   - `item`: The current item, which included the following members:
 *     - `start: SourceToken[]` – Source tokens before the key or value,
 *       possibly including its anchor or tag.
 *     - `key?: Token | null` – Set for pair values. May then be `null`, if
 *       the key before the `:` separator is empty.
 *     - `sep?: SourceToken[]` – Source tokens between the key and the value,
 *       which should include the `:` map value indicator if `value` is set.
 *     - `value?: Token` – The value of a sequence item, or of a map pair.
 *   - `path`: The steps from the root to the current node, as an array of
 *     `['key' | 'value', number]` tuples.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this token, continue with
 *      next sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current item, then continue with the next one
 *   - `number`: Set the index of the next step. This is useful especially if
 *     the index of the current token has changed.
 *   - `function`: Define the next visitor for this item. After the original
 *     visitor is called on item entry, next visitors are called after handling
 *     a non-empty `key` and when exiting the item.
 */
function visit(cst, visitor) {
    if ('type' in cst && cst.type === 'document')
        cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
}
// Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.
/** Terminate visit traversal completely */
visit.BREAK = BREAK;
/** Do not visit the children of the current item */
visit.SKIP = SKIP;
/** Remove the current item */
visit.REMOVE = REMOVE;
/** Find the item at `path` from `cst` as the root */
visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && 'items' in tok) {
            item = tok.items[index];
        }
        else
            return undefined;
    }
    return item;
};
/**
 * Get the immediate parent collection of the item at `path` from `cst` as the root.
 *
 * Throws an error if the collection is not found, which should never happen if the item itself exists.
 */
visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && 'items' in coll)
        return coll;
    throw new Error('Parent collection not found');
};
function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === 'symbol')
        return ctrl;
    for (const field of ['key', 'value']) {
        const token = item[field];
        if (token && 'items' in token) {
            for (let i = 0; i < token.items.length; ++i) {
                const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
                if (typeof ci === 'number')
                    i = ci - 1;
                else if (ci === BREAK)
                    return BREAK;
                else if (ci === REMOVE) {
                    token.items.splice(i, 1);
                    i -= 1;
                }
            }
            if (typeof ctrl === 'function' && field === 'key')
                ctrl = ctrl(item, path);
        }
    }
    return typeof ctrl === 'function' ? ctrl(item, path) : ctrl;
}

exports.visit = visit;


/***/ }),

/***/ 3461:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var cstScalar = __nccwpck_require__(110);
var cstStringify = __nccwpck_require__(1733);
var cstVisit = __nccwpck_require__(7715);

/** The byte order mark */
const BOM = '\u{FEFF}';
/** Start of doc-mode */
const DOCUMENT = '\x02'; // C0: Start of Text
/** Unexpected end of flow-mode */
const FLOW_END = '\x18'; // C0: Cancel
/** Next token is a scalar value */
const SCALAR = '\x1f'; // C0: Unit Separator
/** @returns `true` if `token` is a flow or block collection */
const isCollection = (token) => !!token && 'items' in token;
/** @returns `true` if `token` is a flow or block scalar; not an alias */
const isScalar = (token) => !!token &&
    (token.type === 'scalar' ||
        token.type === 'single-quoted-scalar' ||
        token.type === 'double-quoted-scalar' ||
        token.type === 'block-scalar');
/* istanbul ignore next */
/** Get a printable representation of a lexer token */
function prettyToken(token) {
    switch (token) {
        case BOM:
            return '<BOM>';
        case DOCUMENT:
            return '<DOC>';
        case FLOW_END:
            return '<FLOW_END>';
        case SCALAR:
            return '<SCALAR>';
        default:
            return JSON.stringify(token);
    }
}
/** Identify the type of a lexer token. May return `null` for unknown tokens. */
function tokenType(source) {
    switch (source) {
        case BOM:
            return 'byte-order-mark';
        case DOCUMENT:
            return 'doc-mode';
        case FLOW_END:
            return 'flow-error-end';
        case SCALAR:
            return 'scalar';
        case '---':
            return 'doc-start';
        case '...':
            return 'doc-end';
        case '':
        case '\n':
        case '\r\n':
            return 'newline';
        case '-':
            return 'seq-item-ind';
        case '?':
            return 'explicit-key-ind';
        case ':':
            return 'map-value-ind';
        case '{':
            return 'flow-map-start';
        case '}':
            return 'flow-map-end';
        case '[':
            return 'flow-seq-start';
        case ']':
            return 'flow-seq-end';
        case ',':
            return 'comma';
    }
    switch (source[0]) {
        case ' ':
        case '\t':
            return 'space';
        case '#':
            return 'comment';
        case '%':
            return 'directive-line';
        case '*':
            return 'alias';
        case '&':
            return 'anchor';
        case '!':
            return 'tag';
        case "'":
            return 'single-quoted-scalar';
        case '"':
            return 'double-quoted-scalar';
        case '|':
        case '>':
            return 'block-scalar-header';
    }
    return null;
}

exports.createScalarToken = cstScalar.createScalarToken;
exports.resolveAsScalar = cstScalar.resolveAsScalar;
exports.setScalarValue = cstScalar.setScalarValue;
exports.stringify = cstStringify.stringify;
exports.visit = cstVisit.visit;
exports.BOM = BOM;
exports.DOCUMENT = DOCUMENT;
exports.FLOW_END = FLOW_END;
exports.SCALAR = SCALAR;
exports.isCollection = isCollection;
exports.isScalar = isScalar;
exports.prettyToken = prettyToken;
exports.tokenType = tokenType;


/***/ }),

/***/ 361:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var cst = __nccwpck_require__(3461);

/*
START -> stream

stream
  directive -> line-end -> stream
  indent + line-end -> stream
  [else] -> line-start

line-end
  comment -> line-end
  newline -> .
  input-end -> END

line-start
  doc-start -> doc
  doc-end -> stream
  [else] -> indent -> block-start

block-start
  seq-item-start -> block-start
  explicit-key-start -> block-start
  map-value-start -> block-start
  [else] -> doc

doc
  line-end -> line-start
  spaces -> doc
  anchor -> doc
  tag -> doc
  flow-start -> flow -> doc
  flow-end -> error -> doc
  seq-item-start -> error -> doc
  explicit-key-start -> error -> doc
  map-value-start -> doc
  alias -> doc
  quote-start -> quoted-scalar -> doc
  block-scalar-header -> line-end -> block-scalar(min) -> line-start
  [else] -> plain-scalar(false, min) -> doc

flow
  line-end -> flow
  spaces -> flow
  anchor -> flow
  tag -> flow
  flow-start -> flow -> flow
  flow-end -> .
  seq-item-start -> error -> flow
  explicit-key-start -> flow
  map-value-start -> flow
  alias -> flow
  quote-start -> quoted-scalar -> flow
  comma -> flow
  [else] -> plain-scalar(true, 0) -> flow

quoted-scalar
  quote-end -> .
  [else] -> quoted-scalar

block-scalar(min)
  newline + peek(indent < min) -> .
  [else] -> block-scalar(min)

plain-scalar(is-flow, min)
  scalar-end(is-flow) -> .
  peek(newline + (indent < min)) -> .
  [else] -> plain-scalar(min)
*/
function isEmpty(ch) {
    switch (ch) {
        case undefined:
        case ' ':
        case '\n':
        case '\r':
        case '\t':
            return true;
        default:
            return false;
    }
}
const hexDigits = new Set('0123456789ABCDEFabcdef');
const tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
const flowIndicatorChars = new Set(',[]{}');
const invalidAnchorChars = new Set(' ,[]{}\n\r\t');
const isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
/**
 * Splits an input string into lexical tokens, i.e. smaller strings that are
 * easily identifiable by `tokens.tokenType()`.
 *
 * Lexing starts always in a "stream" context. Incomplete input may be buffered
 * until a complete token can be emitted.
 *
 * In addition to slices of the original input, the following control characters
 * may also be emitted:
 *
 * - `\x02` (Start of Text): A document starts with the next token
 * - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
 * - `\x1f` (Unit Separator): Next token is a scalar value
 * - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
 */
class Lexer {
    constructor() {
        /**
         * Flag indicating whether the end of the current buffer marks the end of
         * all input
         */
        this.atEnd = false;
        /**
         * Explicit indent set in block scalar header, as an offset from the current
         * minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
         * explicitly set.
         */
        this.blockScalarIndent = -1;
        /**
         * Block scalars that include a + (keep) chomping indicator in their header
         * include trailing empty lines, which are otherwise excluded from the
         * scalar's contents.
         */
        this.blockScalarKeep = false;
        /** Current input */
        this.buffer = '';
        /**
         * Flag noting whether the map value indicator : can immediately follow this
         * node within a flow context.
         */
        this.flowKey = false;
        /** Count of surrounding flow collection levels. */
        this.flowLevel = 0;
        /**
         * Minimum level of indentation required for next lines to be parsed as a
         * part of the current scalar value.
         */
        this.indentNext = 0;
        /** Indentation level of the current line. */
        this.indentValue = 0;
        /** Position of the next \n character. */
        this.lineEndPos = null;
        /** Stores the state of the lexer if reaching the end of incpomplete input */
        this.next = null;
        /** A pointer to `buffer`; the current position of the lexer. */
        this.pos = 0;
    }
    /**
     * Generate YAML tokens from the `source` string. If `incomplete`,
     * a part of the last line may be left as a buffer for the next call.
     *
     * @returns A generator of lexical tokens
     */
    *lex(source, incomplete = false) {
        if (source) {
            if (typeof source !== 'string')
                throw TypeError('source is not a string');
            this.buffer = this.buffer ? this.buffer + source : source;
            this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? 'stream';
        while (next && (incomplete || this.hasChars(1)))
            next = yield* this.parseNext(next);
    }
    atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === ' ' || ch === '\t')
            ch = this.buffer[++i];
        if (!ch || ch === '#' || ch === '\n')
            return true;
        if (ch === '\r')
            return this.buffer[i + 1] === '\n';
        return false;
    }
    charAt(n) {
        return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
            let indent = 0;
            while (ch === ' ')
                ch = this.buffer[++indent + offset];
            if (ch === '\r') {
                const next = this.buffer[indent + offset + 1];
                if (next === '\n' || (!next && !this.atEnd))
                    return offset + indent + 1;
            }
            return ch === '\n' || indent >= this.indentNext || (!ch && !this.atEnd)
                ? offset + indent
                : -1;
        }
        if (ch === '-' || ch === '.') {
            const dt = this.buffer.substr(offset, 3);
            if ((dt === '---' || dt === '...') && isEmpty(this.buffer[offset + 3]))
                return -1;
        }
        return offset;
    }
    getLine() {
        let end = this.lineEndPos;
        if (typeof end !== 'number' || (end !== -1 && end < this.pos)) {
            end = this.buffer.indexOf('\n', this.pos);
            this.lineEndPos = end;
        }
        if (end === -1)
            return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === '\r')
            end -= 1;
        return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
        return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
    }
    peek(n) {
        return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
        switch (next) {
            case 'stream':
                return yield* this.parseStream();
            case 'line-start':
                return yield* this.parseLineStart();
            case 'block-start':
                return yield* this.parseBlockStart();
            case 'doc':
                return yield* this.parseDocument();
            case 'flow':
                return yield* this.parseFlowCollection();
            case 'quoted-scalar':
                return yield* this.parseQuotedScalar();
            case 'block-scalar':
                return yield* this.parseBlockScalar();
            case 'plain-scalar':
                return yield* this.parsePlainScalar();
        }
    }
    *parseStream() {
        let line = this.getLine();
        if (line === null)
            return this.setNext('stream');
        if (line[0] === cst.BOM) {
            yield* this.pushCount(1);
            line = line.substring(1);
        }
        if (line[0] === '%') {
            let dirEnd = line.length;
            let cs = line.indexOf('#');
            while (cs !== -1) {
                const ch = line[cs - 1];
                if (ch === ' ' || ch === '\t') {
                    dirEnd = cs - 1;
                    break;
                }
                else {
                    cs = line.indexOf('#', cs + 1);
                }
            }
            while (true) {
                const ch = line[dirEnd - 1];
                if (ch === ' ' || ch === '\t')
                    dirEnd -= 1;
                else
                    break;
            }
            const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
            yield* this.pushCount(line.length - n); // possible comment
            this.pushNewline();
            return 'stream';
        }
        if (this.atLineEnd()) {
            const sp = yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - sp);
            yield* this.pushNewline();
            return 'stream';
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
    }
    *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
            return this.setNext('line-start');
        if (ch === '-' || ch === '.') {
            if (!this.atEnd && !this.hasChars(4))
                return this.setNext('line-start');
            const s = this.peek(3);
            if ((s === '---' || s === '...') && isEmpty(this.charAt(3))) {
                yield* this.pushCount(3);
                this.indentValue = 0;
                this.indentNext = 0;
                return s === '---' ? 'doc' : 'stream';
            }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
            this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
            return this.setNext('block-start');
        if ((ch0 === '-' || ch0 === '?' || ch0 === ':') && isEmpty(ch1)) {
            const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
            this.indentNext = this.indentValue + 1;
            this.indentValue += n;
            return 'block-start';
        }
        return 'doc';
    }
    *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
            return this.setNext('doc');
        let n = yield* this.pushIndicators();
        switch (line[n]) {
            case '#':
                yield* this.pushCount(line.length - n);
            // fallthrough
            case undefined:
                yield* this.pushNewline();
                return yield* this.parseLineStart();
            case '{':
            case '[':
                yield* this.pushCount(1);
                this.flowKey = false;
                this.flowLevel = 1;
                return 'flow';
            case '}':
            case ']':
                // this is an error
                yield* this.pushCount(1);
                return 'doc';
            case '*':
                yield* this.pushUntil(isNotAnchorChar);
                return 'doc';
            case '"':
            case "'":
                return yield* this.parseQuotedScalar();
            case '|':
            case '>':
                n += yield* this.parseBlockScalarHeader();
                n += yield* this.pushSpaces(true);
                yield* this.pushCount(line.length - n);
                yield* this.pushNewline();
                return yield* this.parseBlockScalar();
            default:
                return yield* this.parsePlainScalar();
        }
    }
    *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
            nl = yield* this.pushNewline();
            if (nl > 0) {
                sp = yield* this.pushSpaces(false);
                this.indentValue = indent = sp;
            }
            else {
                sp = 0;
            }
            sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
            return this.setNext('flow');
        if ((indent !== -1 && indent < this.indentNext && line[0] !== '#') ||
            (indent === 0 &&
                (line.startsWith('---') || line.startsWith('...')) &&
                isEmpty(line[3]))) {
            // Allowing for the terminal ] or } at the same (rather than greater)
            // indent level as the initial [ or { is technically invalid, but
            // failing here would be surprising to users.
            const atFlowEndMarker = indent === this.indentNext - 1 &&
                this.flowLevel === 1 &&
                (line[0] === ']' || line[0] === '}');
            if (!atFlowEndMarker) {
                // this is an error
                this.flowLevel = 0;
                yield cst.FLOW_END;
                return yield* this.parseLineStart();
            }
        }
        let n = 0;
        while (line[n] === ',') {
            n += yield* this.pushCount(1);
            n += yield* this.pushSpaces(true);
            this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
            case undefined:
                return 'flow';
            case '#':
                yield* this.pushCount(line.length - n);
                return 'flow';
            case '{':
            case '[':
                yield* this.pushCount(1);
                this.flowKey = false;
                this.flowLevel += 1;
                return 'flow';
            case '}':
            case ']':
                yield* this.pushCount(1);
                this.flowKey = true;
                this.flowLevel -= 1;
                return this.flowLevel ? 'flow' : 'doc';
            case '*':
                yield* this.pushUntil(isNotAnchorChar);
                return 'flow';
            case '"':
            case "'":
                this.flowKey = true;
                return yield* this.parseQuotedScalar();
            case ':': {
                const next = this.charAt(1);
                if (this.flowKey || isEmpty(next) || next === ',') {
                    this.flowKey = false;
                    yield* this.pushCount(1);
                    yield* this.pushSpaces(true);
                    return 'flow';
                }
            }
            // fallthrough
            default:
                this.flowKey = false;
                return yield* this.parsePlainScalar();
        }
    }
    *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
            while (end !== -1 && this.buffer[end + 1] === "'")
                end = this.buffer.indexOf("'", end + 2);
        }
        else {
            // double-quote
            while (end !== -1) {
                let n = 0;
                while (this.buffer[end - 1 - n] === '\\')
                    n += 1;
                if (n % 2 === 0)
                    break;
                end = this.buffer.indexOf('"', end + 1);
            }
        }
        // Only looking for newlines within the quotes
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf('\n', this.pos);
        if (nl !== -1) {
            while (nl !== -1) {
                const cs = this.continueScalar(nl + 1);
                if (cs === -1)
                    break;
                nl = qb.indexOf('\n', cs);
            }
            if (nl !== -1) {
                // this is an error caused by an unexpected unindent
                end = nl - (qb[nl - 1] === '\r' ? 2 : 1);
            }
        }
        if (end === -1) {
            if (!this.atEnd)
                return this.setNext('quoted-scalar');
            end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? 'flow' : 'doc';
    }
    *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
            const ch = this.buffer[++i];
            if (ch === '+')
                this.blockScalarKeep = true;
            else if (ch > '0' && ch <= '9')
                this.blockScalarIndent = Number(ch) - 1;
            else if (ch !== '-')
                break;
        }
        return yield* this.pushUntil(ch => isEmpty(ch) || ch === '#');
    }
    *parseBlockScalar() {
        let nl = this.pos - 1; // may be -1 if this.pos === 0
        let indent = 0;
        let ch;
        loop: for (let i = this.pos; (ch = this.buffer[i]); ++i) {
            switch (ch) {
                case ' ':
                    indent += 1;
                    break;
                case '\n':
                    nl = i;
                    indent = 0;
                    break;
                case '\r': {
                    const next = this.buffer[i + 1];
                    if (!next && !this.atEnd)
                        return this.setNext('block-scalar');
                    if (next === '\n')
                        break;
                } // fallthrough
                default:
                    break loop;
            }
        }
        if (!ch && !this.atEnd)
            return this.setNext('block-scalar');
        if (indent >= this.indentNext) {
            if (this.blockScalarIndent === -1)
                this.indentNext = indent;
            else {
                this.indentNext =
                    this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
            }
            do {
                const cs = this.continueScalar(nl + 1);
                if (cs === -1)
                    break;
                nl = this.buffer.indexOf('\n', cs);
            } while (nl !== -1);
            if (nl === -1) {
                if (!this.atEnd)
                    return this.setNext('block-scalar');
                nl = this.buffer.length;
            }
        }
        // Trailing insufficiently indented tabs are invalid.
        // To catch that during parsing, we include them in the block scalar value.
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === ' ')
            ch = this.buffer[++i];
        if (ch === '\t') {
            while (ch === '\t' || ch === ' ' || ch === '\r' || ch === '\n')
                ch = this.buffer[++i];
            nl = i - 1;
        }
        else if (!this.blockScalarKeep) {
            do {
                let i = nl - 1;
                let ch = this.buffer[i];
                if (ch === '\r')
                    ch = this.buffer[--i];
                const lastChar = i; // Drop the line if last char not more indented
                while (ch === ' ')
                    ch = this.buffer[--i];
                if (ch === '\n' && i >= this.pos && i + 1 + indent > lastChar)
                    nl = i;
                else
                    break;
            } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while ((ch = this.buffer[++i])) {
            if (ch === ':') {
                const next = this.buffer[i + 1];
                if (isEmpty(next) || (inFlow && flowIndicatorChars.has(next)))
                    break;
                end = i;
            }
            else if (isEmpty(ch)) {
                let next = this.buffer[i + 1];
                if (ch === '\r') {
                    if (next === '\n') {
                        i += 1;
                        ch = '\n';
                        next = this.buffer[i + 1];
                    }
                    else
                        end = i;
                }
                if (next === '#' || (inFlow && flowIndicatorChars.has(next)))
                    break;
                if (ch === '\n') {
                    const cs = this.continueScalar(i + 1);
                    if (cs === -1)
                        break;
                    i = Math.max(i, cs - 2); // to advance, but still account for ' #'
                }
            }
            else {
                if (inFlow && flowIndicatorChars.has(ch))
                    break;
                end = i;
            }
        }
        if (!ch && !this.atEnd)
            return this.setNext('plain-scalar');
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? 'flow' : 'doc';
    }
    *pushCount(n) {
        if (n > 0) {
            yield this.buffer.substr(this.pos, n);
            this.pos += n;
            return n;
        }
        return 0;
    }
    *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
            yield s;
            this.pos += s.length;
            return s.length;
        }
        else if (allowEmpty)
            yield '';
        return 0;
    }
    *pushIndicators() {
        let n = 0;
        loop: while (true) {
            switch (this.charAt(0)) {
                case '!':
                    n += yield* this.pushTag();
                    n += yield* this.pushSpaces(true);
                    continue loop;
                case '&':
                    n += yield* this.pushUntil(isNotAnchorChar);
                    n += yield* this.pushSpaces(true);
                    continue loop;
                case '-': // this is an error
                case '?': // this is an error outside flow collections
                case ':': {
                    const inFlow = this.flowLevel > 0;
                    const ch1 = this.charAt(1);
                    if (isEmpty(ch1) || (inFlow && flowIndicatorChars.has(ch1))) {
                        if (!inFlow)
                            this.indentNext = this.indentValue + 1;
                        else if (this.flowKey)
                            this.flowKey = false;
                        n += yield* this.pushCount(1);
                        n += yield* this.pushSpaces(true);
                        continue loop;
                    }
                }
            }
            break loop;
        }
        return n;
    }
    *pushTag() {
        if (this.charAt(1) === '<') {
            let i = this.pos + 2;
            let ch = this.buffer[i];
            while (!isEmpty(ch) && ch !== '>')
                ch = this.buffer[++i];
            return yield* this.pushToIndex(ch === '>' ? i + 1 : i, false);
        }
        else {
            let i = this.pos + 1;
            let ch = this.buffer[i];
            while (ch) {
                if (tagChars.has(ch))
                    ch = this.buffer[++i];
                else if (ch === '%' &&
                    hexDigits.has(this.buffer[i + 1]) &&
                    hexDigits.has(this.buffer[i + 2])) {
                    ch = this.buffer[(i += 3)];
                }
                else
                    break;
            }
            return yield* this.pushToIndex(i, false);
        }
    }
    *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === '\n')
            return yield* this.pushCount(1);
        else if (ch === '\r' && this.charAt(1) === '\n')
            return yield* this.pushCount(2);
        else
            return 0;
    }
    *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
            ch = this.buffer[++i];
        } while (ch === ' ' || (allowTabs && ch === '\t'));
        const n = i - this.pos;
        if (n > 0) {
            yield this.buffer.substr(this.pos, n);
            this.pos = i;
        }
        return n;
    }
    *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
            ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
    }
}

exports.Lexer = Lexer;


/***/ }),

/***/ 6628:
/***/ ((__unused_webpack_module, exports) => {



/**
 * Tracks newlines during parsing in order to provide an efficient API for
 * determining the one-indexed `{ line, col }` position for any offset
 * within the input.
 */
class LineCounter {
    constructor() {
        this.lineStarts = [];
        /**
         * Should be called in ascending order. Otherwise, call
         * `lineCounter.lineStarts.sort()` before calling `linePos()`.
         */
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        /**
         * Performs a binary search and returns the 1-indexed { line, col }
         * position of `offset`. If `line === 0`, `addNewLine` has never been
         * called or `offset` is before the first known newline.
         */
        this.linePos = (offset) => {
            let low = 0;
            let high = this.lineStarts.length;
            while (low < high) {
                const mid = (low + high) >> 1; // Math.floor((low + high) / 2)
                if (this.lineStarts[mid] < offset)
                    low = mid + 1;
                else
                    high = mid;
            }
            if (this.lineStarts[low] === offset)
                return { line: low + 1, col: 1 };
            if (low === 0)
                return { line: 0, col: offset };
            const start = this.lineStarts[low - 1];
            return { line: low, col: offset - start + 1 };
        };
    }
}

exports.LineCounter = LineCounter;


/***/ }),

/***/ 3456:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var node_process = __nccwpck_require__(932);
var cst = __nccwpck_require__(3461);
var lexer = __nccwpck_require__(361);

function includesToken(list, type) {
    for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
            return true;
    return false;
}
function findNonEmptyIndex(list) {
    for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
            case 'space':
            case 'comment':
            case 'newline':
                break;
            default:
                return i;
        }
    }
    return -1;
}
function isFlowToken(token) {
    switch (token?.type) {
        case 'alias':
        case 'scalar':
        case 'single-quoted-scalar':
        case 'double-quoted-scalar':
        case 'flow-collection':
            return true;
        default:
            return false;
    }
}
function getPrevProps(parent) {
    switch (parent.type) {
        case 'document':
            return parent.start;
        case 'block-map': {
            const it = parent.items[parent.items.length - 1];
            return it.sep ?? it.start;
        }
        case 'block-seq':
            return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
            return [];
    }
}
/** Note: May modify input array */
function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
        return [];
    let i = prev.length;
    loop: while (--i >= 0) {
        switch (prev[i].type) {
            case 'doc-start':
            case 'explicit-key-ind':
            case 'map-value-ind':
            case 'seq-item-ind':
            case 'newline':
                break loop;
        }
    }
    while (prev[++i]?.type === 'space') {
        /* loop */
    }
    return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
    // May exhaust call stack with large `source` array
    if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
    else
        for (let i = 0; i < source.length; ++i)
            target.push(source[i]);
}
function fixFlowSeqItems(fc) {
    if (fc.start.type === 'flow-seq-start') {
        for (const it of fc.items) {
            if (it.sep &&
                !it.value &&
                !includesToken(it.start, 'explicit-key-ind') &&
                !includesToken(it.sep, 'map-value-ind')) {
                if (it.key)
                    it.value = it.key;
                delete it.key;
                if (isFlowToken(it.value)) {
                    if (it.value.end)
                        arrayPushArray(it.value.end, it.sep);
                    else
                        it.value.end = it.sep;
                }
                else
                    arrayPushArray(it.start, it.sep);
                delete it.sep;
            }
        }
    }
}
/**
 * A YAML concrete syntax tree (CST) parser
 *
 * ```ts
 * const src: string = ...
 * for (const token of new Parser().parse(src)) {
 *   // token: Token
 * }
 * ```
 *
 * To use the parser with a user-provided lexer:
 *
 * ```ts
 * function* parse(source: string, lexer: Lexer) {
 *   const parser = new Parser()
 *   for (const lexeme of lexer.lex(source))
 *     yield* parser.next(lexeme)
 *   yield* parser.end()
 * }
 *
 * const src: string = ...
 * const lexer = new Lexer()
 * for (const token of parse(src, lexer)) {
 *   // token: Token
 * }
 * ```
 */
class Parser {
    /**
     * @param onNewLine - If defined, called separately with the start position of
     *   each new line (in `parse()`, including the start of input).
     */
    constructor(onNewLine) {
        /** If true, space and sequence indicators count as indentation */
        this.atNewLine = true;
        /** If true, next token is a scalar value */
        this.atScalar = false;
        /** Current indentation level */
        this.indent = 0;
        /** Current offset since the start of parsing */
        this.offset = 0;
        /** On the same line with a block map key */
        this.onKeyLine = false;
        /** Top indicates the node that's currently being built */
        this.stack = [];
        /** The source of the current token, set in parse() */
        this.source = '';
        /** The type of the current token, set in parse() */
        this.type = '';
        // Must be defined after `next()`
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
    }
    /**
     * Parse `source` as a YAML stream.
     * If `incomplete`, a part of the last line may be left as a buffer for the next call.
     *
     * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
     *
     * @returns A generator of tokens representing each directive, document, and other structure.
     */
    *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
            this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
            yield* this.next(lexeme);
        if (!incomplete)
            yield* this.end();
    }
    /**
     * Advance the parser by the `source` of one lexical token.
     */
    *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
            console.log('|', cst.prettyToken(source));
        if (this.atScalar) {
            this.atScalar = false;
            yield* this.step();
            this.offset += source.length;
            return;
        }
        const type = cst.tokenType(source);
        if (!type) {
            const message = `Not a YAML token: ${source}`;
            yield* this.pop({ type: 'error', offset: this.offset, message, source });
            this.offset += source.length;
        }
        else if (type === 'scalar') {
            this.atNewLine = false;
            this.atScalar = true;
            this.type = 'scalar';
        }
        else {
            this.type = type;
            yield* this.step();
            switch (type) {
                case 'newline':
                    this.atNewLine = true;
                    this.indent = 0;
                    if (this.onNewLine)
                        this.onNewLine(this.offset + source.length);
                    break;
                case 'space':
                    if (this.atNewLine && source[0] === ' ')
                        this.indent += source.length;
                    break;
                case 'explicit-key-ind':
                case 'map-value-ind':
                case 'seq-item-ind':
                    if (this.atNewLine)
                        this.indent += source.length;
                    break;
                case 'doc-mode':
                case 'flow-error-end':
                    return;
                default:
                    this.atNewLine = false;
            }
            this.offset += source.length;
        }
    }
    /** Call at end of input to push out any remaining constructions */
    *end() {
        while (this.stack.length > 0)
            yield* this.pop();
    }
    get sourceToken() {
        const st = {
            type: this.type,
            offset: this.offset,
            indent: this.indent,
            source: this.source
        };
        return st;
    }
    *step() {
        const top = this.peek(1);
        if (this.type === 'doc-end' && top?.type !== 'doc-end') {
            while (this.stack.length > 0)
                yield* this.pop();
            this.stack.push({
                type: 'doc-end',
                offset: this.offset,
                source: this.source
            });
            return;
        }
        if (!top)
            return yield* this.stream();
        switch (top.type) {
            case 'document':
                return yield* this.document(top);
            case 'alias':
            case 'scalar':
            case 'single-quoted-scalar':
            case 'double-quoted-scalar':
                return yield* this.scalar(top);
            case 'block-scalar':
                return yield* this.blockScalar(top);
            case 'block-map':
                return yield* this.blockMap(top);
            case 'block-seq':
                return yield* this.blockSequence(top);
            case 'flow-collection':
                return yield* this.flowCollection(top);
            case 'doc-end':
                return yield* this.documentEnd(top);
        }
        /* istanbul ignore next should not happen */
        yield* this.pop();
    }
    peek(n) {
        return this.stack[this.stack.length - n];
    }
    *pop(error) {
        const token = error ?? this.stack.pop();
        /* istanbul ignore if should not happen */
        if (!token) {
            const message = 'Tried to pop an empty stack';
            yield { type: 'error', offset: this.offset, source: '', message };
        }
        else if (this.stack.length === 0) {
            yield token;
        }
        else {
            const top = this.peek(1);
            if (token.type === 'block-scalar') {
                // Block scalars use their parent rather than header indent
                token.indent = 'indent' in top ? top.indent : 0;
            }
            else if (token.type === 'flow-collection' && top.type === 'document') {
                // Ignore all indent for top-level flow collections
                token.indent = 0;
            }
            if (token.type === 'flow-collection')
                fixFlowSeqItems(token);
            switch (top.type) {
                case 'document':
                    top.value = token;
                    break;
                case 'block-scalar':
                    top.props.push(token); // error
                    break;
                case 'block-map': {
                    const it = top.items[top.items.length - 1];
                    if (it.value) {
                        top.items.push({ start: [], key: token, sep: [] });
                        this.onKeyLine = true;
                        return;
                    }
                    else if (it.sep) {
                        it.value = token;
                    }
                    else {
                        Object.assign(it, { key: token, sep: [] });
                        this.onKeyLine = !it.explicitKey;
                        return;
                    }
                    break;
                }
                case 'block-seq': {
                    const it = top.items[top.items.length - 1];
                    if (it.value)
                        top.items.push({ start: [], value: token });
                    else
                        it.value = token;
                    break;
                }
                case 'flow-collection': {
                    const it = top.items[top.items.length - 1];
                    if (!it || it.value)
                        top.items.push({ start: [], key: token, sep: [] });
                    else if (it.sep)
                        it.value = token;
                    else
                        Object.assign(it, { key: token, sep: [] });
                    return;
                }
                /* istanbul ignore next should not happen */
                default:
                    yield* this.pop();
                    yield* this.pop(token);
            }
            if ((top.type === 'document' ||
                top.type === 'block-map' ||
                top.type === 'block-seq') &&
                (token.type === 'block-map' || token.type === 'block-seq')) {
                const last = token.items[token.items.length - 1];
                if (last &&
                    !last.sep &&
                    !last.value &&
                    last.start.length > 0 &&
                    findNonEmptyIndex(last.start) === -1 &&
                    (token.indent === 0 ||
                        last.start.every(st => st.type !== 'comment' || st.indent < token.indent))) {
                    if (top.type === 'document')
                        top.end = last.start;
                    else
                        top.items.push({ start: last.start });
                    token.items.splice(-1, 1);
                }
            }
        }
    }
    *stream() {
        switch (this.type) {
            case 'directive-line':
                yield { type: 'directive', offset: this.offset, source: this.source };
                return;
            case 'byte-order-mark':
            case 'space':
            case 'comment':
            case 'newline':
                yield this.sourceToken;
                return;
            case 'doc-mode':
            case 'doc-start': {
                const doc = {
                    type: 'document',
                    offset: this.offset,
                    start: []
                };
                if (this.type === 'doc-start')
                    doc.start.push(this.sourceToken);
                this.stack.push(doc);
                return;
            }
        }
        yield {
            type: 'error',
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML stream`,
            source: this.source
        };
    }
    *document(doc) {
        if (doc.value)
            return yield* this.lineEnd(doc);
        switch (this.type) {
            case 'doc-start': {
                if (findNonEmptyIndex(doc.start) !== -1) {
                    yield* this.pop();
                    yield* this.step();
                }
                else
                    doc.start.push(this.sourceToken);
                return;
            }
            case 'anchor':
            case 'tag':
            case 'space':
            case 'comment':
            case 'newline':
                doc.start.push(this.sourceToken);
                return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
            this.stack.push(bv);
        else {
            yield {
                type: 'error',
                offset: this.offset,
                message: `Unexpected ${this.type} token in YAML document`,
                source: this.source
            };
        }
    }
    *scalar(scalar) {
        if (this.type === 'map-value-ind') {
            const prev = getPrevProps(this.peek(2));
            const start = getFirstKeyStartProps(prev);
            let sep;
            if (scalar.end) {
                sep = scalar.end;
                sep.push(this.sourceToken);
                delete scalar.end;
            }
            else
                sep = [this.sourceToken];
            const map = {
                type: 'block-map',
                offset: scalar.offset,
                indent: scalar.indent,
                items: [{ start, key: scalar, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
        }
        else
            yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
        switch (this.type) {
            case 'space':
            case 'comment':
            case 'newline':
                scalar.props.push(this.sourceToken);
                return;
            case 'scalar':
                scalar.source = this.source;
                // block-scalar source includes trailing newline
                this.atNewLine = true;
                this.indent = 0;
                if (this.onNewLine) {
                    let nl = this.source.indexOf('\n') + 1;
                    while (nl !== 0) {
                        this.onNewLine(this.offset + nl);
                        nl = this.source.indexOf('\n', nl) + 1;
                    }
                }
                yield* this.pop();
                break;
            /* istanbul ignore next should not happen */
            default:
                yield* this.pop();
                yield* this.step();
        }
    }
    *blockMap(map) {
        const it = map.items[map.items.length - 1];
        // it.sep is true-ish if pair already has key or : separator
        switch (this.type) {
            case 'newline':
                this.onKeyLine = false;
                if (it.value) {
                    const end = 'end' in it.value ? it.value.end : undefined;
                    const last = Array.isArray(end) ? end[end.length - 1] : undefined;
                    if (last?.type === 'comment')
                        end?.push(this.sourceToken);
                    else
                        map.items.push({ start: [this.sourceToken] });
                }
                else if (it.sep) {
                    it.sep.push(this.sourceToken);
                }
                else {
                    it.start.push(this.sourceToken);
                }
                return;
            case 'space':
            case 'comment':
                if (it.value) {
                    map.items.push({ start: [this.sourceToken] });
                }
                else if (it.sep) {
                    it.sep.push(this.sourceToken);
                }
                else {
                    if (this.atIndentedComment(it.start, map.indent)) {
                        const prev = map.items[map.items.length - 2];
                        const end = prev?.value?.end;
                        if (Array.isArray(end)) {
                            arrayPushArray(end, it.start);
                            end.push(this.sourceToken);
                            map.items.pop();
                            return;
                        }
                    }
                    it.start.push(this.sourceToken);
                }
                return;
        }
        if (this.indent >= map.indent) {
            const atMapIndent = !this.onKeyLine && this.indent === map.indent;
            const atNextItem = atMapIndent &&
                (it.sep || it.explicitKey) &&
                this.type !== 'seq-item-ind';
            // For empty nodes, assign newline-separated not indented empty tokens to following node
            let start = [];
            if (atNextItem && it.sep && !it.value) {
                const nl = [];
                for (let i = 0; i < it.sep.length; ++i) {
                    const st = it.sep[i];
                    switch (st.type) {
                        case 'newline':
                            nl.push(i);
                            break;
                        case 'space':
                            break;
                        case 'comment':
                            if (st.indent > map.indent)
                                nl.length = 0;
                            break;
                        default:
                            nl.length = 0;
                    }
                }
                if (nl.length >= 2)
                    start = it.sep.splice(nl[1]);
            }
            switch (this.type) {
                case 'anchor':
                case 'tag':
                    if (atNextItem || it.value) {
                        start.push(this.sourceToken);
                        map.items.push({ start });
                        this.onKeyLine = true;
                    }
                    else if (it.sep) {
                        it.sep.push(this.sourceToken);
                    }
                    else {
                        it.start.push(this.sourceToken);
                    }
                    return;
                case 'explicit-key-ind':
                    if (!it.sep && !it.explicitKey) {
                        it.start.push(this.sourceToken);
                        it.explicitKey = true;
                    }
                    else if (atNextItem || it.value) {
                        start.push(this.sourceToken);
                        map.items.push({ start, explicitKey: true });
                    }
                    else {
                        this.stack.push({
                            type: 'block-map',
                            offset: this.offset,
                            indent: this.indent,
                            items: [{ start: [this.sourceToken], explicitKey: true }]
                        });
                    }
                    this.onKeyLine = true;
                    return;
                case 'map-value-ind':
                    if (it.explicitKey) {
                        if (!it.sep) {
                            if (includesToken(it.start, 'newline')) {
                                Object.assign(it, { key: null, sep: [this.sourceToken] });
                            }
                            else {
                                const start = getFirstKeyStartProps(it.start);
                                this.stack.push({
                                    type: 'block-map',
                                    offset: this.offset,
                                    indent: this.indent,
                                    items: [{ start, key: null, sep: [this.sourceToken] }]
                                });
                            }
                        }
                        else if (it.value) {
                            map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                        }
                        else if (includesToken(it.sep, 'map-value-ind')) {
                            this.stack.push({
                                type: 'block-map',
                                offset: this.offset,
                                indent: this.indent,
                                items: [{ start, key: null, sep: [this.sourceToken] }]
                            });
                        }
                        else if (isFlowToken(it.key) &&
                            !includesToken(it.sep, 'newline')) {
                            const start = getFirstKeyStartProps(it.start);
                            const key = it.key;
                            const sep = it.sep;
                            sep.push(this.sourceToken);
                            // @ts-expect-error type guard is wrong here
                            delete it.key;
                            // @ts-expect-error type guard is wrong here
                            delete it.sep;
                            this.stack.push({
                                type: 'block-map',
                                offset: this.offset,
                                indent: this.indent,
                                items: [{ start, key, sep }]
                            });
                        }
                        else if (start.length > 0) {
                            // Not actually at next item
                            it.sep = it.sep.concat(start, this.sourceToken);
                        }
                        else {
                            it.sep.push(this.sourceToken);
                        }
                    }
                    else {
                        if (!it.sep) {
                            Object.assign(it, { key: null, sep: [this.sourceToken] });
                        }
                        else if (it.value || atNextItem) {
                            map.items.push({ start, key: null, sep: [this.sourceToken] });
                        }
                        else if (includesToken(it.sep, 'map-value-ind')) {
                            this.stack.push({
                                type: 'block-map',
                                offset: this.offset,
                                indent: this.indent,
                                items: [{ start: [], key: null, sep: [this.sourceToken] }]
                            });
                        }
                        else {
                            it.sep.push(this.sourceToken);
                        }
                    }
                    this.onKeyLine = true;
                    return;
                case 'alias':
                case 'scalar':
                case 'single-quoted-scalar':
                case 'double-quoted-scalar': {
                    const fs = this.flowScalar(this.type);
                    if (atNextItem || it.value) {
                        map.items.push({ start, key: fs, sep: [] });
                        this.onKeyLine = true;
                    }
                    else if (it.sep) {
                        this.stack.push(fs);
                    }
                    else {
                        Object.assign(it, { key: fs, sep: [] });
                        this.onKeyLine = true;
                    }
                    return;
                }
                default: {
                    const bv = this.startBlockValue(map);
                    if (bv) {
                        if (bv.type === 'block-seq') {
                            if (!it.explicitKey &&
                                it.sep &&
                                !includesToken(it.sep, 'newline')) {
                                yield* this.pop({
                                    type: 'error',
                                    offset: this.offset,
                                    message: 'Unexpected block-seq-ind on same line with key',
                                    source: this.source
                                });
                                return;
                            }
                        }
                        else if (atMapIndent) {
                            map.items.push({ start });
                        }
                        this.stack.push(bv);
                        return;
                    }
                }
            }
        }
        yield* this.pop();
        yield* this.step();
    }
    *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
            case 'newline':
                if (it.value) {
                    const end = 'end' in it.value ? it.value.end : undefined;
                    const last = Array.isArray(end) ? end[end.length - 1] : undefined;
                    if (last?.type === 'comment')
                        end?.push(this.sourceToken);
                    else
                        seq.items.push({ start: [this.sourceToken] });
                }
                else
                    it.start.push(this.sourceToken);
                return;
            case 'space':
            case 'comment':
                if (it.value)
                    seq.items.push({ start: [this.sourceToken] });
                else {
                    if (this.atIndentedComment(it.start, seq.indent)) {
                        const prev = seq.items[seq.items.length - 2];
                        const end = prev?.value?.end;
                        if (Array.isArray(end)) {
                            arrayPushArray(end, it.start);
                            end.push(this.sourceToken);
                            seq.items.pop();
                            return;
                        }
                    }
                    it.start.push(this.sourceToken);
                }
                return;
            case 'anchor':
            case 'tag':
                if (it.value || this.indent <= seq.indent)
                    break;
                it.start.push(this.sourceToken);
                return;
            case 'seq-item-ind':
                if (this.indent !== seq.indent)
                    break;
                if (it.value || includesToken(it.start, 'seq-item-ind'))
                    seq.items.push({ start: [this.sourceToken] });
                else
                    it.start.push(this.sourceToken);
                return;
        }
        if (this.indent > seq.indent) {
            const bv = this.startBlockValue(seq);
            if (bv) {
                this.stack.push(bv);
                return;
            }
        }
        yield* this.pop();
        yield* this.step();
    }
    *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === 'flow-error-end') {
            let top;
            do {
                yield* this.pop();
                top = this.peek(1);
            } while (top?.type === 'flow-collection');
        }
        else if (fc.end.length === 0) {
            switch (this.type) {
                case 'comma':
                case 'explicit-key-ind':
                    if (!it || it.sep)
                        fc.items.push({ start: [this.sourceToken] });
                    else
                        it.start.push(this.sourceToken);
                    return;
                case 'map-value-ind':
                    if (!it || it.value)
                        fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
                    else if (it.sep)
                        it.sep.push(this.sourceToken);
                    else
                        Object.assign(it, { key: null, sep: [this.sourceToken] });
                    return;
                case 'space':
                case 'comment':
                case 'newline':
                case 'anchor':
                case 'tag':
                    if (!it || it.value)
                        fc.items.push({ start: [this.sourceToken] });
                    else if (it.sep)
                        it.sep.push(this.sourceToken);
                    else
                        it.start.push(this.sourceToken);
                    return;
                case 'alias':
                case 'scalar':
                case 'single-quoted-scalar':
                case 'double-quoted-scalar': {
                    const fs = this.flowScalar(this.type);
                    if (!it || it.value)
                        fc.items.push({ start: [], key: fs, sep: [] });
                    else if (it.sep)
                        this.stack.push(fs);
                    else
                        Object.assign(it, { key: fs, sep: [] });
                    return;
                }
                case 'flow-map-end':
                case 'flow-seq-end':
                    fc.end.push(this.sourceToken);
                    return;
            }
            const bv = this.startBlockValue(fc);
            /* istanbul ignore else should not happen */
            if (bv)
                this.stack.push(bv);
            else {
                yield* this.pop();
                yield* this.step();
            }
        }
        else {
            const parent = this.peek(2);
            if (parent.type === 'block-map' &&
                ((this.type === 'map-value-ind' && parent.indent === fc.indent) ||
                    (this.type === 'newline' &&
                        !parent.items[parent.items.length - 1].sep))) {
                yield* this.pop();
                yield* this.step();
            }
            else if (this.type === 'map-value-ind' &&
                parent.type !== 'flow-collection') {
                const prev = getPrevProps(parent);
                const start = getFirstKeyStartProps(prev);
                fixFlowSeqItems(fc);
                const sep = fc.end.splice(1, fc.end.length);
                sep.push(this.sourceToken);
                const map = {
                    type: 'block-map',
                    offset: fc.offset,
                    indent: fc.indent,
                    items: [{ start, key: fc, sep }]
                };
                this.onKeyLine = true;
                this.stack[this.stack.length - 1] = map;
            }
            else {
                yield* this.lineEnd(fc);
            }
        }
    }
    flowScalar(type) {
        if (this.onNewLine) {
            let nl = this.source.indexOf('\n') + 1;
            while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf('\n', nl) + 1;
            }
        }
        return {
            type,
            offset: this.offset,
            indent: this.indent,
            source: this.source
        };
    }
    startBlockValue(parent) {
        switch (this.type) {
            case 'alias':
            case 'scalar':
            case 'single-quoted-scalar':
            case 'double-quoted-scalar':
                return this.flowScalar(this.type);
            case 'block-scalar-header':
                return {
                    type: 'block-scalar',
                    offset: this.offset,
                    indent: this.indent,
                    props: [this.sourceToken],
                    source: ''
                };
            case 'flow-map-start':
            case 'flow-seq-start':
                return {
                    type: 'flow-collection',
                    offset: this.offset,
                    indent: this.indent,
                    start: this.sourceToken,
                    items: [],
                    end: []
                };
            case 'seq-item-ind':
                return {
                    type: 'block-seq',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [this.sourceToken] }]
                };
            case 'explicit-key-ind': {
                this.onKeyLine = true;
                const prev = getPrevProps(parent);
                const start = getFirstKeyStartProps(prev);
                start.push(this.sourceToken);
                return {
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, explicitKey: true }]
                };
            }
            case 'map-value-ind': {
                this.onKeyLine = true;
                const prev = getPrevProps(parent);
                const start = getFirstKeyStartProps(prev);
                return {
                    type: 'block-map',
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                };
            }
        }
        return null;
    }
    atIndentedComment(start, indent) {
        if (this.type !== 'comment')
            return false;
        if (this.indent <= indent)
            return false;
        return start.every(st => st.type === 'newline' || st.type === 'space');
    }
    *documentEnd(docEnd) {
        if (this.type !== 'doc-mode') {
            if (docEnd.end)
                docEnd.end.push(this.sourceToken);
            else
                docEnd.end = [this.sourceToken];
            if (this.type === 'newline')
                yield* this.pop();
        }
    }
    *lineEnd(token) {
        switch (this.type) {
            case 'comma':
            case 'doc-start':
            case 'doc-end':
            case 'flow-seq-end':
            case 'flow-map-end':
            case 'map-value-ind':
                yield* this.pop();
                yield* this.step();
                break;
            case 'newline':
                this.onKeyLine = false;
            // fallthrough
            case 'space':
            case 'comment':
            default:
                // all other values are errors
                if (token.end)
                    token.end.push(this.sourceToken);
                else
                    token.end = [this.sourceToken];
                if (this.type === 'newline')
                    yield* this.pop();
        }
    }
}

exports.Parser = Parser;


/***/ }),

/***/ 4047:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var composer = __nccwpck_require__(9984);
var Document = __nccwpck_require__(3021);
var errors = __nccwpck_require__(1464);
var log = __nccwpck_require__(7249);
var identity = __nccwpck_require__(1127);
var lineCounter = __nccwpck_require__(6628);
var parser = __nccwpck_require__(3456);

function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || (prettyErrors && new lineCounter.LineCounter()) || null;
    return { lineCounter: lineCounter$1, prettyErrors };
}
/**
 * Parse the input as a stream of YAML documents.
 *
 * Documents should be separated from each other by `...` or `---` marker lines.
 *
 * @returns If an empty `docs` array is returned, it will be of type
 *   EmptyStream and contain additional stream information. In
 *   TypeScript, you should use `'empty' in docs` as a type guard for it.
 */
function parseAllDocuments(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter)
        for (const doc of docs) {
            doc.errors.forEach(errors.prettifyError(source, lineCounter));
            doc.warnings.forEach(errors.prettifyError(source, lineCounter));
        }
    if (docs.length > 0)
        return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
}
/** Parse an input string into a single YAML.Document */
function parseDocument(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    // `doc` is always set by compose.end(true) at the very latest
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
            doc = _doc;
        else if (doc.options.logLevel !== 'silent') {
            doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), 'MULTIPLE_DOCS', 'Source contains multiple documents; please use YAML.parseAllDocuments()'));
            break;
        }
    }
    if (prettyErrors && lineCounter) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter));
    }
    return doc;
}
function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === 'function') {
        _reviver = reviver;
    }
    else if (options === undefined && reviver && typeof reviver === 'object') {
        options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
        return null;
    doc.warnings.forEach(warning => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
        if (doc.options.logLevel !== 'silent')
            throw doc.errors[0];
        else
            doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
}
function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === 'function' || Array.isArray(replacer)) {
        _replacer = replacer;
    }
    else if (options === undefined && replacer) {
        options = replacer;
    }
    if (typeof options === 'string')
        options = options.length;
    if (typeof options === 'number') {
        const indent = Math.round(options);
        options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
            return undefined;
    }
    if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
}

exports.parse = parse;
exports.parseAllDocuments = parseAllDocuments;
exports.parseDocument = parseDocument;
exports.stringify = stringify;


/***/ }),

/***/ 5840:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var map = __nccwpck_require__(7451);
var seq = __nccwpck_require__(1706);
var string = __nccwpck_require__(6464);
var tags = __nccwpck_require__(18);

const sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat)
            ? tags.getTags(compat, 'compat')
            : compat
                ? tags.getTags(null, compat)
                : null;
        this.name = (typeof schema === 'string' && schema) || 'core';
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        // Used by createMap()
        this.sortMapEntries =
            typeof sortMapEntries === 'function'
                ? sortMapEntries
                : sortMapEntries === true
                    ? sortMapEntriesByKey
                    : null;
    }
    clone() {
        const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
    }
}

exports.Schema = Schema;


/***/ }),

/***/ 7451:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var YAMLMap = __nccwpck_require__(4454);

const map = {
    collection: 'map',
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: 'tag:yaml.org,2002:map',
    resolve(map, onError) {
        if (!identity.isMap(map))
            onError('Expected a mapping for this tag');
        return map;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
};

exports.map = map;


/***/ }),

/***/ 3632:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);

const nullTag = {
    identify: value => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: 'tag:yaml.org,2002:null',
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === 'string' && nullTag.test.test(source)
        ? source
        : ctx.options.nullStr
};

exports.nullTag = nullTag;


/***/ }),

/***/ 1706:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var YAMLSeq = __nccwpck_require__(2223);

const seq = {
    collection: 'seq',
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: 'tag:yaml.org,2002:seq',
    resolve(seq, onError) {
        if (!identity.isSeq(seq))
            onError('Expected a sequence for this tag');
        return seq;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
};

exports.seq = seq;


/***/ }),

/***/ 6464:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var stringifyString = __nccwpck_require__(3069);

const string = {
    identify: value => typeof value === 'string',
    default: true,
    tag: 'tag:yaml.org,2002:str',
    resolve: str => str,
    stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
};

exports.string = string;


/***/ }),

/***/ 3959:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);

const boolTag = {
    identify: value => typeof value === 'boolean',
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: str => new Scalar.Scalar(str[0] === 't' || str[0] === 'T'),
    stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
            const sv = source[0] === 't' || source[0] === 'T';
            if (value === sv)
                return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
};

exports.boolTag = boolTag;


/***/ }),

/***/ 8405:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);
var stringifyNumber = __nccwpck_require__(8689);

const floatNaN = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: str => str.slice(-3).toLowerCase() === 'nan'
        ? NaN
        : str[0] === '-'
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
};
const floatExp = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'EXP',
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: str => parseFloat(str),
    stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
};
const float = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf('.');
        if (dot !== -1 && str[str.length - 1] === '0')
            node.minFractionDigits = str.length - dot - 1;
        return node;
    },
    stringify: stringifyNumber.stringifyNumber
};

exports.float = float;
exports.floatExp = floatExp;
exports.floatNaN = floatNaN;


/***/ }),

/***/ 9874:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var stringifyNumber = __nccwpck_require__(8689);

const intIdentify = (value) => typeof value === 'bigint' || Number.isInteger(value);
const intResolve = (str, offset, radix, { intAsBigInt }) => (intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix));
function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
}
const intOct = {
    identify: value => intIdentify(value) && value >= 0,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'OCT',
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: node => intStringify(node, 8, '0o')
};
const int = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
};
const intHex = {
    identify: value => intIdentify(value) && value >= 0,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'HEX',
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: node => intStringify(node, 16, '0x')
};

exports.int = int;
exports.intHex = intHex;
exports.intOct = intOct;


/***/ }),

/***/ 896:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var map = __nccwpck_require__(7451);
var _null = __nccwpck_require__(3632);
var seq = __nccwpck_require__(1706);
var string = __nccwpck_require__(6464);
var bool = __nccwpck_require__(3959);
var float = __nccwpck_require__(8405);
var int = __nccwpck_require__(9874);

const schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
];

exports.schema = schema;


/***/ }),

/***/ 3559:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);
var map = __nccwpck_require__(7451);
var seq = __nccwpck_require__(1706);

function intIdentify(value) {
    return typeof value === 'bigint' || Number.isInteger(value);
}
const stringifyJSON = ({ value }) => JSON.stringify(value);
const jsonScalars = [
    {
        identify: value => typeof value === 'string',
        default: true,
        tag: 'tag:yaml.org,2002:str',
        resolve: str => str,
        stringify: stringifyJSON
    },
    {
        identify: value => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: 'tag:yaml.org,2002:null',
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
    },
    {
        identify: value => typeof value === 'boolean',
        default: true,
        tag: 'tag:yaml.org,2002:bool',
        test: /^true$|^false$/,
        resolve: str => str === 'true',
        stringify: stringifyJSON
    },
    {
        identify: intIdentify,
        default: true,
        tag: 'tag:yaml.org,2002:int',
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
        identify: value => typeof value === 'number',
        default: true,
        tag: 'tag:yaml.org,2002:float',
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: str => parseFloat(str),
        stringify: stringifyJSON
    }
];
const jsonError = {
    default: true,
    tag: '',
    test: /^/,
    resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
    }
};
const schema = [map.map, seq.seq].concat(jsonScalars, jsonError);

exports.schema = schema;


/***/ }),

/***/ 18:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var map = __nccwpck_require__(7451);
var _null = __nccwpck_require__(3632);
var seq = __nccwpck_require__(1706);
var string = __nccwpck_require__(6464);
var bool = __nccwpck_require__(3959);
var float = __nccwpck_require__(8405);
var int = __nccwpck_require__(9874);
var schema = __nccwpck_require__(896);
var schema$1 = __nccwpck_require__(3559);
var binary = __nccwpck_require__(6083);
var merge = __nccwpck_require__(452);
var omap = __nccwpck_require__(303);
var pairs = __nccwpck_require__(8385);
var schema$2 = __nccwpck_require__(5913);
var set = __nccwpck_require__(1528);
var timestamp = __nccwpck_require__(6752);

const schemas = new Map([
    ['core', schema.schema],
    ['failsafe', [map.map, seq.seq, string.string]],
    ['json', schema$1.schema],
    ['yaml11', schema$2.schema],
    ['yaml-1.1', schema$2.schema]
]);
const tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
};
const coreKnownTags = {
    'tag:yaml.org,2002:binary': binary.binary,
    'tag:yaml.org,2002:merge': merge.merge,
    'tag:yaml.org,2002:omap': omap.omap,
    'tag:yaml.org,2002:pairs': pairs.pairs,
    'tag:yaml.org,2002:set': set.set,
    'tag:yaml.org,2002:timestamp': timestamp.timestamp
};
function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge)
            ? schemaTags.concat(merge.merge)
            : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
        if (Array.isArray(customTags))
            tags = [];
        else {
            const keys = Array.from(schemas.keys())
                .filter(key => key !== 'yaml11')
                .map(key => JSON.stringify(key))
                .join(', ');
            throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
    }
    if (Array.isArray(customTags)) {
        for (const tag of customTags)
            tags = tags.concat(tag);
    }
    else if (typeof customTags === 'function') {
        tags = customTags(tags.slice());
    }
    if (addMergeTag)
        tags = tags.concat(merge.merge);
    return tags.reduce((tags, tag) => {
        const tagObj = typeof tag === 'string' ? tagsByName[tag] : tag;
        if (!tagObj) {
            const tagName = JSON.stringify(tag);
            const keys = Object.keys(tagsByName)
                .map(key => JSON.stringify(key))
                .join(', ');
            throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags.includes(tagObj))
            tags.push(tagObj);
        return tags;
    }, []);
}

exports.coreKnownTags = coreKnownTags;
exports.getTags = getTags;


/***/ }),

/***/ 6083:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var node_buffer = __nccwpck_require__(181);
var Scalar = __nccwpck_require__(3301);
var stringifyString = __nccwpck_require__(3069);

const binary = {
    identify: value => value instanceof Uint8Array, // Buffer inherits from Uint8Array
    default: false,
    tag: 'tag:yaml.org,2002:binary',
    /**
     * Returns a Buffer in node and an Uint8Array in browsers
     *
     * To use the resulting buffer as an image, you'll want to do something like:
     *
     *   const blob = new Blob([buffer], { type: 'image/jpeg' })
     *   document.querySelector('#photo').src = URL.createObjectURL(blob)
     */
    resolve(src, onError) {
        if (typeof node_buffer.Buffer === 'function') {
            return node_buffer.Buffer.from(src, 'base64');
        }
        else if (typeof atob === 'function') {
            // On IE 11, atob() can't handle newlines
            const str = atob(src.replace(/[\n\r]/g, ''));
            const buffer = new Uint8Array(str.length);
            for (let i = 0; i < str.length; ++i)
                buffer[i] = str.charCodeAt(i);
            return buffer;
        }
        else {
            onError('This environment does not support reading binary tags; either Buffer or atob is required');
            return src;
        }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
            return '';
        const buf = value; // checked earlier by binary.identify()
        let str;
        if (typeof node_buffer.Buffer === 'function') {
            str =
                buf instanceof node_buffer.Buffer
                    ? buf.toString('base64')
                    : node_buffer.Buffer.from(buf.buffer).toString('base64');
        }
        else if (typeof btoa === 'function') {
            let s = '';
            for (let i = 0; i < buf.length; ++i)
                s += String.fromCharCode(buf[i]);
            str = btoa(s);
        }
        else {
            throw new Error('This environment does not support writing binary tags; either Buffer or btoa is required');
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
            const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
            const n = Math.ceil(str.length / lineWidth);
            const lines = new Array(n);
            for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
                lines[i] = str.substr(o, lineWidth);
            }
            str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? '\n' : ' ');
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
};

exports.binary = binary;


/***/ }),

/***/ 8398:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);

function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
        return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
}
const trueTag = {
    identify: value => value === true,
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
};
const falseTag = {
    identify: value => value === false,
    default: true,
    tag: 'tag:yaml.org,2002:bool',
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
};

exports.falseTag = falseTag;
exports.trueTag = trueTag;


/***/ }),

/***/ 5782:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);
var stringifyNumber = __nccwpck_require__(8689);

const floatNaN = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === 'nan'
        ? NaN
        : str[0] === '-'
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
};
const floatExp = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'EXP',
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, '')),
    stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
};
const float = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, '')));
        const dot = str.indexOf('.');
        if (dot !== -1) {
            const f = str.substring(dot + 1).replace(/_/g, '');
            if (f[f.length - 1] === '0')
                node.minFractionDigits = f.length;
        }
        return node;
    },
    stringify: stringifyNumber.stringifyNumber
};

exports.float = float;
exports.floatExp = floatExp;
exports.floatNaN = floatNaN;


/***/ }),

/***/ 873:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var stringifyNumber = __nccwpck_require__(8689);

const intIdentify = (value) => typeof value === 'bigint' || Number.isInteger(value);
function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === '-' || sign === '+')
        offset += 1;
    str = str.substring(offset).replace(/_/g, '');
    if (intAsBigInt) {
        switch (radix) {
            case 2:
                str = `0b${str}`;
                break;
            case 8:
                str = `0o${str}`;
                break;
            case 16:
                str = `0x${str}`;
                break;
        }
        const n = BigInt(str);
        return sign === '-' ? BigInt(-1) * n : n;
    }
    const n = parseInt(str, radix);
    return sign === '-' ? -1 * n : n;
}
function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? '-' + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
}
const intBin = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'BIN',
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: node => intStringify(node, 2, '0b')
};
const intOct = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'OCT',
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: node => intStringify(node, 8, '0')
};
const int = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
};
const intHex = {
    identify: intIdentify,
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'HEX',
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: node => intStringify(node, 16, '0x')
};

exports.int = int;
exports.intBin = intBin;
exports.intHex = intHex;
exports.intOct = intOct;


/***/ }),

/***/ 452:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Scalar = __nccwpck_require__(3301);

// If the value associated with a merge key is a single mapping node, each of
// its key/value pairs is inserted into the current mapping, unless the key
// already exists in it. If the value associated with the merge key is a
// sequence, then this sequence is expected to contain mapping nodes and each
// of these nodes is merged in turn according to its order in the sequence.
// Keys in mapping nodes earlier in the sequence override keys specified in
// later mapping nodes. -- http://yaml.org/type/merge.html
const MERGE_KEY = '<<';
const merge = {
    identify: value => value === MERGE_KEY ||
        (typeof value === 'symbol' && value.description === MERGE_KEY),
    default: 'key',
    tag: 'tag:yaml.org,2002:merge',
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
};
const isMergeKey = (ctx, key) => (merge.identify(key) ||
    (identity.isScalar(key) &&
        (!key.type || key.type === Scalar.Scalar.PLAIN) &&
        merge.identify(key.value))) &&
    ctx?.doc.schema.tags.some(tag => tag.tag === merge.tag && tag.default);
function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
        for (const it of source.items)
            mergeValue(ctx, map, it);
    else if (Array.isArray(source))
        for (const it of source)
            mergeValue(ctx, map, it);
    else
        mergeValue(ctx, map, source);
}
function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
        throw new Error('Merge sources must be maps or map aliases');
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value] of srcMap) {
        if (map instanceof Map) {
            if (!map.has(key))
                map.set(key, value);
        }
        else if (map instanceof Set) {
            map.add(key);
        }
        else if (!Object.prototype.hasOwnProperty.call(map, key)) {
            Object.defineProperty(map, key, {
                value,
                writable: true,
                enumerable: true,
                configurable: true
            });
        }
    }
    return map;
}
function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}

exports.addMergeToJSMap = addMergeToJSMap;
exports.isMergeKey = isMergeKey;
exports.merge = merge;


/***/ }),

/***/ 303:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var toJS = __nccwpck_require__(4043);
var YAMLMap = __nccwpck_require__(4454);
var YAMLSeq = __nccwpck_require__(2223);
var pairs = __nccwpck_require__(8385);

class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = YAMLOMap.tag;
    }
    /**
     * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
     * but TypeScript won't allow widening the signature of a child method.
     */
    toJSON(_, ctx) {
        if (!ctx)
            return super.toJSON(_);
        const map = new Map();
        if (ctx?.onCreate)
            ctx.onCreate(map);
        for (const pair of this.items) {
            let key, value;
            if (identity.isPair(pair)) {
                key = toJS.toJS(pair.key, '', ctx);
                value = toJS.toJS(pair.value, key, ctx);
            }
            else {
                key = toJS.toJS(pair, '', ctx);
            }
            if (map.has(key))
                throw new Error('Ordered maps must not include duplicate keys');
            map.set(key, value);
        }
        return map;
    }
    static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap = new this();
        omap.items = pairs$1.items;
        return omap;
    }
}
YAMLOMap.tag = 'tag:yaml.org,2002:omap';
const omap = {
    collection: 'seq',
    identify: value => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: 'tag:yaml.org,2002:omap',
    resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
            if (identity.isScalar(key)) {
                if (seenKeys.includes(key.value)) {
                    onError(`Ordered maps must not include duplicate keys: ${key.value}`);
                }
                else {
                    seenKeys.push(key.value);
                }
            }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
};

exports.YAMLOMap = YAMLOMap;
exports.omap = omap;


/***/ }),

/***/ 8385:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Pair = __nccwpck_require__(7165);
var Scalar = __nccwpck_require__(3301);
var YAMLSeq = __nccwpck_require__(2223);

function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
            let item = seq.items[i];
            if (identity.isPair(item))
                continue;
            else if (identity.isMap(item)) {
                if (item.items.length > 1)
                    onError('Each pair must have its own sequence indicator');
                const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
                if (item.commentBefore)
                    pair.key.commentBefore = pair.key.commentBefore
                        ? `${item.commentBefore}\n${pair.key.commentBefore}`
                        : item.commentBefore;
                if (item.comment) {
                    const cn = pair.value ?? pair.key;
                    cn.comment = cn.comment
                        ? `${item.comment}\n${cn.comment}`
                        : item.comment;
                }
                item = pair;
            }
            seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
    }
    else
        onError('Expected a sequence for this tag');
    return seq;
}
function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs = new YAMLSeq.YAMLSeq(schema);
    pairs.tag = 'tag:yaml.org,2002:pairs';
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
            if (typeof replacer === 'function')
                it = replacer.call(iterable, String(i++), it);
            let key, value;
            if (Array.isArray(it)) {
                if (it.length === 2) {
                    key = it[0];
                    value = it[1];
                }
                else
                    throw new TypeError(`Expected [key, value] tuple: ${it}`);
            }
            else if (it && it instanceof Object) {
                const keys = Object.keys(it);
                if (keys.length === 1) {
                    key = keys[0];
                    value = it[key];
                }
                else {
                    throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
                }
            }
            else {
                key = it;
            }
            pairs.items.push(Pair.createPair(key, value, ctx));
        }
    return pairs;
}
const pairs = {
    collection: 'seq',
    default: false,
    tag: 'tag:yaml.org,2002:pairs',
    resolve: resolvePairs,
    createNode: createPairs
};

exports.createPairs = createPairs;
exports.pairs = pairs;
exports.resolvePairs = resolvePairs;


/***/ }),

/***/ 5913:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var map = __nccwpck_require__(7451);
var _null = __nccwpck_require__(3632);
var seq = __nccwpck_require__(1706);
var string = __nccwpck_require__(6464);
var binary = __nccwpck_require__(6083);
var bool = __nccwpck_require__(8398);
var float = __nccwpck_require__(5782);
var int = __nccwpck_require__(873);
var merge = __nccwpck_require__(452);
var omap = __nccwpck_require__(303);
var pairs = __nccwpck_require__(8385);
var set = __nccwpck_require__(1528);
var timestamp = __nccwpck_require__(6752);

const schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
];

exports.schema = schema;


/***/ }),

/***/ 1528:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Pair = __nccwpck_require__(7165);
var YAMLMap = __nccwpck_require__(4454);

class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
        super(schema);
        this.tag = YAMLSet.tag;
    }
    add(key) {
        let pair;
        if (identity.isPair(key))
            pair = key;
        else if (key &&
            typeof key === 'object' &&
            'key' in key &&
            'value' in key &&
            key.value === null)
            pair = new Pair.Pair(key.key, null);
        else
            pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
            this.items.push(pair);
    }
    /**
     * If `keepPair` is `true`, returns the Pair matching `key`.
     * Otherwise, returns the value of that Pair's key.
     */
    get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair)
            ? identity.isScalar(pair.key)
                ? pair.key.value
                : pair.key
            : pair;
    }
    set(key, value) {
        if (typeof value !== 'boolean')
            throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
            this.items.splice(this.items.indexOf(prev), 1);
        }
        else if (!prev && value) {
            this.items.push(new Pair.Pair(key));
        }
    }
    toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
        if (!ctx)
            return JSON.stringify(this);
        if (this.hasAllNullValues(true))
            return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
            throw new Error('Set items must all have null values');
    }
    static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
            for (let value of iterable) {
                if (typeof replacer === 'function')
                    value = replacer.call(iterable, value, value);
                set.items.push(Pair.createPair(value, null, ctx));
            }
        return set;
    }
}
YAMLSet.tag = 'tag:yaml.org,2002:set';
const set = {
    collection: 'map',
    identify: value => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: 'tag:yaml.org,2002:set',
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
        if (identity.isMap(map)) {
            if (map.hasAllNullValues(true))
                return Object.assign(new YAMLSet(), map);
            else
                onError('Set items must all have null values');
        }
        else
            onError('Expected a mapping for this tag');
        return map;
    }
};

exports.YAMLSet = YAMLSet;
exports.set = set;


/***/ }),

/***/ 6752:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var stringifyNumber = __nccwpck_require__(8689);

/** Internal types handle bigint as number, because TS can't figure it out. */
function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === '-' || sign === '+' ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts
        .replace(/_/g, '')
        .split(':')
        .reduce((res, p) => res * num(60) + num(p), num(0));
    return (sign === '-' ? num(-1) * res : res);
}
/**
 * hhhh:mm:ss.sss
 *
 * Internal types handle bigint as number, because TS can't figure it out.
 */
function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === 'bigint')
        num = n => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
    let sign = '';
    if (value < 0) {
        sign = '-';
        value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60]; // seconds, including ms
    if (value < 60) {
        parts.unshift(0); // at least one : is required
    }
    else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60); // minutes
        if (value >= 60) {
            value = (value - parts[0]) / _60;
            parts.unshift(value); // hours
        }
    }
    return (sign +
        parts
            .map(n => String(n).padStart(2, '0'))
            .join(':')
            .replace(/000000\d*$/, '') // % 60 may introduce error
    );
}
const intTime = {
    identify: value => typeof value === 'bigint' || Number.isInteger(value),
    default: true,
    tag: 'tag:yaml.org,2002:int',
    format: 'TIME',
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
};
const floatTime = {
    identify: value => typeof value === 'number',
    default: true,
    tag: 'tag:yaml.org,2002:float',
    format: 'TIME',
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: str => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
};
const timestamp = {
    identify: value => value instanceof Date,
    default: true,
    tag: 'tag:yaml.org,2002:timestamp',
    // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
    // may be omitted altogether, resulting in a date format. In such a case, the time part is
    // assumed to be 00:00:00Z (start of day, UTC).
    test: RegExp('^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})' + // YYYY-Mm-Dd
        '(?:' + // time is optional
        '(?:t|T|[ \\t]+)' + // t | T | whitespace
        '([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)' + // Hh:Mm:Ss(.ss)?
        '(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?' + // Z | +5 | -03:30
        ')?$'),
    resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
            throw new Error('!!timestamp expects a date, starting with yyyy-mm-dd');
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + '00').substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== 'Z') {
            let d = parseSexagesimal(tz, false);
            if (Math.abs(d) < 30)
                d *= 60;
            date -= 60000 * d;
        }
        return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, '') ?? ''
};

exports.floatTime = floatTime;
exports.intTime = intTime;
exports.timestamp = timestamp;


/***/ }),

/***/ 4475:
/***/ ((__unused_webpack_module, exports) => {



const FOLD_FLOW = 'flow';
const FOLD_BLOCK = 'block';
const FOLD_QUOTED = 'quoted';
/**
 * Tries to keep input at up to `lineWidth` characters, splitting only on spaces
 * not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
 * terminated with `\n` and started with `indent`.
 */
function foldFlowLines(text, indent, mode = 'flow', { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
        return text;
    if (lineWidth < minContentWidth)
        minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
        return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === 'number') {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
            folds.push(0);
        else
            end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
            end = i + endStep;
    }
    for (let ch; (ch = text[(i += 1)]);) {
        if (mode === FOLD_QUOTED && ch === '\\') {
            escStart = i;
            switch (text[i + 1]) {
                case 'x':
                    i += 3;
                    break;
                case 'u':
                    i += 5;
                    break;
                case 'U':
                    i += 9;
                    break;
                default:
                    i += 1;
            }
            escEnd = i;
        }
        if (ch === '\n') {
            if (mode === FOLD_BLOCK)
                i = consumeMoreIndentedLines(text, i, indent.length);
            end = i + indent.length + endStep;
            split = undefined;
        }
        else {
            if (ch === ' ' &&
                prev &&
                prev !== ' ' &&
                prev !== '\n' &&
                prev !== '\t') {
                // space surrounded by non-space can be replaced with newline + indent
                const next = text[i + 1];
                if (next && next !== ' ' && next !== '\n' && next !== '\t')
                    split = i;
            }
            if (i >= end) {
                if (split) {
                    folds.push(split);
                    end = split + endStep;
                    split = undefined;
                }
                else if (mode === FOLD_QUOTED) {
                    // white-space collected at end may stretch past lineWidth
                    while (prev === ' ' || prev === '\t') {
                        prev = ch;
                        ch = text[(i += 1)];
                        overflow = true;
                    }
                    // Account for newline escape, but don't break preceding escape
                    const j = i > escEnd + 1 ? i - 2 : escStart - 1;
                    // Bail out if lineWidth & minContentWidth are shorter than an escape string
                    if (escapedFolds[j])
                        return text;
                    folds.push(j);
                    escapedFolds[j] = true;
                    end = j + endStep;
                    split = undefined;
                }
                else {
                    overflow = true;
                }
            }
        }
        prev = ch;
    }
    if (overflow && onOverflow)
        onOverflow();
    if (folds.length === 0)
        return text;
    if (onFold)
        onFold();
    let res = text.slice(0, folds[0]);
    for (let i = 0; i < folds.length; ++i) {
        const fold = folds[i];
        const end = folds[i + 1] || text.length;
        if (fold === 0)
            res = `\n${indent}${text.slice(0, end)}`;
        else {
            if (mode === FOLD_QUOTED && escapedFolds[fold])
                res += `${text[fold]}\\`;
            res += `\n${indent}${text.slice(fold + 1, end)}`;
        }
    }
    return res;
}
/**
 * Presumes `i + 1` is at the start of a line
 * @returns index of last newline in more-indented block
 */
function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === ' ' || ch === '\t') {
        if (i < start + indent) {
            ch = text[++i];
        }
        else {
            do {
                ch = text[++i];
            } while (ch && ch !== '\n');
            end = i;
            start = i + 1;
            ch = text[start];
        }
    }
    return end;
}

exports.FOLD_BLOCK = FOLD_BLOCK;
exports.FOLD_FLOW = FOLD_FLOW;
exports.FOLD_QUOTED = FOLD_QUOTED;
exports.foldFlowLines = foldFlowLines;


/***/ }),

/***/ 2148:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var anchors = __nccwpck_require__(1596);
var identity = __nccwpck_require__(1127);
var stringifyComment = __nccwpck_require__(9799);
var stringifyString = __nccwpck_require__(3069);

function createStringifyContext(doc, options) {
    const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: 'PLAIN',
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: 'false',
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: 'null',
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: 'true',
        verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
        case 'block':
            inFlow = false;
            break;
        case 'flow':
            inFlow = true;
            break;
        default:
            inFlow = null;
    }
    return {
        anchors: new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? ' ' : '',
        indent: '',
        indentStep: typeof opt.indent === 'number' ? ' '.repeat(opt.indent) : '  ',
        inFlow,
        options: opt
    };
}
function getTagObject(tags, item) {
    if (item.tag) {
        const match = tags.filter(t => t.tag === item.tag);
        if (match.length > 0)
            return match.find(t => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter(t => t.identify?.(obj));
        if (match.length > 1) {
            const testMatch = match.filter(t => t.test);
            if (testMatch.length > 0)
                match = testMatch;
        }
        tagObj =
            match.find(t => t.format === item.format) ?? match.find(t => !t.format);
    }
    else {
        obj = item;
        tagObj = tags.find(t => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? 'null' : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
}
// needs to be called before value stringifier to allow for circular anchor refs
function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
        return '';
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
        props.push(doc.directives.tagString(tag));
    return props.join(' ');
}
function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
        if (ctx.doc.directives)
            return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
            throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        }
        else {
            if (ctx.resolvedAliases)
                ctx.resolvedAliases.add(item);
            else
                ctx.resolvedAliases = new Set([item]);
            item = item.resolve(ctx.doc);
        }
    }
    let tagObj = undefined;
    const node = identity.isNode(item)
        ? item
        : ctx.doc.createNode(item, { onTagObj: o => (tagObj = o) });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === 'function'
        ? tagObj.stringify(node, ctx, onComment, onChompKeep)
        : identity.isScalar(node)
            ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep)
            : node.toString(ctx, onComment, onChompKeep);
    if (!props)
        return str;
    return identity.isScalar(node) || str[0] === '{' || str[0] === '['
        ? `${props} ${str}`
        : `${props}\n${ctx.indent}${str}`;
}

exports.createStringifyContext = createStringifyContext;
exports.stringify = stringify;


/***/ }),

/***/ 1212:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var stringify = __nccwpck_require__(2148);
var stringifyComment = __nccwpck_require__(9799);

function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false; // flag for the preceding node's status
    const lines = [];
    for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
            if (!chompKeep && item.spaceBefore)
                lines.push('');
            addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
            if (item.comment)
                comment = item.comment;
        }
        else if (identity.isPair(item)) {
            const ik = identity.isNode(item.key) ? item.key : null;
            if (ik) {
                if (!chompKeep && ik.spaceBefore)
                    lines.push('');
                addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
            }
        }
        chompKeep = false;
        let str = stringify.stringify(item, itemCtx, () => (comment = null), () => (chompKeep = true));
        if (comment)
            str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        if (chompKeep && comment)
            chompKeep = false;
        lines.push(blockItemPrefix + str);
    }
    let str;
    if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
    }
    else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
            const line = lines[i];
            str += line ? `\n${indent}${line}` : '\n';
        }
    }
    if (comment) {
        str += '\n' + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
            onComment();
    }
    else if (chompKeep && onChompKeep)
        onChompKeep();
    return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
            if (item.spaceBefore)
                lines.push('');
            addCommentBefore(ctx, lines, item.commentBefore, false);
            if (item.comment)
                comment = item.comment;
        }
        else if (identity.isPair(item)) {
            const ik = identity.isNode(item.key) ? item.key : null;
            if (ik) {
                if (ik.spaceBefore)
                    lines.push('');
                addCommentBefore(ctx, lines, ik.commentBefore, false);
                if (ik.comment)
                    reqNewline = true;
            }
            const iv = identity.isNode(item.value) ? item.value : null;
            if (iv) {
                if (iv.comment)
                    comment = iv.comment;
                if (iv.commentBefore)
                    reqNewline = true;
            }
            else if (item.value == null && ik?.comment) {
                comment = ik.comment;
            }
        }
        if (comment)
            reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => (comment = null));
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes('\n'));
        if (i < items.length - 1) {
            str += ',';
        }
        else if (ctx.options.trailingComma) {
            if (ctx.options.lineWidth > 0) {
                reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) +
                    (str.length + 2) >
                    ctx.options.lineWidth);
            }
            if (reqNewline) {
                str += ',';
            }
        }
        if (comment)
            str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
        return start + end;
    }
    else {
        if (!reqNewline) {
            const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
            reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
            let str = start;
            for (const line of lines)
                str += line ? `\n${indentStep}${indent}${line}` : '\n';
            return `${str}\n${indent}${end}`;
        }
        else {
            return `${start}${fcPadding}${lines.join(' ')}${fcPadding}${end}`;
        }
    }
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
        comment = comment.replace(/^\n+/, '');
    if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart()); // Avoid double indent on first line
    }
}

exports.stringifyCollection = stringifyCollection;


/***/ }),

/***/ 9799:
/***/ ((__unused_webpack_module, exports) => {



/**
 * Stringifies a comment.
 *
 * Empty comment lines are left empty,
 * lines consisting of a single space are replaced by `#`,
 * and all other lines are prefixed with a `#`.
 */
const stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, '#');
function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
        return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
const lineComment = (str, indent, comment) => str.endsWith('\n')
    ? indentComment(comment, indent)
    : comment.includes('\n')
        ? '\n' + indentComment(comment, indent)
        : (str.endsWith(' ') ? '' : ' ') + comment;

exports.indentComment = indentComment;
exports.lineComment = lineComment;
exports.stringifyComment = stringifyComment;


/***/ }),

/***/ 6829:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var stringify = __nccwpck_require__(2148);
var stringifyComment = __nccwpck_require__(9799);

function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
            lines.push(dir);
            hasDirectives = true;
        }
        else if (doc.directives.docStart)
            hasDirectives = true;
    }
    if (hasDirectives)
        lines.push('---');
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
        if (lines.length !== 1)
            lines.unshift('');
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ''));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
        if (identity.isNode(doc.contents)) {
            if (doc.contents.spaceBefore && hasDirectives)
                lines.push('');
            if (doc.contents.commentBefore) {
                const cs = commentString(doc.contents.commentBefore);
                lines.push(stringifyComment.indentComment(cs, ''));
            }
            // top-level block scalars need to be indented if followed by a comment
            ctx.forceBlockIndent = !!doc.comment;
            contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? undefined : () => (chompKeep = true);
        let body = stringify.stringify(doc.contents, ctx, () => (contentComment = null), onChompKeep);
        if (contentComment)
            body += stringifyComment.lineComment(body, '', commentString(contentComment));
        if ((body[0] === '|' || body[0] === '>') &&
            lines[lines.length - 1] === '---') {
            // Top-level block scalars with a preceding doc marker ought to use the
            // same line for their header.
            lines[lines.length - 1] = `--- ${body}`;
        }
        else
            lines.push(body);
    }
    else {
        lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
        if (doc.comment) {
            const cs = commentString(doc.comment);
            if (cs.includes('\n')) {
                lines.push('...');
                lines.push(stringifyComment.indentComment(cs, ''));
            }
            else {
                lines.push(`... ${cs}`);
            }
        }
        else {
            lines.push('...');
        }
    }
    else {
        let dc = doc.comment;
        if (dc && chompKeep)
            dc = dc.replace(/^\n+/, '');
        if (dc) {
            if ((!chompKeep || contentComment) && lines[lines.length - 1] !== '')
                lines.push('');
            lines.push(stringifyComment.indentComment(commentString(dc), ''));
        }
    }
    return lines.join('\n') + '\n';
}

exports.stringifyDocument = stringifyDocument;


/***/ }),

/***/ 8689:
/***/ ((__unused_webpack_module, exports) => {



function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === 'bigint')
        return String(value);
    const num = typeof value === 'number' ? value : Number(value);
    if (!isFinite(num))
        return isNaN(num) ? '.nan' : num < 0 ? '-.inf' : '.inf';
    let n = Object.is(value, -0) ? '-0' : JSON.stringify(value);
    if (!format &&
        minFractionDigits &&
        (!tag || tag === 'tag:yaml.org,2002:float') &&
        /^-?\d/.test(n) &&
        !n.includes('e')) {
        let i = n.indexOf('.');
        if (i < 0) {
            i = n.length;
            n += '.';
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
            n += '0';
    }
    return n;
}

exports.stringifyNumber = stringifyNumber;


/***/ }),

/***/ 9748:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);
var Scalar = __nccwpck_require__(3301);
var stringify = __nccwpck_require__(2148);
var stringifyComment = __nccwpck_require__(9799);

function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = (identity.isNode(key) && key.comment) || null;
    if (simpleKeys) {
        if (keyComment) {
            throw new Error('With simple keys, key nodes cannot have comments');
        }
        if (identity.isCollection(key) || (!identity.isNode(key) && typeof key === 'object')) {
            const msg = 'With simple keys, collection cannot be used as a key value';
            throw new Error(msg);
        }
    }
    let explicitKey = !simpleKeys &&
        (!key ||
            (keyComment && value == null && !ctx.inFlow) ||
            identity.isCollection(key) ||
            (identity.isScalar(key)
                ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL
                : typeof key === 'object'));
    ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => (keyCommentDone = true), () => (chompKeep = true));
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
            throw new Error('With simple keys, single line scalar must not span more than 1024 characters');
        explicitKey = true;
    }
    if (ctx.inFlow) {
        if (allNullValues || value == null) {
            if (keyCommentDone && onComment)
                onComment();
            return str === '' ? '?' : explicitKey ? `? ${str}` : str;
        }
    }
    else if ((allNullValues && !simpleKeys) || (value == null && explicitKey)) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
            str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        }
        else if (chompKeep && onChompKeep)
            onChompKeep();
        return str;
    }
    if (keyCommentDone)
        keyComment = null;
    if (explicitKey) {
        if (keyComment)
            str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}\n${indent}:`;
    }
    else {
        str = `${str}:`;
        if (keyComment)
            str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
    }
    else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === 'object')
            value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq &&
        indentStep.length >= 2 &&
        !ctx.inFlow &&
        !explicitKey &&
        identity.isSeq(value) &&
        !value.flow &&
        !value.tag &&
        !value.anchor) {
        // If indentSeq === false, consider '- ' as part of indentation where possible
        ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => (valueCommentDone = true), () => (chompKeep = true));
    let ws = ' ';
    if (keyComment || vsb || vcb) {
        ws = vsb ? '\n' : '';
        if (vcb) {
            const cs = commentString(vcb);
            ws += `\n${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === '' && !ctx.inFlow) {
            if (ws === '\n' && valueComment)
                ws = '\n\n';
        }
        else {
            ws += `\n${ctx.indent}`;
        }
    }
    else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf('\n');
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
            let hasPropsLine = false;
            if (hasNewline && (vs0 === '&' || vs0 === '!')) {
                let sp0 = valueStr.indexOf(' ');
                if (vs0 === '&' &&
                    sp0 !== -1 &&
                    sp0 < nl0 &&
                    valueStr[sp0 + 1] === '!') {
                    sp0 = valueStr.indexOf(' ', sp0 + 1);
                }
                if (sp0 === -1 || nl0 < sp0)
                    hasPropsLine = true;
            }
            if (!hasPropsLine)
                ws = `\n${ctx.indent}`;
        }
    }
    else if (valueStr === '' || valueStr[0] === '\n') {
        ws = '';
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
        if (valueCommentDone && onComment)
            onComment();
    }
    else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    }
    else if (chompKeep && onChompKeep) {
        onChompKeep();
    }
    return str;
}

exports.stringifyPair = stringifyPair;


/***/ }),

/***/ 3069:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var Scalar = __nccwpck_require__(3301);
var foldFlowLines = __nccwpck_require__(4475);

const getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
});
// Also checks for lines starting with %, as parsing the output as YAML 1.1 will
// presume that's starting a new document.
const containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
        return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
        return false;
    for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === '\n') {
            if (i - start > limit)
                return true;
            start = i + 1;
            if (strLen - start <= limit)
                return false;
        }
    }
    return true;
}
function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
        return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
    let str = '';
    let start = 0;
    for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === ' ' && json[i + 1] === '\\' && json[i + 2] === 'n') {
            // space before newline needs to be escaped to not be folded
            str += json.slice(start, i) + '\\ ';
            i += 1;
            start = i;
            ch = '\\';
        }
        if (ch === '\\')
            switch (json[i + 1]) {
                case 'u':
                    {
                        str += json.slice(start, i);
                        const code = json.substr(i + 2, 4);
                        switch (code) {
                            case '0000':
                                str += '\\0';
                                break;
                            case '0007':
                                str += '\\a';
                                break;
                            case '000b':
                                str += '\\v';
                                break;
                            case '001b':
                                str += '\\e';
                                break;
                            case '0085':
                                str += '\\N';
                                break;
                            case '00a0':
                                str += '\\_';
                                break;
                            case '2028':
                                str += '\\L';
                                break;
                            case '2029':
                                str += '\\P';
                                break;
                            default:
                                if (code.substr(0, 2) === '00')
                                    str += '\\x' + code.substr(2);
                                else
                                    str += json.substr(i, 6);
                        }
                        i += 5;
                        start = i + 1;
                    }
                    break;
                case 'n':
                    if (implicitKey ||
                        json[i + 2] === '"' ||
                        json.length < minMultiLineLength) {
                        i += 1;
                    }
                    else {
                        // folding will eat first newline
                        str += json.slice(start, i) + '\n\n';
                        while (json[i + 2] === '\\' &&
                            json[i + 3] === 'n' &&
                            json[i + 4] !== '"') {
                            str += '\n';
                            i += 2;
                        }
                        str += indent;
                        // space after newline needs to be escaped to not be folded
                        if (json[i + 2] === ' ')
                            str += '\\';
                        i += 1;
                        start = i + 1;
                    }
                    break;
                default:
                    i += 1;
            }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey
        ? str
        : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false ||
        (ctx.implicitKey && value.includes('\n')) ||
        /[ \t]\n|\n[ \t]/.test(value) // single quoted string can't have leading or trailing whitespace around newline
    )
        return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? '  ' : '');
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
    return ctx.implicitKey
        ? res
        : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
        qs = doubleQuotedString;
    else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
            qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
            qs = doubleQuotedString;
        else
            qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
}
// The negative lookbehind avoids a polynomial search,
// but isn't supported yet on Safari: https://caniuse.com/js-regexp-lookbehind
let blockEndNewlines;
try {
    blockEndNewlines = new RegExp('(^|(?<!\n))\n+(?!\n|$)', 'g');
}
catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    // 1. Block can't end in whitespace unless the last line is non-empty.
    // 2. Strings consisting of only whitespace are best rendered explicitly.
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
    }
    const indent = ctx.indent ||
        (ctx.forceBlockIndent || containsDocumentMarker(value) ? '  ' : '');
    const literal = blockQuote === 'literal'
        ? true
        : blockQuote === 'folded' || type === Scalar.Scalar.BLOCK_FOLDED
            ? false
            : type === Scalar.Scalar.BLOCK_LITERAL
                ? true
                : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
        return literal ? '|\n' : '>\n';
    // determine chomping from whitespace at value end
    let chomp;
    let endStart;
    for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== '\n' && ch !== '\t' && ch !== ' ')
            break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf('\n');
    if (endNlPos === -1) {
        chomp = '-'; // strip
    }
    else if (value === end || endNlPos !== end.length - 1) {
        chomp = '+'; // keep
        if (onChompKeep)
            onChompKeep();
    }
    else {
        chomp = ''; // clip
    }
    if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === '\n')
            end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    // determine indent indicator from whitespace at value start
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === ' ')
            startWithSpace = true;
        else if (ch === '\n')
            startNlPos = startEnd;
        else
            break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? '2' : '1'; // root is at -1
    // Leading | or > is added later
    let header = (startWithSpace ? indentSize : '') + chomp;
    if (comment) {
        header += ' ' + commentString(comment.replace(/ ?[\r\n]+/g, ' '));
        if (onComment)
            onComment();
    }
    if (!literal) {
        const foldedValue = value
            .replace(/\n+/g, '\n$&')
            .replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, '$1$2') // more-indented lines aren't folded
            //                ^ more-ind. ^ empty     ^ capture next empty lines only at end of indent
            .replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== 'folded' && type !== Scalar.Scalar.BLOCK_FOLDED) {
            foldOptions.onOverflow = () => {
                literalFallback = true;
            };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
            return `>${header}\n${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}\n${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if ((implicitKey && value.includes('\n')) ||
        (inFlow && /[[\]{},]/.test(value))) {
        return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        // not allowed:
        // - '-' or '?'
        // - start with an indicator character (except [?:-]) or /[?-] /
        // - '\n ', ': ' or ' \n' anywhere
        // - '#' not preceded by a non-space char
        // - end with ' ' or ':'
        return implicitKey || inFlow || !value.includes('\n')
            ? quotedString(value, ctx)
            : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey &&
        !inFlow &&
        type !== Scalar.Scalar.PLAIN &&
        value.includes('\n')) {
        // Where allowed & type not set explicitly, prefer block style for multiline strings
        return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
        if (indent === '') {
            ctx.forceBlockIndent = true;
            return blockString(item, ctx, onComment, onChompKeep);
        }
        else if (implicitKey && indent === indentStep) {
            return quotedString(value, ctx);
        }
    }
    const str = value.replace(/\n+/g, `$&\n${indent}`);
    // Verify that output will be parsed as a string, as e.g. plain numbers and
    // booleans get parsed with those types in v1.2 (e.g. '42', 'true' & '0.9e-3'),
    // and others in v1.1.
    if (actualString) {
        const test = (tag) => tag.default && tag.tag !== 'tag:yaml.org,2002:str' && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
            return quotedString(value, ctx);
    }
    return implicitKey
        ? str
        : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === 'string'
        ? item
        : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        // force double quotes on control characters & unpaired surrogates
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
            type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
        switch (_type) {
            case Scalar.Scalar.BLOCK_FOLDED:
            case Scalar.Scalar.BLOCK_LITERAL:
                return implicitKey || inFlow
                    ? quotedString(ss.value, ctx) // blocks are not valid inside flow containers
                    : blockString(ss, ctx, onComment, onChompKeep);
            case Scalar.Scalar.QUOTE_DOUBLE:
                return doubleQuotedString(ss.value, ctx);
            case Scalar.Scalar.QUOTE_SINGLE:
                return singleQuotedString(ss.value, ctx);
            case Scalar.Scalar.PLAIN:
                return plainString(ss, ctx, onComment, onChompKeep);
            default:
                return null;
        }
    };
    let res = _stringify(type);
    if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = (implicitKey && defaultKeyType) || defaultStringType;
        res = _stringify(t);
        if (res === null)
            throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
}

exports.stringifyString = stringifyString;


/***/ }),

/***/ 204:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {



var identity = __nccwpck_require__(1127);

const BREAK = Symbol('break visit');
const SKIP = Symbol('skip children');
const REMOVE = Symbol('remove node');
/**
 * Apply a visitor to an AST node or document.
 *
 * Walks through the tree (depth-first) starting from `node`, calling a
 * `visitor` function with three arguments:
 *   - `key`: For sequence values and map `Pair`, the node's index in the
 *     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
 *     `null` for the root node.
 *   - `node`: The current node.
 *   - `path`: The ancestry of the current node.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this node, continue with next
 *     sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current node, then continue with the next one
 *   - `Node`: Replace the current node, then continue by visiting it
 *   - `number`: While iterating the items of a sequence or map, set the index
 *     of the next step. This is useful especially if the index of the current
 *     node has changed.
 *
 * If `visitor` is a single function, it will be called with all values
 * encountered in the tree, including e.g. `null` values. Alternatively,
 * separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
 * `Alias` and `Scalar` node. To define the same visitor function for more than
 * one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
 * and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
 * specific defined one will be used for each node.
 */
function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
            node.contents = null;
    }
    else
        visit_(null, node, visitor_, Object.freeze([]));
}
// Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.
/** Terminate visit traversal completely */
visit.BREAK = BREAK;
/** Do not visit the children of the current node */
visit.SKIP = SKIP;
/** Remove the current node */
visit.REMOVE = REMOVE;
function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== 'symbol') {
        if (identity.isCollection(node)) {
            path = Object.freeze(path.concat(node));
            for (let i = 0; i < node.items.length; ++i) {
                const ci = visit_(i, node.items[i], visitor, path);
                if (typeof ci === 'number')
                    i = ci - 1;
                else if (ci === BREAK)
                    return BREAK;
                else if (ci === REMOVE) {
                    node.items.splice(i, 1);
                    i -= 1;
                }
            }
        }
        else if (identity.isPair(node)) {
            path = Object.freeze(path.concat(node));
            const ck = visit_('key', node.key, visitor, path);
            if (ck === BREAK)
                return BREAK;
            else if (ck === REMOVE)
                node.key = null;
            const cv = visit_('value', node.value, visitor, path);
            if (cv === BREAK)
                return BREAK;
            else if (cv === REMOVE)
                node.value = null;
        }
    }
    return ctrl;
}
/**
 * Apply an async visitor to an AST node or document.
 *
 * Walks through the tree (depth-first) starting from `node`, calling a
 * `visitor` function with three arguments:
 *   - `key`: For sequence values and map `Pair`, the node's index in the
 *     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
 *     `null` for the root node.
 *   - `node`: The current node.
 *   - `path`: The ancestry of the current node.
 *
 * The return value of the visitor may be used to control the traversal:
 *   - `Promise`: Must resolve to one of the following values
 *   - `undefined` (default): Do nothing and continue
 *   - `visit.SKIP`: Do not visit the children of this node, continue with next
 *     sibling
 *   - `visit.BREAK`: Terminate traversal completely
 *   - `visit.REMOVE`: Remove the current node, then continue with the next one
 *   - `Node`: Replace the current node, then continue by visiting it
 *   - `number`: While iterating the items of a sequence or map, set the index
 *     of the next step. This is useful especially if the index of the current
 *     node has changed.
 *
 * If `visitor` is a single function, it will be called with all values
 * encountered in the tree, including e.g. `null` values. Alternatively,
 * separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
 * `Alias` and `Scalar` node. To define the same visitor function for more than
 * one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
 * and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
 * specific defined one will be used for each node.
 */
async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
            node.contents = null;
    }
    else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
}
// Without the `as symbol` casts, TS declares these in the `visit`
// namespace using `var`, but then complains about that because
// `unique symbol` must be `const`.
/** Terminate visit traversal completely */
visitAsync.BREAK = BREAK;
/** Do not visit the children of the current node */
visitAsync.SKIP = SKIP;
/** Remove the current node */
visitAsync.REMOVE = REMOVE;
async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== 'symbol') {
        if (identity.isCollection(node)) {
            path = Object.freeze(path.concat(node));
            for (let i = 0; i < node.items.length; ++i) {
                const ci = await visitAsync_(i, node.items[i], visitor, path);
                if (typeof ci === 'number')
                    i = ci - 1;
                else if (ci === BREAK)
                    return BREAK;
                else if (ci === REMOVE) {
                    node.items.splice(i, 1);
                    i -= 1;
                }
            }
        }
        else if (identity.isPair(node)) {
            path = Object.freeze(path.concat(node));
            const ck = await visitAsync_('key', node.key, visitor, path);
            if (ck === BREAK)
                return BREAK;
            else if (ck === REMOVE)
                node.key = null;
            const cv = await visitAsync_('value', node.value, visitor, path);
            if (cv === BREAK)
                return BREAK;
            else if (cv === REMOVE)
                node.value = null;
        }
    }
    return ctrl;
}
function initVisitor(visitor) {
    if (typeof visitor === 'object' &&
        (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
            Alias: visitor.Node,
            Map: visitor.Node,
            Scalar: visitor.Node,
            Seq: visitor.Node
        }, visitor.Value && {
            Map: visitor.Value,
            Scalar: visitor.Value,
            Seq: visitor.Value
        }, visitor.Collection && {
            Map: visitor.Collection,
            Seq: visitor.Collection
        }, visitor);
    }
    return visitor;
}
function callVisitor(key, node, visitor, path) {
    if (typeof visitor === 'function')
        return visitor(key, node, path);
    if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
    if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
    if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
    if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
    if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
    return undefined;
}
function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (identity.isCollection(parent)) {
        parent.items[key] = node;
    }
    else if (identity.isPair(parent)) {
        if (key === 'key')
            parent.key = node;
        else
            parent.value = node;
    }
    else if (identity.isDocument(parent)) {
        parent.contents = node;
    }
    else {
        const pt = identity.isAlias(parent) ? 'alias' : 'scalar';
        throw new Error(`Cannot replace node with ${pt} parent`);
    }
}

exports.visit = visit;
exports.visitAsync = visitAsync;


/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __nccwpck_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	var threw = true;
/******/ 	try {
/******/ 		__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 		threw = false;
/******/ 	} finally {
/******/ 		if(threw) delete __webpack_module_cache__[moduleId];
/******/ 	}
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__nccwpck_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__nccwpck_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

// NAMESPACE OBJECT: ./src/rules/unpinned-action.js
var unpinned_action_namespaceObject = {};
__nccwpck_require__.r(unpinned_action_namespaceObject);
__nccwpck_require__.d(unpinned_action_namespaceObject, {
  check: () => (check),
  description: () => (description),
  id: () => (id),
  severity: () => (severity)
});

// NAMESPACE OBJECT: ./src/rules/unpinned-docker-action.js
var unpinned_docker_action_namespaceObject = {};
__nccwpck_require__.r(unpinned_docker_action_namespaceObject);
__nccwpck_require__.d(unpinned_docker_action_namespaceObject, {
  check: () => (unpinned_docker_action_check),
  description: () => (unpinned_docker_action_description),
  id: () => (unpinned_docker_action_id),
  severity: () => (unpinned_docker_action_severity)
});

// NAMESPACE OBJECT: ./src/rules/unpinned-container-image.js
var unpinned_container_image_namespaceObject = {};
__nccwpck_require__.r(unpinned_container_image_namespaceObject);
__nccwpck_require__.d(unpinned_container_image_namespaceObject, {
  check: () => (unpinned_container_image_check),
  description: () => (unpinned_container_image_description),
  id: () => (unpinned_container_image_id),
  severity: () => (unpinned_container_image_severity)
});

// NAMESPACE OBJECT: ./src/rules/excessive-permissions.js
var excessive_permissions_namespaceObject = {};
__nccwpck_require__.r(excessive_permissions_namespaceObject);
__nccwpck_require__.d(excessive_permissions_namespaceObject, {
  check: () => (excessive_permissions_check),
  description: () => (excessive_permissions_description),
  id: () => (excessive_permissions_id),
  severity: () => (excessive_permissions_severity)
});

// NAMESPACE OBJECT: ./src/rules/secrets-in-env.js
var secrets_in_env_namespaceObject = {};
__nccwpck_require__.r(secrets_in_env_namespaceObject);
__nccwpck_require__.d(secrets_in_env_namespaceObject, {
  check: () => (secrets_in_env_check),
  description: () => (secrets_in_env_description),
  id: () => (secrets_in_env_id),
  severity: () => (secrets_in_env_severity)
});

// NAMESPACE OBJECT: ./src/rules/script-injection.js
var script_injection_namespaceObject = {};
__nccwpck_require__.r(script_injection_namespaceObject);
__nccwpck_require__.d(script_injection_namespaceObject, {
  check: () => (script_injection_check),
  description: () => (script_injection_description),
  id: () => (script_injection_id),
  severity: () => (script_injection_severity)
});

// NAMESPACE OBJECT: ./src/rules/pull-request-target-checkout.js
var pull_request_target_checkout_namespaceObject = {};
__nccwpck_require__.r(pull_request_target_checkout_namespaceObject);
__nccwpck_require__.d(pull_request_target_checkout_namespaceObject, {
  check: () => (pull_request_target_checkout_check),
  checkoutOfUntrustedPr: () => (checkoutOfUntrustedPr),
  description: () => (pull_request_target_checkout_description),
  fetchesUntrustedPrCode: () => (fetchesUntrustedPrCode),
  id: () => (pull_request_target_checkout_id),
  severity: () => (pull_request_target_checkout_severity)
});

// NAMESPACE OBJECT: ./src/rules/reusable-workflow-secrets.js
var reusable_workflow_secrets_namespaceObject = {};
__nccwpck_require__.r(reusable_workflow_secrets_namespaceObject);
__nccwpck_require__.d(reusable_workflow_secrets_namespaceObject, {
  check: () => (reusable_workflow_secrets_check),
  description: () => (reusable_workflow_secrets_description),
  id: () => (reusable_workflow_secrets_id),
  severity: () => (reusable_workflow_secrets_severity)
});

// NAMESPACE OBJECT: ./src/rules/untrusted-self-hosted-runner.js
var untrusted_self_hosted_runner_namespaceObject = {};
__nccwpck_require__.r(untrusted_self_hosted_runner_namespaceObject);
__nccwpck_require__.d(untrusted_self_hosted_runner_namespaceObject, {
  check: () => (untrusted_self_hosted_runner_check),
  description: () => (untrusted_self_hosted_runner_description),
  id: () => (untrusted_self_hosted_runner_id),
  severity: () => (untrusted_self_hosted_runner_severity)
});

// NAMESPACE OBJECT: ./src/rules/workflow-run-artifact-execution.js
var workflow_run_artifact_execution_namespaceObject = {};
__nccwpck_require__.r(workflow_run_artifact_execution_namespaceObject);
__nccwpck_require__.d(workflow_run_artifact_execution_namespaceObject, {
  check: () => (workflow_run_artifact_execution_check),
  description: () => (workflow_run_artifact_execution_description),
  id: () => (workflow_run_artifact_execution_id),
  severity: () => (workflow_run_artifact_execution_severity)
});

// NAMESPACE OBJECT: ./src/rules/workflow-structure.js
var workflow_structure_namespaceObject = {};
__nccwpck_require__.r(workflow_structure_namespaceObject);
__nccwpck_require__.d(workflow_structure_namespaceObject, {
  check: () => (workflow_structure_check),
  description: () => (workflow_structure_description),
  id: () => (workflow_structure_id),
  severity: () => (workflow_structure_severity)
});

;// CONCATENATED MODULE: external "node:fs/promises"
const promises_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:fs/promises");
;// CONCATENATED MODULE: external "node:path"
const external_node_path_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:path");
;// CONCATENATED MODULE: external "node:crypto"
const external_node_crypto_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:crypto");
// EXTERNAL MODULE: ./node_modules/yaml/dist/index.js
var dist = __nccwpck_require__(8815);
;// CONCATENATED MODULE: ./src/lib/parser.js
/**
 * YAML workflow parser.
 *
 * Parses GitHub Actions workflow files into a structure annotated with line
 * numbers for every job, step, and `uses:` reference. Line numbers refer to
 * 1-indexed positions in the source.
 */




/**
 * @typedef {object} ActionRef
 * @property {string} raw            - e.g. `actions/checkout@v3` or `./local`
 * @property {string|null} owner
 * @property {string|null} repo
 * @property {string|null} subpath   - reusable-workflow sub-path
 * @property {string|null} ref       - tag, branch, or SHA after `@`
 * @property {'external'|'reusable-workflow'|'local'|'self'|'docker'|'unknown'} kind
 * @property {number} line
 * @property {number} column
 * @property {number} start
 * @property {number} end
 * @property {number} lineStart
 * @property {number} lineEnd
 * @property {boolean} alias
 */

/**
 * @typedef {object} ImageRef
 * @property {string} raw
 * @property {number} line
 * @property {number} start
 * @property {number} end
 * @property {string} context
 * @property {string|null} jobName
 */

/**
 * @typedef {object} StepNode
 * @property {string|null} name
 * @property {string|null} id
 * @property {boolean} ifDeclared
 * @property {ActionRef|null} uses
 * @property {boolean} usesDeclared
 * @property {string|null} run
 * @property {boolean} runDeclared
 * @property {unknown} env
 * @property {unknown} with_
 * @property {string|null} workingDirectory
 * @property {string|null} shell
 * @property {boolean} shellDeclared
 * @property {'wait'|'wait-all'|'cancel'|'parallel'|null} control
 * @property {unknown} controlValue
 * @property {number} primaryCount
 * @property {unknown} background
 * @property {boolean} backgroundDeclared
 * @property {boolean} parallelValid
 * @property {number} parallelDepth
 * @property {number} line
 * @property {number} runLine
 * @property {number} envLine
 */

/**
 * @typedef {object} JobNode
 * @property {string} name
 * @property {unknown} permissions
 * @property {boolean} permissionsDeclared
 * @property {unknown} runsOn
 * @property {boolean} runsOnDeclared
 * @property {unknown} env
 * @property {ActionRef|null} uses
 * @property {boolean} usesDeclared
 * @property {unknown} with_
 * @property {unknown} secrets
 * @property {StepNode[]} steps
 * @property {boolean} stepsDeclared
 * @property {boolean} stepsValid
 * @property {boolean} validMapping
 * @property {number} line
 * @property {number} permissionsLine
 * @property {number} envLine
 */

/**
 * @typedef {object} WorkflowDoc
 * @property {string} path
 * @property {string} source
 * @property {'workflow'|'composite-action'|'unknown'} kind
 * @property {string|null} name
 * @property {unknown} on
 * @property {boolean} onDeclared
 * @property {unknown} permissions
 * @property {boolean} permissionsDeclared
 * @property {object|null} env
 * @property {JobNode[]} jobs
 * @property {ImageRef[]} images
 * @property {number} permissionsLine
 * @property {number} envLine
 * @property {object} raw         - the parsed plain object (for rules to query)
 */

/**
 * @param {string} raw e.g. `actions/checkout@v3` or `./local`
 * @param {number} line
 * @param {{column?: number, start?: number, end?: number, lineStart?: number, lineEnd?: number}} [location]
 * @returns {ActionRef}
 */
function parseActionRef(raw, line, location = {}) {
  /** @type {ActionRef} */
  const base = {
    raw,
    owner: null,
    repo: null,
    subpath: null,
    ref: null,
    kind: 'unknown',
    line,
    column: location.column ?? 0,
    start: location.start ?? 0,
    end: location.end ?? 0,
    lineStart: location.lineStart ?? 0,
    lineEnd: location.lineEnd ?? 0,
    alias: Boolean(location.alias),
  };
  if (typeof raw !== 'string' || raw.length === 0) return base;
  if (raw.startsWith('./') || raw.startsWith('../')) {
    return { ...base, kind: 'local' };
  }
  if (raw.startsWith('$/')) {
    return { ...base, kind: 'self' };
  }
  if (raw.startsWith('docker://')) {
    return { ...base, kind: 'docker' };
  }
  const atIndex = raw.lastIndexOf('@');
  if (atIndex <= 0) return base;
  const left = raw.slice(0, atIndex);
  const ref = raw.slice(atIndex + 1);
  const parts = left.split('/');
  if (parts.length < 2) return base;
  const owner = parts[0];
  const repo = parts[1];
  const rest = parts.slice(2).join('/');
  const kind = /\.(yml|yaml)$/.test(rest) ? 'reusable-workflow' : 'external';
  return { ...base, owner, repo, subpath: rest || null, ref, kind };
}

/**
 * Find the 1-based line of a Pair/Scalar node within the YAML document.
 *
 * @param {string} source
 * @param {{range?: number[]}} node
 * @returns {number}
 */
function lineFromRange(source, node) {
  if (!node || !node.range || node.range.length === 0) return 0;
  const offset = node.range[0];
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/**
 * Return exact source offsets for a scalar node.
 *
 * @param {string} source
 * @param {{range?: number[]}} node
 */
function locationFromRange(source, node) {
  const start = node?.range?.[0] ?? 0;
  const end = node?.range?.[1] ?? start;
  const lineStart = source.lastIndexOf('\n', Math.max(start - 1, 0)) + 1;
  const newline = source.indexOf('\n', end);
  const lineEnd = newline === -1 ? source.length : newline;
  return {
    start,
    end,
    lineStart,
    lineEnd,
    column: start - lineStart + 1,
  };
}

/**
 * Read a Pair value into a JS scalar where possible.
 *
 * @param {unknown} node
 */
function toJs(node) {
  if (node == null) return null;
  if (typeof node !== 'object') return node;
  if ('toJSON' in node && typeof node.toJSON === 'function') return node.toJSON();
  return node;
}

/**
 * Locate a child Pair by key within a YAMLMap.
 *
 * @param {object} map  - yaml YAMLMap node
 * @param {string} key
 * @returns {object|null}
 */
function findPair(map, key) {
  if (!map || !(0,dist/* isMap */.jh)(map)) return null;
  for (const item of map.items) {
    if ((0,dist/* isPair */.tO)(item) && (0,dist/* isScalar */.jn)(item.key) && item.key.value === key) {
      return item;
    }
  }
  return null;
}

/**
 * @param {string} source
 * @param {object} stepsNode
 * @param {number} [parallelDepth]
 * @returns {StepNode[]}
 */
function extractSteps(source, stepsNode, doc, parallelDepth = 0) {
  if (!(0,dist/* isSeq */.oP)(stepsNode)) return [];
  const steps = [];
  for (const stepNode of stepsNode.items) {
    if (!(0,dist/* isMap */.jh)(stepNode)) continue;
    const usesPair = findPair(stepNode, 'uses');
    const runPair = findPair(stepNode, 'run');
    const namePair = findPair(stepNode, 'name');
    const idPair = findPair(stepNode, 'id');
    const ifPair = findPair(stepNode, 'if');
    const envPair = findPair(stepNode, 'env');
    const withPair = findPair(stepNode, 'with');
    const workingDirectoryPair = findPair(stepNode, 'working-directory');
    const shellPair = findPair(stepNode, 'shell');
    const waitPair = findPair(stepNode, 'wait');
    const waitAllPair = findPair(stepNode, 'wait-all');
    const cancelPair = findPair(stepNode, 'cancel');
    const parallelPair = findPair(stepNode, 'parallel');
    const backgroundPair = findPair(stepNode, 'background');
    const controlPairs = [
      ['wait', waitPair],
      ['wait-all', waitAllPair],
      ['cancel', cancelPair],
      ['parallel', parallelPair],
    ].filter(([, pair]) => Boolean(pair));
    const [control, controlPair] = controlPairs[0] ?? [null, null];
    const stepLine = lineFromRange(source, stepNode);
    /** @type {StepNode} */
    const step = {
      name: namePair && (0,dist/* isScalar */.jn)(namePair.value) ? String(namePair.value.value) : null,
      id: idPair && (0,dist/* isScalar */.jn)(idPair.value) ? String(idPair.value.value) : null,
      ifDeclared: Boolean(ifPair),
      uses: null,
      usesDeclared: Boolean(usesPair),
      run: runPair && (0,dist/* isScalar */.jn)(runPair.value) ? String(runPair.value.value) : null,
      runDeclared: Boolean(runPair),
      env: envPair ? toJs(envPair.value) : null,
      with_: withPair ? toJs(withPair.value) : null,
      workingDirectory: workingDirectoryPair && (0,dist/* isScalar */.jn)(workingDirectoryPair.value)
        ? String(workingDirectoryPair.value.value)
        : null,
      shell: shellPair && (0,dist/* isScalar */.jn)(shellPair.value) ? String(shellPair.value.value) : null,
      shellDeclared: Boolean(shellPair),
      control,
      controlValue: controlPair ? toJs(controlPair.value) : null,
      primaryCount: Number(Boolean(usesPair)) + Number(Boolean(runPair)) + controlPairs.length,
      background: backgroundPair ? toJs(backgroundPair.value) : null,
      backgroundDeclared: Boolean(backgroundPair),
      parallelValid: Boolean(
        parallelPair
        && (0,dist/* isSeq */.oP)(parallelPair.value)
        && parallelPair.value.items.length > 0
        && parallelPair.value.items.every(item => (0,dist/* isMap */.jh)(item)),
      ),
      parallelDepth,
      line: stepLine,
      runLine: runPair ? lineFromRange(source, runPair.key) : 0,
      envLine: envPair ? lineFromRange(source, envPair.key) : 0,
    };
    const usesValue = usesPair ? resolveScalar(usesPair.value, doc) : null;
    if (usesValue) {
      const usesLine = lineFromRange(source, usesValue.location);
      step.uses = parseActionRef(
        String(usesValue.scalar.value),
        usesLine,
        {
          ...locationFromRange(source, usesValue.location),
          alias: usesValue.alias,
        },
      );
    }
    steps.push(step);
    if (parallelPair && (0,dist/* isSeq */.oP)(parallelPair.value)) {
      steps.push(...extractSteps(source, parallelPair.value, doc, parallelDepth + 1));
    }
  }
  return steps;
}

function imageRef(source, scalarValue, context, jobName = null) {
  const location = locationFromRange(source, scalarValue.location);
  return {
    raw: String(scalarValue.scalar.value),
    line: lineFromRange(source, scalarValue.location),
    start: location.start,
    end: location.end,
    context,
    jobName,
  };
}

/**
 * @param {string} source
 * @param {object} doc - yaml Document
 * @returns {JobNode[]}
 */
function extractJobs(source, doc, images) {
  /** @type {JobNode[]} */
  const jobs = [];
  const jobsPair = findPair(doc.contents, 'jobs');
  if (!jobsPair || !(0,dist/* isMap */.jh)(jobsPair.value)) return jobs;

  for (const jobPair of jobsPair.value.items) {
    if (!(0,dist/* isPair */.tO)(jobPair) || !(0,dist/* isScalar */.jn)(jobPair.key)) continue;
    const jobName = String(jobPair.key.value);
    const jobNode = jobPair.value;
    const jobLine = lineFromRange(source, jobPair.key);

    /** @type {JobNode} */
    const job = {
      name: jobName,
      permissions: null,
      permissionsDeclared: false,
      runsOn: null,
      runsOnDeclared: false,
      env: null,
      uses: null,
      usesDeclared: false,
      with_: null,
      secrets: null,
      steps: [],
      stepsDeclared: false,
      stepsValid: false,
      validMapping: (0,dist/* isMap */.jh)(jobNode),
      line: jobLine,
      permissionsLine: 0,
      envLine: 0,
    };

    if ((0,dist/* isMap */.jh)(jobNode)) {
      const perms = findPair(jobNode, 'permissions');
      if (perms) {
        job.permissions = toJs(perms.value);
        job.permissionsDeclared = true;
        job.permissionsLine = lineFromRange(source, perms.key);
      }
      const runsOn = findPair(jobNode, 'runs-on');
      if (runsOn) {
        job.runsOn = toJs(runsOn.value);
        job.runsOnDeclared = true;
      }
      const env = findPair(jobNode, 'env');
      if (env) {
        job.env = toJs(env.value);
        job.envLine = lineFromRange(source, env.key);
      }
      const jobUses = findPair(jobNode, 'uses');
      job.usesDeclared = Boolean(jobUses);
      const jobUsesValue = jobUses ? resolveScalar(jobUses.value, doc) : null;
      if (jobUsesValue) {
        const usesLine = lineFromRange(source, jobUsesValue.location);
        job.uses = parseActionRef(
          String(jobUsesValue.scalar.value),
          usesLine,
          {
            ...locationFromRange(source, jobUsesValue.location),
            alias: jobUsesValue.alias,
          },
        );
      }
      const jobWith = findPair(jobNode, 'with');
      if (jobWith) job.with_ = toJs(jobWith.value);
      const jobSecrets = findPair(jobNode, 'secrets');
      if (jobSecrets) job.secrets = toJs(jobSecrets.value);

      const containerPair = findPair(jobNode, 'container');
      const containerValue = containerPair ? resolveScalar(containerPair.value, doc) : null;
      if (containerValue) {
        images.push(imageRef(source, containerValue, 'job-container', jobName));
      } else if (containerPair && (0,dist/* isMap */.jh)(containerPair.value)) {
        const imagePair = findPair(containerPair.value, 'image');
        const imageValue = imagePair ? resolveScalar(imagePair.value, doc) : null;
        if (imageValue) {
          images.push(imageRef(source, imageValue, 'job-container', jobName));
        }
      }

      const servicesPair = findPair(jobNode, 'services');
      if (servicesPair && (0,dist/* isMap */.jh)(servicesPair.value)) {
        for (const servicePair of servicesPair.value.items) {
          if (!(0,dist/* isPair */.tO)(servicePair) || !(0,dist/* isMap */.jh)(servicePair.value)) continue;
          const imagePair = findPair(servicePair.value, 'image');
          const imageValue = imagePair ? resolveScalar(imagePair.value, doc) : null;
          if (imageValue) {
            images.push(imageRef(source, imageValue, 'service-container', jobName));
          }
        }
      }

      const stepsPair = findPair(jobNode, 'steps');
      if (stepsPair) {
        job.stepsDeclared = true;
        job.stepsValid = (0,dist/* isSeq */.oP)(stepsPair.value)
          && stepsPair.value.items.every(item => (0,dist/* isMap */.jh)(item));
        job.steps = extractSteps(source, stepsPair.value, doc);
      }
    }
    jobs.push(job);
  }
  return jobs;
}

/**
 * Parse a workflow YAML source into a {@link WorkflowDoc}.
 *
 * @param {string} source
 * @param {string} path
 * @returns {WorkflowDoc}
 */
function parseWorkflowSource(source, path) {
  const doc = (0,dist/* parseDocument */.Tp)(source, { keepSourceTokens: true });
  if (doc.errors && doc.errors.length > 0) {
    const first = doc.errors[0];
    throw new Error(`yaml parse error in ${path}: ${first.message}`);
  }
  /** @type {WorkflowDoc} */
  const result = {
    path,
    source,
    kind: 'unknown',
    name: null,
    on: null,
    onDeclared: false,
    permissions: null,
    permissionsDeclared: false,
    env: null,
    jobs: [],
    images: [],
    permissionsLine: 0,
    envLine: 0,
    raw: doc.toJS() ?? {},
  };
  if (!doc.contents || !(0,dist/* isMap */.jh)(doc.contents)) return result;
  const namePair = findPair(doc.contents, 'name');
  if (namePair && (0,dist/* isScalar */.jn)(namePair.value)) result.name = String(namePair.value.value);
  const onPair = findPair(doc.contents, 'on');
  if (onPair) {
    result.on = toJs(onPair.value);
    result.onDeclared = true;
  }
  const permPair = findPair(doc.contents, 'permissions');
  if (permPair) {
    result.permissions = toJs(permPair.value);
    result.permissionsDeclared = true;
    result.permissionsLine = lineFromRange(source, permPair.key);
  }
  const envPair = findPair(doc.contents, 'env');
  if (envPair) {
    result.env = toJs(envPair.value);
    result.envLine = lineFromRange(source, envPair.key);
  }
  const runsPair = findPair(doc.contents, 'runs');
  const usingPair = runsPair && (0,dist/* isMap */.jh)(runsPair.value) ? findPair(runsPair.value, 'using') : null;
  if (usingPair?.value?.value === 'composite') {
    result.kind = 'composite-action';
    const stepsPair = findPair(runsPair.value, 'steps');
    result.jobs = [{
      name: 'composite',
      permissions: null,
      permissionsDeclared: false,
      runsOn: null,
      runsOnDeclared: false,
      env: null,
      uses: null,
      usesDeclared: false,
      with_: null,
      secrets: null,
      steps: stepsPair ? extractSteps(source, stepsPair.value, doc) : [],
      stepsDeclared: Boolean(stepsPair),
      stepsValid: Boolean(
        stepsPair
        && (0,dist/* isSeq */.oP)(stepsPair.value)
        && stepsPair.value.items.every(item => (0,dist/* isMap */.jh)(item)),
      ),
      validMapping: true,
      line: lineFromRange(source, runsPair.key),
      permissionsLine: 0,
      envLine: 0,
    }];
  } else {
    result.kind = findPair(doc.contents, 'jobs') ? 'workflow' : 'unknown';
    result.jobs = extractJobs(source, doc, result.images);
    if (usingPair?.value?.value === 'docker') {
      result.kind = 'unknown';
      const imagePair = findPair(runsPair.value, 'image');
      const imageValue = imagePair ? resolveScalar(imagePair.value, doc) : null;
      if (imageValue) {
        result.images.push(imageRef(source, imageValue, 'docker-action'));
      }
    }
  }
  return result;
}

function resolveScalar(node, doc) {
  if ((0,dist/* isScalar */.jn)(node)) return { scalar: node, location: node, alias: false };
  if (!(0,dist/* isAlias */.Vj)(node)) return null;
  const scalar = node.resolve(doc);
  return (0,dist/* isScalar */.jn)(scalar) ? { scalar, location: node, alias: true } : null;
}

/**
 * @param {string} path
 * @returns {Promise<WorkflowDoc>}
 */
async function parseWorkflowFile(path) {
  const source = await (0,promises_namespaceObject.readFile)(path, 'utf8');
  return parseWorkflowSource(source, path);
}

/**
 * Iterate every action reference in a workflow.
 *
 * @param {WorkflowDoc} workflow
 * @returns {Array<{ref: ActionRef, jobName: string|null, stepIndex: number, target: 'job'|'step', location: 'job'|'step'|'action-step'}>}
 */
function collectUses(workflow) {
  const out = [];
  for (const job of workflow.jobs) {
    if (job.uses) {
      out.push({
        ref: job.uses,
        jobName: job.name,
        stepIndex: -1,
        target: 'job',
        location: 'job',
      });
    }
    job.steps.forEach((step, i) => {
      if (!step.uses) return;
      const composite = workflow.kind === 'composite-action';
      out.push({
        ref: step.uses,
        jobName: composite ? null : job.name,
        stepIndex: i,
        target: 'step',
        location: composite ? 'action-step' : 'step',
      });
    });
  }
  return out;
}

/**
 * Return container images referenced by jobs, services, and Docker actions.
 *
 * @param {WorkflowDoc} workflow
 * @returns {ImageRef[]}
 */
function collectImages(workflow) {
  return [...workflow.images];
}

;// CONCATENATED MODULE: ./src/lib/redact.js
/**
 * Secret redaction utility.
 *
 * Replaces values that look like tokens, credentials, or high-entropy strings
 * with `<redacted>`. Conservative by design: prefers false positives over leaks.
 */

const TOKEN_PATTERNS = [
  /ghp_[A-Za-z0-9]{30,}/g,
  /ghs_[A-Za-z0-9]{30,}/g,
  /gho_[A-Za-z0-9]{30,}/g,
  /ghu_[A-Za-z0-9]{30,}/g,
  /github_pat_[A-Za-z0-9_]{30,}/g,
  /xox[abprs]-[A-Za-z0-9-]{10,}/g,
  /(?:AKIA|ASIA)[0-9A-Z]{16}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /AIza[0-9A-Za-z_-]{30,}/g,
  /ya29\.[0-9A-Za-z_-]{20,}/g,
  /npm_[0-9A-Za-z]{20,}/g,
  /eyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const SENSITIVE_KEY = /(?:token|secret|password|api[_-]?key|auth[_-]?token|access[_-]?key|private[_-]?key)$/i;
const KV_TOKEN_KEYS = /([\w-]*(?:token|secret|password|api[_-]?key|auth[_-]?token|access[_-]?key|private[_-]?key))(\s*[:=]\s*)["']?([^"'\s,]+)/gi;
const HIGH_ENTROPY = /[A-Za-z0-9_+/-]{32,}={0,2}/g;
// This public rule ID is long enough to trip the generic entropy heuristic.
// Keep the exception exact instead of weakening detection for arbitrary
// kebab-case values, which may still be credentials or passphrases.
const SAFE_PUBLIC_VALUES = new Set([
  'reusable-workflow-secrets-inherit',
]);

/**
 * Redacts sensitive substrings from a value.
 *
 * @param {unknown} input
 * @returns {string}
 */
function redact(input) {
  if (input == null) return '';
  let s = typeof input === 'string' ? input : String(input);
  for (const re of TOKEN_PATTERNS) s = s.replace(re, '<redacted>');
  s = s.replace(KV_TOKEN_KEYS, (_, key, separator) => `${key}${separator}<redacted>`);
  s = s.replace(HIGH_ENTROPY, value => (
    shouldRedactHighEntropy(value) ? '<redacted>' : value
  ));
  return s;
}

/**
 * Recursively redact strings in a JSON-compatible value.
 *
 * @param {unknown} input
 * @param {WeakSet<object>} [seen]
 * @returns {unknown}
 */
function redactDeep(input, seen = new WeakSet()) {
  if (typeof input === 'string') return redact(input);
  if (input === null || typeof input !== 'object') return input;
  if (seen.has(input)) return '<circular>';
  seen.add(input);
  let output;
  if (Array.isArray(input)) {
    output = input.map(item => redactDeep(item, seen));
  } else {
    output = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = SENSITIVE_KEY.test(key) ? '<redacted>' : redactDeep(value, seen);
    }
  }
  seen.delete(input);
  return output;
}

function shouldRedactHighEntropy(value) {
  if (SAFE_PUBLIC_VALUES.has(value)) return false;
  if (/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value)) return false;
  const categories = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[_+/=-]/.test(value),
  ].filter(Boolean).length;
  if (categories < 2) return false;
  const frequencies = new Map();
  for (const char of value) frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy >= 3.5;
}

/**
 * Wraps console.error/log so any string-coerced argument is redacted first.
 *
 * @param {(...args: unknown[]) => void} fn
 * @returns {(...args: unknown[]) => void}
 */
function safeLogger(fn) {
  return (...args) => fn(...args.map(a => redactDeep(a)));
}

;// CONCATENATED MODULE: ./src/lib/formatter.js
/**
 * Output formatter supporting TOON (Token-Oriented Object Notation), JSON,
 * plain text, and SARIF.
 *
 * TOON output rules:
 *   - One record per line: `LABEL: key=value key=value`
 *   - Values containing spaces or `=` are quoted: `msg="hello world"`
 *   - Empty/null values are omitted
 *   - Trailing `STATUS: OK` or `STATUS: FAIL` signal for machine consumers
 */



/**
 * Severity ordering, lowest-to-highest.
 */
const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

/**
 * @param {string} value
 * @returns {string}
 */
function quoteIfNeeded(value) {
  if (value === '') return '""';
  if (/[\s="\\]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32)) {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Serialize a record to a single TOON line.
 *
 * @param {string} label
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
function toonLine(label, fields) {
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    const value = typeof v === 'string' ? v : String(v);
    parts.push(`${k}=${quoteIfNeeded(redact(value))}`);
  }
  return parts.length === 0 ? `${label}:` : `${label}: ${parts.join(' ')}`;
}

/**
 * Render a TOON document.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
function renderToon(records, options = {}) {
  const lines = records.map(r => toonLine(r.label, r.fields));
  if (options.status) lines.push(`STATUS: ${options.status}`);
  return lines.join('\n') + '\n';
}

/**
 * Render JSON with stable key ordering and 2-space indent.
 *
 * @param {unknown} payload
 * @returns {string}
 */
function renderJson(payload) {
  return JSON.stringify(redactDeep(payload), null, 2) + '\n';
}

/**
 * Render plain text (human-readable summary).
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL'}} [options]
 * @returns {string}
 */
function renderText(records, options = {}) {
  const lines = records.map(r => {
    const kv = Object.entries(r.fields)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${escapeText(redact(String(v)))}`)
      .join(' ');
    return `[${r.label}] ${kv}`;
  });
  if (options.status) lines.push(`==> ${options.status}`);
  return lines.join('\n') + '\n';
}

function escapeText(value) {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * Format records into the requested output mode.
 *
 * @param {'toon'|'json'|'text'|'sarif'} format
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: 'OK'|'FAIL', json?: unknown}} [options]
 * @returns {string}
 */
function formatter_format(format_, records, options = {}) {
  switch (format_) {
    case 'json':
      return renderJson(options.json ?? recordsToJson(records, options));
    case 'text':
      return renderText(records, options);
    case 'sarif':
      return renderSarif(records, options);
    case 'toon':
    default:
      return renderToon(records, options);
  }
}

/**
 * Render records as SARIF 2.1.0 for GitHub code scanning.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: string}} [options]
 */
function renderSarif(records, options = {}) {
  const ruleRecords = records.filter(record => record.label === 'RULE');
  const resultRecords = records.filter(record => (
    record.label === 'FINDING'
    || record.label === 'ERROR'
    || record.label === 'WARNING'
    || record.label === 'PIN'
    || record.label === 'UPGRADE'
  ));
  const rules = new Map();
  for (const record of ruleRecords) {
    const id = String(record.fields.id ?? 'actions-warden');
    rules.set(id, {
      id,
      shortDescription: {
        text: String(record.fields.description ?? id),
      },
      defaultConfiguration: {
        level: sarifLevel(String(record.fields.severity ?? 'low')),
      },
    });
  }

  const results = resultRecords.map(record => {
    const fields = record.fields;
    const ruleId = String(fields.type ?? `actions-warden/${record.label.toLowerCase()}`);
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        shortDescription: { text: ruleId },
        defaultConfiguration: {
          level: record.label === 'ERROR'
            ? 'error'
            : sarifLevel(String(fields.sev ?? 'low')),
        },
      });
    }
    const file = fields.file ? String(fields.file) : null;
    const line = Number(fields.line);
    return {
      ruleId,
      level: record.label === 'ERROR'
        ? 'error'
        : record.label === 'WARNING'
          ? 'warning'
          : sarifLevel(String(fields.sev ?? (record.label === 'FINDING' ? 'warning' : 'low'))),
      message: {
        text: String(fields.explain ?? fields.msg ?? summarizeFields(record.label, fields)),
      },
      ...(file ? {
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: file.replace(/\\/g, '/') },
            ...(Number.isInteger(line) && line > 0
              ? { region: { startLine: line } }
              : {}),
          },
        }],
      } : {}),
      ...(fields.id ? {
        partialFingerprints: {
          // GitHub code scanning recognizes this key and uses the suffix to
          // distinguish multiple results with the same semantic fingerprint.
          primaryLocationLineHash: `${fields.fingerprint ?? fields.id}:1`,
          'actions-warden/id': String(fields.id),
          ...(fields.fingerprint
            ? { 'actions-warden/semantic': String(fields.fingerprint) }
            : {}),
        },
      } : {}),
    };
  });

  return renderJson({
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'actions-warden',
          informationUri: 'https://github.com/chiz0me/actions-warden',
          rules: [...rules.values()],
        },
      },
      invocations: [{
        executionSuccessful: options.status !== 'ERROR',
      }],
      results,
    }],
  });
}

function sarifLevel(severity) {
  if (severity === 'critical' || severity === 'high' || severity === 'error') return 'error';
  if (severity === 'medium' || severity === 'warning') return 'warning';
  return 'note';
}

function summarizeFields(label, fields) {
  const details = Object.entries(fields)
    .filter(([key, value]) => !['id', 'file', 'line'].includes(key) && value != null && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
  return `${label}: ${details}`;
}

/**
 * Convert records to a generic JSON payload when no custom JSON is supplied.
 *
 * @param {Array<{label: string, fields: Record<string, unknown>}>} records
 * @param {{status?: string}} options
 * @returns {object}
 */
function recordsToJson(records, options) {
  return {
    schemaVersion: '1.0',
    records: records.map(r => ({ label: r.label, ...r.fields })),
    status: options.status ?? null,
  };
}

/**
 * Aggregate findings into a summary record.
 *
 * @param {Array<{severity: string}>} findings
 * @returns {Record<string, number>}
 */
function summarize(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  }
  return counts;
}

;// CONCATENATED MODULE: ./src/lib/ignore.js
/**
 * Inline ignore directives in workflow sources.
 *
 * Directives (accept either `actions-warden-` or `aw-` prefix):
 *
 *   # actions-warden-ignore-file                - silence the entire file
 *   # actions-warden-ignore-start               - start a block (until -end)
 *   # actions-warden-ignore-end                 - end the current block
 *   # actions-warden-ignore-next-line           - silence the next non-comment line
 *   # actions-warden-ignore                     - silence the same line (inline)
 *
 * Optional rule filter: append rule ids after a colon, e.g.
 *   # actions-warden-ignore: unpinned-action,secrets-in-env
 *
 * Without a filter the directive silences every rule.
 */

const PREFIX = '(?:actions-warden|aw)';
const LEAD = '(?:#|;)\\s*';
const TAIL = '(?::\\s*([\\w,\\s-]+?))?\\s*(?=;|$)';
const RE_FILE = new RegExp(`${LEAD}${PREFIX}-ignore-file${TAIL}`);
const RE_START = new RegExp(`${LEAD}${PREFIX}-ignore-start${TAIL}`);
const RE_END = new RegExp(`${LEAD}${PREFIX}-ignore-end\\s*(?=;|$)`);
const RE_NEXT = new RegExp(`${LEAD}${PREFIX}-ignore-next-line${TAIL}`);
const RE_INLINE = new RegExp(`${LEAD}${PREFIX}-ignore(?!-)${TAIL}`);

/**
 * @typedef {object} IgnoreScope
 * @property {boolean} wholeFile
 * @property {Set<string>|null} fileRules           - null means "all rules"
 * @property {Array<{start: number, end: number, rules: Set<string>|null}>} ranges
 * @property {Map<number, Set<string>|null>} lines  - line -> ignored rule set (or null = all)
 */

/**
 * @param {string|null|undefined} list   comma- or whitespace-separated rule ids
 * @returns {Set<string>|null}            null = match every rule
 */
function parseRuleList(list) {
  if (!list) return null;
  const ids = list.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  return new Set(ids);
}

/**
 * @param {string} source
 * @returns {IgnoreScope}
 */
function parseIgnoreDirectives(source) {
  /** @type {IgnoreScope} */
  const scope = {
    wholeFile: false,
    fileRules: null,
    ranges: [],
    lines: new Map(),
  };
  const lines = source.split('\n');
  /** @type {{start: number, rules: Set<string>|null}|null} */
  let openBlock = null;

  lines.forEach((text, i) => {
    const lineNo = i + 1;
    const fileMatch = text.match(RE_FILE);
    if (fileMatch) {
      scope.wholeFile = true;
      scope.fileRules = parseRuleList(fileMatch[1]);
      return;
    }
    const startMatch = text.match(RE_START);
    if (startMatch) {
      openBlock = { start: lineNo, rules: parseRuleList(startMatch[1]) };
      return;
    }
    if (RE_END.test(text)) {
      if (openBlock) {
        scope.ranges.push({ start: openBlock.start, end: lineNo, rules: openBlock.rules });
        openBlock = null;
      }
      return;
    }
    const nextMatch = text.match(RE_NEXT);
    if (nextMatch) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j].trim();
        if (next === '' || next.startsWith('#')) continue;
        mergeLine(scope.lines, j + 1, parseRuleList(nextMatch[1]));
        break;
      }
      return;
    }
    const inlineMatch = text.match(RE_INLINE);
    if (inlineMatch) {
      mergeLine(scope.lines, lineNo, parseRuleList(inlineMatch[1]));
    }
  });

  if (openBlock) {
    scope.ranges.push({ start: openBlock.start, end: lines.length, rules: openBlock.rules });
  }
  return scope;
}

function mergeLine(map, line, rules) {
  const existing = map.get(line);
  if (existing === undefined) {
    map.set(line, rules);
    return;
  }
  if (existing === null || rules === null) {
    map.set(line, null);
    return;
  }
  for (const r of rules) existing.add(r);
}

/**
 * @param {IgnoreScope} scope
 * @param {number} line
 * @param {string} ruleId
 * @returns {boolean}
 */
function isIgnored(scope, line, ruleId) {
  if (scope.wholeFile && matches(scope.fileRules, ruleId)) return true;
  for (const range of scope.ranges) {
    if (line >= range.start && line <= range.end && matches(range.rules, ruleId)) return true;
  }
  const lineRules = scope.lines.get(line);
  if (lineRules !== undefined && matches(lineRules, ruleId)) return true;
  return false;
}

function matches(rules, ruleId) {
  return rules === null ? true : rules.has(ruleId);
}

;// CONCATENATED MODULE: ./src/lib/identity.js



/**
 * Return a stable repository-relative path using POSIX separators.
 *
 * @param {string} file
 * @param {string} cwd
 */
function identity_canonicalPath(file, cwd = process.cwd()) {
  return (0,external_node_path_namespaceObject.relative)(cwd, file).split(external_node_path_namespaceObject.sep).join('/');
}

/**
 * Create a stable, collision-resistant identifier for a source occurrence.
 *
 * IDs deliberately exclude absolute paths so they remain stable across clones.
 *
 * @param {object} input
 * @param {string} input.kind
 * @param {string} input.file
 * @param {string} input.cwd
 * @param {number} [input.line]
 * @param {number} [input.start]
 * @param {string} [input.subject]
 */
function occurrenceId({
  kind,
  file,
  cwd = process.cwd(),
  line = 0,
  start = 0,
  subject = '',
}) {
  const identity = JSON.stringify({
    kind,
    file: identity_canonicalPath(file, cwd),
    line,
    start,
    subject,
  });
  return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(identity).digest('hex').slice(0, 16);
}

/**
 * The ID shared by an unpinned-action finding and its pin change.
 *
 * @param {object} input
 * @param {string} input.file
 * @param {string} input.cwd
 * @param {{line: number, start?: number, raw: string}} input.ref
 */
function pinOccurrenceId({ file, cwd, ref }) {
  return occurrenceId({
    kind: 'pin',
    file,
    cwd,
    line: ref.line,
    start: ref.start ?? 0,
    subject: ref.raw,
  });
}

// EXTERNAL MODULE: ./node_modules/picomatch/index.js
var picomatch = __nccwpck_require__(4006);
;// CONCATENATED MODULE: ./src/lib/paths.js
/**
 * Workflow file discovery with safe path handling.
 */





/**
 * Default workflow directory globs.
 */
const DEFAULT_WORKFLOW_PATTERNS = [
  '.github/workflows/*.yml',
  '.github/workflows/*.yaml',
  'action.yml',
  'action.yaml',
  '**/action.yml',
  '**/action.yaml',
];

/**
 * Reject path-traversal and absolute-escape attempts.
 *
 * @param {string} p
 * @param {string} cwd
 */
function assertInside(p, cwd) {
  if (typeof p !== 'string' || p.includes('\0')) {
    throw new Error('invalid workflow path');
  }
  const root = (0,external_node_path_namespaceObject.resolve)(cwd);
  const abs = (0,external_node_path_namespaceObject.resolve)(cwd, p);
  const rel = (0,external_node_path_namespaceObject.relative)(root, abs);
  if (isOutside(rel)) {
    throw new Error(`path traversal rejected: ${p}`);
  }
  return abs;
}

function isOutside(rel) {
  return rel === '..' || rel.startsWith(`..${external_node_path_namespaceObject.sep}`) || (0,external_node_path_namespaceObject.isAbsolute)(rel);
}

async function assertRealInside(path, cwd) {
  const [root, target] = await Promise.all([(0,promises_namespaceObject.realpath)((0,external_node_path_namespaceObject.resolve)(cwd)), (0,promises_namespaceObject.realpath)(path)]);
  if (isOutside((0,external_node_path_namespaceObject.relative)(root, target))) {
    throw new Error(`symlink escape rejected: ${path}`);
  }
  return target;
}

/**
 * Recursively list files under a directory.
 *
 * @param {string} dir
 * @param {string[]} acc
 * @returns {Promise<string[]>}
 */
async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await (0,promises_namespaceObject.readdir)(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.git') && entry.name !== '.github') continue;
    if (entry.name === 'node_modules') continue;
    const full = (0,external_node_path_namespaceObject.join)(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Discover workflow files matching the given patterns (relative to cwd).
 *
 * @param {object} opts
 * @param {string[]} [opts.patterns]
 * @param {string} [opts.cwd]
 * @returns {Promise<string[]>}
 */
async function discoverWorkflows({ patterns = DEFAULT_WORKFLOW_PATTERNS, cwd = process.cwd() } = {}) {
  const root = (0,external_node_path_namespaceObject.resolve)(cwd);
  for (const p of patterns) assertInside(p, root);
  const normalizedPatterns = patterns.map(p => {
    const pattern = (0,external_node_path_namespaceObject.isAbsolute)(p) ? (0,external_node_path_namespaceObject.relative)(root, p) : p;
    return pattern.split(external_node_path_namespaceObject.sep).join('/');
  });
  const matchers = normalizedPatterns.map(p => picomatch(p, { dot: true }));
  const all = await walk(root);
  const out = [];
  for (const file of all) {
    const rel = (0,external_node_path_namespaceObject.relative)(root, file).split(external_node_path_namespaceObject.sep).join('/');
    if (matchers.some(m => m(rel))) out.push(file);
  }
  return out.sort();
}

/**
 * Resolve a single workflow path argument. If it's a directory or glob,
 * expand it; if a file, validate it exists.
 *
 * @param {string} input
 * @param {string} [cwd]
 * @returns {Promise<string[]>}
 */
async function resolveWorkflowArg(input, cwd = process.cwd()) {
  const abs = assertInside(input, cwd);
  try {
    const st = await (0,promises_namespaceObject.stat)(abs);
    const safePath = await assertRealInside(abs, cwd);
    if (st.isDirectory()) {
      const files = await walk(safePath);
      return files.filter(f => /\.ya?ml$/i.test(f)).sort();
    }
    if (!st.isFile()) return [];
    return [safePath];
  } catch {
    return discoverWorkflows({ patterns: [input], cwd });
  }
}

;// CONCATENATED MODULE: ./src/lib/targets.js


/**
 * Resolve command workflow targets and reject empty scopes.
 *
 * @param {object} input
 * @param {string[]|undefined} input.workflows
 * @param {string} input.cwd
 */
async function resolveTargets({ workflows, cwd }) {
  if (!workflows || workflows.length === 0) {
    const discovered = await discoverWorkflows({ cwd });
    if (discovered.length === 0) {
      throw new Error('no workflow or composite action files found');
    }
    return discovered;
  }

  const out = new Set();
  for (const workflow of workflows) {
    const files = await resolveWorkflowArg(workflow, cwd);
    if (files.length === 0) {
      throw new Error(`no workflows matched: ${workflow}`);
    }
    for (const file of files) out.add(file);
  }
  return [...out].sort();
}

;// CONCATENATED MODULE: ./src/lib/config.js





const CONFIG_NAMES = ['.actions-warden.yml', '.actions-warden.yaml'];
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const TOP_LEVEL_KEYS = new Set([
  'version',
  'baseline',
  'ignore-paths',
  'rules',
  'runner-policy',
]);

const DEFAULT_CONFIG = Object.freeze({
  path: null,
  baseline: null,
  ignorePaths: [],
  rules: {},
  runnerPolicy: {
    trustedGroups: [],
    selfHostedLabels: [],
    flagUnknownGroups: false,
  },
});

/**
 * Load and strictly validate repository policy.
 *
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {string|false} [options.path]
 * @param {string[]} [options.ruleIds]
 */
async function loadConfig({
  cwd = process.cwd(),
  path,
  ruleIds = [],
} = {}) {
  if (path === false) {
    return { ...DEFAULT_CONFIG, runnerPolicy: { ...DEFAULT_CONFIG.runnerPolicy } };
  }
  let resolvedPath;
  if (path) {
    resolvedPath = await resolveRepositoryFile(path, cwd);
  } else {
    for (const candidate of CONFIG_NAMES) {
      try {
        resolvedPath = await resolveRepositoryFile(candidate, cwd);
        break;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  if (!resolvedPath) return { ...DEFAULT_CONFIG, runnerPolicy: { ...DEFAULT_CONFIG.runnerPolicy } };

  const source = await (0,promises_namespaceObject.readFile)(resolvedPath, 'utf8');
  const document = (0,dist/* parseDocument */.Tp)(source);
  if (document.errors.length > 0) {
    throw new Error(`invalid actions-warden config: ${document.errors[0].message}`);
  }
  const raw = document.toJS() ?? {};
  if (!isRecord(raw)) throw new Error('actions-warden config must be a mapping');
  rejectUnknownKeys(raw, TOP_LEVEL_KEYS, 'config');
  if (raw.version !== undefined && raw.version !== 1) {
    throw new Error('actions-warden config version must be 1');
  }

  const knownRules = new Set(ruleIds);
  const rules = validateRules(raw.rules, knownRules);
  const runnerPolicy = validateRunnerPolicy(raw['runner-policy']);
  const baseline = optionalString(raw.baseline, 'baseline');
  const ignorePaths = stringArray(raw['ignore-paths'], 'ignore-paths');

  return {
    path: resolvedPath,
    baseline,
    ignorePaths,
    rules,
    runnerPolicy,
  };
}

function filterIgnoredPaths(files, config, cwd) {
  if (config.ignorePaths.length === 0) return files;
  const matchers = config.ignorePaths.map(pattern => picomatch(pattern, { dot: true }));
  return files.filter(file => {
    const path = (0,external_node_path_namespaceObject.relative)(cwd, file).split(external_node_path_namespaceObject.sep).join('/');
    return !matchers.some(matches => matches(path));
  });
}

async function resolveRepositoryFile(path, cwd = process.cwd()) {
  const requestedRoot = (0,external_node_path_namespaceObject.resolve)(cwd);
  const requested = (0,external_node_path_namespaceObject.resolve)(requestedRoot, path);
  if (!(0,external_node_path_namespaceObject.isAbsolute)(path) && config_isOutside((0,external_node_path_namespaceObject.relative)(requestedRoot, requested))) {
    throw new Error(`path traversal rejected: ${path}`);
  }
  const [root, target] = await Promise.all([
    (0,promises_namespaceObject.realpath)(requestedRoot),
    (0,promises_namespaceObject.realpath)(requested),
  ]);
  if (config_isOutside((0,external_node_path_namespaceObject.relative)(root, target))) {
    throw new Error(`repository file escapes working directory: ${path}`);
  }
  return target;
}

function validateRules(value, knownRules) {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error('config.rules must be a mapping');
  const rules = {};
  for (const [ruleId, policy] of Object.entries(value)) {
    if (knownRules.size > 0 && !knownRules.has(ruleId)) {
      throw new Error(`unknown rule in config: ${ruleId}`);
    }
    if (!isRecord(policy)) throw new Error(`config.rules.${ruleId} must be a mapping`);
    rejectUnknownKeys(policy, new Set(['enabled', 'severity']), `config.rules.${ruleId}`);
    if (policy.enabled !== undefined && typeof policy.enabled !== 'boolean') {
      throw new Error(`config.rules.${ruleId}.enabled must be a boolean`);
    }
    if (policy.severity !== undefined && !SEVERITIES.has(policy.severity)) {
      throw new Error(`config.rules.${ruleId}.severity must be low, medium, high, or critical`);
    }
    rules[ruleId] = {
      enabled: policy.enabled ?? true,
      severity: policy.severity,
    };
  }
  return rules;
}

function validateRunnerPolicy(value) {
  if (value === undefined) return { ...DEFAULT_CONFIG.runnerPolicy };
  if (!isRecord(value)) throw new Error('config.runner-policy must be a mapping');
  rejectUnknownKeys(
    value,
    new Set(['trusted-groups', 'self-hosted-labels', 'flag-unknown-groups']),
    'config.runner-policy',
  );
  const flagUnknownGroups = value['flag-unknown-groups'] ?? false;
  if (typeof flagUnknownGroups !== 'boolean') {
    throw new Error('config.runner-policy.flag-unknown-groups must be a boolean');
  }
  return {
    trustedGroups: stringArray(value['trusted-groups'], 'runner-policy.trusted-groups'),
    selfHostedLabels: stringArray(
      value['self-hosted-labels'],
      'runner-policy.self-hosted-labels',
    ),
    flagUnknownGroups,
  };
}

function rejectUnknownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`unknown ${label} key: ${key}`);
  }
}

function stringArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item)) {
    throw new Error(`config.${label} must be an array of non-empty strings`);
  }
  return [...new Set(value)];
}

function optionalString(value, label) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !value) {
    throw new Error(`config.${label} must be a non-empty string`);
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function config_isOutside(path) {
  return path === '..' || path.startsWith(`..${external_node_path_namespaceObject.sep}`) || (0,external_node_path_namespaceObject.isAbsolute)(path);
}

;// CONCATENATED MODULE: ./src/lib/baseline.js




/**
 * Load a versioned baseline and return its finding IDs.
 */
async function loadBaseline({ path, cwd = process.cwd() }) {
  const resolvedPath = await resolveRepositoryFile(path, cwd);
  const raw = JSON.parse(await (0,promises_namespaceObject.readFile)(resolvedPath, 'utf8'));
  if (!raw || typeof raw !== 'object' || raw.schemaVersion !== '1.0') {
    throw new Error('baseline schemaVersion must be "1.0"');
  }
  if (!Array.isArray(raw.findings)) {
    throw new Error('baseline findings must be an array');
  }
  const ids = new Set();
  const fingerprints = new Set();
  for (const finding of raw.findings) {
    if (!finding || typeof finding !== 'object' || typeof finding.id !== 'string') {
      throw new Error('every baseline finding must contain a string id');
    }
    ids.add(finding.id);
    if (finding.fingerprint !== undefined && typeof finding.fingerprint !== 'string') {
      throw new Error('baseline finding fingerprints must be strings');
    }
    if (finding.fingerprint) fingerprints.add(finding.fingerprint);
  }
  return { path: resolvedPath, ids, fingerprints };
}

/**
 * Serialize current findings deterministically for review and version control.
 */
function serializeBaseline(findings, cwd = process.cwd()) {
  const records = findings
    .filter(finding => finding.ruleId !== 'parse-error')
    .map(finding => ({
      id: finding.id,
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: canonicalPath(finding.file, cwd),
      line: finding.line,
    }))
    .sort((a, b) => (
      a.file.localeCompare(b.file)
      || a.line - b.line
      || a.ruleId.localeCompare(b.ruleId)
      || a.id.localeCompare(b.id)
    ));
  return `${JSON.stringify({
    schemaVersion: '1.0',
    generatedBy: 'actions-warden',
    findings: records,
  }, null, 2)}\n`;
}

/**
 * Attach line-independent semantic fingerprints while distinguishing repeated
 * equivalent findings by their source-order ordinal.
 */
function assignBaselineFingerprints(findings, cwd = process.cwd()) {
  const ordered = [...findings].sort((a, b) => (
    identity_canonicalPath(a.file, cwd).localeCompare(identity_canonicalPath(b.file, cwd))
    || a.line - b.line
    || a.ruleId.localeCompare(b.ruleId)
    || a.id.localeCompare(b.id)
  ));
  const occurrences = new Map();
  for (const finding of ordered) {
    const semantic = stableValue(Object.fromEntries(
      Object.entries(finding.fields ?? {})
        .filter(([key]) => !['file', 'line', 'sev', 'source_line'].includes(key)),
    ));
    const key = JSON.stringify({
      ruleId: finding.ruleId,
      file: identity_canonicalPath(finding.file, cwd),
      fields: semantic,
    });
    const ordinal = occurrences.get(key) ?? 0;
    occurrences.set(key, ordinal + 1);
    finding.fingerprint = occurrenceId({
      kind: 'baseline',
      file: finding.file,
      cwd,
      subject: `${key}#${ordinal}`,
    });
  }
  return findings;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

;// CONCATENATED MODULE: ./src/rules/unpinned-action.js
/**
 * Rule: external action references must be pinned to a 40-character commit SHA.
 *
 * Tags like `v4` or `main` can be rewritten by repo owners (or attackers with
 * write access), making them an unstable supply-chain link.
 */



const id = 'unpinned-action';
const severity = 'high';
const description = 'External action or reusable workflow is not pinned to a full commit SHA.';

const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 * @returns {Array<{id: string, severity: string, line: number, fields: object, explain: string}>}
 */
function check(workflow) {
  const findings = [];
  for (const { ref } of collectUses(workflow)) {
    if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
    if (ref.ref && SHA_RE.test(ref.ref)) continue;
    findings.push({
      id,
      severity,
      line: ref.line,
      start: ref.start,
      fields: {
        type: id,
        sev: severity,
        action: ref.raw,
        ref: ref.ref ?? '',
      },
      explain: `replace the mutable ref in \`${ref.raw}\` with a reviewed full 40-character commit SHA, preserving any action or workflow subpath; retain the release tag as update metadata`,
    });
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/unpinned-docker-action.js


const unpinned_docker_action_id = 'unpinned-docker-action';
const unpinned_docker_action_severity = 'high';
const unpinned_docker_action_description = 'Docker action image is not pinned to a SHA-256 digest.';

const DIGEST_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function unpinned_docker_action_check(workflow) {
  const findings = [];
  for (const { ref } of collectUses(workflow)) {
    if (ref.kind !== 'docker' || DIGEST_RE.test(ref.raw)) continue;
    findings.push({
      id: unpinned_docker_action_id,
      severity: unpinned_docker_action_severity,
      line: ref.line,
      start: ref.start,
      fields: {
        type: unpinned_docker_action_id,
        sev: unpinned_docker_action_severity,
        image: ref.raw.slice('docker://'.length),
      },
      explain: 'resolve the intended image from its trusted registry, then replace the tag with the verified `@sha256:<64-hex-digest>` reference',
    });
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/unpinned-container-image.js


const unpinned_container_image_id = 'unpinned-container-image';
const unpinned_container_image_severity = 'high';
const unpinned_container_image_description = 'Job, service, or Docker action image is not pinned to a SHA-256 digest.';

const unpinned_container_image_DIGEST_RE = /@sha256:[0-9a-f]{64}$/i;

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function unpinned_container_image_check(workflow) {
  const findings = [];
  for (const image of collectImages(workflow)) {
    const localDockerAction = image.context === 'docker-action'
      && !image.raw.startsWith('/')
      && /(?:^|\/)Dockerfile$/.test(image.raw);
    if (unpinned_container_image_DIGEST_RE.test(image.raw) || localDockerAction) {
      continue;
    }
    findings.push({
      id: unpinned_container_image_id,
      severity: unpinned_container_image_severity,
      line: image.line,
      start: image.start,
      fields: {
        type: unpinned_container_image_id,
        sev: unpinned_container_image_severity,
        image: image.raw,
        context: image.context,
        job: image.jobName,
      },
      explain: image.raw.includes('${{')
        ? 'make every possible expression or matrix value an immutable image reference ending in `@sha256:<64-hex-digest>`'
        : 'resolve the intended image from its trusted registry, then replace the tag with the verified `@sha256:<64-hex-digest>` reference',
    });
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/excessive-permissions.js
/**
 * Rule: workflows and jobs should not grant `write-all` or default-broad
 * permissions when scoped tokens would suffice.
 */

const excessive_permissions_id = 'excessive-permissions';
const excessive_permissions_severity = 'medium';
const excessive_permissions_description = 'Workflow or job grants broadly writable GITHUB_TOKEN permissions.';

const BROAD_VALUES = new Set(['write-all']);

/**
 * @param {unknown} permissions
 * @param {boolean} declared
 * @returns {string|null}  - returns an offending scope label, or null
 */
function inspect(permissions, declared) {
  if (!declared) return 'unset-default';
  if (permissions === undefined || permissions === null) return null;
  if (typeof permissions === 'string') {
    return BROAD_VALUES.has(permissions) ? permissions : null;
  }
  if (typeof permissions === 'object') {
    const writable = Object.entries(permissions)
      .filter(([scope, value]) => value === 'write' && scope !== 'id-token')
      .map(([scope]) => scope);
    // Specific job capabilities such as contents:write or security-events:write
    // are often the least privilege needed. Flag only maps broad enough to
    // approximate write-all. Other rules independently report untrusted code
    // flowing into privileged trigger contexts.
    if (writable.length >= 3) return writable.map(scope => `${scope}=write`).join(',');
  }
  return null;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function excessive_permissions_check(workflow) {
  if (workflow.kind !== 'workflow') return [];
  const findings = [];
  const topScope = inspect(workflow.permissions, workflow.permissionsDeclared);
  if (topScope === 'unset-default') {
    findings.push({
      id: excessive_permissions_id,
      severity: 'low',
      line: 1,
      fields: { type: excessive_permissions_id, sev: 'low', scope: 'workflow-default-unspecified' },
      explain: 'declare workflow-level `permissions: {}` and grant only the read or write scopes each job requires, so configurable repository defaults cannot broaden the token',
    });
  } else if (topScope) {
    findings.push({
      id: excessive_permissions_id,
      severity: excessive_permissions_severity,
      line: workflow.permissionsLine || 1,
      fields: { type: excessive_permissions_id, sev: excessive_permissions_severity, scope: topScope, target: 'workflow' },
      explain: `replace workflow ${topScope} with an empty permissions map, then grant only the scopes required by each job`,
    });
  }
  for (const job of workflow.jobs) {
    const jobScope = inspect(job.permissions, job.permissionsDeclared);
    if (jobScope && jobScope !== 'unset-default') {
      findings.push({
        id: excessive_permissions_id,
        severity: excessive_permissions_severity,
        line: job.permissionsLine || job.line,
        fields: { type: excessive_permissions_id, sev: excessive_permissions_severity, scope: jobScope, job: job.name },
        explain: `replace ${jobScope} in job "${job.name}" with only the specific read or write scopes its steps require`,
      });
    }
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/secrets-in-env.js
/**
 * Rule: secrets exposed via env at workflow/job level are available to every
 * step in that scope, including third-party actions. Prefer step-scoped `env`
 * unless job scope is required for condition evaluation.
 */

const secrets_in_env_id = 'secrets-in-env';
const secrets_in_env_severity = 'medium';
const secrets_in_env_description = 'Workflow- or job-level env exposes secrets to unrelated steps.';

/**
 * @param {unknown} env
 * @returns {Array<{key: string, exposure: 'named-secret'|'all-secrets'}>}
 */
function secretKeys(env) {
  if (!env || typeof env !== 'object') return [];
  const out = [];
  for (const [key, val] of Object.entries(env)) {
    if (typeof val !== 'string' || !containsSecretReference(val)) continue;
    out.push({ key, exposure: secretExposure(val) });
  }
  return out;
}

function secretExposure(value) {
  if (/\btoJSON\s*\(\s*secrets\s*\)/i.test(value)) return 'all-secrets';
  if (/\bsecrets\s*\.\s*\*/i.test(value)) return 'all-secrets';
  for (const match of value.matchAll(/\bsecrets\s*\[([^\]]+)\]/gi)) {
    if (!/^\s*(['"])[A-Za-z_][A-Za-z0-9_]*\1\s*$/.test(match[1])) {
      return 'all-secrets';
    }
  }
  if (/\bsecrets\s*(?:[,)]|\}\})/i.test(withoutQuotedStrings(value))) {
    return 'all-secrets';
  }
  return 'named-secret';
}

function containsSecretReference(value) {
  const expressions = value.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
  return expressions.some(expression => (
    /\bsecrets\s*(?:\.|\[|[,)]|\}\})/i.test(withoutQuotedStrings(expression))
  ));
}

function withoutQuotedStrings(value) {
  let output = '';
  let quote = null;
  let escaped = false;
  for (const char of value) {
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      output += ' ';
    } else if (char === '\'' || char === '"') {
      quote = char;
      output += ' ';
    } else {
      output += char;
    }
  }
  return output;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function secrets_in_env_check(workflow) {
  const findings = [];
  for (const { key, exposure } of secretKeys(workflow.env)) {
    const findingSeverity = 'high';
    findings.push({
      id: secrets_in_env_id,
      severity: findingSeverity,
      line: workflow.envLine || 1,
      fields: {
        type: secrets_in_env_id,
        sev: findingSeverity,
        key,
        scope: 'workflow',
        exposure,
      },
      explain: exposure === 'all-secrets'
        ? `replace ${key} with explicit named secret references, then scope each reference to only the consuming step or action input; never serialize or dynamically index the secrets context`
        : `move ${key} to step-level env or a supported action input so only the step that consumes it receives the secret`,
    });
  }
  for (const job of workflow.jobs) {
    for (const { key, exposure } of secretKeys(job.env)) {
      const findingSeverity = exposure === 'all-secrets' ? 'high' : secrets_in_env_severity;
      findings.push({
        id: secrets_in_env_id,
        severity: findingSeverity,
        line: job.envLine || job.line,
        fields: {
          type: secrets_in_env_id,
          sev: findingSeverity,
          key,
          scope: 'job',
          job: job.name,
          exposure,
        },
        explain: exposure === 'all-secrets'
          ? `replace ${key} with explicit named secret references, then scope each reference to only the consuming step or action input; never serialize or dynamically index the secrets context`
          : `move ${key} to step-level env or an action input; if job scope is required for an if condition, keep every step in "${job.name}" trusted and minimize the secret's privileges`,
      });
    }
    for (const step of job.steps) {
      for (const { key, exposure } of secretKeys(step.env)) {
        if (exposure !== 'all-secrets') continue;
        findings.push({
          id: secrets_in_env_id,
          severity: 'high',
          line: step.envLine || step.line,
          fields: {
            type: secrets_in_env_id,
            sev: 'high',
            key,
            scope: 'step',
            job: job.name,
            exposure,
          },
          explain: `replace ${key} with explicit named secret references; dynamic indexing or toJSON(secrets) can expose every secret even when the env key is step-scoped`,
        });
      }
    }
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/script-injection.js
/**
 * Rule: attacker-controlled fields like `github.event.issue.title` interpolated
 * directly into `run:` scripts allow arbitrary command execution.
 *
 * Safe pattern: pass through env vars and quote, e.g.
 *   env: { TITLE: ${{ github.event.issue.title }} }
 *   run: echo "$TITLE"
 */

const script_injection_id = 'script-injection';
const script_injection_severity = 'critical';
const script_injection_description = 'Untrusted GitHub context is interpolated into run or github-script code.';

const TAINTED_PATTERNS = [
  /github\.event\.issue\.(title|body)/i,
  /github\.event\.pull_request\.(title|body|head\.ref|head\.label)/i,
  /github\.event\.pull_request\.head\.repo\.default_branch/i,
  /github\.event\.comment\.body/i,
  /github\.event\.review\.body/i,
  /github\.event\.review_comment\.body/i,
  /github\.event\.discussion\.(title|body)/i,
  /github\.event\.commits(?:\[[^\]]+\]|\.[\d*]+)\.message/i,
  /github\.event\.commits(?:\[[^\]]+\]|\.[\d*]+)\.author\.(name|email)/i,
  /github\.event\.head_commit\.message/i,
  /github\.event\.head_commit\.author\.(name|email)/i,
  /github\.event\.label\.name/i,
  /github\.event\.milestone\.title/i,
  /github\.event\.release\.(name|body|tag_name)/i,
  /github\.event\.pages(?:\[[^\]]+\]|\.[\d*]+)\.page_name/i,
  /github\.event\.workflow_run\.(display_title|head_branch)/i,
  /github\.event\.workflow_run\.head_repository\.default_branch/i,
  /github\.head_ref/i,
];

/**
 * @param {string} run
 * @returns {string|null}
 */
function detectTaintedExpr(run) {
  if (typeof run !== 'string') return null;
  for (const expression of expressionsIn(run)) {
    for (const pat of TAINTED_PATTERNS) {
      if (pat.test(expression)) return expression;
    }
  }
  return null;
}

function detectTaintedEnvExpr(value, taintedKeys) {
  if (typeof value !== 'string') return null;
  for (const expression of expressionsIn(value)) {
    for (const key of taintedKeys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const property = `env(?:\\.${escaped}|\\[\\s*['"]${escaped}['"]\\s*\\])`;
      if (new RegExp(property, 'i').test(expression)) return { expression, key };
    }
  }
  return null;
}

function expressionsIn(value) {
  return value.match(/\$\{\{[\s\S]*?\}\}/g) ?? [];
}

function mergeTaintedEnv(inherited, env) {
  const merged = new Set(inherited);
  if (!env || typeof env !== 'object' || Array.isArray(env)) return merged;
  for (const [key, value] of Object.entries(env)) {
    merged.delete(key);
    if (
      detectTaintedExpr(value)
      || detectTaintedEnvExpr(value, inherited)
    ) merged.add(key);
  }
  return merged;
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function script_injection_check(workflow) {
  const findings = [];
  const workflowTaintedEnv = mergeTaintedEnv(new Set(), workflow.env);
  for (const job of workflow.jobs) {
    const jobTaintedEnv = mergeTaintedEnv(workflowTaintedEnv, job.env);
    for (const step of job.steps) {
      const stepTaintedEnv = mergeTaintedEnv(jobTaintedEnv, step.env);
      const sinks = [];
      if (step.run) sinks.push({ kind: 'run', value: step.run, line: step.runLine || step.line });
      if (
        step.uses?.owner?.toLowerCase() === 'actions'
        && step.uses?.repo?.toLowerCase() === 'github-script'
        && typeof step.with_?.script === 'string'
      ) {
        sinks.push({ kind: 'github-script', value: step.with_.script, line: step.line });
      }
      for (const sink of sinks) {
        const directMatch = detectTaintedExpr(sink.value);
        const envMatch = directMatch
          ? null
          : detectTaintedEnvExpr(sink.value, stepTaintedEnv);
        const match = directMatch ?? envMatch?.expression;
        if (!match) continue;
        findings.push({
          id: script_injection_id,
          severity: script_injection_severity,
          line: sink.line,
          fields: {
            type: script_injection_id,
            sev: script_injection_severity,
            job: job.name,
            sink: sink.kind,
            expr: match,
            ...(envMatch ? { via_env: envMatch.key } : {}),
          },
          explain: sink.kind === 'github-script'
            ? 'assign the expression to step-level `env`, then read it through `process.env`; do not interpolate `${{ }}` into the script body'
            : 'assign the expression to step-level `env`, then read it with the shell\'s quoted variable syntax (for example, `"$VALUE"`), not `${{ env.VALUE }}`',
        });
      }
    }
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/lib/triggers.js
/**
 * Test whether a parsed workflow subscribes to an event.
 *
 * @param {unknown} on
 * @param {string} name
 */
function hasTrigger(on, name) {
  if (!on) return false;
  if (typeof on === 'string') return on === name;
  if (Array.isArray(on)) return on.includes(name);
  return typeof on === 'object' && Object.prototype.hasOwnProperty.call(on, name);
}

;// CONCATENATED MODULE: ./src/lib/execution.js
/**
 * Conservative indicators that a step may execute or interpret files from the
 * current workspace. Avoid treating harmless shell commands such as `echo` as
 * code execution while covering common build/test/package entry points.
 */

const WORKSPACE_COMMAND = /(?:^|[;&|])\s*(?:sudo\s+)?(?:(?:\.{0,2}[\\/]|[A-Za-z]:[\\/]|[A-Za-z0-9_.-]+[\\/])[^\s;&|]+|source\s+[^\s;&|]+|make(?:\s|$)|npm\s+(?:ci|install|test|run|exec)\b|npx\b|pnpm\s+(?:install|test|run|exec)\b|yarn\s+(?:install|test|run|exec)\b|bun\s+(?:install|test|run|x)\b|(?:bash|sh|zsh|python3?|ruby|node|perl|php)\s+[^\s;&|]+|(?:pwsh|powershell)(?:\.exe)?\s+(?:-File\s+)?[^\s;&|]+|cmd(?:\.exe)?\s+\/c\s+[^\s;&|]+|java\s+-jar\s+[^\s;&|]+|cargo\s+(?:build|test|run)\b|go\s+(?:build|test|run)\b|mvn\b|gradle\b|\.\/gradlew\b|dotnet\s+(?:build|test|run|publish)\b|bundle\s+exec\b|rake\b|pytest\b)/im;
const WORKSPACE_ACTION = /(?:^|[-_/])(build|builder|compile|exec|package|publish|runner|test|deploy)(?:[-_/]|$)/i;

/**
 * @param {import('./parser.js').StepNode} step
 */
function executesWorkspace(step, { sourcePaths = ['.'] } = {}) {
  let executes = false;
  if (step.uses?.kind === 'local') executes = true;
  if (typeof step.run === 'string' && WORKSPACE_COMMAND.test(step.run)) executes = true;
  if (step.uses?.kind === 'external') {
    const identity = [
      step.uses.owner,
      step.uses.repo,
      step.uses.subpath,
    ].filter(Boolean).join('/');
    if (WORKSPACE_ACTION.test(identity)) executes = true;
    if (Object.values(step.with_ ?? {}).some(
      value => typeof value === 'string' && WORKSPACE_COMMAND.test(value),
    )) executes = true;
  }
  if (!executes) return false;

  const normalized = sourcePaths.map(normalizePath);
  if (normalized.includes('.')) return true;
  const candidates = [
    step.run,
    step.workingDirectory,
    step.uses?.raw,
    ...Object.values(step.with_ ?? {}),
  ].filter(value => typeof value === 'string');
  return normalized.some(sourcePath => (
    candidates.some(candidate => referencesPath(candidate, sourcePath))
  ));
}

function normalizeSourcePath(value) {
  if (typeof value !== 'string' || !value.trim()) return '.';
  const expanded = normalizeTrustedRoots(value);
  if (expanded.includes('${{')) return '.';
  return normalizePath(expanded);
}

function normalizePath(value) {
  const normalized = normalizeTrustedRoots(String(value))
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '');
  return normalized.replace(/\/+$/, '') || '.';
}

function normalizeTrustedRoots(value) {
  return String(value)
    .replace(/\$\{\{\s*runner\.temp\s*\}\}/gi, '__runner_temp__')
    .replace(/\$(?:\{RUNNER_TEMP\}|RUNNER_TEMP\b)|%RUNNER_TEMP%/g, '__runner_temp__')
    .replace(/\$\{\{\s*github\.workspace\s*\}\}/gi, '.')
    .replace(/\$(?:\{GITHUB_WORKSPACE\}|GITHUB_WORKSPACE\b)|%GITHUB_WORKSPACE%/g, '.');
}

function referencesPath(value, path) {
  const normalizedValue = normalizePath(value);
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\s"'=:/])${escaped}(?:$|[\\s"'/:;&|])`, 'i')
    .test(normalizedValue);
}

// EXTERNAL MODULE: ./node_modules/semver/index.js
var semver = __nccwpck_require__(2088);
;// CONCATENATED MODULE: ./src/rules/pull-request-target-checkout.js
/**
 * Rule: workflows triggered by `pull_request_target` that check out the PR
 * head ref expose secrets to attacker-supplied code (pwn-request pattern).
 */





const pull_request_target_checkout_id = 'pull-request-target-checkout';
const pull_request_target_checkout_severity = 'critical';
const pull_request_target_checkout_description = 'pull_request_target can fetch attacker-controlled code without an active checkout guard.';

// GitHub backported fork-PR checkout protection on 2026-07-20. Floating major
// tags v2-v7 received it automatically; immutable callers need one of these
// release commits (or a later release that a future warden version recognizes).
const PROTECTED_MINIMUM = new Map([
  [2, '2.8.0'],
  [3, '3.7.0'],
  [4, '4.4.0'],
  [5, '5.1.0'],
  [6, '6.1.0'],
  [7, '7.0.0'],
]);
const KNOWN_PROTECTED_SHAS = new Set([
  '0717577d45739eb3c851188b29f50ed6c0b2194e', // v2.8.0
  'a37ce9120846195fa4ece8f58b268e6043cb2f26', // v3.7.0
  '11d5960a326750d5838078e36cf38b85af677262', // v4.4.0
  'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09', // v5.1.0
  'd23441a48e516b6c34aea4fa41551a30e30af803', // v6.1.0
  '9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0', // v7.0.0
  '3d3c42e5aac5ba805825da76410c181273ba90b1', // v7.0.1
]);

function checkoutProtection(step) {
  const optOut = step.with_?.['allow-unsafe-pr-checkout'];
  if (optOut === true || (typeof optOut === 'string' && optOut.trim().toLowerCase() === 'true')) {
    return { active: false, reason: 'explicit-opt-out' };
  }
  if (typeof optOut === 'string' && optOut.includes('${{')) {
    return { active: false, reason: 'dynamic-opt-out' };
  }

  const ref = step.uses?.ref ?? '';
  if (KNOWN_PROTECTED_SHAS.has(ref.toLowerCase())) {
    return { active: true, reason: 'protected-release-sha' };
  }
  const majorTag = ref.match(/^v([2-7])$/i);
  if (majorTag) return { active: true, reason: 'protected-floating-major' };

  const version = ref.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/i);
  if (version) {
    const major = Number(version[1]);
    const minimum = PROTECTED_MINIMUM.get(major);
    const normalized = `${major}.${version[2]}.${version[3] ?? '0'}`;
    if (minimum && semver.gte(normalized, minimum)) {
      return { active: true, reason: 'protected-release-tag' };
    }
  }
  return { active: false, reason: 'unknown-or-unprotected-version' };
}

function checkoutOfUntrustedPr(step) {
  if (!step.uses) return null;
  if (
    step.uses.owner?.toLowerCase() !== 'actions'
    || step.uses.repo?.toLowerCase() !== 'checkout'
  ) return null;
  const ref = step.with_?.ref;
  const repository = step.with_?.repository;
  const untrustedRef = typeof ref === 'string' && (
    /github\.event\.pull_request\.head/i.test(ref)
    || /github\.event\.pull_request\.merge_commit_sha/i.test(ref)
    || /github\.head_ref/i.test(ref)
    || /refs\/pull\//i.test(ref)
  );
  const untrustedRepository = typeof repository === 'string'
    && /github\.event\.pull_request\.head\.repo/i.test(repository);
  if (!untrustedRef && !untrustedRepository) return null;

  const protection = checkoutProtection(step);
  if (protection.active) return null;

  return {
    line: step.uses.line,
    path: normalizeSourcePath(step.with_?.path),
    protection: protection.reason,
  };
}

function fetchesUntrustedPrCode(step) {
  if (typeof step.run !== 'string') return false;
  if (/\bgh\s+pr\s+(?:checkout|co)\b/i.test(step.run)) return true;
  return /\bgit\s+fetch\b[\s\S]*(?:(?:refs\/)?pull\/|github\.event\.pull_request\.(?:head|number)|github\.head_ref)/i
    .test(step.run);
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function pull_request_target_checkout_check(workflow) {
  if (!hasTrigger(workflow.on, 'pull_request_target')) return [];
  const findings = [];
  for (const job of workflow.jobs) {
    const untrustedSources = [];
    let executed = false;
    for (const step of job.steps) {
      const checkout = checkoutOfUntrustedPr(step);
      if (checkout) {
        untrustedSources.push(checkout);
        continue;
      }
      if (fetchesUntrustedPrCode(step)) {
        untrustedSources.push({
          line: step.runLine || step.line,
          path: '.',
          protection: 'not-applicable-direct-fetch',
        });
        continue;
      }
      const untrustedSource = untrustedSources.find(source => (
        executesWorkspace(step, { sourcePaths: [source.path] })
      ));
      if (untrustedSource) {
        findings.push({
          id: pull_request_target_checkout_id,
          severity: pull_request_target_checkout_severity,
          line: step.runLine || step.line,
          fields: {
            type: pull_request_target_checkout_id,
            sev: pull_request_target_checkout_severity,
            job: job.name,
            source_line: untrustedSource.line,
            checkout_protection: untrustedSource.protection,
          },
          explain: remediation(untrustedSource.protection, true),
        });
        executed = true;
        break;
      }
    }
    if (untrustedSources.length > 0 && !executed) {
      const [untrustedSource] = untrustedSources;
      findings.push({
        id: pull_request_target_checkout_id,
        severity: 'high',
        line: untrustedSource.line,
        fields: {
          type: pull_request_target_checkout_id,
          sev: 'high',
          job: job.name,
          source_line: untrustedSource.line,
          stage: 'checkout-only',
          checkout_protection: untrustedSource.protection,
        },
        explain: remediation(untrustedSource.protection, false),
      });
    }
  }
  return findings;
}

function remediation(protection, executed) {
  if (protection === 'explicit-opt-out' || protection === 'dynamic-opt-out') {
    return executed
      ? 'remove `allow-unsafe-pr-checkout` and keep the built-in fork guard; run pull-request code under `pull_request`, or split untrusted build from privileged publication'
      : 'remove `allow-unsafe-pr-checkout` unless this job only inspects data; if the opt-out is required, use a dedicated path, disable persisted credentials, minimize permissions and secrets, and never execute the checkout';
  }
  if (protection === 'unknown-or-unprotected-version') {
    return executed
      ? 'pin the full SHA of a current protected actions/checkout release, or run pull-request code under `pull_request` and keep privileged publication in a separate trusted job'
      : 'pin the full SHA of a current protected actions/checkout release and avoid consuming the pull-request checkout in this privileged job';
  }
  return executed
    ? 'do not fetch and execute pull-request code in a privileged `pull_request_target` job; use `pull_request` or split untrusted build from privileged publication'
    : 'avoid fetching pull-request code in a privileged `pull_request_target` job; if inspection is required, isolate it as data with minimal permissions and no persisted credentials';
}

;// CONCATENATED MODULE: ./src/rules/reusable-workflow-secrets.js
const reusable_workflow_secrets_id = 'reusable-workflow-secrets-inherit';
const reusable_workflow_secrets_severity = 'high';
const reusable_workflow_secrets_description = 'Cross-repository reusable workflow inherits every caller secret.';

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function reusable_workflow_secrets_check(workflow) {
  const findings = [];
  for (const job of workflow.jobs) {
    if (
      job.uses?.kind !== 'reusable-workflow'
      || job.secrets !== 'inherit'
    ) {
      continue;
    }
    findings.push({
      id: reusable_workflow_secrets_id,
      severity: reusable_workflow_secrets_severity,
      line: job.uses.line,
      start: job.uses.start,
      fields: {
        type: reusable_workflow_secrets_id,
        sev: reusable_workflow_secrets_severity,
        job: job.name,
        workflow: job.uses.raw,
      },
      explain: 'declare required names under the callee\'s `on.workflow_call.secrets`, then map only those secrets in this caller instead of using `inherit`',
    });
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/untrusted-self-hosted-runner.js




const untrusted_self_hosted_runner_id = 'untrusted-self-hosted-runner';
const untrusted_self_hosted_runner_severity = 'high';
const untrusted_self_hosted_runner_description = 'Untrusted pull-request code can reach a self-hosted runner.';

function runnerRisk(value, policy) {
  const labels = collectLabels(value);
  const configuredLabel = labels.find(label => (
    policy.selfHostedLabels.some(pattern => picomatch.isMatch(label, pattern))
  ));
  if (labels.includes('self-hosted')) return { selector: 'self-hosted' };
  if (configuredLabel) return { selector: configuredLabel };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const group = typeof value.group === 'string' ? value.group : null;
    if (
      group
      && policy.flagUnknownGroups
      && !policy.trustedGroups.some(pattern => picomatch.isMatch(group, pattern))
    ) {
      return { selector: `group:${group}` };
    }
  }
  return null;
}

function collectLabels(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectLabels);
  if (value && typeof value === 'object' && 'labels' in value) {
    return collectLabels(value.labels);
  }
  return [];
}

function matrixRunnerRisk(job, rawJob, policy) {
  const matrix = rawJob?.strategy?.matrix;
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) return null;
  for (const key of matrixRunnerKeys(job.runsOn)) {
    const values = [];
    if (Array.isArray(matrix[key])) values.push(...matrix[key]);
    if (Array.isArray(matrix.include)) {
      for (const entry of matrix.include) {
        if (entry && typeof entry === 'object' && key in entry) values.push(entry[key]);
      }
    }
    for (const value of values) {
      const risk = runnerRisk(value, policy);
      if (risk) return { selector: `matrix.${key}:${risk.selector}` };
    }
  }
  return null;
}

function matrixRunnerKeys(value) {
  if (Array.isArray(value)) return new Set(value.flatMap(item => [...matrixRunnerKeys(item)]));
  if (value && typeof value === 'object') {
    return new Set(Object.values(value).flatMap(item => [...matrixRunnerKeys(item)]));
  }
  if (typeof value !== 'string') return new Set();
  const match = value.trim().match(
    /^\$\{\{\s*matrix(?:\.([A-Za-z_][A-Za-z0-9_-]*)|\[['"]([^'"]+)['"]\])\s*\}\}$/i,
  );
  return new Set(match ? [match[1] ?? match[2]] : []);
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function untrusted_self_hosted_runner_check(workflow, context = {}) {
  const pullRequest = hasTrigger(workflow.on, 'pull_request');
  const pullRequestTarget = hasTrigger(workflow.on, 'pull_request_target');
  if (!pullRequest && !pullRequestTarget) return [];
  const policy = {
    trustedGroups: [],
    selfHostedLabels: [],
    flagUnknownGroups: false,
    ...(context.runnerPolicy ?? {}),
  };
  return workflow.jobs.flatMap(job => {
    if (
      pullRequestTarget
      && !pullRequest
      && !job.steps.some(step => (
        checkoutOfUntrustedPr(step) || fetchesUntrustedPrCode(step)
      ))
    ) return [];
    const risk = runnerRisk(job.runsOn, policy)
      ?? matrixRunnerRisk(job, workflow.raw?.jobs?.[job.name], policy);
    if (!risk) return [];
    return [{
      id: untrusted_self_hosted_runner_id,
      severity: untrusted_self_hosted_runner_severity,
      line: job.line,
      fields: {
        type: untrusted_self_hosted_runner_id,
        sev: untrusted_self_hosted_runner_severity,
        job: job.name,
        selector: risk.selector,
      },
      explain: 'use a GitHub-hosted runner or a clean one-job ephemeral runner isolated from credentials and sensitive networks; treat approval as an additional gate, not runner cleanup',
    }];
  });
}

;// CONCATENATED MODULE: ./src/rules/workflow-run-artifact-execution.js



const workflow_run_artifact_execution_id = 'workflow-run-artifact-execution';
const workflow_run_artifact_execution_severity = 'critical';
const workflow_run_artifact_execution_description = 'Privileged workflow_run job executes files from a cross-run artifact.';

function downloadsArtifact(step) {
  const officialDownload = step.uses?.owner?.toLowerCase() === 'actions'
    && step.uses?.repo?.toLowerCase() === 'download-artifact';
  const thirdPartyDownload = step.uses?.kind === 'external'
    && step.uses?.repo?.toLowerCase().includes('download-artifact') === true
    && !officialDownload;
  if (officialDownload) {
    const runId = step.with_?.['run-id'];
    if (!selectsAnotherRun(runId, step.with_?.repository)) return null;
    return {
      line: step.uses.line,
      path: normalizeSourcePath(step.with_?.path),
      retrieval: 'actions/download-artifact-cross-run',
    };
  }
  if (thirdPartyDownload) {
    return {
      line: step.uses.line,
      path: normalizeSourcePath(step.with_?.path),
      retrieval: 'third-party-download-action',
    };
  }
  if (typeof step.run !== 'string') return null;
  const command = step.run;
  const ghDownload = command.match(
    /\bgh\s+run\s+download\s+(?:"([^"]+)"|'([^']+)'|(\$\{\{[\s\S]*?\}\})|([^\s;&|]+))/i,
  );
  const ghRunId = ghDownload?.[1] ?? ghDownload?.[2] ?? ghDownload?.[3] ?? ghDownload?.[4];
  const repository = shellOption(command, /(?:--repo|-R)/i);
  if (ghRunId && !ghRunId.startsWith('-') && selectsAnotherRun(ghRunId, repository)) {
    const directory = command.match(/(?:^|\s)(?:--dir|-D)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|(\S+))/i);
    return {
      line: step.runLine || step.line,
      path: normalizeSourcePath(directory?.[1] ?? directory?.[2] ?? directory?.[3]),
      retrieval: 'gh-run-download-cross-run',
    };
  }
  if (
    /\b(?:gh\s+api|curl|wget)\b[\s\S]*\/actions\/artifacts\/[^/\s"']+\/(?:zip|tar)\b/i
      .test(command)
    || /\b(?:curl|wget)\b[\s\S]*archive_download_url\b/i.test(command)
  ) {
    return {
      line: step.runLine || step.line,
      path: '.',
      retrieval: 'actions-api-artifact-archive',
    };
  }
  return null;
}

function selectsAnotherRun(value, repository) {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'number') return true;
  if (typeof value !== 'string') return true;
  const normalized = value.trim();
  if (!normalized) return false;
  if (
    /^\$\{\{\s*github\.run_id\s*\}\}$/i.test(normalized)
    && isCurrentRepository(repository)
  ) return false;
  return true;
}

function isCurrentRepository(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return /^\$\{\{\s*(?:github\.repository|github\.event\.workflow_run\.repository\.full_name)\s*\}\}$/i
    .test(value.trim());
}

function shellOption(command, option) {
  const match = command.match(
    new RegExp(`(?:^|\\s)${option.source}(?:=|\\s+)(?:"([^"]+)"|'([^']+)'|(\\S+))`, 'i'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

/**
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function workflow_run_artifact_execution_check(workflow) {
  if (!hasTrigger(workflow.on, 'workflow_run')) return [];
  const findings = [];
  for (const job of workflow.jobs) {
    const artifactSources = [];
    for (const step of job.steps) {
      const artifact = downloadsArtifact(step);
      if (artifact) {
        artifactSources.push(artifact);
        continue;
      }
      const artifactSource = artifactSources.find(source => (
        executesWorkspace(step, { sourcePaths: [source.path] })
      ));
      if (artifactSource) {
        findings.push({
          id: workflow_run_artifact_execution_id,
          severity: workflow_run_artifact_execution_severity,
          line: step.runLine || step.line,
          fields: {
            type: workflow_run_artifact_execution_id,
            sev: workflow_run_artifact_execution_severity,
            job: job.name,
            source_line: artifactSource.line,
            retrieval: artifactSource.retrieval,
          },
          explain: 'download cross-run artifacts into a dedicated temporary directory, validate the expected producer, integrity, and data schema, then consume them only as inert data; never execute, source, or import artifact-controlled files in this privileged job',
        });
        break;
      }
    }
  }
  return findings;
}

;// CONCATENATED MODULE: ./src/rules/workflow-structure.js
const workflow_structure_id = 'workflow-structure';
const workflow_structure_severity = 'medium';
const workflow_structure_description = 'Workflow or composite action contains invalid or ambiguous GitHub Actions syntax.';

const PERMISSION_SHORTHANDS = new Set(['read-all', 'write-all']);
const PERMISSION_LEVELS = new Set(['read', 'write', 'none']);

/**
 * Detect high-value structural mistakes separately from security policy.
 *
 * @param {import('../lib/parser.js').WorkflowDoc} workflow
 */
function workflow_structure_check(workflow) {
  if (workflow.kind === 'composite-action') return checkCompositeAction(workflow);
  if (workflow.kind !== 'workflow') {
    return isWorkflowPath(workflow.path)
      ? [finding(1, 'missing-jobs', 'workflow files must declare a `jobs:` mapping')]
      : [];
  }

  const findings = [];
  if (!workflow.onDeclared) {
    findings.push(finding(1, 'missing-trigger', 'the workflow must declare an `on:` trigger'));
  } else if (workflow.on === null) {
    findings.push(finding(1, 'trigger', 'the workflow declares `on:` without a trigger value'));
  } else if (!validTriggers(workflow.on)) {
    findings.push(finding(1, 'trigger-shape', '`on` must name at least one workflow event'));
  }
  findings.push(...permissionFindings(
    workflow.permissions,
    workflow.permissionsDeclared,
    workflow.permissionsLine || 1,
    'permissions',
  ));

  if (!workflow_structure_isRecord(workflow.raw?.jobs)) {
    findings.push(finding(1, 'jobs-mapping', '`jobs:` must be a mapping of job IDs to job definitions'));
    return findings;
  }
  if (Object.keys(workflow.raw.jobs).length === 0) {
    findings.push(finding(1, 'empty-jobs', 'the workflow must declare at least one job'));
  }

  for (const job of workflow.jobs) {
    if (!job.validMapping) {
      findings.push(finding(
        job.line,
        'job-definition',
        `job "${job.name}" must be a mapping`,
        job.name,
      ));
      continue;
    }
    findings.push(...permissionFindings(
      job.permissions,
      job.permissionsDeclared,
      job.permissionsLine || job.line,
      'job-permissions',
      job.name,
    ));

    if (job.usesDeclared) {
      if (!isReusableWorkflowRef(job.uses)) {
        findings.push(finding(
          job.line,
          'reusable-job-uses',
          `job "${job.name}" must reference a reusable workflow from its uses key`,
          job.name,
        ));
      }
      if (job.runsOnDeclared) {
        findings.push(finding(
          job.line,
          'reusable-job-runs-on',
          `job "${job.name}" cannot contain both a reusable workflow call and runs-on`,
          job.name,
        ));
      }
      if (job.stepsDeclared) {
        findings.push(finding(
          job.line,
          'reusable-job-steps',
          `job "${job.name}" cannot contain both a reusable workflow call and steps`,
          job.name,
        ));
      }
    } else {
      if (!job.runsOnDeclared || !validRunnerSelector(job.runsOn)) {
        findings.push(finding(
          job.line,
          'missing-runs-on',
          `job "${job.name}" must declare a non-empty runs-on value`,
          job.name,
        ));
      }
      if (!job.stepsDeclared) {
        findings.push(finding(
          job.line,
          'missing-steps',
          `job "${job.name}" must declare steps or call a reusable workflow`,
          job.name,
        ));
      } else if (!job.stepsValid) {
        findings.push(finding(
          job.line,
          'steps-sequence',
          `job "${job.name}" must declare steps as a sequence of mappings`,
          job.name,
        ));
      } else if (job.steps.length === 0) {
        findings.push(finding(
          job.line,
          'empty-steps',
          `job "${job.name}" must declare at least one step or call a reusable workflow`,
          job.name,
        ));
      }
    }
    findings.push(...checkSteps(job.steps, job.name, false));
  }
  return findings;
}

function checkCompositeAction(workflow) {
  const job = workflow.jobs[0];
  if (!job?.stepsDeclared) {
    return [finding(job?.line || 1, 'composite-steps', 'a composite action must declare `runs.steps`')];
  }
  if (!job.stepsValid) {
    return [finding(job.line, 'composite-steps', 'a composite action must declare `runs.steps` as a sequence of mappings')];
  }
  if (job.steps.length === 0) {
    return [finding(job.line, 'composite-steps', 'a composite action must declare at least one step')];
  }
  return checkSteps(job.steps, job.name, true);
}

function checkSteps(steps, jobName, composite) {
  const findings = [];
  for (const step of steps) {
    if (step.primaryCount === 0) {
      findings.push(finding(
        step.line,
        'step-action',
        'a step must contain run, uses, wait, wait-all, cancel, or parallel',
        jobName,
      ));
      continue;
    }
    if (step.primaryCount > 1) {
      const runAndUsesOnly = step.usesDeclared
        && step.runDeclared
        && step.primaryCount === 2;
      findings.push(finding(
        step.line,
        runAndUsesOnly ? 'step-run-uses' : 'step-primary',
        runAndUsesOnly
          ? 'a step cannot contain both run and uses'
          : 'a step can contain only one of run, uses, wait, wait-all, cancel, or parallel',
        jobName,
      ));
      continue;
    }
    if (step.backgroundDeclared && step.control) {
      findings.push(finding(
        step.line,
        'background-step-type',
        'background is supported only on run or uses steps',
        jobName,
      ));
    } else if (step.backgroundDeclared && typeof step.background !== 'boolean') {
      findings.push(finding(
        step.line,
        'background-value',
        'background must be a boolean value',
        jobName,
      ));
    }
    if (step.control) {
      findings.push(...controlStepFindings(step, jobName, composite));
      continue;
    }
    if (step.usesDeclared && !isStepActionRef(step.uses)) {
      findings.push(finding(
        step.line,
        'step-uses',
        'a step uses value must reference an action, Docker image, or local/self action',
        jobName,
      ));
    }
    if (step.runDeclared && step.run === null) {
      findings.push(finding(step.line, 'step-run', 'a run step must contain a script', jobName));
    }
    if (composite && step.runDeclared && (!step.shellDeclared || step.shell === null)) {
      findings.push(finding(
        step.line,
        'composite-step-shell',
        'run steps in a composite action must declare a non-empty shell',
        jobName,
      ));
    }
    if (composite && step.backgroundDeclared) {
      findings.push(finding(
        step.line,
        'composite-step-background',
        'background steps are not supported inside a composite action',
        jobName,
      ));
    }
  }
  return findings;
}

function controlStepFindings(step, jobName, composite) {
  if (composite) {
    return [finding(
      step.line,
      'composite-step-control',
      `${step.control} control steps are not supported inside a composite action`,
      jobName,
    )];
  }
  const findings = [];
  if (step.control === 'parallel') {
    if (!step.parallelValid) {
      findings.push(finding(
        step.line,
        'parallel-steps',
        'parallel must contain a non-empty sequence of step mappings',
        jobName,
      ));
    }
    return findings;
  }
  if (step.ifDeclared) {
    findings.push(finding(
      step.line,
      'control-step-if',
      `${step.control} control steps always run and do not support if`,
      jobName,
    ));
  }
  if (step.control === 'wait-all') {
    if (step.controlValue !== null) {
      findings.push(finding(step.line, 'wait-all-value', 'wait-all takes no value', jobName));
    }
    return findings;
  }
  if (step.control === 'wait') {
    const valid = (typeof step.controlValue === 'string' && step.controlValue.length > 0)
      || (
        Array.isArray(step.controlValue)
        && step.controlValue.length > 0
        && step.controlValue.every(value => typeof value === 'string' && value.length > 0)
      );
    if (!valid) {
      findings.push(finding(
        step.line,
        'wait-value',
        'wait must name one or more background step IDs',
        jobName,
      ));
    }
    return findings;
  }
  if (typeof step.controlValue !== 'string' || step.controlValue.length === 0) {
    findings.push(finding(
      step.line,
      'cancel-value',
      'cancel must name one background step ID',
      jobName,
    ));
  }
  return findings;
}

function permissionFindings(value, declared, line, issue, job) {
  if (!declared) return [];
  if (value === null) {
    return [finding(
      line,
      issue,
      job
        ? `job "${job}" has a bare permissions key; use an empty map or explicit scopes`
        : 'bare `permissions:` is invalid; use `permissions: {}` to disable all token permissions',
      job,
    )];
  }
  if (typeof value === 'string') {
    if (PERMISSION_SHORTHANDS.has(value)) return [];
    return [finding(
      line,
      issue,
      '`permissions` scalar values must be `read-all` or `write-all`',
      job,
    )];
  }
  if (!workflow_structure_isRecord(value)) {
    return [finding(line, issue, '`permissions` must be a mapping or a supported shorthand', job)];
  }
  const invalid = Object.entries(value)
    .filter(([, level]) => !PERMISSION_LEVELS.has(level))
    .map(([scope]) => scope);
  return invalid.length === 0
    ? []
    : [finding(
      line,
      issue,
      `permission scopes must use read, write, or none; invalid: ${invalid.join(', ')}`,
      job,
    )];
}

function isReusableWorkflowRef(ref) {
  if (!ref) return false;
  if (ref.kind === 'reusable-workflow') {
    return Boolean(
      ref.owner
      && ref.repo
      && ref.ref
      && !/\s|@/.test(ref.ref)
      && /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(ref.subpath ?? ''),
    );
  }
  if (ref.kind === 'local') {
    return /^\.\/\.github\/workflows\/[^/]+\.ya?ml$/i.test(ref.raw);
  }
  return ref.kind === 'self'
    && /^\$\/\.github\/workflows\/[^/]+\.ya?ml$/i.test(ref.raw);
}

function isStepActionRef(ref) {
  if (!ref) return false;
  if (ref.kind === 'self') return /^\$\/[^@]+$/.test(ref.raw);
  if (ref.kind === 'external') {
    return Boolean(
      ref.owner
      && ref.repo
      && ref.ref
      && !/\s|@/.test(ref.ref)
      && /^[^/@\s]+\/[^/@\s]+(?:\/[^/@\s]+)*@[^@\s]+$/.test(ref.raw),
    );
  }
  if (ref.kind === 'local') {
    return ref.raw === './' || /^(?:\.\/|\.\.\/).+$/s.test(ref.raw);
  }
  if (ref.kind === 'docker') return /^docker:\/\/\S+$/.test(ref.raw);
  return false;
}

function isWorkflowPath(path) {
  return /(?:^|[\\/])\.github[\\/]workflows[\\/][^\\/]+\.ya?ml$/i.test(path);
}

function validTriggers(value) {
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(event => typeof event === 'string' && event.length > 0);
  }
  return workflow_structure_isRecord(value) && Object.keys(value).length > 0;
}

function validRunnerSelector(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) {
    return value.length > 0
      && value.every(label => typeof label === 'string' && label.trim().length > 0);
  }
  if (!workflow_structure_isRecord(value)) return false;
  const groupValid = typeof value.group === 'string' && value.group.trim().length > 0;
  const labelsValid = typeof value.labels === 'string'
    ? value.labels.trim().length > 0
    : Array.isArray(value.labels)
      && value.labels.length > 0
      && value.labels.every(label => typeof label === 'string' && label.trim().length > 0);
  return groupValid || labelsValid;
}

function workflow_structure_isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finding(line, issue, explain, job) {
  return {
    id: workflow_structure_id,
    severity: workflow_structure_severity,
    line,
    fields: {
      type: workflow_structure_id,
      sev: workflow_structure_severity,
      issue,
      ...(job ? { job } : {}),
    },
    explain,
  };
}

;// CONCATENATED MODULE: ./src/rules/index.js
/**
 * Rule registry.
 */













const RULES = [
  unpinned_action_namespaceObject,
  unpinned_docker_action_namespaceObject,
  unpinned_container_image_namespaceObject,
  excessive_permissions_namespaceObject,
  secrets_in_env_namespaceObject,
  script_injection_namespaceObject,
  pull_request_target_checkout_namespaceObject,
  reusable_workflow_secrets_namespaceObject,
  untrusted_self_hosted_runner_namespaceObject,
  workflow_run_artifact_execution_namespaceObject,
  workflow_structure_namespaceObject,
];

/**
 * @returns {Array<{id: string, severity: string, description: string}>}
 */
function listRules() {
  return RULES.map(r => ({ id: r.id, severity: r.severity, description: r.description }));
}

;// CONCATENATED MODULE: ./src/commands/audit.js
/**
 * Audit command - scan workflows for security findings.
 *
 * Programmatic API:
 *   const result = await audit({ cwd, workflows, severity, explain });
 *   result.findings: Finding[]
 *   result.summary:  { files, findings, critical, high, medium, low }
 *   result.status:   'OK' | 'FAIL'
 *
 * A finding looks like:
 *   { id, ruleId, severity, file, line, fields, explain }
 */










/**
 * @typedef {object} Finding
 * @property {string} id           - unique id (sha1 short)
 * @property {string} ruleId
 * @property {string} severity
 * @property {string} file
 * @property {number} line
 * @property {Record<string, unknown>} fields
 * @property {string} explain
 */

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]      - explicit file/glob args
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]  - minimum severity
 * @param {boolean} [opts.explain]
 * @param {string|false} [opts.configPath]
 * @param {string} [opts.baseline]
 * @param {boolean} [opts.ignoreBaseline]
 * @returns {Promise<{findings: Finding[], allFindings: Finding[], summary: object, status: 'OK'|'FAIL', files: string[], baseline: object}>}
 */
async function audit({
  cwd = process.cwd(),
  workflows,
  severity,
  explain = false,
  configPath,
  baseline,
  ignoreBaseline = false,
} = {}) {
  const config = await loadConfig({
    cwd,
    path: configPath,
    ruleIds: RULES.map(rule => rule.id),
  });
  const resolvedFiles = await resolveTargets({ workflows, cwd });
  const files = filterIgnoredPaths(resolvedFiles, config, cwd);
  const baselineData = await resolveBaselineData({
    baseline: ignoreBaseline ? null : (baseline ?? config.baseline),
    cwd,
  });
  return runAudit({
    cwd,
    files,
    severity,
    explain,
    config,
    baselineData,
    loadWorkflow: parseWorkflowFile,
  });
}

/**
 * Audit workflow sources supplied by a caller without writing them to disk.
 * This is the shared boundary used by remote scanners; rules receive the same
 * parsed model as a local audit and therefore cannot tell local and remote
 * inputs apart.
 *
 * @param {object} opts
 * @param {string} [opts.cwd] - identity root for stable paths and finding IDs
 * @param {Array<{file: string, source: string}>} opts.sources
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]
 * @param {boolean} [opts.explain]
 * @param {typeof DEFAULT_CONFIG} [opts.config]
 * @param {{path: string|null, ids: Set<string>, fingerprints: Set<string>}} [opts.baselineData]
 */
async function auditSources({
  cwd = process.cwd(),
  sources,
  severity,
  explain = false,
  config = DEFAULT_CONFIG,
  baselineData = emptyBaseline(),
} = {}) {
  if (!Array.isArray(sources)) throw new Error('sources must be an array');
  const sourceByFile = new Map();
  for (const item of sources) {
    if (!item || typeof item.file !== 'string' || typeof item.source !== 'string') {
      throw new Error('every source must contain string file and source values');
    }
    if (sourceByFile.has(item.file)) throw new Error(`duplicate workflow source: ${item.file}`);
    sourceByFile.set(item.file, item.source);
  }
  const files = filterIgnoredPaths([...sourceByFile.keys()].sort(), config, cwd);
  return runAudit({
    cwd,
    files,
    severity,
    explain,
    config,
    baselineData,
    loadWorkflow: async file => parseWorkflowSource(sourceByFile.get(file), file),
  });
}

async function runAudit({
  cwd,
  files,
  severity,
  explain,
  config,
  baselineData,
  loadWorkflow,
}) {
  /** @type {Finding[]} */
  const findings = [];
  for (const file of files) {
    let doc;
    try {
      doc = await loadWorkflow(file);
    } catch (err) {
      findings.push({
        id: occurrenceId({ kind: 'parse-error', file, cwd }),
        ruleId: 'parse-error',
        severity: 'high',
        file,
        line: 0,
        fields: { type: 'parse-error', sev: 'high', file: identity_canonicalPath(file, cwd) },
        explain: String(err.message ?? err),
      });
      continue;
    }
    const ignore = parseIgnoreDirectives(doc.source);
    for (const rule of RULES) {
      const rulePolicy = config.rules[rule.id];
      if (rulePolicy?.enabled === false) continue;
      const ruleFindings = rule.check(doc, {
        config,
        runnerPolicy: config.runnerPolicy,
      });
      for (const f of ruleFindings) {
        if (isIgnored(ignore, f.line, rule.id)) continue;
        const effectiveSeverity = rulePolicy?.severity ?? f.severity;
        const fields = {
          ...f.fields,
          sev: effectiveSeverity,
          file: identity_canonicalPath(file, cwd),
        };
        const finding = {
          id: rule.id === 'unpinned-action'
            ? pinOccurrenceId({
              file,
              cwd,
              ref: {
                line: f.line,
                start: f.start ?? 0,
                raw: String(f.fields.action ?? ''),
              },
            })
            : occurrenceId({
              kind: rule.id,
              file,
              cwd,
              line: f.line,
              start: f.start ?? 0,
              subject: JSON.stringify(f.fields),
            }),
          ruleId: rule.id,
          severity: effectiveSeverity,
          file,
          line: f.line,
          fields,
          explain: f.explain,
        };
        findings.push(finding);
      }
    }
  }
  assignBaselineFingerprints(findings, cwd);
  const severityFiltered = filterBySeverity(findings, severity);
  const filtered = severityFiltered.filter(finding => (
    finding.ruleId === 'parse-error'
    || (
      !baselineData.ids.has(finding.id)
      && !baselineData.fingerprints.has(finding.fingerprint)
    )
  ));
  const suppressed = severityFiltered.length - filtered.length;
  const counts = summarize(filtered);
  const status = filtered.length === 0 ? 'OK' : 'FAIL';
  return {
    files,
    findings: explain ? filtered : filtered.map(stripExplain),
    allFindings: findings,
    summary: {
      files: files.length,
      findings: filtered.length,
      totalFindings: severityFiltered.length,
      suppressed,
      ...counts,
    },
    baseline: {
      path: baselineData.path,
      suppressed,
    },
    configPath: config.path,
    status,
  };
}

async function resolveBaselineData({ baseline, cwd }) {
  return baseline
    ? loadBaseline({ path: baseline, cwd })
    : emptyBaseline();
}

function emptyBaseline() {
  return { path: null, ids: new Set(), fingerprints: new Set() };
}

function stripExplain(f) {
  const copy = { ...f };
  delete copy.explain;
  return copy;
}

/**
 * @param {string[]|undefined} workflows
 * @param {string} cwd
 */
/**
 * @param {Finding[]} findings
 * @param {string|undefined} min
 */
function filterBySeverity(findings, min) {
  if (!min) return findings;
  const minIdx = SEVERITY_ORDER.indexOf(min);
  if (minIdx === -1) return findings;
  return findings.filter(f => (
    f.ruleId === 'parse-error'
    || SEVERITY_ORDER.indexOf(f.severity) >= minIdx
  ));
}

function relPath(p, cwd) {
  return identity_canonicalPath(p, cwd);
}

/**
 * Render an audit result to the chosen format.
 *
 * @param {Awaited<ReturnType<typeof audit>>} result
 * @param {{format: 'toon'|'json'|'text', explain?: boolean, cwd?: string}} opts
 */
function renderAudit(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return formatter_format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        files: result.files.map(f => relPath(f, cwd)),
        findings: result.findings.map(f => ({ ...f, file: relPath(f.file, cwd) })),
        summary: result.summary,
        baseline: {
          ...result.baseline,
          path: result.baseline.path ? relPath(result.baseline.path, cwd) : null,
        },
        configPath: result.configPath ? relPath(result.configPath, cwd) : null,
        status: result.status,
      },
    });
  }
  /** @type {Array<{label: string, fields: Record<string, unknown>}>} */
  const records = [];
  if (opts.format === 'sarif') {
    for (const rule of RULES) {
      records.push({
        label: 'RULE',
        fields: {
          id: rule.id,
          severity: rule.severity,
          description: rule.description,
        },
      });
    }
  }
  for (const f of result.files) {
    records.push({ label: 'SCAN', fields: { file: relPath(f, opts.cwd ?? process.cwd()) } });
  }
  for (const finding of result.findings) {
    const fields = { id: finding.id, ...finding.fields, line: finding.line };
    if (opts.format === 'sarif' && finding.fingerprint) {
      fields.fingerprint = finding.fingerprint;
    }
    if (opts.explain) fields.explain = finding.explain;
    records.push({ label: 'FINDING', fields });
  }
  records.push({ label: 'SUMMARY', fields: result.summary });
  return formatter_format(opts.format, records, { status: result.status });
}

;// CONCATENATED MODULE: external "node:os"
const external_node_os_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:os");
;// CONCATENATED MODULE: ./src/lib/cache.js
/**
 * On-disk cache for GitHub API responses.
 *
 * Keyed by sha1 of the request identity. TTL is stored in each cache entry.
 * Files live outside the scanned repository, under ACTIONS_WARDEN_CACHE_DIR,
 * XDG_CACHE_HOME, or the user's platform cache directory.
 */






/**
 * @typedef {object} CacheEntry
 * @property {number} savedAt   - ms epoch
 * @property {number} ttlMs
 * @property {unknown} value
 * @property {string|undefined} etag
 */

/**
 * @param {string} cwd
 * @returns {string}
 */
function cacheDir(cwd = process.cwd()) {
  const base = process.env.ACTIONS_WARDEN_CACHE_DIR
    ?? (process.env.XDG_CACHE_HOME
      ? (0,external_node_path_namespaceObject.join)(process.env.XDG_CACHE_HOME, 'actions-warden')
      : (0,external_node_path_namespaceObject.join)((0,external_node_os_namespaceObject.homedir)(), '.cache', 'actions-warden'));
  return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.resolve)(base), digest((0,external_node_path_namespaceObject.resolve)(cwd)));
}

/**
 * @param {string} key
 * @returns {string}
 */
function digest(key) {
  return (0,external_node_crypto_namespaceObject.createHash)('sha1').update(key).digest('hex');
}

/**
 * @param {object} opts
 * @param {string} opts.key
 * @param {number} [opts.ttlMs]     - default 1h
 * @param {string} [opts.cwd]
 * @returns {Promise<unknown|undefined>}
 */
async function readCache({ key, ttlMs = 3600 * 1000, cwd = process.cwd() }) {
  const cached = await readCacheEntry({ key, ttlMs, cwd });
  return cached?.fresh ? cached.value : undefined;
}

/**
 * Read cache metadata, optionally including an expired value for ETag
 * revalidation.
 */
async function readCacheEntry({
  key,
  ttlMs = 3600 * 1000,
  cwd = process.cwd(),
  allowExpired = false,
}) {
  const path = (0,external_node_path_namespaceObject.join)(cacheDir(cwd), `${digest(key)}.json`);
  try {
    const raw = await (0,promises_namespaceObject.readFile)(path, 'utf8');
    /** @type {CacheEntry} */
    const entry = JSON.parse(raw);
    const fresh = Date.now() - entry.savedAt <= Math.min(entry.ttlMs, ttlMs);
    if (!fresh && !allowExpired) return undefined;
    return { value: entry.value, etag: entry.etag, fresh };
  } catch {
    return undefined;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.key
 * @param {unknown} opts.value
 * @param {number} [opts.ttlMs]
 * @param {string} [opts.cwd]
 * @param {string} [opts.etag]
 */
async function writeCache({
  key,
  value,
  ttlMs = 3600 * 1000,
  cwd = process.cwd(),
  etag,
}) {
  const dir = cacheDir(cwd);
  await (0,promises_namespaceObject.mkdir)(dir, { recursive: true });
  /** @type {CacheEntry} */
  const entry = { savedAt: Date.now(), ttlMs, value, ...(etag ? { etag } : {}) };
  const path = (0,external_node_path_namespaceObject.join)(dir, `${digest(key)}.json`);
  const temp = `${path}.${process.pid}.${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`;
  try {
    await (0,promises_namespaceObject.writeFile)(temp, JSON.stringify(entry), { encoding: 'utf8', mode: 0o600 });
    await (0,promises_namespaceObject.rename)(temp, path);
  } catch (error) {
    await (0,promises_namespaceObject.unlink)(temp).catch(() => {});
    throw error;
  }
}

;// CONCATENATED MODULE: ./src/lib/resolver.js
/**
 * GitHub API version resolver.
 *
 * Resolves tags/branches to commit SHAs and looks up latest releases. Uses
 * native fetch, with exponential backoff on rate-limit (HTTP 403 + ratelimit
 * remaining 0) and 5xx responses. Caches successful responses to disk.
 */







const API = 'https://api.github.com';
const IN_FLIGHT = new Map();
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * Resolve the API token. Precedence: explicit param > GITHUB_TOKEN > GH_TOKEN.
 *
 * @param {string|undefined} explicit
 * @returns {string|undefined}
 */
function resolveToken(explicit) {
  if (explicit && explicit.length > 0) return explicit;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  return undefined;
}

/**
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} [opts.token]
 * @param {number} [opts.retries]
 * @param {string} [opts.cwd]
 * @param {boolean} [opts.useCache]
 * @param {(event: {attempt: number, maxRetries: number, reason: 'network'|'rate-limit'|'server-error', delayMs: number, status?: number}) => void|Promise<void>} [opts.onRetry]
 * @returns {Promise<{status: number, body: unknown}>}
 */
function ghFetch(options) {
  const {
    url,
    token,
    cwd = process.cwd(),
    useCache = true,
  } = options;
  const inFlightKey = `${requestCacheKey(url, token)}|cwd=${(0,external_node_path_namespaceObject.resolve)(cwd)}|cache=${useCache}`;
  const existing = IN_FLIGHT.get(inFlightKey);
  if (existing) return existing;
  const request = ghFetchInternal(options).finally(() => {
    if (IN_FLIGHT.get(inFlightKey) === request) IN_FLIGHT.delete(inFlightKey);
  });
  IN_FLIGHT.set(inFlightKey, request);
  return request;
}

async function ghFetchInternal({
  url,
  token,
  retries = 3,
  cwd = process.cwd(),
  useCache = true,
  onRetry,
}) {
  if (onRetry !== undefined && typeof onRetry !== 'function') {
    throw new Error('onRetry must be a function');
  }
  const cacheKey = requestCacheKey(url, token);
  const cached = useCache
    ? await readCacheEntry({ key: cacheKey, cwd, allowExpired: true })
    : undefined;
  if (cached?.fresh) return { status: 200, body: cached.value };

  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'actions-warden',
    'x-github-api-version': '2022-11-28',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  if (cached?.etag) headers['if-none-match'] = cached.etag;

  let attempt = 0;
  for (;;) {
    let response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      if (attempt >= retries) throw new Error(`github fetch failed: ${redact(String(err))}`);
      const delayMs = backoff(attempt);
      await notifyRetry(onRetry, {
        attempt: attempt + 1,
        maxRetries: retries,
        reason: 'network',
        delayMs,
      });
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (response.status === 304 && cached) {
      await writeCache({
        key: cacheKey,
        value: cached.value,
        etag: cached.etag,
        cwd,
      });
      return { status: 200, body: cached.value };
    }
    if ((response.status === 403 && remaining === '0') || response.status === 429) {
      const reset = Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000;
      const wait = Math.max(reset - Date.now(), backoff(attempt));
      if (attempt >= retries) {
        const resetMessage = Number.isFinite(reset) && reset > Date.now()
          ? `; resets at ${new Date(reset).toISOString()}`
          : '';
        throw new Error(`github rate limit exhausted${resetMessage}`);
      }
      const delayMs = Math.min(wait, 30_000);
      await notifyRetry(onRetry, {
        attempt: attempt + 1,
        maxRetries: retries,
        reason: 'rate-limit',
        delayMs,
        status: response.status,
      });
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
    if (response.status >= 500 && attempt < retries) {
      const delayMs = backoff(attempt);
      await notifyRetry(onRetry, {
        attempt: attempt + 1,
        maxRetries: retries,
        reason: 'server-error',
        delayMs,
        status: response.status,
      });
      await sleep(delayMs);
      attempt += 1;
      continue;
    }
    const text = await response.text();
    /** @type {unknown} */
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (response.status === 200 && useCache) {
      await writeCache({
        key: cacheKey,
        value: body,
        etag: response.headers.get('etag') ?? undefined,
        cwd,
      });
    }
    return { status: response.status, body };
  }
}

function requestCacheKey(url, token) {
  if (!token) return `${url}|auth=anonymous`;
  const identity = (0,external_node_crypto_namespaceObject.createHash)('sha256').update(token).digest('hex').slice(0, 16);
  return `${url}|auth=${identity}`;
}

function backoff(attempt) {
  return Math.min(1000 * 2 ** attempt, 8000);
}
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function notifyRetry(onRetry, event) {
  if (onRetry) await onRetry(event);
}

/**
 * Resolve a ref (tag, branch, or commit-ish) to an immutable commit SHA.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.ref
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<{sha: string, type: 'tag'|'branch'|'commit'}>}
 */
async function resolveRefToSha({ owner, repo, ref, token, cwd }) {
  // Already a full SHA?
  if (COMMIT_SHA_RE.test(ref)) {
    return { sha: ref.toLowerCase(), type: 'commit' };
  }
  // Try as tag.
  const tagUrl = `${API}/repos/${owner}/${repo}/git/refs/tags/${encodeURIComponent(ref)}`;
  const tagRes = await ghFetch({ url: tagUrl, token, cwd });
  if (tagRes.status === 200 && tagRes.body && typeof tagRes.body === 'object') {
    const obj = tagRes.body.object;
    if (obj && COMMIT_SHA_RE.test(String(obj.sha))) {
      if (obj.type === 'tag') {
        const sha = await dereferenceTagToCommit({
          owner,
          repo,
          sha: String(obj.sha),
          token,
          cwd,
        });
        return { sha, type: 'tag' };
      }
      if (obj.type !== 'commit') {
        throw new Error(`tag ${owner}/${repo}@${ref} does not resolve to a commit`);
      }
      return { sha: String(obj.sha).toLowerCase(), type: 'tag' };
    }
  }
  // Try as branch.
  const branchUrl = `${API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(ref)}`;
  const branchRes = await ghFetch({ url: branchUrl, token, cwd });
  if (
    branchRes.status === 200
    && branchRes.body?.object?.type === 'commit'
    && COMMIT_SHA_RE.test(String(branchRes.body.object.sha))
  ) {
    return { sha: String(branchRes.body.object.sha).toLowerCase(), type: 'branch' };
  }
  // Try as commit.
  const commitUrl = `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;
  const commitRes = await ghFetch({ url: commitUrl, token, cwd });
  if (commitRes.status === 200 && COMMIT_SHA_RE.test(String(commitRes.body?.sha))) {
    return { sha: String(commitRes.body.sha).toLowerCase(), type: 'commit' };
  }
  throw new Error(`could not resolve ${owner}/${repo}@${ref}`);
}

async function dereferenceTagToCommit({ owner, repo, sha, token, cwd }) {
  let currentSha = sha;
  for (let depth = 0; depth < 10; depth += 1) {
    const url = `${API}/repos/${owner}/${repo}/git/tags/${currentSha}`;
    const response = await ghFetch({ url, token, cwd });
    const target = response.body?.object;
    if (
      response.status !== 200
      || !target
      || !COMMIT_SHA_RE.test(String(target.sha))
    ) {
      throw new Error(`could not dereference annotated tag ${owner}/${repo}@${sha}`);
    }
    if (target.type === 'commit') return String(target.sha).toLowerCase();
    if (target.type !== 'tag') {
      throw new Error(`annotated tag ${owner}/${repo}@${sha} targets ${target.type ?? 'an unknown object'}, not a commit`);
    }
    currentSha = String(target.sha);
  }
  throw new Error(`annotated tag chain is too deep for ${owner}/${repo}@${sha}`);
}

/**
 * Confirm that a commit SHA is reachable through the requested repository's
 * commits API rather than merely looking like a SHA.
 */
async function verifyCommitInRepo({ owner, repo, sha, token, cwd }) {
  if (!COMMIT_SHA_RE.test(sha)) {
    throw new Error(`invalid commit SHA for ${owner}/${repo}`);
  }
  const url = `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}`;
  const response = await ghFetch({ url, token, cwd });
  if (
    response.status !== 200
    || !response.body
    || typeof response.body !== 'object'
    || String(response.body.sha).toLowerCase() !== sha.toLowerCase()
  ) {
    throw new Error(`commit ${sha} is not verifiable in ${owner}/${repo} (HTTP ${response.status})`);
  }
  return true;
}

/**
 * List all tags for a repo.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<Array<{name: string, sha: string}>>}
 */
async function listTags({ owner, repo, token, cwd }) {
  /** @type {Array<{name: string, sha: string}>} */
  const out = [];
  for (let page = 1; page <= 100; page += 1) {
    const url = `${API}/repos/${owner}/${repo}/tags?per_page=100&page=${page}`;
    const res = await ghFetch({ url, token, cwd });
    if (res.status !== 200) {
      throw new Error(`could not list tags for ${owner}/${repo} (HTTP ${res.status})`);
    }
    if (!Array.isArray(res.body)) {
      throw new Error(`invalid tag response for ${owner}/${repo}`);
    }
    for (const t of res.body) {
      if (t && t.name && t.commit?.sha) out.push({ name: t.name, sha: t.commit.sha });
    }
    if (res.body.length < 100) break;
  }
  return out;
}

/**
 * Get conservative age evidence for a tag.
 *
 * Git commit and tagger timestamps are author-controlled, so they are not
 * suitable for a security cooldown. Prefer GitHub's release publication time.
 * For tags without releases, persist when this exact tag-to-SHA mapping was
 * first observed and age it from that point.
 *
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.tag
 * @param {string} opts.sha
 * @param {string} [opts.token]
 * @param {string} [opts.cwd]
 * @returns {Promise<{dateMs: number, source: 'release'|'first-seen'}>}
 */
async function getTagAgeEvidence({ owner, repo, tag, sha, token, cwd = process.cwd() }) {
  const releaseUrl = `${API}/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  const release = await ghFetch({ url: releaseUrl, token, cwd });
  if (release.status === 200 && release.body && typeof release.body === 'object') {
    const dateText = release.body.published_at;
    const dateMs = Date.parse(dateText);
    if (Number.isFinite(dateMs)) return { dateMs, source: 'release' };
  }
  // A release object without a trustworthy timestamp provides no stronger age
  // evidence than a tag without a release. Start the conservative first-seen
  // cooldown instead of failing the entire upgrade.
  if (release.status !== 404 && release.status !== 200) {
    throw new Error(`could not verify tag age for ${owner}/${repo}@${tag} (HTTP ${release.status})`);
  }

  const observationKey = `first-seen:${owner.toLowerCase()}/${repo.toLowerCase()}@${tag}:${sha}`;
  const ttlMs = 10 * 365 * 86_400_000;
  const existing = await readCache({ key: observationKey, ttlMs, cwd });
  if (existing && typeof existing === 'object' && Number.isFinite(existing.dateMs)) {
    return { dateMs: existing.dateMs, source: 'first-seen' };
  }
  const evidence = { dateMs: Date.now(), source: 'first-seen' };
  await writeCache({ key: observationKey, value: evidence, ttlMs, cwd });
  return evidence;
}

/**
 * Pick the highest semver tag matching the given policy.
 *
 * @param {object} opts
 * @param {Array<{name: string}>} opts.tags
 * @param {string|null} opts.currentRef    - current ref ("v3", "v3.1.0", branch)
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @returns {{name: string}|null}
 */
function pickLatestTag({ tags, currentRef, mode = 'major' }) {
  const semverTags = tags
    .map(t => ({ tag: t, parsed: parseActionVersion(t.name) }))
    .filter(x => x.parsed)
    .filter(x => x.parsed.prerelease.length === 0)
    .map(x => ({
      tag: x.tag,
      version: x.parsed.version,
      specificity: versionSpecificity(x.tag.name),
    }))
    .sort((a, b) => semver.rcompare(a.version, b.version) || b.specificity - a.specificity);
  if (semverTags.length === 0) return null;

  const current = currentRef ? parseActionVersion(currentRef) : null;
  if (!current || mode === 'major') return semverTags[0].tag;
  for (const candidate of semverTags) {
    if (semver.lt(candidate.version, current.version)) continue;
    if (mode === 'minor' && semver.major(candidate.version) === current.major) {
      return candidate.tag;
    }
    if (
      mode === 'patch' &&
      semver.major(candidate.version) === current.major &&
      semver.minor(candidate.version) === current.minor
    ) {
      return candidate.tag;
    }
  }
  return null;
}

function parseActionVersion(input) {
  if (typeof input !== 'string') return null;
  const match = input.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(-[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  const normalized = `${match[1]}.${match[2] ?? '0'}.${match[3] ?? '0'}${match[4] ?? ''}`;
  return semver.parse(normalized);
}

function versionSpecificity(input) {
  const core = input.replace(/^v/, '').split('-')[0];
  return core.split('.').length;
}

;// CONCATENATED MODULE: ./src/lib/writer.js
/**
 * Safe file writer with dry-run guard.
 *
 * Every mutation flows through {@link writeFileGuarded}. When `dryRun` is true
 * (the default), no bytes are written - the change is recorded and reported.
 */





/**
 * @typedef {object} WriteResult
 * @property {string} path
 * @property {boolean} written
 * @property {boolean} dryRun
 * @property {number} bytes
 */

/**
 * @param {object} args
 * @param {string} args.path
 * @param {string} args.content
 * @param {boolean} [args.dryRun]
 * @param {string} [args.cwd]
 * @returns {Promise<WriteResult>}
 */
async function writeFileGuarded({ path, content, dryRun = true, cwd = process.cwd() }) {
  if (typeof path !== 'string' || path.includes('\0')) throw new Error('invalid path');
  const requestedRoot = (0,external_node_path_namespaceObject.resolve)(cwd);
  const requestedPath = (0,external_node_path_namespaceObject.resolve)(requestedRoot, path);
  if (!(0,external_node_path_namespaceObject.isAbsolute)(path) && writer_isOutside((0,external_node_path_namespaceObject.relative)(requestedRoot, requestedPath))) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  const root = await (0,promises_namespaceObject.realpath)(requestedRoot);
  const parent = await (0,promises_namespaceObject.realpath)((0,external_node_path_namespaceObject.dirname)(requestedPath));
  if (writer_isOutside((0,external_node_path_namespaceObject.relative)(root, parent))) {
    throw new Error(`refusing to write outside working directory: ${path}`);
  }
  const abs = (0,external_node_path_namespaceObject.join)(parent, (0,external_node_path_namespaceObject.basename)(requestedPath));
  let existingMode;
  try {
    const entry = await (0,promises_namespaceObject.lstat)(requestedPath);
    if (entry.isSymbolicLink()) {
      throw new Error(`refusing to write through a symlink: ${path}`);
    }
    existingMode = entry.mode & 0o777;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (dryRun) {
    return { path: abs, written: false, dryRun: true, bytes };
  }
  const tempPath = (0,external_node_path_namespaceObject.join)(parent, `.${(0,external_node_path_namespaceObject.basename)(abs)}.actions-warden-${process.pid}-${(0,external_node_crypto_namespaceObject.randomUUID)()}`);
  let handle;
  try {
    handle = await (0,promises_namespaceObject.open)(tempPath, 'wx', existingMode ?? 0o600);
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await (0,promises_namespaceObject.rename)(tempPath, abs);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await (0,promises_namespaceObject.unlink)(tempPath).catch(() => {});
    throw error;
  }
  return { path: abs, written: true, dryRun: false, bytes };
}

/**
 * Throws on path traversal attempts.
 *
 * @param {string} path
 * @param {string} [cwd]
 * @returns {string} absolute path
 */
function assertSafePath(path, cwd = process.cwd()) {
  if (typeof path !== 'string' || path.includes('\0')) {
    throw new Error('invalid path');
  }
  const root = resolve(cwd);
  const abs = resolve(root, path);
  if (writer_isOutside(relative(root, abs))) {
    throw new Error(`path traversal rejected: ${path}`);
  }
  return abs;
}

function writer_isOutside(rel) {
  return rel === '..' || rel.startsWith(`..${external_node_path_namespaceObject.sep}`) || (0,external_node_path_namespaceObject.isAbsolute)(rel);
}

;// CONCATENATED MODULE: ./src/lib/patcher.js
/**
 * Apply non-overlapping source patches from right to left.
 *
 * @param {string} source
 * @param {Array<{start: number, end: number, text: string, expected?: string}>} patches
 */
function patcher_applyPatches(source, patches) {
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
function locateActionRef(source, ref) {
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
function patcher_planUsesPatches(source, ref, newRef, versionLabel) {
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
function readVersionComment(source, ref) {
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

;// CONCATENATED MODULE: ./src/lib/concurrency.js
/**
 * Order-preserving bounded async map.
 */
async function mapLimit(values, limit, worker) {
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

;// CONCATENATED MODULE: ./src/commands/pin.js
/**
 * Pin command - rewrite tag-based `uses:` refs to immutable commit SHAs.
 *
 * Format: `uses: owner/repo@<sha>  # actions-warden-ref: <original-ref>`
 *
 * The original tag is preserved as explicit metadata so upgrades can find the
 * human-readable version later.
 */












const pin_SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @typedef {object} PinChange
 * @property {string} id
 * @property {string} file
 * @property {string} action        - owner/repo
 * @property {string} fromRef
 * @property {string} toSha
 * @property {number} line
 * @property {'tag'|'branch'|'commit'} refType
 */

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.token]
 * @param {string} [opts.fix]            - finding/change id to apply (skip others)
 * @returns {Promise<{changes: PinChange[], errors: object[], status: 'OK'|'FAIL'}>}
 */
async function pin({ cwd = process.cwd(), workflows, dryRun = true, token, fix } = {}) {
  const files = await resolveTargets({ workflows, cwd });
  const tok = resolveToken(token);
  /** @type {PinChange[]} */
  const changes = [];
  const errors = [];
  let matchedFix = false;

  for (const file of files) {
    let source;
    try {
      source = await (0,promises_namespaceObject.readFile)(file, 'utf8');
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
      continue;
    }
    let doc;
    try {
      doc = parseWorkflowSource(source, file);
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
      continue;
    }
    /** @type {Array<{ref: import('../lib/parser.js').ActionRef, sha: string, type: string}>} */
    const planned = [];
    const candidates = [];
    const ignore = parseIgnoreDirectives(source);
    for (const { ref } of collectUses(doc)) {
      if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
      if (!ref.ref || pin_SHA_RE.test(ref.ref)) continue;
      if (isIgnored(ignore, ref.line, 'unpinned-action')) continue;
      const id = pinOccurrenceId({ file, cwd, ref });
      if (fix && fix !== id) continue;
      if (fix === id) matchedFix = true;
      candidates.push({ id, ref });
    }
    const resolutions = await mapLimit(candidates, 4, async ({ id, ref }) => {
      try {
        const resolved = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: ref.ref,
          token: tok,
          cwd,
        });
        await verifyCommitInRepo({
          owner: ref.owner,
          repo: ref.repo,
          sha: resolved.sha,
          token: tok,
          cwd,
        });
        return {
          planned: { id, ref, sha: resolved.sha, type: resolved.type },
        };
      } catch (err) {
        return {
          error: { file, action: ref.raw, error: String(err.message ?? err) },
        };
      }
    });
    for (const result of resolutions) {
      if (result.planned) planned.push(result.planned);
      if (result.error) errors.push(result.error);
    }
    if (planned.length === 0) continue;

    const patches = [];
    const fileChanges = [];
    for (const { id, ref, sha, type } of planned) {
      const change = {
        id,
        file,
        action: `${ref.owner}/${ref.repo}${ref.subpath ? `/${ref.subpath}` : ''}`,
        fromRef: ref.ref,
        toSha: sha,
        line: ref.line,
        refType: type,
      };
      patches.push(...patcher_planUsesPatches(source, ref, sha, ref.ref));
      fileChanges.push(change);
    }
    try {
      const newSource = patcher_applyPatches(source, patches);
      if (newSource !== source) {
        parseWorkflowSource(newSource, file);
        await writeFileGuarded({ path: file, content: newSource, dryRun, cwd });
      }
      changes.push(...fileChanges);
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
    }
  }
  if (fix && !matchedFix) {
    errors.push({ error: `fix id not found: ${fix}` });
  }
  return { changes, errors, status: errors.length === 0 ? 'OK' : 'FAIL' };
}

/**
 * Replace `uses: owner/repo[/sub]@<ref>` with the pinned SHA + comment.
 *
 * Operates on the source string; preserves quoting and whitespace.
 *
 * @param {string} source
 * @param {import('../lib/parser.js').ActionRef} ref
 * @param {string} sha
 * @returns {string}
 */
function rewriteUses(source, ref, sha) {
  return applyPatches(source, planUsesPatches(source, ref, sha, ref.ref));
}

/**
 * @param {Awaited<ReturnType<typeof pin>>} result
 * @param {{format: 'toon'|'json'|'text', dryRun: boolean, cwd?: string}} opts
 */
function renderPin(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return formatter_format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        dryRun: opts.dryRun,
        changes: result.changes.map(c => ({ ...c, file: rel(c.file, cwd) })),
        errors: result.errors.map(error => ({
          ...error,
          file: error.file ? rel(error.file, cwd) : undefined,
        })),
        status: result.status,
      },
    });
  }
  const records = [];
  for (const c of result.changes) {
    records.push({
      label: 'PIN',
      fields: {
        id: c.id,
        file: rel(c.file, cwd),
        line: c.line,
        action: c.action,
        from: c.fromRef,
        to: c.toSha,
        kind: c.refType,
        applied: !opts.dryRun,
      },
    });
  }
  for (const e of result.errors) {
    records.push({ label: 'ERROR', fields: { file: rel(e.file ?? '', cwd), action: e.action ?? '', msg: e.error } });
  }
  records.push({ label: 'SUMMARY', fields: { changes: result.changes.length, errors: result.errors.length, dry_run: opts.dryRun } });
  return formatter_format(opts.format, records, { status: result.status });
}

function rel(p, cwd) {
  return p ? identity_canonicalPath(p, cwd) : p;
}

;// CONCATENATED MODULE: ./src/commands/upgrade.js
/**
 * Upgrade command - bump pinned (or tagged) actions to the newest version
 * permitted by the chosen policy.
 *
 * For SHA-pinned refs, the human-readable version is read from the inline
 * comment (e.g. `# actions-warden-ref: v3.1.0`). Legacy plain semver comments
 * remain readable. If metadata is absent, the action is reported as `unknown`
 * and skipped.
 */












const upgrade_SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * @typedef {object} UpgradeChange
 * @property {string} id
 * @property {string} file
 * @property {string} action
 * @property {string} fromRef
 * @property {string|null} fromVersion
 * @property {string} toTag
 * @property {string} toSha
 * @property {'major'|'minor'|'patch'|'unknown'} level
 * @property {number} line
 */

/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.token]
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @param {string} [opts.fix]
 * @param {number} [opts.minAgeDays]   - skip tags newer than this many days
 * @returns {Promise<{changes: UpgradeChange[], errors: object[], skipped: object[], status: 'OK'|'FAIL'}>}
 */
async function upgrade({
  cwd = process.cwd(),
  workflows,
  dryRun = true,
  token,
  mode = 'minor',
  fix,
  minAgeDays = 7,
} = {}) {
  const files = await resolveTargets({ workflows, cwd });
  const tok = resolveToken(token);
  /** @type {UpgradeChange[]} */
  const changes = [];
  const errors = [];
  /** @type {object[]} */
  const skipped = [];
  const cooldownMs = Math.max(minAgeDays, 0) * 86_400_000;
  let matchedFix = false;

  for (const file of files) {
    let source;
    try {
      source = await (0,promises_namespaceObject.readFile)(file, 'utf8');
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
      continue;
    }
    let doc;
    try {
      doc = parseWorkflowSource(source, file);
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
      continue;
    }

    const ignore = parseIgnoreDirectives(source);
    const planned = [];
    for (const { ref } of collectUses(doc)) {
      if (ref.kind !== 'external' && ref.kind !== 'reusable-workflow') continue;
      if (isIgnored(ignore, ref.line, 'unpinned-action')) continue;
      const inlineVersion = readVersionComment(source, ref);
      const currentVersion = ref.ref && upgrade_SHA_RE.test(ref.ref) ? inlineVersion : ref.ref;
      if (!currentVersion) continue;
      const id = occurrenceId({
        kind: 'upgrade',
        file,
        cwd,
        line: ref.line,
        start: ref.start,
        subject: ref.raw,
      });
      if (fix && fix !== id) continue;
      if (fix === id) matchedFix = true;

      let tags;
      try {
        tags = await listTags({ owner: ref.owner, repo: ref.repo, token: tok, cwd });
      } catch (err) {
        errors.push({ file, action: ref.raw, error: String(err.message ?? err) });
        continue;
      }
      const latest = await pickAgedTag({
        tags,
        currentRef: currentVersion,
        mode,
        cooldownMs,
        owner: ref.owner,
        repo: ref.repo,
        token: tok,
        cwd,
        skipped,
        errors,
        file,
        ref,
      });
      if (!latest) continue;
      if (latest.name === currentVersion) continue;
      const level = bumpLevel(currentVersion, latest.name);
      let resolved;
      try {
        resolved = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: latest.name,
          token: tok,
          cwd,
        });
        await verifyCommitInRepo({
          owner: ref.owner,
          repo: ref.repo,
          sha: resolved.sha,
          token: tok,
          cwd,
        });
      } catch (err) {
        errors.push({ file, action: ref.raw, error: String(err.message ?? err) });
        continue;
      }
      planned.push({ id, ref, latest, sha: resolved.sha, level, currentVersion });
    }

    const patches = [];
    const fileChanges = [];
    for (const { id, ref, latest, sha, level, currentVersion } of planned) {
      const change = {
        id,
        file,
        action: `${ref.owner}/${ref.repo}`,
        fromRef: ref.ref,
        fromVersion: currentVersion,
        toTag: latest.name,
        toSha: sha,
        level,
        line: ref.line,
      };
      patches.push(...patcher_planUsesPatches(source, ref, sha, latest.name));
      fileChanges.push(change);
    }
    try {
      const newSource = patcher_applyPatches(source, patches);
      if (newSource !== source) {
        parseWorkflowSource(newSource, file);
        await writeFileGuarded({ path: file, content: newSource, dryRun, cwd });
      }
      changes.push(...fileChanges);
    } catch (err) {
      errors.push({ file, error: String(err.message ?? err) });
    }
  }
  if (fix && !matchedFix) {
    errors.push({ error: `fix id not found: ${fix}` });
  }
  return { changes, errors, skipped, status: errors.length === 0 ? 'OK' : 'FAIL' };
}

/**
 * Walk candidate tags newest-first and return the first whose commit is older
 * than the cooldown threshold. Skipped candidates are recorded.
 */
async function pickAgedTag({
  tags,
  currentRef,
  mode,
  cooldownMs,
  owner,
  repo,
  token,
  cwd,
  skipped,
  errors,
  file,
  ref,
}) {
  if (cooldownMs <= 0) {
    return pickLatestTag({ tags, currentRef, mode });
  }
  const remaining = [...tags];
  const cutoff = Date.now() - cooldownMs;
  for (;;) {
    const candidate = pickLatestTag({ tags: remaining, currentRef, mode });
    if (!candidate) return null;
    let evidence;
    try {
      evidence = await getTagAgeEvidence({
        owner,
        repo,
        tag: candidate.name,
        sha: candidate.sha,
        token,
        cwd,
      });
    } catch (err) {
      errors.push({
        file,
        action: ref.raw,
        error: String(err.message ?? err),
      });
      return null;
    }
    const { dateMs, source: ageSource } = evidence;
    if (dateMs <= cutoff) return candidate;
    skipped.push({
      file,
      action: `${ref.owner}/${ref.repo}`,
      tag: candidate.name,
      reason: 'cooldown',
      ageDays: Math.round((Date.now() - dateMs) / 86_400_000),
      ageSource,
    });
    const idx = remaining.findIndex(t => t.name === candidate.name);
    if (idx === -1) return null;
    remaining.splice(idx, 1);
  }
}

function bumpLevel(from, to) {
  const a = semver.coerce(from);
  const b = semver.coerce(to);
  if (!a || !b) return 'unknown';
  if (a.major !== b.major) return 'major';
  if (a.minor !== b.minor) return 'minor';
  return 'patch';
}

/**
 * @param {Awaited<ReturnType<typeof upgrade>>} result
 * @param {{format: 'toon'|'json'|'text', dryRun: boolean, mode: string, cwd?: string}} opts
 */
function renderUpgrade(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return formatter_format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        dryRun: opts.dryRun,
        mode: opts.mode,
        changes: result.changes.map(c => ({ ...c, file: upgrade_rel(c.file, cwd) })),
        skipped: (result.skipped ?? []).map(s => ({ ...s, file: upgrade_rel(s.file ?? '', cwd) })),
        errors: result.errors.map(error => ({
          ...error,
          file: error.file ? upgrade_rel(error.file, cwd) : undefined,
        })),
        status: result.status,
      },
    });
  }
  const records = [];
  for (const c of result.changes) {
    records.push({
      label: 'UPGRADE',
      fields: {
        id: c.id,
        file: upgrade_rel(c.file, cwd),
        line: c.line,
        action: c.action,
        from: c.fromVersion ?? c.fromRef,
        to: c.toTag,
        sha: c.toSha,
        level: c.level,
        applied: !opts.dryRun,
      },
    });
  }
  for (const s of result.skipped ?? []) {
    records.push({
      label: 'SKIP',
      fields: {
        file: upgrade_rel(s.file ?? '', cwd),
        action: s.action,
        tag: s.tag,
        reason: s.reason,
        age_days: s.ageDays,
        age_source: s.ageSource,
      },
    });
  }
  for (const e of result.errors) {
    records.push({ label: 'ERROR', fields: { file: upgrade_rel(e.file ?? '', cwd), action: e.action ?? '', msg: e.error } });
  }
  records.push({ label: 'SUMMARY', fields: { changes: result.changes.length, skipped: (result.skipped ?? []).length, errors: result.errors.length, mode: opts.mode, dry_run: opts.dryRun } });
  return formatter_format(opts.format, records, { status: result.status });
}

function upgrade_rel(p, cwd) {
  return p ? identity_canonicalPath(p, cwd) : p;
}

;// CONCATENATED MODULE: ./src/commands/report.js
/**
 * Report command - runs audit + dry-run pin + dry-run upgrade and produces
 * a combined view. Useful for "what would change?" review and LLM prompting.
 */







/**
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.workflows]
 * @param {string} [opts.token]
 * @param {'major'|'minor'|'patch'} [opts.mode]
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]
 * @param {boolean} [opts.explain]
 * @param {boolean} [opts.skipResolve]   - when true, skip pin/upgrade (offline mode)
 * @param {string|false} [opts.configPath]
 * @param {string} [opts.baseline]
 */
async function report({
  cwd = process.cwd(),
  workflows,
  token,
  mode = 'minor',
  severity,
  explain = true,
  skipResolve = false,
  minAgeDays = 7,
  configPath,
  baseline,
} = {}) {
  const auditResult = await audit({
    cwd,
    workflows,
    severity,
    explain,
    configPath,
    baseline,
  });
  let pinResult = { changes: [], errors: [], status: 'OK' };
  let upgradeResult = { changes: [], errors: [], skipped: [], status: 'OK' };
  if (!skipResolve && auditResult.files.length > 0) {
    // Audit owns target discovery and config path filtering. Reuse its exact
    // file set so every report phase operates on the same scope.
    const scopedWorkflows = auditResult.files;
    pinResult = await pin({ cwd, workflows: scopedWorkflows, dryRun: true, token });
    upgradeResult = await upgrade({
      cwd,
      workflows: scopedWorkflows,
      dryRun: true,
      token,
      mode,
      minAgeDays,
    });
    const upgradedOccurrences = new Set(
      upgradeResult.changes.map(change => `${change.file}:${change.line}`),
    );
    pinResult = {
      ...pinResult,
      changes: pinResult.changes.filter(
        change => !upgradedOccurrences.has(`${change.file}:${change.line}`),
      ),
    };
  }
  const status = [auditResult.status, pinResult.status, upgradeResult.status].includes('FAIL')
    ? 'FAIL' : 'OK';
  return {
    audit: auditResult,
    pin: pinResult,
    upgrade: upgradeResult,
    offline: skipResolve,
    status,
  };
}

/**
 * @param {Awaited<ReturnType<typeof report>>} result
 * @param {{format: 'toon'|'json'|'text', mode: string, cwd?: string}} opts
 */
function renderReport(result, opts) {
  const cwd = opts.cwd ?? process.cwd();
  if (opts.format === 'json') {
    return formatter_format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        audit: {
          files: result.audit.files.map(f => report_rel(f, cwd)),
          findings: result.audit.findings.map(f => ({ ...f, file: report_rel(f.file, cwd) })),
          summary: result.audit.summary,
          baseline: {
            ...result.audit.baseline,
            path: result.audit.baseline.path ? report_rel(result.audit.baseline.path, cwd) : null,
          },
          status: result.audit.status,
        },
        pin: {
          changes: result.pin.changes.map(c => ({ ...c, file: report_rel(c.file, cwd) })),
          errors: result.pin.errors.map(error => ({
            ...error,
            file: error.file ? report_rel(error.file, cwd) : undefined,
          })),
          status: result.pin.status,
        },
        upgrade: {
          changes: result.upgrade.changes.map(c => ({ ...c, file: report_rel(c.file, cwd) })),
          skipped: result.upgrade.skipped.map(skip => ({
            ...skip,
            file: skip.file ? report_rel(skip.file, cwd) : undefined,
          })),
          errors: result.upgrade.errors.map(error => ({
            ...error,
            file: error.file ? report_rel(error.file, cwd) : undefined,
          })),
          mode: opts.mode,
          status: result.upgrade.status,
        },
        offline: result.offline,
        status: result.status,
      },
    });
  }
  const records = [];
  for (const finding of result.audit.findings) {
    records.push({
      label: 'FINDING',
      fields: {
        id: finding.id,
        ...finding.fields,
        line: finding.line,
        explain: finding.explain,
        ...(opts.format === 'sarif' && finding.fingerprint
          ? { fingerprint: finding.fingerprint }
          : {}),
      },
    });
  }
  for (const c of result.pin.changes) {
    records.push({ label: 'PIN', fields: { id: c.id, file: report_rel(c.file, cwd), action: c.action, from: c.fromRef, to: c.toSha } });
  }
  for (const c of result.upgrade.changes) {
    records.push({ label: 'UPGRADE', fields: { id: c.id, file: report_rel(c.file, cwd), action: c.action, from: c.fromVersion ?? c.fromRef, to: c.toTag, level: c.level } });
  }
  for (const skipped of result.upgrade.skipped ?? []) {
    records.push({
      label: 'SKIP',
      fields: {
        stage: 'upgrade',
        file: report_rel(skipped.file ?? '', cwd),
        action: skipped.action,
        tag: skipped.tag,
        reason: skipped.reason,
        age_days: skipped.ageDays,
        age_source: skipped.ageSource,
      },
    });
  }
  for (const error of result.pin.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        stage: 'pin',
        file: report_rel(error.file ?? '', cwd),
        action: error.action,
        msg: error.error,
      },
    });
  }
  for (const error of result.upgrade.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        stage: 'upgrade',
        file: report_rel(error.file ?? '', cwd),
        action: error.action,
        msg: error.error,
      },
    });
  }
  records.push({
    label: 'SUMMARY',
    fields: {
      files: result.audit.summary.files,
      findings: result.audit.summary.findings,
      critical: result.audit.summary.critical,
      high: result.audit.summary.high,
      medium: result.audit.summary.medium,
      low: result.audit.summary.low,
      pins: result.pin.changes.length,
      upgrades: result.upgrade.changes.length,
      skipped: (result.upgrade.skipped ?? []).length,
      errors: result.pin.errors.length + result.upgrade.errors.length,
      offline: result.offline,
    },
  });
  return formatter_format(opts.format, records, { status: result.status });
}

function report_rel(p, cwd) {
  return p ? identity_canonicalPath(p, cwd) : p;
}

;// CONCATENATED MODULE: ./src/commands/verify.js









const verify_SHA_RE = /^[0-9a-f]{40}$/i;

async function verify({ cwd = process.cwd(), workflows, token } = {}) {
  const files = await resolveTargets({ workflows, cwd });
  const resolvedToken = resolveToken(token);
  const checks = [];
  const warnings = [];
  const errors = [];

  for (const file of files) {
    let source;
    let workflow;
    try {
      source = await (0,promises_namespaceObject.readFile)(file, 'utf8');
      workflow = parseWorkflowSource(source, file);
    } catch (error) {
      errors.push({ file, error: String(error.message ?? error) });
      continue;
    }

    const refs = collectUses(workflow)
      .map(item => item.ref)
      .filter(ref => ref.kind === 'external' || ref.kind === 'reusable-workflow');
    const results = await mapLimit(refs, 4, async ref => {
      const id = occurrenceId({
        kind: 'verify',
        file,
        cwd,
        line: ref.line,
        start: ref.start,
        subject: ref.raw,
      });
      if (!ref.ref || !verify_SHA_RE.test(ref.ref)) {
        return { type: 'error', value: {
          id,
          file,
          line: ref.line,
          action: ref.raw,
          error: 'reference is not pinned to a full commit SHA',
        } };
      }

      try {
        await verifyCommitInRepo({
          owner: ref.owner,
          repo: ref.repo,
          sha: ref.ref,
          token: resolvedToken,
          cwd,
        });
        const version = readVersionComment(source, ref);
        if (!version) {
          const warning = {
            id,
            file,
            line: ref.line,
            action: ref.raw,
            warning: 'pinned SHA has no actions-warden-ref version metadata',
          };
          return {
            type: 'warning',
            value: warning,
            check: { id, file, line: ref.line, action: ref.raw, sha: ref.ref },
          };
        }
        const expected = await resolveRefToSha({
          owner: ref.owner,
          repo: ref.repo,
          ref: version,
          token: resolvedToken,
          cwd,
        });
        if (expected.sha.toLowerCase() !== ref.ref.toLowerCase()) {
          throw new Error(`version metadata ${version} resolves to ${expected.sha}, not ${ref.ref}`);
        }
        return { type: 'check', value: {
          id,
          file,
          line: ref.line,
          action: `${ref.owner}/${ref.repo}${ref.subpath ? `/${ref.subpath}` : ''}`,
          version,
          sha: ref.ref.toLowerCase(),
        } };
      } catch (error) {
        return { type: 'error', value: {
          id,
          file,
          line: ref.line,
          action: ref.raw,
          error: String(error.message ?? error),
        } };
      }
    });
    for (const result of results) {
      if (result.type === 'error') errors.push(result.value);
      if (result.type === 'warning') {
        warnings.push(result.value);
        checks.push(result.check);
      }
      if (result.type === 'check') checks.push(result.value);
    }
  }

  return {
    files,
    checks,
    warnings,
    errors,
    status: errors.length === 0 ? 'OK' : 'FAIL',
  };
}

function renderVerify(result, { format: outputFormat, cwd = process.cwd() }) {
  if (outputFormat === 'json') {
    return formatter_format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        files: result.files.map(file => identity_canonicalPath(file, cwd)),
        checks: result.checks.map(check => ({ ...check, file: identity_canonicalPath(check.file, cwd) })),
        warnings: result.warnings.map(warning => ({
          ...warning,
          file: identity_canonicalPath(warning.file, cwd),
        })),
        errors: result.errors.map(error => ({
          ...error,
          file: error.file ? identity_canonicalPath(error.file, cwd) : undefined,
        })),
        status: result.status,
      },
    });
  }
  const records = [];
  for (const check of result.checks) {
    records.push({
      label: 'VERIFIED',
      fields: {
        id: check.id,
        file: identity_canonicalPath(check.file, cwd),
        line: check.line,
        action: check.action,
        version: check.version,
        sha: check.sha,
      },
    });
  }
  for (const warning of result.warnings) {
    records.push({
      label: 'WARNING',
      fields: {
        id: warning.id,
        file: identity_canonicalPath(warning.file, cwd),
        line: warning.line,
        action: warning.action,
        msg: warning.warning,
      },
    });
  }
  for (const error of result.errors) {
    records.push({
      label: 'ERROR',
      fields: {
        id: error.id,
        file: error.file ? identity_canonicalPath(error.file, cwd) : undefined,
        line: error.line,
        action: error.action,
        msg: error.error,
      },
    });
  }
  records.push({
    label: 'SUMMARY',
    fields: {
      verified: result.checks.length,
      warnings: result.warnings.length,
      errors: result.errors.length,
    },
  });
  return formatter_format(outputFormat, records, { status: result.status });
}

;// CONCATENATED MODULE: external "node:util"
const external_node_util_namespaceObject = __WEBPACK_EXTERNAL_createRequire(import.meta.url)("node:util");
;// CONCATENATED MODULE: ./src/lib/github-org.js
/**
 * Read-only GitHub organization/repository discovery.
 *
 * Repository code is fetched as Git objects and parsed in memory. Nothing is
 * cloned, checked out, or executed by the organization scanner.
 */




const github_org_API = 'https://api.github.com';
const NAME_RE = /^[A-Za-z0-9_.-]+$/;
const github_org_SHA_RE = /^[0-9a-f]{40}$/i;
const MAX_WORKFLOW_BYTES = 2 * 1024 * 1024;
const MAX_WORKFLOW_FILES = 1000;
const MAX_REPOSITORY_WORKFLOW_BYTES = 32 * 1024 * 1024;

/**
 * List every repository visible to the supplied token for an organization.
 */
async function listOrganizationRepositories({ organization, token, cwd, onRetry } = {}) {
  const org = validateName(organization, 'organization');
  const repositories = [];
  const seen = new Set();

  for (let page = 1; page <= 1000; page += 1) {
    const query = new URLSearchParams({
      type: 'all',
      sort: 'full_name',
      direction: 'asc',
      per_page: '100',
      page: String(page),
    });
    const response = await ghFetch({
      url: `${github_org_API}/orgs/${encodeURIComponent(org)}/repos?${query}`,
      token,
      cwd,
      useCache: false,
      onRetry,
    });
    if (response.status !== 200) {
      throw new Error(`could not list repositories for ${org} (HTTP ${response.status})`);
    }
    if (!Array.isArray(response.body)) {
      throw new Error(`invalid repository response for ${org}`);
    }

    for (const raw of response.body) {
      const repository = normalizeRepository(raw, org);
      const key = repository.fullName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      repositories.push(repository);
    }
    if (response.body.length < 100) {
      return repositories.sort((left, right) => left.fullName.localeCompare(right.fullName));
    }
  }
  throw new Error(`repository listing for ${org} exceeded 100000 entries`);
}

/**
 * Fetch and validate the workflow-bearing portion of a repository tree.
 * The returned snapshot can be compared with a checkpoint before any blobs
 * are downloaded.
 */
async function fetchRepositoryWorkflowTree({
  repository,
  token,
  cwd,
  includePath,
  onRetry,
} = {}) {
  const normalized = normalizeRepository(repository, repository?.owner);
  if (includePath !== undefined && typeof includePath !== 'function') {
    throw new Error('includePath must be a function');
  }
  if (!normalized.defaultBranch) {
    return workflowTree(normalized, { entries: [], empty: true, treeSha: null });
  }
  const treeUrl = `${github_org_API}/repos/${encodeURIComponent(normalized.owner)}`
    + `/${encodeURIComponent(normalized.name)}/git/trees/`
    + `${encodeURIComponent(normalized.defaultBranch)}?recursive=1`;
  const treeResponse = await ghFetch({
    url: treeUrl,
    token,
    cwd,
    useCache: false,
    onRetry,
  });
  if (treeResponse.status === 409) {
    return workflowTree(normalized, { entries: [], empty: true, treeSha: null });
  }
  if (treeResponse.status !== 200) {
    throw new Error(`could not read ${normalized.fullName}@${normalized.defaultBranch} tree (HTTP ${treeResponse.status})`);
  }
  if (!treeResponse.body || typeof treeResponse.body !== 'object' || !Array.isArray(treeResponse.body.tree)) {
    throw new Error(`invalid tree response for ${normalized.fullName}`);
  }
  if (typeof treeResponse.body.truncated !== 'boolean') {
    throw new Error(`invalid tree truncation state for ${normalized.fullName}`);
  }
  if (!github_org_SHA_RE.test(String(treeResponse.body.sha ?? ''))) {
    throw new Error(`invalid tree SHA for ${normalized.fullName}`);
  }
  if (treeResponse.body.truncated === true) {
    throw new Error(`tree response for ${normalized.fullName} was truncated; refusing an incomplete scan`);
  }

  const entries = treeResponse.body.tree
    .filter(entry => (
      entry?.type === 'blob'
      && github_org_isWorkflowPath(entry.path)
      && (includePath === undefined || includePath(entry.path))
    ))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (entries.length > MAX_WORKFLOW_FILES) {
    throw new Error(
      `${normalized.fullName} has more than ${MAX_WORKFLOW_FILES} workflow files; refusing an unbounded scan`,
    );
  }
  const declaredBytes = entries.reduce(
    (total, entry) => total + (
      Number.isSafeInteger(entry.size) && entry.size >= 0 ? entry.size : 0
    ),
    0,
  );
  if (declaredBytes > MAX_REPOSITORY_WORKFLOW_BYTES) {
    throw new Error(
      `${normalized.fullName} workflow sources exceed the ${MAX_REPOSITORY_WORKFLOW_BYTES}-byte repository limit`,
    );
  }
  return workflowTree(normalized, {
    entries,
    empty: false,
    treeSha: String(treeResponse.body.sha).toLowerCase(),
  });
}

/**
 * Fetch workflow and composite-action YAML from a repository's default branch.
 */
async function fetchRepositoryWorkflows({
  repository,
  token,
  cwd,
  includePath,
  workflowTree: suppliedWorkflowTree,
  onRetry,
} = {}) {
  const normalized = normalizeRepository(repository, repository?.owner);
  if (suppliedWorkflowTree !== undefined && includePath !== undefined) {
    throw new Error('includePath cannot be combined with a supplied workflow tree');
  }
  const tree = suppliedWorkflowTree ?? await fetchRepositoryWorkflowTree({
    repository: normalized,
    token,
    cwd,
    includePath,
    onRetry,
  });
  validateWorkflowTree(tree, normalized);
  if (tree.empty) {
    return { sources: [], errors: [], empty: true, treeSha: tree.treeSha };
  }

  const sources = [];
  const errors = [];
  let sourceBytes = 0;
  for (const entry of tree.entries) {
    if (!github_org_SHA_RE.test(String(entry.sha ?? ''))) {
      errors.push({ path: entry.path, error: 'workflow tree entry has an invalid blob SHA' });
      continue;
    }
    if (
      entry.size !== undefined
      && (!Number.isSafeInteger(entry.size) || entry.size < 0)
    ) {
      errors.push({ path: entry.path, error: 'workflow tree entry has an invalid size' });
      continue;
    }
    if (Number.isFinite(entry.size) && entry.size > MAX_WORKFLOW_BYTES) {
      errors.push({
        path: entry.path,
        error: `workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`,
      });
      continue;
    }
    let source;
    try {
      source = await fetchBlobText({
        owner: normalized.owner,
        repo: normalized.name,
        sha: entry.sha,
        token,
        cwd,
        onRetry,
      });
    } catch (error) {
      errors.push({ path: entry.path, error: String(error.message ?? error) });
      continue;
    }
    sourceBytes += Buffer.byteLength(source);
    if (sourceBytes > MAX_REPOSITORY_WORKFLOW_BYTES) {
      throw new Error(
        `${normalized.fullName} workflow sources exceed the ${MAX_REPOSITORY_WORKFLOW_BYTES}-byte repository limit`,
      );
    }
    sources.push({ path: entry.path, source, sha: String(entry.sha).toLowerCase() });
  }
  return {
    sources,
    errors,
    empty: false,
    treeSha: tree.treeSha,
  };
}

function github_org_isWorkflowPath(path) {
  if (
    typeof path !== 'string'
    || path.includes('\0')
    || path.includes('\\')
    || path.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) return false;
  return (
    /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path)
    || /^action\.ya?ml$/.test(path)
    || /^\.github\/actions\/(?:.*\/)?action\.ya?ml$/.test(path)
  );
}

async function fetchBlobText({ owner, repo, sha, token, cwd, onRetry }) {
  const response = await ghFetch({
    url: `${github_org_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      + `/git/blobs/${encodeURIComponent(sha)}`,
    token,
    cwd,
    useCache: false,
    onRetry,
  });
  if (response.status !== 200) {
    throw new Error(`could not read workflow blob ${sha} (HTTP ${response.status})`);
  }
  const body = response.body;
  if (!body || typeof body !== 'object' || body.encoding !== 'base64' || typeof body.content !== 'string') {
    throw new Error(`invalid workflow blob response for ${sha}`);
  }
  if (String(body.sha ?? '').toLowerCase() !== sha.toLowerCase()) {
    throw new Error(`workflow blob response did not match ${sha}`);
  }
  if (body.size !== undefined && (!Number.isSafeInteger(body.size) || body.size < 0)) {
    throw new Error(`workflow blob ${sha} has an invalid size`);
  }
  if (Number.isFinite(body.size) && body.size > MAX_WORKFLOW_BYTES) {
    throw new Error(`workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`);
  }
  const compact = body.content.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    throw new Error(`workflow blob ${sha} is not valid base64`);
  }
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.length > MAX_WORKFLOW_BYTES) {
    throw new Error(`workflow exceeds the ${MAX_WORKFLOW_BYTES}-byte scan limit`);
  }
  if (Number.isFinite(body.size) && bytes.length !== body.size) {
    throw new Error(`workflow blob ${sha} size did not match its metadata`);
  }
  try {
    return new external_node_util_namespaceObject.TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`workflow blob ${sha} is not valid UTF-8`);
  }
}

function workflowTree(repository, { entries, empty, treeSha }) {
  return {
    repository: repository.fullName,
    branch: repository.defaultBranch,
    entries: entries.map(entry => ({
      path: entry.path,
      type: entry.type,
      sha: entry.sha,
      ...(entry.size === undefined ? {} : { size: entry.size }),
    })),
    empty,
    treeSha,
  };
}

function validateWorkflowTree(tree, repository) {
  if (
    !tree
    || typeof tree !== 'object'
    || tree.repository !== repository.fullName
    || tree.branch !== repository.defaultBranch
    || typeof tree.empty !== 'boolean'
    || !Array.isArray(tree.entries)
    || (tree.treeSha !== null && !github_org_SHA_RE.test(String(tree.treeSha)))
  ) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (tree.empty && tree.entries.length > 0) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (!tree.empty && tree.treeSha === null) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  if (tree.entries.length > MAX_WORKFLOW_FILES) {
    throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
  }
  for (const entry of tree.entries) {
    if (
      !entry
      || typeof entry !== 'object'
      || entry.type !== 'blob'
      || !github_org_isWorkflowPath(entry.path)
    ) {
      throw new Error(`invalid workflow tree snapshot for ${repository.fullName}`);
    }
  }
}

function normalizeRepository(raw, expectedOwner) {
  if (!raw || typeof raw !== 'object') throw new Error('invalid repository record');
  const owner = validateName(
    raw.owner?.login ?? (typeof raw.owner === 'string' ? raw.owner : expectedOwner),
    'repository owner',
  );
  const name = validateName(raw.name, 'repository name');
  const fullName = `${owner}/${name}`;
  const suppliedFullName = raw.full_name ?? raw.fullName;
  if (
    suppliedFullName !== undefined
    && String(suppliedFullName).toLowerCase() !== fullName.toLowerCase()
  ) {
    throw new Error(`invalid repository identity: ${suppliedFullName}`);
  }
  const suppliedDefaultBranch = raw.default_branch ?? raw.defaultBranch;
  const defaultBranch = suppliedDefaultBranch == null
    ? null
    : validateRef(String(suppliedDefaultBranch));
  const visibility = ['public', 'private', 'internal'].includes(raw.visibility)
    ? raw.visibility
    : raw.private === true ? 'private' : 'public';
  return {
    owner,
    name,
    fullName,
    defaultBranch,
    visibility,
    private: raw.private === true,
    fork: raw.fork === true,
    archived: raw.archived === true,
    disabled: raw.disabled === true,
    htmlUrl: typeof (raw.html_url ?? raw.htmlUrl) === 'string'
      ? (raw.html_url ?? raw.htmlUrl)
      : `https://github.com/${owner}/${name}`,
  };
}

function validateName(value, label) {
  if (typeof value !== 'string' || !NAME_RE.test(value) || value === '.' || value === '..') {
    throw new Error(`invalid ${label}`);
  }
  return value;
}

function validateRef(value) {
  if (!value || value.includes('\0') || value.startsWith('/') || value.endsWith('/')) {
    throw new Error('invalid default branch');
  }
  return value;
}

;// CONCATENATED MODULE: ./src/version.js
// Runtime version embedded in the GitHub Action bundle. The version-sync check
// keeps this value aligned with package.json, the lockfile, and plugin metadata.
const VERSION = '0.2.0';

;// CONCATENATED MODULE: ./src/lib/org-checkpoint.js
/**
 * Durable organization-scan checkpoints.
 *
 * Checkpoints contain validated report data and Git tree revisions, never
 * tokens or raw workflow YAML. Every update uses the guarded atomic writer.
 */













const CHECKPOINT_KIND = 'actions-warden-org-scan';
const CHECKPOINT_SCHEMA_VERSION = '1.0';
const MAX_ORGANIZATION_CHECKPOINT_BYTES = 256 * 1024 * 1024;
const org_checkpoint_NAME_RE = /^[A-Za-z0-9_.-]+$/;
const org_checkpoint_SHA_RE = /^[0-9a-f]{40}$/i;
const ID_RE = /^[0-9a-f]{16}$/;
const org_checkpoint_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const RULE_IDS = new Set(['parse-error', ...listRules().map(rule => rule.id)]);
const RULES_HASH = org_checkpoint_digest(listRules());

function createOrganizationCheckpointIdentity({
  organization,
  repositories,
  visibility,
  includeArchived,
  includeDisabled,
  includeForks,
  maxRepositories,
  severity,
  explain,
  config,
  baselineData,
}) {
  return {
    toolVersion: VERSION,
    rulesHash: RULES_HASH,
    organization: organization.toLowerCase(),
    scope: {
      repositories,
      visibility,
      includeArchived,
      includeDisabled,
      includeForks,
      maxRepositories: maxRepositories ?? null,
      severity: severity ?? null,
      explain,
    },
    configHash: org_checkpoint_digest({
      ignorePaths: config.ignorePaths,
      rules: config.rules,
      runnerPolicy: config.runnerPolicy,
    }),
    baselineHash: org_checkpoint_digest({
      ids: [...baselineData.ids].sort(),
      fingerprints: [...baselineData.fingerprints].sort(),
    }),
  };
}

async function loadOrganizationCheckpoint({ path, cwd, identity }) {
  const resolvedPath = await resolveRepositoryFile(path, cwd);
  const metadata = await (0,promises_namespaceObject.stat)(resolvedPath);
  if (!metadata.isFile()) throw new Error('organization checkpoint must be a file');
  if (metadata.size > MAX_ORGANIZATION_CHECKPOINT_BYTES) {
    throw new Error(
      `organization checkpoint exceeds ${MAX_ORGANIZATION_CHECKPOINT_BYTES} bytes`,
    );
  }

  let checkpoint;
  try {
    checkpoint = JSON.parse(await (0,promises_namespaceObject.readFile)(resolvedPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('organization checkpoint is not valid JSON');
    throw error;
  }
  if (!org_checkpoint_isRecord(checkpoint) || checkpoint.schemaVersion !== CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(`organization checkpoint schemaVersion must be "${CHECKPOINT_SCHEMA_VERSION}"`);
  }
  if (checkpoint.kind !== CHECKPOINT_KIND) {
    throw new Error('file is not an actions-warden organization checkpoint');
  }
  validateIdentity(checkpoint.identity, identity);
  if (!Array.isArray(checkpoint.repositories)) {
    throw new Error('organization checkpoint repositories must be an array');
  }

  const results = new Map();
  for (const value of checkpoint.repositories) {
    const result = validateCheckpointResult(value, identity);
    const key = result.repository.toLowerCase();
    if (results.has(key)) throw new Error(`duplicate checkpoint repository: ${result.repository}`);
    results.set(key, result);
  }
  return { path: resolvedPath, results };
}

async function validateOrganizationCheckpointPath({ path, cwd }) {
  return writeFileGuarded({ path, content: '', cwd, dryRun: true });
}

async function writeOrganizationCheckpoint({
  path,
  cwd,
  identity,
  repositoryResults,
}) {
  const repositories = [...repositoryResults]
    .map(result => serializeCheckpointResult(result, cwd))
    .sort((left, right) => left.repository.localeCompare(right.repository));
  const content = `${JSON.stringify(redactDeep({
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    kind: CHECKPOINT_KIND,
    identity,
    repositories,
  }), null, 2)}\n`;
  if (Buffer.byteLength(content) > MAX_ORGANIZATION_CHECKPOINT_BYTES) {
    throw new Error(
      `organization checkpoint exceeds ${MAX_ORGANIZATION_CHECKPOINT_BYTES} bytes`,
    );
  }
  return writeFileGuarded({ path, content, cwd, dryRun: false });
}

function canReuseCheckpointResult(result, repository, treeSha) {
  return result.repository === repository.fullName
    && result.branch === repository.defaultBranch
    && result.treeSha === treeSha
    && result.errors.length === 0;
}

function restoreCheckpointResult(result, { repository, cwd, sourceUrl }) {
  const repositoryRoot = (0,external_node_path_namespaceObject.resolve)(cwd, repository.owner, repository.name);
  const findings = result.findings.map(finding => ({
    ...finding,
    file: (0,external_node_path_namespaceObject.resolve)(repositoryRoot, ...finding.file.split('/')),
    repository: repository.fullName,
    branch: repository.defaultBranch,
    url: sourceUrl(repository, finding.file, finding.line),
  }));
  return {
    repository,
    revision: { branch: repository.defaultBranch, treeSha: result.treeSha },
    files: [...result.files],
    findings,
    errors: result.errors.map(error => ({
      repository: repository.fullName,
      ...(error.path ? { path: error.path } : {}),
      error: error.error,
    })),
    summary: { ...result.summary },
    status: result.status,
  };
}

function serializeCheckpointResult(result, cwd) {
  const repositoryRoot = (0,external_node_path_namespaceObject.resolve)(cwd, result.repository.owner, result.repository.name);
  return {
    repository: result.repository.fullName,
    branch: result.revision.branch,
    treeSha: result.revision.treeSha,
    files: [...result.files],
    findings: result.findings.map(finding => {
      const copy = { ...finding, file: identity_canonicalPath(finding.file, repositoryRoot) };
      delete copy.repository;
      delete copy.branch;
      delete copy.url;
      return copy;
    }),
    errors: result.errors.map(error => ({
      ...(error.path ? { path: error.path } : {}),
      error: error.error,
    })),
    summary: result.summary,
    status: result.status,
  };
}

function validateIdentity(actual, expected) {
  if (!org_checkpoint_isRecord(actual)) throw new Error('organization checkpoint identity is invalid');
  for (const field of [
    'toolVersion',
    'rulesHash',
    'organization',
    'scope',
    'configHash',
    'baselineHash',
  ]) {
    if (stableStringify(actual[field]) !== stableStringify(expected[field])) {
      throw new Error(`organization checkpoint does not match current ${field}`);
    }
  }
}

function validateCheckpointResult(value, identity) {
  if (!org_checkpoint_isRecord(value)) throw new Error('organization checkpoint repository result is invalid');
  const repository = validateFullName(value.repository);
  const branch = validateBranch(value.branch);
  const treeSha = value.treeSha === null ? null : validateSha(value.treeSha, repository);
  const files = validateFiles(value.files, repository);
  const findings = validateFindings(value.findings, {
    repository,
    files: new Set(files),
    explain: identity.scope.explain,
  });
  const errors = validateErrors(value.errors, repository);
  const summary = validateSummary(value.summary, files, findings, repository);
  const status = findings.length === 0 && errors.length === 0 ? 'OK' : 'FAIL';
  if (value.status !== status) {
    throw new Error(`organization checkpoint status is inconsistent for ${repository}`);
  }
  return { repository, branch, treeSha, files, findings, errors, summary, status };
}

function validateFullName(value) {
  if (typeof value !== 'string') throw new Error('checkpoint repository name must be a string');
  const parts = value.split('/');
  if (
    parts.length !== 2
    || parts.some(part => !org_checkpoint_NAME_RE.test(part) || part === '.' || part === '..')
  ) throw new Error(`invalid checkpoint repository: ${value}`);
  return value;
}

function validateBranch(value) {
  if (value === null) return null;
  if (
    typeof value !== 'string'
    || !value
    || value.includes('\0')
    || value.startsWith('/')
    || value.endsWith('/')
  ) throw new Error('invalid checkpoint default branch');
  return value;
}

function validateSha(value, repository) {
  if (typeof value !== 'string' || !org_checkpoint_SHA_RE.test(value)) {
    throw new Error(`invalid checkpoint tree SHA for ${repository}`);
  }
  return value.toLowerCase();
}

function validateFiles(value, repository) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint files for ${repository}`);
  if (value.some(path => !github_org_isWorkflowPath(path))) {
    throw new Error(`invalid checkpoint workflow path for ${repository}`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`duplicate checkpoint workflow path for ${repository}`);
  }
  if (value.some((path, index) => index > 0 && value[index - 1].localeCompare(path) > 0)) {
    throw new Error(`checkpoint workflow paths are not ordered for ${repository}`);
  }
  return [...value];
}

function validateFindings(value, { repository, files, explain }) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint findings for ${repository}`);
  return value.map(finding => {
    if (
      !org_checkpoint_isRecord(finding)
      || typeof finding.id !== 'string'
      || !ID_RE.test(finding.id)
      || typeof finding.fingerprint !== 'string'
      || !ID_RE.test(finding.fingerprint)
      || !RULE_IDS.has(finding.ruleId)
      || !org_checkpoint_SEVERITIES.has(finding.severity)
      || !files.has(finding.file)
      || !Number.isInteger(finding.line)
      || finding.line < 0
      || !org_checkpoint_isRecord(finding.fields)
      || !isJsonValue(finding.fields)
      || finding.fields.file !== `${repository}/${finding.file}`
      || finding.fields.sev !== finding.severity
      || (explain ? typeof finding.explain !== 'string' : finding.explain !== undefined)
    ) {
      throw new Error(`invalid checkpoint finding for ${repository}`);
    }
    return {
      id: finding.id,
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      fields: finding.fields,
      ...(finding.explain === undefined ? {} : { explain: finding.explain }),
      fingerprint: finding.fingerprint,
    };
  });
}

function validateErrors(value, repository) {
  if (!Array.isArray(value)) throw new Error(`invalid checkpoint errors for ${repository}`);
  return value.map(error => {
    if (
      !org_checkpoint_isRecord(error)
      || typeof error.error !== 'string'
      || (error.path !== undefined && !github_org_isWorkflowPath(error.path))
    ) throw new Error(`invalid checkpoint error for ${repository}`);
    return {
      ...(error.path === undefined ? {} : { path: error.path }),
      error: error.error,
    };
  });
}

function validateSummary(value, files, findings, repository) {
  if (!org_checkpoint_isRecord(value)) throw new Error(`invalid checkpoint summary for ${repository}`);
  const fields = [
    'files',
    'findings',
    'totalFindings',
    'suppressed',
    'critical',
    'high',
    'medium',
    'low',
  ];
  if (fields.some(field => !Number.isSafeInteger(value[field]) || value[field] < 0)) {
    throw new Error(`invalid checkpoint summary for ${repository}`);
  }
  const counts = summarize(findings);
  if (
    value.files !== files.length
    || value.findings !== findings.length
    || value.totalFindings !== value.findings + value.suppressed
    || [...org_checkpoint_SEVERITIES].some(severity => value[severity] !== counts[severity])
  ) throw new Error(`inconsistent checkpoint summary for ${repository}`);
  return Object.fromEntries(fields.map(field => [field, value[field]]));
}

function org_checkpoint_digest(value) {
  return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value) {
  return JSON.stringify(org_checkpoint_stableValue(value));
}

function org_checkpoint_stableValue(value) {
  if (Array.isArray(value)) return value.map(org_checkpoint_stableValue);
  if (org_checkpoint_isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, org_checkpoint_stableValue(item)]),
    );
  }
  return value;
}

function isJsonValue(value, seen = new Set()) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  const valid = Array.isArray(value)
    ? value.every(item => isJsonValue(item, seen))
    : Object.entries(value).every(([key, item]) => (
      typeof key === 'string' && isJsonValue(item, seen)
    ));
  seen.delete(value);
  return valid;
}

function org_checkpoint_isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

;// CONCATENATED MODULE: ./src/commands/org-scan.js
/**
 * Organization scan command - enumerate repositories through the GitHub API,
 * fetch workflow YAML from each default branch, and aggregate audit findings.
 */















const VISIBILITIES = new Set(['all', 'public', 'private', 'internal']);
const ORGANIZATION_RE = /^[A-Za-z0-9_.-]+$/;

/**
 * @param {object} opts
 * @param {string} opts.organization
 * @param {string} [opts.cwd]
 * @param {string} [opts.token]
 * @param {string[]} [opts.repositories]
 * @param {'all'|'public'|'private'|'internal'} [opts.visibility]
 * @param {boolean} [opts.includeArchived]
 * @param {boolean} [opts.includeDisabled]
 * @param {boolean} [opts.includeForks]
 * @param {number} [opts.maxRepositories]
 * @param {number} [opts.concurrency]
 * @param {'low'|'medium'|'high'|'critical'} [opts.severity]
 * @param {boolean} [opts.explain]
 * @param {string|false} [opts.configPath]
 * @param {string} [opts.baseline]
 * @param {string} [opts.checkpointPath]
 * @param {boolean} [opts.resume]
 * @param {(event: object) => void|Promise<void>} [opts.onProgress]
 */
async function scanOrganization({
  organization,
  cwd = process.cwd(),
  token,
  repositories,
  visibility = 'all',
  includeArchived = false,
  includeDisabled = false,
  includeForks = false,
  maxRepositories,
  concurrency = 4,
  severity,
  explain = false,
  configPath,
  baseline,
  checkpointPath,
  resume = false,
  onProgress,
} = {}) {
  if (
    typeof organization !== 'string'
    || !ORGANIZATION_RE.test(organization)
    || organization === '.'
    || organization === '..'
  ) throw new Error('invalid organization');
  if (!VISIBILITIES.has(visibility)) throw new Error(`invalid visibility: ${visibility}`);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error('concurrency must be an integer from 1 to 16');
  }
  if (maxRepositories !== undefined && (!Number.isInteger(maxRepositories) || maxRepositories < 1)) {
    throw new Error('max repositories must be a positive integer');
  }
  if (checkpointPath !== undefined && (typeof checkpointPath !== 'string' || !checkpointPath)) {
    throw new Error('checkpoint path must be a non-empty string');
  }
  if (typeof resume !== 'boolean') throw new Error('resume must be a boolean');
  if (resume && !checkpointPath) throw new Error('resume requires a checkpoint path');
  if (onProgress !== undefined && typeof onProgress !== 'function') {
    throw new Error('onProgress must be a function');
  }
  const startedAt = Date.now();
  await emitProgress(onProgress, { type: 'scan-started', organization });
  const patterns = normalizePatterns(repositories);
  const resolvedToken = resolveToken(token);
  const config = await loadConfig({
    cwd,
    path: configPath,
    ruleIds: RULES.map(rule => rule.id),
  });
  const baselinePath = baseline ?? config.baseline;
  const baselineData = baselinePath
    ? await loadBaseline({ path: baselinePath, cwd })
    : { path: null, ids: new Set(), fingerprints: new Set() };
  if (checkpointPath) {
    await validateOrganizationCheckpointPath({ path: checkpointPath, cwd });
    await assertCheckpointDoesNotReplaceControlFile(checkpointPath, cwd, [
      config.path,
      baselineData.path,
    ]);
  }
  const checkpointIdentity = createOrganizationCheckpointIdentity({
    organization,
    repositories: patterns,
    visibility,
    includeArchived,
    includeDisabled,
    includeForks,
    maxRepositories,
    severity,
    explain,
    config,
    baselineData,
  });
  const loadedCheckpoint = resume
    ? await loadOrganizationCheckpoint({ path: checkpointPath, cwd, identity: checkpointIdentity })
    : { results: new Map() };
  if (resume) {
    await emitProgress(onProgress, {
      type: 'checkpoint-loaded',
      repositories: loadedCheckpoint.results.size,
    });
  }
  await emitProgress(onProgress, { type: 'discovery-started', organization });
  const discovered = await listOrganizationRepositories({
    organization,
    token: resolvedToken,
    cwd,
    onRetry: retry => emitRetryProgress(onProgress, retry),
  });
  const eligible = selectRepositories(discovered, {
    patterns,
    visibility,
    includeArchived,
    includeDisabled,
    includeForks,
  });
  if (patterns.length > 0 && eligible.length === 0) {
    throw new Error(`no repositories matched: ${patterns.join(', ')}`);
  }
  const selected = maxRepositories === undefined
    ? eligible
    : eligible.slice(0, maxRepositories);
  await emitProgress(onProgress, {
    type: 'discovery-completed',
    organization,
    discovered: discovered.length,
    eligible: eligible.length,
    selected: selected.length,
  });

  const checkpointResults = new Map();
  for (const repository of selected) {
    const stored = loadedCheckpoint.results.get(repository.fullName.toLowerCase());
    if (!stored) continue;
    checkpointResults.set(repository.fullName.toLowerCase(), restoreCheckpointResult(stored, {
      repository,
      cwd,
      sourceUrl,
    }));
  }
  const persistCheckpoint = createCheckpointWriter({
    path: checkpointPath,
    cwd,
    identity: checkpointIdentity,
    results: checkpointResults,
  });
  if (checkpointPath && !resume) {
    await persistCheckpoint();
    await emitProgress(onProgress, { type: 'checkpoint-created' });
  }

  let completed = 0;
  let reused = 0;
  const repositoryResults = await mapLimit(selected, concurrency, async (repository, index) => {
    await emitProgress(onProgress, {
      type: 'repository-started',
      repository: repository.fullName,
      position: index + 1,
      total: selected.length,
    });
    let repositoryResult;
    let wasReused = false;
    try {
      const workflowTree = await fetchRepositoryWorkflowTree({
        repository,
        token: resolvedToken,
        cwd,
        includePath: path => filterIgnoredPaths([
          virtualPath(cwd, repository, path),
        ], config, cwd).length > 0,
        onRetry: retry => emitRetryProgress(onProgress, retry, repository.fullName),
      });
      const stored = loadedCheckpoint.results.get(repository.fullName.toLowerCase());
      if (stored && canReuseCheckpointResult(stored, repository, workflowTree.treeSha)) {
        repositoryResult = restoreCheckpointResult(stored, { repository, cwd, sourceUrl });
        wasReused = true;
      } else {
        const fetched = await fetchRepositoryWorkflows({
          repository,
          token: resolvedToken,
          cwd,
          workflowTree,
          onRetry: retry => emitRetryProgress(onProgress, retry, repository.fullName),
        });
        const sources = fetched.sources.map(item => ({
          file: virtualPath(cwd, repository, item.path),
          source: item.source,
        }));
        const auditResult = await auditSources({
          cwd,
          sources,
          severity,
          explain,
          config,
          baselineData,
        });
        const errors = fetched.errors.map(error => ({
          repository: repository.fullName,
          path: error.path,
          error: error.error,
        }));
        const findings = auditResult.findings.map(finding => ({
          ...finding,
          repository: repository.fullName,
          branch: repository.defaultBranch,
          url: sourceUrl(
            repository,
            identity_canonicalPath(finding.file, (0,external_node_path_namespaceObject.resolve)(cwd, repository.owner, repository.name)),
            finding.line,
          ),
        }));
        repositoryResult = {
          repository,
          revision: {
            branch: repository.defaultBranch,
            treeSha: fetched.treeSha,
          },
          files: auditResult.files.map(file => identity_canonicalPath(
            file,
            (0,external_node_path_namespaceObject.resolve)(cwd, repository.owner, repository.name),
          )),
          findings,
          errors,
          summary: auditResult.summary,
          status: auditResult.status === 'FAIL' || errors.length > 0 ? 'FAIL' : 'OK',
        };
      }
    } catch (error) {
      if (error instanceof ProgressCallbackError) throw error;
      repositoryResult = {
        repository,
        revision: { branch: repository.defaultBranch, treeSha: null },
        files: [],
        findings: [],
        errors: [{
          repository: repository.fullName,
          error: String(error.message ?? error),
        }],
        summary: emptySummary(),
        status: 'FAIL',
      };
    }
    if (checkpointPath) {
      checkpointResults.set(repository.fullName.toLowerCase(), repositoryResult);
      await persistCheckpoint();
    }
    completed += 1;
    if (wasReused) reused += 1;
    await emitProgress(onProgress, {
      type: 'repository-completed',
      repository: repository.fullName,
      position: index + 1,
      total: selected.length,
      completed,
      reused: wasReused,
      status: repositoryResult.status,
      files: repositoryResult.files.length,
      findings: repositoryResult.findings.length,
      errors: repositoryResult.errors.length,
    });
    return repositoryResult;
  });

  const findings = repositoryResults.flatMap(result => result.findings);
  const errors = repositoryResults.flatMap(result => result.errors);
  const counts = summarize(findings);
  const summary = {
    repositoriesDiscovered: discovered.length,
    repositoriesEligible: eligible.length,
    repositoriesSelected: selected.length,
    repositoriesScanned: repositoryResults.length,
    repositoriesWithWorkflows: repositoryResults.filter(result => result.files.length > 0).length,
    repositoriesWithFindings: repositoryResults.filter(result => result.findings.length > 0).length,
    repositoriesFailed: repositoryResults.filter(result => result.errors.length > 0).length,
    repositoriesSkipped: discovered.length - selected.length,
    files: repositoryResults.reduce((total, result) => total + result.files.length, 0),
    findings: findings.length,
    totalFindings: repositoryResults.reduce(
      (total, result) => total + result.summary.totalFindings,
      0,
    ),
    suppressed: repositoryResults.reduce((total, result) => total + result.summary.suppressed, 0),
    errors: errors.length,
    ...counts,
  };
  const result = {
    organization,
    scope: {
      repositories: patterns,
      visibility,
      includeArchived,
      includeDisabled,
      includeForks,
      maxRepositories: maxRepositories ?? null,
      concurrency,
      severity: severity ?? null,
    },
    repositories: repositoryResults,
    findings,
    errors,
    summary,
    baseline: {
      path: baselineData.path,
      suppressed: summary.suppressed,
    },
    configPath: config.path,
    status: findings.length === 0 && errors.length === 0 ? 'OK' : 'FAIL',
  };
  await emitProgress(onProgress, {
    type: 'scan-completed',
    organization,
    status: result.status,
    total: selected.length,
    completed,
    reused,
    findings: summary.findings,
    errors: summary.errors,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

function renderOrganizationScan(result, { format: outputFormat, cwd = process.cwd() }) {
  if (outputFormat === 'json') {
    return formatter_format('json', [], {
      status: result.status,
      json: {
        schemaVersion: '1.0',
        organization: result.organization,
        scope: result.scope,
        repositories: result.repositories.map(repositoryResult => ({
          repository: repositoryResult.repository,
          revision: repositoryResult.revision,
          files: repositoryResult.files,
          findings: repositoryResult.findings.map(finding => normalizeFinding(finding, cwd)),
          errors: repositoryResult.errors,
          summary: repositoryResult.summary,
          status: repositoryResult.status,
        })),
        findings: result.findings.map(finding => normalizeFinding(finding, cwd)),
        errors: result.errors,
        summary: result.summary,
        baseline: {
          ...result.baseline,
          path: result.baseline.path ? identity_canonicalPath(result.baseline.path, cwd) : null,
        },
        configPath: result.configPath ? identity_canonicalPath(result.configPath, cwd) : null,
        status: result.status,
      },
    });
  }

  const records = [];
  if (outputFormat === 'sarif') {
    for (const rule of listRules()) records.push({ label: 'RULE', fields: rule });
  }
  for (const repositoryResult of result.repositories) {
    records.push({
      label: 'REPOSITORY',
      fields: {
        repo: repositoryResult.repository.fullName,
        visibility: repositoryResult.repository.visibility,
        branch: repositoryResult.revision.branch,
        files: repositoryResult.files.length,
        findings: repositoryResult.findings.length,
        errors: repositoryResult.errors.length,
        status: repositoryResult.status,
      },
    });
    for (const finding of repositoryResult.findings) {
      records.push({
        label: 'FINDING',
        fields: {
          id: finding.id,
          ...finding.fields,
          repo: finding.repository,
          file: identity_canonicalPath(finding.file, cwd),
          line: finding.line,
          url: finding.url,
          ...(finding.explain ? { explain: finding.explain } : {}),
          ...(outputFormat === 'sarif' && finding.fingerprint
            ? { fingerprint: finding.fingerprint }
            : {}),
        },
      });
    }
    for (const error of repositoryResult.errors) {
      records.push({
        label: 'ERROR',
        fields: {
          repo: error.repository,
          file: error.path ? `${error.repository}/${error.path}` : undefined,
          msg: error.error,
        },
      });
    }
  }
  records.push({
    label: 'SUMMARY',
    fields: { organization: result.organization, ...result.summary },
  });
  return formatter_format(outputFormat, records, { status: result.status });
}

function selectRepositories(repositories, options) {
  const matchers = options.patterns.map(pattern => picomatch(pattern, { nocase: true }));
  return repositories.filter(repository => {
    if (!options.includeArchived && repository.archived) return false;
    if (!options.includeDisabled && repository.disabled) return false;
    if (!options.includeForks && repository.fork) return false;
    if (options.visibility !== 'all' && repository.visibility !== options.visibility) return false;
    if (
      matchers.length > 0
      && !matchers.some(matches => matches(repository.name) || matches(repository.fullName))
    ) return false;
    return true;
  });
}

function normalizePatterns(patterns) {
  if (patterns === undefined) return [];
  if (!Array.isArray(patterns) || patterns.some(pattern => typeof pattern !== 'string' || !pattern)) {
    throw new Error('repository filters must be non-empty strings');
  }
  return [...new Set(patterns)];
}

function normalizeFinding(finding, cwd) {
  return {
    ...finding,
    file: identity_canonicalPath(finding.file, cwd),
  };
}

function sourceUrl(repository, path, line) {
  if (!repository.defaultBranch) return repository.htmlUrl;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const encodedBranch = encodeURIComponent(repository.defaultBranch);
  const suffix = Number.isInteger(line) && line > 0 ? `#L${line}` : '';
  return `${repository.htmlUrl}/blob/${encodedBranch}/${encodedPath}${suffix}`;
}

function virtualPath(cwd, repository, path) {
  return (0,external_node_path_namespaceObject.resolve)(cwd, repository.owner, repository.name, ...path.split('/'));
}

function createCheckpointWriter({ path, cwd, identity, results }) {
  let pending = Promise.resolve();
  return async function persistCheckpoint() {
    if (!path) return;
    const snapshot = [...results.values()];
    const write = pending.then(() => writeOrganizationCheckpoint({
      path,
      cwd,
      identity,
      repositoryResults: snapshot,
    }));
    pending = write;
    await write;
  };
}

async function assertCheckpointDoesNotReplaceControlFile(path, cwd, controlFiles) {
  const requested = (0,external_node_path_namespaceObject.resolve)(cwd, path);
  const checkpoint = comparablePath((0,external_node_path_namespaceObject.join)(await (0,promises_namespaceObject.realpath)((0,external_node_path_namespaceObject.dirname)(requested)), (0,external_node_path_namespaceObject.basename)(requested)));
  for (const controlFile of controlFiles) {
    if (controlFile && comparablePath((0,external_node_path_namespaceObject.resolve)(controlFile)) === checkpoint) {
      throw new Error('checkpoint path cannot replace the active config or baseline');
    }
  }
}

function comparablePath(path) {
  return process.platform === 'win32' ? path.toLowerCase() : path;
}

async function emitRetryProgress(onProgress, retry, repository) {
  await emitProgress(onProgress, {
    type: 'request-retry',
    ...(repository ? { repository } : {}),
    attempt: retry.attempt,
    maxRetries: retry.maxRetries,
    reason: retry.reason,
    delayMs: retry.delayMs,
    ...(retry.status === undefined ? {} : { status: retry.status }),
  });
}

async function emitProgress(onProgress, event) {
  if (!onProgress) return;
  try {
    await onProgress(Object.freeze({ ...event }));
  } catch (error) {
    throw new ProgressCallbackError(error);
  }
}

class ProgressCallbackError extends Error {
  constructor(cause) {
    super(`organization progress callback failed: ${String(cause?.message ?? cause)}`, { cause });
    this.name = 'ProgressCallbackError';
  }
}

function emptySummary() {
  return {
    files: 0,
    findings: 0,
    totalFindings: 0,
    suppressed: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
}

;// CONCATENATED MODULE: ./src/lib/action-status.js
/**
 * Decide whether the JavaScript Action step should fail. Findings can be
 * advisory, but parse and resolution errors are always operational failures.
 */
function shouldFailAction({ command, result, failOnFindings }) {
  if (result.status !== 'FAIL') return false;
  if (!['audit', 'report', 'org-scan'].includes(command)) return true;
  if (hasOperationalFailure(command, result)) return true;
  return failOnFindings;
}

function hasOperationalFailure(command, result) {
  if (command === 'audit') {
    return result.findings.some(finding => finding.ruleId === 'parse-error');
  }
  if (command === 'org-scan') {
    return (
      result.errors.length > 0
      || result.findings.some(finding => finding.ruleId === 'parse-error')
    );
  }
  return (
    result.audit.findings.some(finding => finding.ruleId === 'parse-error')
    || result.pin.errors.length > 0
    || result.upgrade.errors.length > 0
  );
}

;// CONCATENATED MODULE: ./src/lib/org-progress.js
/**
 * Human-readable rendering for structured organization-scan progress events.
 * Progress is a separate channel from final report serialization.
 */



function formatOrganizationProgress(event) {
  switch (event.type) {
    case 'scan-started':
      return line(`starting organization scan for ${event.organization}`);
    case 'checkpoint-loaded':
      return line(`loaded checkpoint with ${event.repositories} completed repositories`);
    case 'checkpoint-created':
      return line('created organization scan checkpoint');
    case 'discovery-started':
      return line(`discovering repositories in ${event.organization}`);
    case 'discovery-completed':
      return line(
        `selected ${event.selected} of ${event.discovered} discovered repositories`
        + ` (${event.eligible} eligible)`,
      );
    case 'repository-started':
      return line(`[${event.position}/${event.total}] scanning ${event.repository}`);
    case 'request-retry':
      return line(
        `${event.repository ? `${event.repository}: ` : ''}`
        + `GitHub request retry ${event.attempt}/${event.maxRetries}`
        + ` after ${event.reason} (${event.delayMs}ms)`,
      );
    case 'repository-completed':
      return line(
        `[${event.completed}/${event.total}] ${event.reused ? 'resumed' : 'completed'} `
        + `${event.repository}: ${event.status}, ${count(event.files, 'file')}, `
        + `${count(event.findings, 'finding')}, ${count(event.errors, 'error')}`,
      );
    case 'scan-completed':
      return line(
        `finished ${event.organization}: ${event.status}, ${event.completed}/${event.total} `
        + `repositories, ${event.reused} resumed, ${event.findings} findings, `
        + `${event.errors} errors in ${event.elapsedMs}ms`,
      );
    default:
      return '';
  }
}

function line(value) {
  const safe = [...redact(String(value))]
    .map(char => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');
  return `[actions-warden] ${safe}\n`;
}

function count(value, noun) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

;// CONCATENATED MODULE: ./src/lib/annotations.js
/**
 * Native GitHub Actions annotation support.
 *
 * This module stays independent of stdout and the Action runtime so collection,
 * ordering, limits, and workflow-command encoding can be tested as pure logic.
 */





const LEVEL_ORDER = new Map([
  ['error', 0],
  ['warning', 1],
  ['notice', 2],
]);
const annotations_SEVERITY_ORDER = new Map([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
]);
const RULE_DESCRIPTIONS = new Map(
  listRules().map(rule => [rule.id, rule.description]),
);

/**
 * @typedef {object} Annotation
 * @property {'error'|'warning'|'notice'} level
 * @property {string} title
 * @property {string} message
 * @property {string} [file]
 * @property {number} [line]
 * @property {number} [column]
 * @property {string} [id]
 * @property {'critical'|'high'|'medium'|'low'} [severity]
 */

/**
 * Convert one command result into native annotation records.
 *
 * @param {object} input
 * @param {string} input.command
 * @param {object} input.result
 * @param {string} [input.cwd]
 * @returns {Annotation[]}
 */
function collectAnnotations({ command, result, cwd = process.cwd() }) {
  /** @type {Annotation[]} */
  const annotations = [];
  if (command === 'audit') {
    annotations.push(...(result.findings ?? []).map(finding => (
      findingAnnotation(finding, cwd)
    )));
  } else if (command === 'report') {
    annotations.push(...(result.audit?.findings ?? []).map(finding => (
      findingAnnotation(finding, cwd)
    )));
    annotations.push(...errorAnnotations('pin', result.pin?.errors, cwd));
    annotations.push(...errorAnnotations('upgrade', result.upgrade?.errors, cwd));
  } else if (command === 'org-scan') {
    annotations.push(...(result.findings ?? []).map(finding => (
      findingAnnotation({
        ...finding,
        file: undefined,
        fields: {
          ...finding.fields,
          repository: finding.repository,
          remote_path: finding.fields?.file,
          source_url: finding.url,
        },
      }, cwd)
    )));
    annotations.push(...errorAnnotations('org-scan', result.errors, cwd));
  } else if (command === 'verify') {
    annotations.push(...(result.warnings ?? []).map(warning => ({
      level: 'warning',
      severity: 'medium',
      title: 'actions-warden: verification warning',
      message: diagnosticMessage(warning.warning, warning),
      ...annotations_location(warning, cwd),
      id: warning.id,
    })));
    annotations.push(...errorAnnotations('verify', result.errors, cwd));
  } else if (command === 'pin' || command === 'upgrade') {
    annotations.push(...errorAnnotations(command, result.errors, cwd));
  }
  return annotations.sort(compareAnnotations);
}

/**
 * Apply a deterministic per-level cap.
 *
 * GitHub currently limits warning and error annotations per Action step. A
 * matching notice cap keeps output bounded and predictable.
 *
 * @param {Annotation[]} annotations
 * @param {number} [limitPerLevel]
 */
function limitAnnotations(annotations, limitPerLevel = 10) {
  const limit = Math.max(0, Math.min(10, Number.isInteger(limitPerLevel) ? limitPerLevel : 10));
  const counts = new Map();
  const emitted = [];
  const omittedByLevel = { error: 0, warning: 0, notice: 0 };
  for (const annotation of [...annotations].sort(compareAnnotations)) {
    const count = counts.get(annotation.level) ?? 0;
    if (count >= limit) {
      omittedByLevel[annotation.level] += 1;
      continue;
    }
    counts.set(annotation.level, count + 1);
    emitted.push(annotation);
  }
  const omitted = Object.values(omittedByLevel).reduce((sum, count) => sum + count, 0);
  return { emitted, omitted, omittedByLevel };
}

/**
 * Encode annotations as GitHub workflow commands.
 *
 * @param {Annotation[]} annotations
 */
function renderAnnotationCommands(annotations) {
  if (annotations.length === 0) return '';
  return annotations.map(annotation => {
    const properties = [];
    if (annotation.file) properties.push(`file=${escapeProperty(annotation.file)}`);
    if (annotation.file && annotation.line) properties.push(`line=${annotation.line}`);
    if (annotation.file && annotation.column) properties.push(`col=${annotation.column}`);
    properties.push(`title=${escapeProperty(annotation.title)}`);
    const suffix = properties.length > 0 ? ` ${properties.join(',')}` : '';
    return `::${annotation.level}${suffix}::${escapeData(redact(annotation.message))}`;
  }).join('\n') + '\n';
}

function findingAnnotation(finding, cwd) {
  const severity = normalizeSeverity(finding.severity);
  const description = finding.explain
    || RULE_DESCRIPTIONS.get(finding.ruleId)
    || 'GitHub Actions security finding.';
  return {
    level: annotationLevel(severity),
    severity,
    title: `actions-warden: ${finding.ruleId}`,
    message: diagnosticMessage(description, {
      ...finding.fields,
      ruleId: finding.ruleId,
      id: finding.id,
    }),
    ...annotations_location(finding, cwd),
    id: finding.id,
  };
}

function errorAnnotations(command, errors = [], cwd) {
  return errors.map(error => ({
    level: 'error',
    severity: 'critical',
    title: `actions-warden: ${command} error`,
    message: diagnosticMessage(error.error, error),
    ...annotations_location(error, cwd),
    id: error.id,
  }));
}

function diagnosticMessage(primary, diagnostic) {
  const detailEntries = Object.entries(diagnostic ?? {})
    .filter(([key, value]) => (
      !['error', 'warning', 'explain', 'file', 'line', 'column', 'id'].includes(key)
      && value !== null
      && value !== undefined
      && ['string', 'number', 'boolean'].includes(typeof value)
    ))
    .map(([key, value]) => `${key}=${String(value)}`);
  const parts = [
    String(primary || 'actions-warden reported a problem.'),
    detailEntries.join(' '),
    diagnostic?.id ? `[${diagnostic.id}]` : '',
  ].filter(Boolean);
  return truncate(parts.join(' '), 16_000);
}

function annotations_location(diagnostic, cwd) {
  const file = normalizeFile(diagnostic?.file, cwd);
  if (!file) return {};
  const line = positiveInteger(diagnostic?.line) ?? 1;
  const column = positiveInteger(diagnostic?.column);
  return {
    file,
    line,
    ...(column ? { column } : {}),
  };
}

function normalizeFile(file, cwd) {
  if (typeof file !== 'string' || file.length === 0 || file.includes('\0')) return undefined;
  const root = (0,external_node_path_namespaceObject.resolve)(cwd);
  const absolute = (0,external_node_path_namespaceObject.resolve)(root, file);
  const rel = (0,external_node_path_namespaceObject.relative)(root, absolute);
  if (rel === '..' || rel.startsWith(`..${external_node_path_namespaceObject.sep}`) || (0,external_node_path_namespaceObject.isAbsolute)(rel)) return undefined;
  return rel.split(/[\\/]/).join('/');
}

function normalizeSeverity(severity) {
  return annotations_SEVERITY_ORDER.has(severity) ? severity : 'low';
}

function annotationLevel(severity) {
  if (severity === 'critical' || severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  return 'notice';
}

function compareAnnotations(a, b) {
  return (LEVEL_ORDER.get(a.level) ?? 3) - (LEVEL_ORDER.get(b.level) ?? 3)
    || (annotations_SEVERITY_ORDER.get(a.severity) ?? 4) - (annotations_SEVERITY_ORDER.get(b.severity) ?? 4)
    || compareText(a.file, b.file)
    || (a.line ?? 0) - (b.line ?? 0)
    || compareText(a.title, b.title)
    || compareText(a.id, b.id);
}

function compareText(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  return left < right ? -1 : left > right ? 1 : 0;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function escapeData(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

function escapeProperty(value) {
  return escapeData(value)
    .replaceAll(':', '%3A')
    .replaceAll(',', '%2C');
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

;// CONCATENATED MODULE: ./src/action.js


















const FORMATS = new Set(['toon', 'json', 'text', 'sarif']);
const MODES = new Set(['major', 'minor', 'patch']);
const action_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const action_VISIBILITIES = new Set(['all', 'public', 'private', 'internal']);

async function main() {
  const command = input('command') || 'audit';
  const format = input('format') || 'toon';
  const cwd = (0,external_node_path_namespaceObject.resolve)(input('working-directory') || process.env.GITHUB_WORKSPACE || process.cwd());
  const workflows = parseStringList(input('workflow'), 'workflow');
  const token = input('token') || undefined;
  const severity = optionalChoice(input('severity'), action_SEVERITIES, 'severity');
  const mode = choice(input('mode') || 'minor', MODES, 'mode');
  const minAgeDays = nonNegativeInteger(input('min-age') || '7', 'min-age');
  const explain = booleanInput('explain', false);
  const offline = booleanInput('offline', false);
  const write = booleanInput('write', false);
  const failOnFindings = booleanInput('fail-on-findings', true);
  const annotationsEnabled = booleanInput('annotations', true);
  const fix = input('fix') || undefined;
  const configPath = input('config') || undefined;
  const ignoreConfig = booleanInput('ignore-config', false);
  const baseline = input('baseline') || undefined;
  const organization = input('organization') || undefined;
  const repositories = parseStringList(input('repository'), 'repository');
  const visibility = choice(input('visibility') || 'all', action_VISIBILITIES, 'visibility');
  const includeArchived = booleanInput('include-archived', false);
  const includeDisabled = booleanInput('include-disabled', false);
  const includeForks = booleanInput('include-forks', false);
  const maxRepositories = optionalPositiveInteger(input('max-repos'), 'max-repos');
  const concurrency = action_positiveInteger(input('concurrency') || '4', 'concurrency');
  const checkpointPath = input('checkpoint-path') || undefined;
  const resumeFrom = input('resume-from') || undefined;
  const progress = booleanInput('progress', true);

  if (!FORMATS.has(format)) throw new Error(`invalid format: ${format}`);

  let result;
  let payload;
  let findings = 0;

  switch (command) {
    case 'audit':
      result = await audit({
        cwd,
        workflows,
        severity,
        explain,
        configPath: ignoreConfig ? false : configPath,
        baseline,
      });
      payload = renderAudit(result, { format, explain, cwd });
      findings = result.summary.findings;
      break;
    case 'pin':
      result = await pin({ cwd, workflows, dryRun: !write, token, fix });
      payload = renderPin(result, { format, dryRun: !write, cwd });
      break;
    case 'upgrade':
      result = await upgrade({
        cwd,
        workflows,
        dryRun: !write,
        token,
        mode,
        minAgeDays,
        fix,
      });
      payload = renderUpgrade(result, { format, dryRun: !write, mode, cwd });
      break;
    case 'report':
      result = await report({
        cwd,
        workflows,
        token,
        mode,
        severity,
        explain,
        skipResolve: offline,
        minAgeDays,
        configPath: ignoreConfig ? false : configPath,
        baseline,
      });
      payload = renderReport(result, { format, mode, cwd });
      findings = result.audit.summary.findings;
      break;
    case 'verify':
      result = await verify({ cwd, workflows, token });
      payload = renderVerify(result, { format, cwd });
      break;
    case 'org-scan':
      if (!organization) throw new Error('organization is required for org-scan');
      if (checkpointPath && resumeFrom) {
        throw new Error('checkpoint-path and resume-from cannot be used together');
      }
      if (
        (resumeFrom ?? checkpointPath)
        && input('output-path')
        && await samePath(
          (0,external_node_path_namespaceObject.resolve)(cwd, resumeFrom ?? checkpointPath),
          (0,external_node_path_namespaceObject.resolve)(cwd, input('output-path')),
        )
      ) throw new Error('checkpoint and report output paths must be different');
      result = await scanOrganization({
        organization,
        cwd,
        token,
        repositories,
        visibility,
        includeArchived,
        includeDisabled,
        includeForks,
        maxRepositories,
        concurrency,
        severity,
        explain,
        configPath: ignoreConfig ? false : configPath,
        baseline,
        checkpointPath: resumeFrom ?? checkpointPath,
        resume: Boolean(resumeFrom),
        onProgress: progress
          ? event => {
              const message = formatOrganizationProgress(event);
              if (message) process.stderr.write(message);
            }
          : undefined,
      });
      payload = renderOrganizationScan(result, { format, cwd });
      findings = result.summary.findings;
      break;
    case 'rules': {
      const rules = listRules();
      result = { status: 'OK' };
      payload = formatter_format(
        format,
        rules.map(rule => ({ label: 'RULE', fields: rule })),
        { status: 'OK', json: { schemaVersion: '1.0', rules, status: 'OK' } },
      );
      break;
    }
    default:
      throw new Error(`unknown command: ${command}`);
  }

  process.stdout.write(payload);
  const annotationResult = annotationsEnabled
    ? limitAnnotations(collectAnnotations({ command, result, cwd }))
    : { emitted: [], omitted: 0 };
  const annotationCommands = renderAnnotationCommands(annotationResult.emitted);
  if (annotationCommands) process.stdout.write(annotationCommands);

  let reportPath = '';
  const requestedOutput = input('output-path');
  if (requestedOutput) {
    reportPath = (0,external_node_path_namespaceObject.resolve)(cwd, requestedOutput);
    await writeFileGuarded({
      path: reportPath,
      content: payload,
      dryRun: false,
      cwd,
    });
  }

  await setOutput('status', result.status);
  await setOutput('findings', String(findings));
  await setOutput('annotations', String(annotationResult.emitted.length));
  await setOutput('annotations-skipped', String(annotationResult.omitted));
  if (reportPath) await setOutput('report-path', reportPath);
  await writeSummary({
    command,
    status: result.status,
    findings,
    annotations: annotationResult.emitted.length,
    annotationsSkipped: annotationResult.omitted,
    payload,
  });

  if (shouldFailAction({ command, result, failOnFindings })) {
    process.exitCode = 1;
  }
}

function input(name) {
  return process.env[`INPUT_${name.toUpperCase()}`]
    ?? process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`]
    ?? '';
}

function parseStringList(value, name) {
  if (!value.trim()) return undefined;
  if (value.trim().startsWith('[')) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(item => typeof item !== 'string')) {
      throw new Error(`${name} JSON input must be an array of strings`);
    }
    return parsed;
  }
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

function booleanInput(name, defaultValue) {
  const value = input(name);
  if (!value) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function choice(value, choices, name) {
  if (!choices.has(value)) throw new Error(`invalid ${name}: ${value}`);
  return value;
}

function optionalChoice(value, choices, name) {
  return value ? choice(value, choices, name) : undefined;
}

function nonNegativeInteger(value, name) {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a non-negative integer`);
  return Number.parseInt(value, 10);
}

function action_positiveInteger(value, name) {
  if (!/^\d+$/.test(value) || Number.parseInt(value, 10) < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Number.parseInt(value, 10);
}

function optionalPositiveInteger(value, name) {
  return value ? action_positiveInteger(value, name) : undefined;
}

async function samePath(left, right) {
  const [leftParent, rightParent] = await Promise.all([
    (0,promises_namespaceObject.realpath)((0,external_node_path_namespaceObject.dirname)(left)),
    (0,promises_namespaceObject.realpath)((0,external_node_path_namespaceObject.dirname)(right)),
  ]);
  const leftTarget = (0,external_node_path_namespaceObject.join)(leftParent, (0,external_node_path_namespaceObject.basename)(left));
  const rightTarget = (0,external_node_path_namespaceObject.join)(rightParent, (0,external_node_path_namespaceObject.basename)(right));
  return process.platform === 'win32'
    ? leftTarget.toLowerCase() === rightTarget.toLowerCase()
    : leftTarget === rightTarget;
}

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const delimiter = `actions_warden_${(0,external_node_crypto_namespaceObject.randomUUID)().replaceAll('-', '')}`;
  await (0,promises_namespaceObject.appendFile)(
    process.env.GITHUB_OUTPUT,
    `${name}<<${delimiter}\n${value}\n${delimiter}\n`,
    'utf8',
  );
}

async function writeSummary({
  command,
  status,
  findings,
  annotations,
  annotationsSkipped,
  payload,
}) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const indented = payload
    .slice(0, 8000)
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
  await (0,promises_namespaceObject.appendFile)(
    process.env.GITHUB_STEP_SUMMARY,
    `### actions-warden (${command})\n\nstatus: \`${status}\`  findings: \`${findings}\`  annotations: \`${annotations}\`  skipped: \`${annotationsSkipped}\`\n\n${indented}\n`,
    'utf8',
  );
}

main().catch(async error => {
  const message = redact(String(error?.message ?? error));
  process.stderr.write(`error: ${message}\n`);
  const annotationsEnabled = input('annotations') !== 'false';
  if (annotationsEnabled) {
    process.stdout.write(renderAnnotationCommands([{
      level: 'error',
      severity: 'critical',
      title: 'actions-warden: action error',
      message,
    }]));
  }
  await setOutput('status', 'FAIL').catch(() => {});
  await setOutput('findings', '0').catch(() => {});
  await setOutput('annotations', annotationsEnabled ? '1' : '0').catch(() => {});
  await setOutput('annotations-skipped', '0').catch(() => {});
  process.exitCode = 2;
});

