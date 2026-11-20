import handler from '../netlify/functions/news.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
