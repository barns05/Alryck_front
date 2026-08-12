/**
 * CustomSelect — liste déroulante custom compatible iOS Safari.
 * Remplace les <select> natifs qui ne fonctionnent pas dans les modales iOS.
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, placeholder = '— Choisir —', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm text-left focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={`truncate ${!selected ? 'text-muted-foreground' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={12} className="shrink-0 ml-1 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-[200] mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => handleSelect('')}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            {placeholder}
          </button>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => handleSelect(o.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${o.value === value ? 'bg-primary/10 text-primary font-medium' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}