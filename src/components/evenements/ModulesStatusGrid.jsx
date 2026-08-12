import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, FileText, FileBadge } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function FicheStatutInline({ evenementId }) {
  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches-service', evenementId],
    queryFn: () => base44.entities.FicheService.filter({ evenement_id: evenementId }),
    staleTime: 30000,
  });
  const actives = fiches.filter(f => f.statut && f.statut !== 'Non generee');
  if (actives.length === 0) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">À faire</span>;
  const toutesEnvoyees = actives.every(f => f.statut === 'Envoyee' || f.statut === 'Vue');
  if (toutesEnvoyees) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">📨 Envoyée</span>;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✅ Prête</span>;
}

function DocsStatutInline({ evenementId }) {
  const { data: devis = [] } = useQuery({
    queryKey: ['devis-evenement', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    staleTime: 30000,
  });
  const { data: contrats = [] } = useQuery({
    queryKey: ['contrats-evenement', evenementId],
    queryFn: () => base44.entities.Contrat.filter({ evenement_id: evenementId }),
    staleTime: 30000,
  });
  const total = devis.length + contrats.length;
  if (total === 0) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Aucun</span>;
  const aAccepte = devis.some(d => d.statut === 'Accepté') || contrats.some(c => c.statut === 'Signé');
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${aAccepte ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
      {total} doc{total > 1 ? 's' : ''}{aAccepte ? ' ✓' : ''}
    </span>
  );
}

export default function ModulesStatusGrid({ ev, formulaire, onOpenFacturation }) {
  const formulaireComplete = formulaire?.statut === 'Complété' || formulaire?.statut === 'Clôturé';
  const prog = ev.programme_journee || [];
  const progStatut = prog.length === 0
    ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">À faire</span>
    : prog.some(e => e.heure && e.heure !== '--:--')
      ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Prêt</span>
      : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">En cours</span>;

  return (
    <Section title="Modules">
      <div className="grid grid-cols-2 gap-2">
        {/* Questionnaire */}
        <div className="bg-muted/40 rounded-xl p-2.5 flex items-center gap-2">
          <ClipboardList size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Questionnaire</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              !formulaire ? 'bg-slate-100 text-slate-500' :
              formulaireComplete ? 'bg-emerald-100 text-emerald-700' :
              formulaire.statut === 'Envoyé' || formulaire.statut === 'En cours' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              {!formulaire ? 'À faire' : formulaire.statut}
            </span>
          </div>
        </div>
        {/* Programme */}
        <div className="bg-muted/40 rounded-xl p-2.5 flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Programme</p>
            {progStatut}
          </div>
        </div>
        {/* Fiche de service */}
        <div className="bg-muted/40 rounded-xl p-2.5 flex items-center gap-2">
          <FileBadge size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Fiche service</p>
            <FicheStatutInline evenementId={ev.id} />
          </div>
        </div>
        {/* Documents */}
        <button
          type="button"
          onClick={onOpenFacturation}
          className="bg-muted/40 rounded-xl p-2.5 flex items-center gap-2 text-left hover:bg-muted/60 transition-colors w-full"
        >
          <FileText size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Documents</p>
            <DocsStatutInline evenementId={ev.id} />
          </div>
        </button>
      </div>
    </Section>
  );
}