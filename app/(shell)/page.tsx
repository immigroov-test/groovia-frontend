// The home page is served at BOTH '/' and '/home', from one component, so a bare immigroov.com is
// a real page rather than a redirect. '/home' is kept because email CTAs, OAuth returns and any
// link shared before this change all point at it.
export { metadata } from './home/page';
export { default } from './home/page';
