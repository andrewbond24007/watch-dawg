import handler from '../netlify/functions/nowcast.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
