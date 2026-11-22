import handler from '../netlify/functions/housemap.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
