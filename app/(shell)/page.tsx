import { redirect } from 'next/navigation';

// Everyone (guests included) lands on /chat; middleware already redirects / -> /chat.
// This is the belt-and-suspenders fallback so the route stays valid without the old
// marketing UI, which is no longer used.
export default function Home() {
  redirect('/chat');
}
