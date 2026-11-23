import handler from '../netlify/functions/td.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
