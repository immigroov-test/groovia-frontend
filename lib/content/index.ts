// All user-facing copy, split by audience so a page's wording can be found and changed in one place:
//   chat.ts       Groovia's own messages, prompts and limits
//   marketing.ts  landing, nav, About, Contact
//   auth.ts       the sign-in / sign-up popup
//   admin.ts      the admin panel
//   mentor.ts     the fixed lists a mentor picks from, plus mentor-hub copy
//
// UI_CONTENT is composed from those parts, so every existing `import { UI_CONTENT } from
// '../lib/content'` keeps working and no component needs to know which file a string lives in.
import { CHAT } from './chat';
import { MARKETING } from './marketing';
import { AUTH } from './auth';
import { ADMIN } from './admin';

export const UI_CONTENT = {
  ...CHAT,
  ...MARKETING,
  auth: AUTH,
  admin: ADMIN,
} as const;

export { CHAT, MARKETING, AUTH, ADMIN };
export { INTENT_OPTIONS } from './chat';
export { MENTOR_HUB, EXPERTISE_CATEGORIES, EXPERTISE_CATEGORY_MAP, SERVICE_CATEGORIES,
         SERVICE_DESCRIPTION_TEMPLATE, REMINDER_NOTICE } from './mentor';
