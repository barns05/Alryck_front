import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

export default function MenuImagesViewer({ images }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images || images.length === 0) return null;

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  return (
    <>
      <div className="space-y-3">
        {/* Image principale */}
        <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3] cursor-zoom-in" onClick={() => setLightbox(true)}>
          <img
            src={images[current].url}
            alt={`Page ${current + 1}`}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full p-1.5">
            <ZoomIn size={14} className="text-white" />
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm rounded-full p-1.5 hover:bg-black/60 transition-colors"
              >
                <ChevronLeft size={16} className="text-white" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm rounded-full p-1.5 hover:bg-black/60 transition-colors"
              >
                <ChevronRight size={16} className="text-white" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                <span className="text-white text-xs">{current + 1} / {images.length}</span>
              </div>
            </>
          )}
        </div>

        {/* Miniatures */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                onClick={() => setCurrent(idx)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === current ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-80'
                }`}
              >
                <img src={img.url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox plein écran */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 bg-white/20 rounded-full p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 rounded-full p-3 text-white hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 rounded-full p-3 text-white hover:bg-white/30 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <img
            src={images[current].url}
            alt={`Page ${current + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={e => { e.stopPropagation(); setCurrent(idx); }}
                  className={`w-2 h-2 rounded-full transition-all ${idx === current ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}