export interface Quote { text: string; author: string }

// Shown in the login popup. A random one is picked each time the popup opens.
export const QUOTES: Quote[] = [
  { text: 'Learn thoroughly, and let your conduct reflect your learning.', author: 'Kural 391 (trans. W.H. Drew & John Lazarus)' },
  { text: "Knowledge flows in proportion to learning, just as water flows in proportion to a well's depth.", author: 'Kural 396 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Learning is the only true and imperishable wealth.', author: 'Kural 400 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Listen to the wise, however little; it yields great dignity.', author: 'Kural 416 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Wisdom is discerning the truth in everything, regardless of who speaks it.', author: 'Kural 423 (trans. W.H. Drew & John Lazarus)' },
  { text: 'The wise foresee what is to come; the unwise do not.', author: 'Kural 427 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Winning the alliance of the great is the rarest of blessings.', author: 'Kural 443 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Determine who can accomplish a task, and entrust it to them completely.', author: 'Kural 517 (trans. W.H. Drew & John Lazarus)' },
  { text: "Greatness is proportionate to one's ambition, just as a water-flower's stalk matches the water's depth.", author: 'Kural 595 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Always aim for greatness; even if you fail, the noble intent remains.', author: 'Kural 596 (trans. W.H. Drew & John Lazarus)' },
  { text: "Never say 'this is too difficult'; relentless effort provides the strength to achieve it.", author: 'Kural 611 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Even when fate opposes you, sheer effort will always yield its reward.', author: 'Kural 619 (trans. W.H. Drew & John Lazarus)' },
  { text: 'What is learned is a handful of earth; what is unlearned is the size of the world.', author: 'Avvai' },
  { text: 'Seek your fortune even if you must cross the roaring oceans.', author: 'Avvai' },
];

export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
