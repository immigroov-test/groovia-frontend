'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { Button } from './Button';

interface Props {
  kind: 'poster' | 'media';
  onUploaded: (url: string) => void;
}

export function WebinarMediaUpload({ kind, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const poster = kind === 'poster';

  async function upload(file: File) {
    setError('');
    const allowed = poster ? file.type.startsWith('image/') : file.type.startsWith('image/') || ['video/mp4', 'video/webm', 'application/pdf'].includes(file.type);
    const limit = poster ? 10 : 50;
    if (!allowed) { setError(poster ? 'Choose a PNG, JPG, or WebP image.' : 'Choose an image, MP4/WebM video, or PDF file.'); return; }
    if (file.size > limit * 1024 * 1024) { setError(`File must be under ${limit} MB.`); return; }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again before uploading.');
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('webinar-media').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('webinar-media').getPublicUrl(path);
      onUploaded(`${data.publicUrl}?t=${Date.now()}`);
    } catch (caught: unknown) {
      const text = caught instanceof Error ? caught.message : 'Upload failed. Please try again.';
      setError(/bucket not found/i.test(text) ? 'Webinar media storage is not set up. Run the webinar media SQL migration.' : text);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return <div className="mt-2">
    <input ref={inputRef} type="file" accept={poster ? 'image/png,image/jpeg,image/webp' : 'image/png,image/jpeg,image/webp,video/mp4,video/webm,application/pdf'} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
    <Button type="button" size="sm" variant="outline" loading={uploading} onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" /> Upload {poster ? 'poster' : 'media'}</Button>
    <span className="ml-2 text-xs text-muted">{poster ? 'PNG, JPG or WebP · 10 MB max' : 'Image, MP4/WebM, or PDF · 50 MB max'}</span>
    {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
  </div>;
}
