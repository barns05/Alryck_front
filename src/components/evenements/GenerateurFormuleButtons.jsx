/**
 * Boutons Générer — apparaissent dans la fiche événement quand une formule catalogue est associée.
 * Respecte les modules actifs dans les paramètres de l'application.
 */
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, FileText, ClipboardList, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModules } from '@/hooks/useModules';
import { useToast } from '@/components/ui/use-toast';
import ProgrammeDrawer from '@/components/evenements/ProgrammeDrawer';
import FormulaireDrawer from '@/components/evenements/FormulaireDrawer';
import GenerateFichesModal from '@/components/evenements/GenerateFichesModal';

export default function GenerateurFormuleButtons({ evenement }) {
  const modules = useModules();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showProgramme, setShowProgramme] = useState(false);
  const [showFormulaire, setShowFormulaire] = useState(false);
  const [showFiches, setShowFiches] = useState(false);
  const [generatingFiches, setGeneratingFiches] = useState(false);

  // Aucun bouton si pas de formule
  if (!evenement.formule_nom) return null;

  const hasProgramme = modules.programme !== false;
  const hasFiche = modules.fiche_service !== false;
  const hasFormulaire = modules.formulaire !== false;

  if (!hasProgramme && !hasFiche && !hasFormulaire) return null;

  const handleGenerateFiches = async () => {
    setGeneratingFiches(true);
    try {
      const response = await base44.functions.invoke('generateFichesService', {
        evenement_id: evenement.id,
      });
      toast({ title: '✅ Fiches générées', description: response.data?.message });
      qc.invalidateQueries(['fiches', evenement.id]);
    } catch (err) {
      toast({ title: '❌ Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingFiches(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">
          ✨ Formule <strong className="text-foreground">{evenement.formule_nom}</strong> associée — Générer :
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasProgramme && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setShowProgramme(v => !v)}
          >
            <Calendar size={13} />
            📅 Programme
            {showProgramme ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        )}

        {hasFiche && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setShowFiches(true)}
            disabled={generatingFiches}
          >
            {generatingFiches ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            📄 Fiche de service
          </Button>
        )}

        {hasFormulaire && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setShowFormulaire(v => !v)}
          >
            <ClipboardList size={13} />
            📋 Questionnaire de préparation
            {showFormulaire ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        )}
      </div>

      {/* Drawer programme inline */}
      {showProgramme && hasProgramme && (
        <ProgrammeDrawer evenement={evenement} onClose={() => setShowProgramme(false)} />
      )}

      {/* Drawer formulaire inline */}
      {showFormulaire && hasFormulaire && (
        <FormulaireDrawer evenement={evenement} onClose={() => setShowFormulaire(false)} />
      )}

      {/* Modal fiche de service */}
      {showFiches && hasFiche && (
        <GenerateFichesModal evenement={evenement} onClose={() => setShowFiches(false)} />
      )}
    </div>
  );
}