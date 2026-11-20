import handler from '../netlify/functions/quotes.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
