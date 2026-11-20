import handler from '../netlify/functions/candles.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
