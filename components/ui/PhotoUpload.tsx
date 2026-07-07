'use client';
import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Upload, X, ZoomIn } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { getCroppedBlob, readFileAsDataURL, type PixelCrop } from '../../lib/cropImage';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  userId?: string;
  required?: boolean;
}

export function PhotoUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Crop modal state
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<PixelCrop | null>(null);

  function pickFile(file: File) {
    setError('');
    if (!file.type.startsWith('image/')) { setError('Please select an image file (PNG or JPG).'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB.'); return; }
    readFileAsDataURL(file)
      .then((src) => { setRawSrc(src); setCrop({ x: 0, y: 0 }); setZoom(1); })
      .catch(() => setError('Could not read that image. Please try another.'));
  }

  const saveCrop = useCallback(async () => {
    if (!rawSrc || !areaPixels) return;
    setUploading(true);
    setError('');
    try {
      const blob = await getCroppedBlob(rawSrc, areaPixels, 512);
      const dataUrl = await readFileAsDataURL(blob);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mentor/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Upload failed. Please try again.');
      onChange(json.url + `?t=${Date.now()}`);
      setRawSrc(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [rawSrc, areaPixels, onChange]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFileChange} />

      {value ? (
        <div className="relative w-24 h-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Profile photo" className="w-24 h-24 rounded-full object-cover border-2 border-brand-100 shadow-sm" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow hover:bg-brand-700"
            aria-label="Change photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full border-2 border-dashed rounded-xl px-6 py-8 flex flex-col items-center gap-2 cursor-pointer transition-colors',
            dragging ? 'border-brand-500 bg-brand-50' : 'border-[--color-border] hover:border-brand-300 hover:bg-brand-50/40',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
            <Upload className="h-5 w-5 text-brand-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-brand-700">Drag and drop your photo here, or click to browse</p>
            <p className="text-xs text-muted mt-0.5">PNG, JPG or WebP · you can crop it next</p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Crop modal: WhatsApp-style adjust and zoom before upload */}
      {rawSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-card shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-[--color-border] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Adjust your photo</h3>
              <button type="button" onClick={() => setRawSrc(null)} className="text-muted hover:text-foreground" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative w-full h-64 sm:h-80 bg-neutral-900">
              <Cropper
                image={rawSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setAreaPixels(pixels)}
              />
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              <p className="text-xs text-muted text-center">Drag the photo to reposition, use the slider to zoom.</p>
              <div className="flex items-center gap-3">
                <ZoomIn className="h-4 w-4 text-muted shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[--color-brand-600]"
                  aria-label="Zoom"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setRawSrc(null)} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="button" variant="accent" size="sm" loading={uploading} onClick={saveCrop}>
                  Save photo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
