import handler from '../netlify/functions/rates.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
