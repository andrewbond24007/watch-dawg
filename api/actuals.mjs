import handler from '../netlify/functions/actuals.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
