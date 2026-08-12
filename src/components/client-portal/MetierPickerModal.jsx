/**
 * MetierPickerModal — Sélecteur plein écran de métier (inspiré Mariages.net).
 *
 * Remplace le <select> natif groupé par groupes métiers. Avantages :
 *  - Recherche texte en direct (correspondance partielle insensible à la casse)
 *    sur les 40 métiers individuels (et non plus 11 groupes) ;
 *  - Chaque métier affiché avec son emoji (metierConfig.icone_defaut) ;
 *  - Overlay plein écran via createPortal → aucun ancêtre à risque de transform CSS
 *    (compatible iOS Safari, pas de blocage de saisie).
 *
 * Props :
 *  - open: boolean            (visibilité)
 *  - selected: string         (métier actuellement sélectionné, ou 'all')
 *  - onSelect: (metier) => void (reçoit la valeur exacte de CompanySettings.metier, ou 'all')
 *  - onClose: () => void      (annulation via la croix)
 */
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { METIER_CONFIG } from '@/config/metierConfig';

function MetierRow({ m, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(m.nom)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b active:bg-black/5 transition-colors"
      style={{ borderColor: '#f5f3ed', background: selected ? 'rgba(30,27,75,0.06)' : 'transparent' }}
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ background: 'rgba(30,27,75,0.06)' }}
      >
        {m.icone}
      </span>
      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>
        {m.label || m.nom}
      </span>
      {selected && <Check size={18} style={{ color: '#1e1b4b' }} className="shrink-0" />}
    </button>
  );
}

export default function MetierPickerModal({ open, selected, onSelect, onClose }) {
  const [query, setQuery] = useState('');

  // Groupe « Lieux et réception » → une seule entrée « Lieux de réception ».
  const GROUPE_LIEUX = 'Lieux et réception';
  const grouped = useMemo(() => {
    const groups = [];
    let cur = null;
    for (const [metier, cfg] of Object.entries(METIER_CONFIG)) {
      if (cfg.groupe === GROUPE_LIEUX) {
        if (!cur || cur.groupe !== GROUPE_LIEUX) {
          cur = { groupe: GROUPE_LIEUX, metiers: [{ nom: 'groupe:Lieux et réception', label: 'Lieux de réception', icone: '🏛️' }] };
          groups.push(cur);
        }
        continue;
      }
      if (!cur || cur.groupe !== cfg.groupe) {
        cur = { groupe: cfg.groupe, metiers: [] };
        groups.push(cur);
      }
      cur.metiers.push({ nom: metier, icone: cfg.icone_defaut });
    }
    return groups;
  }, []);

  // Recherche : liste plate filtrée (sans en-têtes de groupe) tant que la requête est non vide.
  const filteredFlat = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out = [];
    let lieuxAdded = false;
    for (const [metier, cfg] of Object.entries(METIER_CONFIG)) {
      if (cfg.groupe === GROUPE_LIEUX) {
        if (lieuxAdded) continue;
        if ('lieux de réception'.includes(q) || metier.toLowerCase().includes(q)) {
          out.push({ nom: 'groupe:Lieux et réception', label: 'Lieux de réception', icone: '🏛️' });
          lieuxAdded = true;
        }
        continue;
      }
      if (metier.toLowerCase().includes(q)) {
        out.push({ nom: metier, icone: cfg.icone_defaut });
      }
    }
    return out;
  }, [query]);

  // Bloque le scroll de fond pendant l'ouverture et garantit la réinitialisation
  // à la fermeture, quelle que soit la voie (sélection, croix, démontage parent).
  // Évite la fuite de style overflow/wide sur <body>/<html> constatée à la fermeture.
  useEffect(() => {
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: '#fff' }}>
      {/* ── En-tête ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#e8e4dc' }}
      >
        <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>
          Que recherchez-vous ?
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70"
          style={{ background: '#f3f4f6', color: '#1e1b4b' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Barre de recherche ── */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: '#e8e4dc' }}>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9ca3af' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom ou type de prestataire"
            className="w-full h-11 pl-9 pr-3 rounded-xl border text-base focus:outline-none focus:ring-2"
            style={{ borderColor: '#e8e4dc', background: '#fff' }}
          />
        </div>
      </div>

      {/* ── Liste défilante ── */}
      <div className="flex-1 overflow-y-auto">
        {/* « Tout afficher » — masqué pendant la recherche */}
        {!filteredFlat && (
          <button
            type="button"
            onClick={() => onSelect('all')}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b active:bg-black/5 transition-colors"
            style={{
              borderColor: '#f0ede5',
              background: selected === 'all' ? 'rgba(30,27,75,0.06)' : 'transparent',
            }}
          >
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ background: 'rgba(30,27,75,0.06)' }}
            >
              🔍
            </span>
            <span className="flex-1 font-semibold text-sm" style={{ color: '#1e1b4b' }}>
              Tout afficher
            </span>
            {selected === 'all' && <Check size={18} style={{ color: '#1e1b4b' }} className="shrink-0" />}
          </button>
        )}

        {filteredFlat ? (
          filteredFlat.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>
              Aucun métier ne correspond à « {query} ».
            </div>
          ) : (
            filteredFlat.map((m) => (
              <MetierRow
                key={m.nom}
                m={m}
                selected={selected === m.nom}
                onSelect={onSelect}
              />
            ))
          )
        ) : (
          grouped.map((g) => (
            <div key={g.groupe}>
              <div
                className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10"
                style={{ color: '#9ca3af', background: '#fff' }}
              >
                {g.groupe}
              </div>
              {g.metiers.map((m) => (
                <MetierRow
                  key={m.nom}
                  m={m}
                  selected={selected === m.nom}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}