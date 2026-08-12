import { UtensilsCrossed } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

export default function ConvivesFormuleSection({ ev, formulaire, optionsList, loadingOptions }) {
  const hasData = ev.formule_nom || ev.nb_adultes > 0 || ev.nb_adolescents > 0 || ev.nb_enfants > 0 || ev.nb_prestataires > 0;
  if (!hasData) return null;

  const opts = formulaire?.reponses?.['options-prestations'];
  const ids = Array.isArray(opts) ? opts : (opts ? [opts] : []);
  const optionsNoms = !loadingOptions && ids.length > 0
    ? ids.map(id => optionsList.find(o => o.id === id)?.nom).filter(Boolean)
    : [];

  return (
    <Section title="Convives & Formule">
      <div className="bg-muted/40 rounded-xl p-3 space-y-2">
        {ev.formule_nom && (
          <div className="flex items-center gap-2 text-sm">
            <UtensilsCrossed size={14} className="text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Formule : </span>
            <span className="font-semibold text-primary">{ev.formule_nom}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          {ev.nb_adultes > 0 && (
            <span className="bg-background border border-border rounded-lg px-2 py-1">
              👨‍👩‍👧 <span className="font-semibold">{ev.nb_adultes}</span> adulte{ev.nb_adultes > 1 ? 's' : ''}
            </span>
          )}
          {ev.nb_adolescents > 0 && (
            <span className="bg-background border border-border rounded-lg px-2 py-1">
              🧑 <span className="font-semibold">{ev.nb_adolescents}</span> ado{ev.nb_adolescents > 1 ? 's' : ''}
            </span>
          )}
          {ev.nb_enfants > 0 && (
            <span className="bg-background border border-border rounded-lg px-2 py-1">
              🧒 <span className="font-semibold">{ev.nb_enfants}</span> enfant{ev.nb_enfants > 1 ? 's' : ''}
            </span>
          )}
          {ev.nb_prestataires > 0 && (
            <span className="bg-background border border-border rounded-lg px-2 py-1">
              🎵 <span className="font-semibold">{ev.nb_prestataires}</span> prestataire{ev.nb_prestataires > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {optionsNoms.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Options choisies :</p>
            <div className="flex flex-wrap gap-2">
              {optionsNoms.map((nom, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">✓ {nom}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}