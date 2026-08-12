import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUT_PRESTATAIRE_COLORS } from '@/constants/statutColors';
import PrestatairesLogosRow from './PrestatairesLogosRow';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

export default function PrestatairesListSection({ prestatairesEv, onGerer }) {
  return (
    <Section title={`Prestataires (${prestatairesEv.length})`}>
      <PrestatairesLogosRow prestatairesEv={prestatairesEv} />
      {prestatairesEv.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun prestataire associé.</p>
      ) : (
        <div className="space-y-2">
          {prestatairesEv.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
              <div>
                <p className="font-medium text-sm">{p.prestataire_nom}</p>
                <p className="text-xs text-muted-foreground">{p.prestataire_domaine}{p.montant ? ` · ${p.montant}€` : ''}</p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUT_PRESTATAIRE_COLORS[p.statut] || ''}`}>{p.statut}</span>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" className="w-full gap-1.5 mt-1" onClick={onGerer}>
        <Plus size={13} /> Gérer les prestataires
      </Button>
    </Section>
  );
}