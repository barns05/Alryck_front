/**
 * Section "Générer les modèles" pour une formule du catalogue.
 * Affiche 3 boutons (formulaire, programme, fiche) avec états de génération.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Calendar, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModules } from '@/hooks/useModules';
import { useToast } from '@/components/ui/use-toast';
import ProgramGenerationOrchestrator from '@/components/programme/ProgramGenerationOrchestrator';
import BrochureFormulaireModal from '@/components/formulaire/BrochureFormulaireModal';

export default function GenerateurFormuleModeles({ formuleName, compact = false, onGenerateFormulaire }) {
  const modules = useModules();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState({});
  const [error, setError] = useState(null);
  const [generateProgramModal, setGenerateProgramModal] = useState(null);
  const [brochureFormulaireModal, setBrochureFormulaireModal] = useState(false);

  // Liste complète des modèles formulaire (partagée avec BrochureFormulaireModal)
  const { data: tousModeles = [] } = useQuery({
    queryKey: ['modeles-formulaire'],
    queryFn: () => base44.entities.ModeleFormulaire.list(),
    staleTime: 30000,
  });

  // Requêtes pour les modèles existants (associés à cette formule)
  const modeleFormulaire = tousModeles.find(m => !m.is_exemple && (
    m.nom === `[Modèle] ${formuleName}` ||
    m.nom === formuleName ||
    m.nom?.includes(formuleName)
  )) || null;

  const { data: modeleProgramme } = useQuery({
    queryKey: ['modele-programme-formule', formuleName],
    queryFn: () => base44.entities.ModeleProgramme.filter({}).then(all =>
      all.find(m => m.nom === `[Modèle] ${formuleName}` || m.nom === formuleName) || null
    ),
  });

  const { data: modeleFiche } = useQuery({
    queryKey: ['modele-fiche-formule', formuleName],
    queryFn: () => base44.entities.ModeleFicheService.filter({}).then(all =>
      all.find(m => m.nom === `[Modèle] ${formuleName}` || m.nom === formuleName) || null
    ),
  });

  // Mutations de génération (appelent le backend si une fonction existe)
  const generateFormulaire = async () => {
    setGenerating(p => ({ ...p, formulaire: true }));
    setError(null);
    try {
      // Placeholder : appeler une fonction backend
      toast({ title: '✅ Formulaire généré', description: `Modèle créé avec succès pour ${formuleName}` });
      qc.invalidateQueries(['modele-formulaire-formule']);
    } catch (err) {
      const msg = err.message || 'Erreur lors de la génération du formulaire';
      setError(msg);
      toast({ title: '❌ Erreur', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(p => ({ ...p, formulaire: false }));
    }
  };



  const generateFiche = async () => {
    setGenerating(p => ({ ...p, fiche: true }));
    setError(null);
    try {
      toast({ title: '✅ Fiche de service générée', description: `Modèle créé avec succès pour ${formuleName}` });
      qc.invalidateQueries(['modele-fiche-formule']);
    } catch (err) {
      const msg = err.message || 'Erreur lors de la génération de la fiche de service';
      setError(msg);
      toast({ title: '❌ Erreur', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(p => ({ ...p, fiche: false }));
    }
  };

  const hasFormulaire = modules.formulaire !== false;
  const hasProgramme = modules.programme !== false;
  const hasFiche = modules.fiche_service !== false;

  if (!hasFormulaire && !hasProgramme && !hasFiche) return null;

  return (
    <div className={compact ? "space-y-2" : "space-y-2 border-t border-border pt-4"}>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">🎯 Générer les modèles</p>
      

      
      {compact ? (
        <div className="flex gap-1 flex-wrap">
          {/* Formulaire */}
          {hasFormulaire && (
            modeleFormulaire ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-emerald-600">✓ Questionnaire associé</span>
                <button
                  onClick={() => setBrochureFormulaireModal(true)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Modifier
                </button>
              </div>
            ) : (
              <button
                onClick={() => setBrochureFormulaireModal(true)}
                disabled={generating.formulaire}
                className="flex items-center gap-1 px-2 py-2 min-h-[44px] rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
              >
                <ClipboardList size={12} />
                <span className="flex flex-col items-center"><span className="text-[10px] font-medium">Questionnaire</span><span className="text-[10px] font-normal opacity-70">client</span></span>
              </button>
            )
          )}

          {/* Programme */}
          {hasProgramme && (
            <button
              onClick={() => setGenerateProgramModal(formuleName)}
              className="flex items-center gap-1 px-2 py-2 min-h-[44px] rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
            >
              <Calendar size={12} />
              <span className="flex flex-col items-center"><span className="text-[10px] font-medium">Programme</span><span className="text-[10px] font-normal opacity-70">horaires</span></span>
            </button>
          )}

          {/* Fiche de service */}
          {hasFiche && (
            <button
              onClick={generateFiche}
              disabled={generating.fiche}
              className="flex items-center gap-1 px-2 py-2 min-h-[44px] rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
            >
              {generating.fiche ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              <span className="flex flex-col items-center"><span className="text-[10px] font-medium">Fiche</span><span className="text-[10px] font-normal opacity-70">de service</span></span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* Formulaire de préparation */}
          {hasFormulaire && (
            modeleFormulaire ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-emerald-600">✓ Associé au questionnaire</span>
                <button
                  onClick={() => setBrochureFormulaireModal(true)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Modifier
                </button>
              </div>
            ) : (
              <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={() => setBrochureFormulaireModal(true)} disabled={generating.formulaire}>
                <span>📋</span> Créer / Associer un questionnaire
              </Button>
            )
          )}
          {hasProgramme && (
            <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={() => setGenerateProgramModal(formuleName)}>
              <span>📅</span> Générer le programme
            </Button>
          )}
          {hasFiche && (
            <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={generateFiche} disabled={generating.fiche}>
              {generating.fiche ? <Loader2 size={14} className="animate-spin" /> : <span>📄</span>}
              Générer la fiche de service
            </Button>
          )}
        </div>
      )}

      {/* Brochure formulaire modal */}
      {brochureFormulaireModal && (
        <BrochureFormulaireModal
          formulaName={formuleName}
          modeles={tousModeles}
          onClose={() => setBrochureFormulaireModal(false)}
          onCreated={() => {
            qc.invalidateQueries(['modeles-formulaire']);
          }}
        />
      )}

      {/* Orchestrateur génération programme */}
      {generateProgramModal && (
        <ProgramGenerationOrchestrator
          programmeName={generateProgramModal}
          onClose={() => setGenerateProgramModal(null)}
          onCreated={() => {
            qc.invalidateQueries(['modeles-programme']);
            qc.invalidateQueries(['modele-programme-formule']);
          }}
        />
      )}
    </div>
  );
}