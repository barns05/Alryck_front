/**
 * ReassuranceAccordions — Blocs de réassurance (Équipements, Points forts, À propos)
 * affichés en accordéon replié par défaut sur la vitrine prospect.
 *
 * Même principe que FaqAccordion : entrée discrète « En savoir plus (N) » qui révèle
 * le contenu au clic, puis chaque section est un accordéon natif <details>/<summary>
 * (fiable sur iOS, sans transform ni JS). Réutilise les mêmes données que
 * BlocInfosDecouverte (equipements, style_tags + points_forts_personnalises, a_propos).
 * Renvoie null si aucune des trois sections n'est renseignée.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EQUIPEMENTS_EMOJIS, getEquipementDisplayLabel } from '@/config/metierConfig';

export default function ReassuranceAccordions({ vitrineData }) {
  const [open, setOpen] = useState(false);
  if (!vitrineData) return null;

  const equipements = Array.isArray(vitrineData.equipements) ? vitrineData.equipements : [];
  const pointsForts = [
    ...(Array.isArray(vitrineData.style_tags) ? vitrineData.style_tags : []),
    ...(Array.isArray(vitrineData.points_forts_personnalises) ? vitrineData.points_forts_personnalises : []),
  ];
  const aPropos = vitrineData.a_propos || null;

  const sections = [];
  if (equipements.length > 0) sections.push({ key: 'equipements', title: 'Équipements' });
  if (pointsForts.length > 0) sections.push({ key: 'pointsForts', title: 'Points forts' });
  if (aPropos) sections.push({ key: 'aPropos', title: 'À propos de nous' });

  if (sections.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800">ℹ️ En savoir plus ({sections.length})</span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 divide-y divide-border">
          {sections.map((s) => (
            <details key={s.key} className="group py-2.5 first:pt-1.5 last:pb-1">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold text-slate-800 leading-snug">{s.title}</span>
                <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="mt-2">
                {s.key === 'equipements' && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {equipements.map((eq, i) => {
                      const emoji = EQUIPEMENTS_EMOJIS[eq] || EQUIPEMENTS_EMOJIS.__default;
                      return (
                        <div key={i} className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] leading-none shrink-0">{emoji}</span>
                          <span className="text-xs text-slate-700 truncate">{getEquipementDisplayLabel(eq)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {s.key === 'pointsForts' && (
                  <div className="flex gap-1.5 flex-wrap">
                    {pointsForts.map((tag, i) => (
                      <span
                        key={i}
                        className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs italic font-semibold whitespace-nowrap"
                        style={{ background: '#FDF6E3', color: '#7a5f1a', border: '1px solid rgba(197,160,89,0.42)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {s.key === 'aPropos' && (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{aPropos}</p>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}