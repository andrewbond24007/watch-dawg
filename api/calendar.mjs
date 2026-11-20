import handler from '../netlify/functions/calendar.mjs';
import { adapt } from '../lib/adapt.mjs';
export const GET = adapt(handler);
