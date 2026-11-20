import handler from '../netlify/functions/asset-news.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
