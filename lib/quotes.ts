export interface Quote { text: string; author: string }

// Shown in the login popup. A random one is picked each time the popup opens.
// The first entry is the default.
export const QUOTES: Quote[] = [
  { text: 'Venture across the oceans and seek prosperity.', author: 'Avvaiyar' },
  { text: 'Let a man learn thoroughly whatever he may learn, and let his conduct be worthy of his learning.', author: 'Kural 391 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Water will flow from a well in the sand in proportion to the depth to which it is dug, and knowledge will flow from a man in proportion to his learning.', author: 'Kural 396 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Learning is the true imperishable riches; all other things are not riches.', author: 'Kural 400 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Let a man listen (to the wise), however little; that will yield him great dignity.', author: 'Kural 416 (trans. W.H. Drew & John Lazarus)' },
  { text: 'To discern the truth in every thing, by whomsoever spoken, is wisdom.', author: 'Kural 423 (trans. W.H. Drew & John Lazarus)' },
  { text: 'The wise are those who know beforehand what will happen; those who do not know this are the unwise.', author: 'Kural 427 (trans. W.H. Drew & John Lazarus)' },
  { text: 'To seek and win the alliance of the great is the rarest of all blessings.', author: 'Kural 443 (trans. W.H. Drew & John Lazarus)' },
  { text: "After having considered, 'this man can accomplish this, by these means', let the king leave with him the discharge of that duty.", author: 'Kural 517 (trans. W.H. Drew & John Lazarus)' },
  { text: "The stalks of water-flowers are proportionate to the depth of water; so is men's greatness proportionate to their minds.", author: 'Kural 595 (trans. W.H. Drew & John Lazarus)' },
  { text: 'In all that a man thinks of, let him think of his greatness; and if it should be thrust from him by fate, it will have the nature of not being thrust from him.', author: 'Kural 596 (trans. W.H. Drew & John Lazarus)' },
  { text: "Yield not to the feebleness which says, 'this is too difficult to be done'; labour will give the greatness of mind which is necessary to do it.", author: 'Kural 611 (trans. W.H. Drew & John Lazarus)' },
  { text: 'Although it be said that, through fate, it cannot be attained, yet labour, with bodily exertion, will yield its reward.', author: 'Kural 619 (trans. W.H. Drew & John Lazarus)' },
  { text: 'What is learned is but a handful of earth; what is unlearned is the size of the world.', author: 'Avvaiyar (Kattrathu Kaimann Alavu)' },
  { text: 'Seek your fortune, wealth and knowledge, even if it means traversing the roaring waves of the ocean.', author: 'Avvaiyar' },
];

export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
