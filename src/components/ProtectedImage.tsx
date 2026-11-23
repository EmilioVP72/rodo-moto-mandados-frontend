import { useEffect, useState } from 'react';
import { apiFetch } from '../api/httpClient';

export function ProtectedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [image, setImage] = useState<{ source: string; url: string } | null>(null);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    if (!/^\/uploads\/(signatures|proofs|recovery|transfers)\/[a-zA-Z0-9_-]+\.(png|jpg|webp)$/.test(src)) return;
    let active = true;
    let url = '';
    apiFetch<Blob>(src, { blob: true, cache: 'no-store' }).then(blob => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      setImage({ source: src, url });
    }).catch(() => { if (active) setFailed(src); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [src]);
  const preview = /^data:image\/(png|jpeg|jpg|webp);base64,/.test(src) ? src : image?.source === src ? image.url : undefined;
  return preview ? <img src={preview} alt={alt} className={className} /> : <span>{failed === src ? 'Evidencia no disponible' : alt}</span>;
}
