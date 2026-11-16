import { createGoldenFetch } from './org-golden-fixture.js';

globalThis.fetch = createGoldenFetch();
