import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BlocFormulairesRegles from './blocs/BlocFormulairesRegles';
import BlocProgrammeRegles from './blocs/BlocProgrammeRegles';
import BlocFicheServiceRegles from './blocs/BlocFicheServiceRegles';
import BlocFacturationRegles from './blocs/BlocFacturationRegles';
import BlocAvisRegles from './blocs/BlocAvisRegles';
import BlocProspectRegles from './blocs/BlocProspectRegles';

const BLOCS_ALL = [
  { id: 'formulaire', emoji: '📝', label: 'Questionnaires' },
  { id: 'programme', emoji: '📋', label: 'Programme de la journée' },
  { id: 'fiche_service', emoji: '📄', label: 'Fiche de service' },
  { id: 'facturation', emoji: '💶', label: 'Facturation' },
  { id: 'avis', emoji: '⭐', label: 'Avis clients' },
  { id: 'prospect', emoji: '🔍', label: 'Prospects' },
];

export default function AutomationRegles({ evenementId = null }) {
  const [openBloc, setOpenBloc] = useState(null);
  const BLOCS = evenementId ? BLOCS_ALL.filter(b => b.id !== 'prospect') : BLOCS_ALL;
  const qc = useQueryClient();

  const { data: regles = [] } = useQuery({
    queryKey: ['automation-regles', evenementId],
    queryFn: () => evenementId
      ? base44.entities.AutomationRegle.filter({ evenement_id: evenementId })
      : base44.entities.AutomationRegle.filter({ evenement_id: null }),
  });

  const { data: modelesForm = [] } = useQuery({
    queryKey: ['modeles-formulaire-automation'],
    queryFn: async () => {
      const all = await base44.entities.ModeleFormulaire.list();
      return (all || []).filter(m => m.est_demo !== true && m.is_exemple !== true);
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const saveRegle = useMutation({
    mutationFn: async ({ bloc, formulaire_id, formulaire_nom, config }) => {
      const existing = regles.find(r =>
        r.bloc === bloc &&
        (formulaire_id ? r.formulaire_id === formulaire_id : !r.formulaire_id) &&
        (evenementId ? r.evenement_id === evenementId : !r.evenement_id)
      );
      const payload = { bloc, config, actif: true, ...(formulaire_id && { formulaire_id, formulaire_nom }), ...(evenementId && { evenement_id: evenementId }) };
      if (existing) {
        return base44.entities.AutomationRegle.update(existing.id, payload);
      } else {
        return base44.entities.AutomationRegle.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['automation-regles', evenementId]);
      toast.success('Règle enregistrée');
    },
  });

  const getConfig = (bloc, formulaire_id = null) => {
    const regle = regles.find(r =>
      r.bloc === bloc &&
      (formulaire_id ? r.formulaire_id === formulaire_id : !r.formulaire_id) &&
      (evenementId ? r.evenement_id === evenementId : !r.evenement_id)
    );
    return regle?.config || {};
  };

  const BlocComponents = {
    formulaire: (
      <>
        <p className="text-xs text-muted-foreground mb-2">Count: {modelesForm.length}</p>
        <BlocFormulairesRegles modelesForm={modelesForm} getConfig={getConfig} onSave={saveRegle.mutate} />
      </>
    ),
    programme: <BlocProgrammeRegles config={getConfig('programme')} onSave={c => saveRegle.mutate({ bloc: 'programme', config: c })} />,
    fiche_service: <BlocFicheServiceRegles config={getConfig('fiche_service')} onSave={c => saveRegle.mutate({ bloc: 'fiche_service', config: c })} />,
    facturation: <BlocFacturationRegles config={getConfig('facturation')} onSave={c => saveRegle.mutate({ bloc: 'facturation', config: c })} />,
    avis: <BlocAvisRegles config={getConfig('avis')} onSave={c => saveRegle.mutate({ bloc: 'avis', config: c })} />,
    prospect: <BlocProspectRegles config={getConfig('prospect')} onSave={c => saveRegle.mutate({ bloc: 'prospect', config: c })} />,
  };

  return (
    <div className="space-y-3">
      {BLOCS.map(bloc => (
        <div key={bloc.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            onClick={() => setOpenBloc(openBloc === bloc.id ? null : bloc.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{bloc.emoji}</span>
              <span className="font-semibold">{bloc.label}</span>
            </div>
            {openBloc === bloc.id ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
          </button>
          {openBloc === bloc.id && (
            <div className="border-t border-border px-5 py-5">
              {BlocComponents[bloc.id]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}