import handler from '../netlify/functions/health.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
