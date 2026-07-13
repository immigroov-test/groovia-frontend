'use client';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

// Assistant avatar. Uses the Immigroov loop image at /ai-avatar.png if present, else
// falls back to a sparkle. The circle uses the blue-to-orange brand gradient (a distinct
// colour from the old brown). Drop a transparent PNG at groovia-frontend/public/ai-avatar.png.
export function AiAvatar({ className = 'h-7 w-7' }: { className?: string }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-accent-500 flex items-center justify-center text-white overflow-hidden`}
    >
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/ai-avatar.png"
          alt=""
          aria-hidden
          className="h-full w-full object-contain p-0.5"
          onError={() => setImgOk(false)}
        />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
    </div>
  );
}
