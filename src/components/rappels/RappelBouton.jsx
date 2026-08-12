import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import RappelModal from './RappelModal';

/**
 * Petit bouton "+ Rappel" à placer sur les fiches événement/client/prospect
 * Props: context = { type: 'evenement'|'client'|'prospect', id, nom }
 */
export default function RappelBouton({ context, className = '' }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border hover:border-primary/50 rounded-lg px-3 py-1.5 transition-all ${className}`}
      >
        <Bell size={12} />
        + Rappel
      </button>
      {open && (
        <RappelModal
          defaultContext={context}
          onClose={() => setOpen(false)}
          onSaved={() => qc.invalidateQueries(['rappels'])}
        />
      )}
    </>
  );
}