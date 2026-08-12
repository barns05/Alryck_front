import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';
import HelpTooltip from '@/components/HelpTooltip';
import FormulaireTypeSection from '@/components/settings/FormulaireTypeSection';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const MODULE_GROUPS = [
  {
    label: 'Modules de navigation',
    modules: [
      { key: 'facturation',   label: 'Facturation',            emoji: '💶', desc: 'Devis, factures, échéances et gestion financière' },
      { key: 'equipe',        label: 'Équipe & Planning',      emoji: '👥', desc: 'Planning équipe, extras, missions' },
      { key: 'promotions',    label: 'Promotions',             emoji: '🚀', desc: 'Campagnes promotionnelles et offres clients' },
      { key: 'medias',        label: 'Médias',                 emoji: '🖼️', desc: 'Galerie photos et vidéos' },
      { key: 'prestataires',  label: 'Partenaires & Lieux',    emoji: '🤝', desc: 'Prestataires, lieux et partenaires' },
      { key: 'analyse',       label: 'Analyse',                emoji: '📊', desc: 'Statistiques et indicateurs de performance' },
      { key: 'developpement', label: 'Développement',          emoji: '🌱', desc: 'Suivi du développement commercial' },
      { key: 'securite',      label: 'Module Sécurité ERP',    emoji: '🔒', desc: 'Contrôles obligatoires et registre de sécurité' },
      { key: 'logistique',    label: 'Logistique & Livraisons',  emoji: '📦', desc: 'Gérez vos livraisons et prestations hors site' },
    ],
  },
];

const DEFAULTS = {
  formulaire: true, programme: true, plan_table: true,
  fiche_service: true, extras: true, menu: true, prospects: true,
  facturation: false, equipe: true, promotions: true, medias: true,
  prestataires: true, analyse: true, developpement: true, securite: false, logistique: false,
};

// Toast interne
function Toast({ show }) {
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
      <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium">
        <CheckCircle2 size={16} />
        Modifications enregistrées
      </div>
    </div>
  );
}

export default function BlocParametresApp() {
  const qc = useQueryClient();
  const [localModules, setLocalModules] = useState(null); // état local des toggles
  const [localTypeFormulaire, setLocalTypeFormulaire] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef(null);

  const { settings: company } = useOwnerCompanySettings();
  const savedModules = { ...DEFAULTS, ...(company?.modules_actifs || {}) };
  const savedTypeFormulaire = company?.type_formulaire || 'universel';

  // Synchroniser l'état local quand les données serveur arrivent (reset propre)
  useEffect(() => {
    setLocalModules(null);
    setLocalTypeFormulaire(null);
  }, [company?.id]);

  const effective = localModules ?? savedModules;
  const effectiveTypeFormulaire = localTypeFormulaire ?? savedTypeFormulaire;

  // Vrai diff entre état local et état sauvegardé
  const hasChanges =
    (localModules !== null && Object.keys(localModules).some(k => localModules[k] !== savedModules[k])) ||
    (localTypeFormulaire !== null && localTypeFormulaire !== savedTypeFormulaire);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      console.log('[BlocParametresApp] SAVE — company.id:', company?.id);
      console.log('[BlocParametresApp] SAVE — données envoyées:', JSON.stringify(data));
      if (company?.id) {
        return base44.entities.CompanySettings.update(company.id, data);
      }
      return base44.entities.CompanySettings.create(data);
    },
    onSuccess: async (result) => {
      console.log('[BlocParametresApp] SAVE OK — réponse base:', JSON.stringify(result));
      // Refetch garanti AVANT de réinitialiser l'état local
      await qc.refetchQueries({ queryKey: ['company-settings'] });
      // Vérification directe en base post-save
      const freshList = await base44.entities.CompanySettings.list();
      console.log('[BlocParametresApp] GET POST-SAVE modules_actifs:', JSON.stringify(freshList.find(cs => cs.is_owner === true)?.modules_actifs));
      // ── Backfill Logistique : si on active le module, cocher la tâche
      //    taches_requises.logistique=true sur tous les événements existants
      //    qui ne l'ont pas encore. Idempotent. ──────────────────────────────
      const wasLogistiqueOff = !savedModules.logistique;
      const isLogistiqueOn = effective.logistique === true;
      if (wasLogistiqueOff && isLogistiqueOn) {
        try {
          const allEvts = await base44.entities.Evenement.list('-date', 1000);
          const toUpdate = allEvts.filter(e => (e.taches_requises?.logistique ?? false) !== true);
          if (toUpdate.length > 0) {
            await base44.entities.Evenement.bulkUpdate(
              toUpdate.map(e => ({ id: e.id, taches_requises: { ...(e.taches_requises || {}), logistique: true } }))
            );
            qc.invalidateQueries(['evenements']);
          }
        } catch (err) {
          console.error('[BlocParametresApp] backfill logistique erreur:', err);
        }
      }

      // Seulement après que le cache est à jour, on efface l'état local
      setLocalModules(null);
      setLocalTypeFormulaire(null);
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowToast(false), 2000);
    },
    onError: (err) => {
      console.error('[BlocParametresApp] SAVE ERREUR:', err);
    },
  });

  const toggle = (key) => {
    setLocalModules(prev => {
      const base = prev ?? savedModules;
      return { ...base, [key]: !base[key] };
    });
  };

  const handleSave = () => {
    if (!hasChanges) return;
    const mergedModules = { ...(company?.modules_actifs || {}), ...effective };
    console.log('[BlocParametresApp] handleSave — effective:', JSON.stringify(effective));
    console.log('[BlocParametresApp] handleSave — mergedModules:', JSON.stringify(mergedModules));
    updateMutation.mutate({ modules_actifs: mergedModules, type_formulaire: effectiveTypeFormulaire });
  };

  return (
    <>
      <Toast show={showToast} />

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="font-semibold text-base">⚙️ Modules actifs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Désactiver un module le fait disparaître de toute l'application.</p>
          </div>
          <HelpTooltip text="Activez ou désactivez les modules selon votre activité. Un module désactivé disparaît complètement de l'application." />
        </div>

        <div className="space-y-5">
          {MODULE_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">{group.label}</p>
              <div className="space-y-2">
                {group.modules.map(m => {
                  const isOn = effective[m.key];
                  return (
                    <div key={m.key} className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${isOn ? 'bg-card border-border' : 'bg-secondary/30 border-border opacity-60'}`}>
                      <span className="text-xl shrink-0">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      <button
                        onClick={() => toggle(m.key)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isOn ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-20 z-10 bg-card border-t border-border px-4 py-4 flex items-center justify-between gap-4 shadow-lg rounded-b-2xl">
        {hasChanges ? (
          <p className="text-xs text-amber-600 font-medium">⚠️ Modifications non sauvegardées</p>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending || !company}
          className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          {updateMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </>
  );
}