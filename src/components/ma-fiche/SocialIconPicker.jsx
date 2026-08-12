/**
 * SocialIconPicker — Sélecteur d'icône de réseau social.
 * Extrait de CoordonneesTab pour réutilisation.
 */
import { useState } from 'react';

export const ICON_OPTIONS = [
  { value: 'instagram', label: 'Instagram', slug: 'instagram', color: '#E1306C' },
  { value: 'facebook',  label: 'Facebook',  slug: 'facebook',  color: '#1877F2' },
  { value: 'tiktok',    label: 'TikTok',    slug: 'tiktok',    color: '#000000' },
  { value: 'youtube',   label: 'YouTube',   slug: 'youtube',   color: '#FF0000' },
  { value: 'linkedin',  label: 'LinkedIn',  slug: 'linkedin',  color: '#0A66B2' },
  { value: 'twitter',   label: 'X / Twitter', slug: 'x',     color: '#000000' },
  { value: 'pinterest', label: 'Pinterest', slug: 'pinterest', color: '#E60023' },
  { value: 'snapchat',  label: 'Snapchat',  slug: 'snapchat',  color: '#FFFC00' },
];

export default function SocialIconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = ICON_OPTIONS.find(o => o.value === value) || ICON_OPTIONS[0];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 border border-input rounded-lg px-2 py-1.5 bg-background hover:bg-muted/50 transition-colors">
        <span className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: selected.color }}>
          <img src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${selected.slug}.svg`} alt={selected.label} className="w-3.5 h-3.5" style={{ filter: 'brightness(0) invert(1)' }} />
        </span>
        <span className="text-sm">{selected.label}</span>
        <span className="text-muted-foreground text-xs ml-1">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-lg p-2 grid grid-cols-2 gap-1 w-44">
          {ICON_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-muted/60 ${value === opt.value ? 'bg-muted font-medium' : ''}`}>
              <span className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: opt.color }}>
                <img src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${opt.slug}.svg`} alt={opt.label} className="w-3 h-3" style={{ filter: 'brightness(0) invert(1)' }} />
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}