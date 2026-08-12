import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function BlocLogistiqueChauffeurs({ chauffeurs }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div className="text-left">
            <p className="font-semibold">Chauffeurs disponibles</p>
            <p className="text-xs text-muted-foreground">{chauffeurs.length} chauffeur{chauffeurs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground rotate-180" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          {chauffeurs.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-amber-800 font-medium">Aucun chauffeur disponible</p>
              <p className="text-xs text-amber-700">
                Ajoutez la compétence <strong>Chauffeur / Livreur</strong> à un Extra ou Collaborateur depuis le <strong>Planning Extras</strong> pour les voir ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chauffeurs.filter(c => c.actif !== false).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.type === 'extra' ? '👤 Extra' : '👔 Collaborateur'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}