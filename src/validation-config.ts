import { z } from 'zod';
// Configure before schema modules load: the browser CSP intentionally forbids eval.
// Zod's documented jitless mode uses the normal parser without probing new Function.
z.config({ jitless: true });
