import handler from '../netlify/functions/reaction.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
