/**
 * Modal de sélection des étapes pour générer un modèle de programme
 * depuis la Bibliothèque d'étapes — même logique que SelectFormulaModal.
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Check, Sparkles } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = ['Accueil', 'Cocktail', 'Repas', 'Animation', 'Logistique', 'Départ'];

/**
 * Analyse le catalogue alimentaire pour pré-sélectionner les étapes pertinentes.
 */
function analyserCatalogueEtapes(menuItems, formulaName) {
  const items = menuItems.filter(i =>
    i.toutes_formules || (i.formules_associees || []).includes(formulaName)
  );
  const categories = new Set(items.map(i => i.categorie));
  const noms = items.map(i => (i.nom || '').toLowerCase());

  const suggestions = new Set();
  // Toujours
  suggestions.add('Accueil des convives');
  suggestions.add('Départ des convives');

  if (categories.has('Apéritif')) suggestions.add('Cocktail / vin d\'honneur');
  if (categories.has('Entrée')) suggestions.add('Entrée');
  if (categories.has('Plat')) suggestions.add('Plat');
  if (categories.has('Dessert')) suggestions.add('Dessert');
  if (noms.some(n => n.includes('fromage'))) suggestions.add('Fromages');
  if (noms.some(n => n.includes('trou normand') || n.includes('sorbet'))) suggestions.add('Trou normand');
  if (noms.some(n => n.includes('café') || n.includes('mignardise'))) suggestions.add('Café & mignardises');

  return suggestions;
}

export default function SelectEtapesModal({ formulaName, nameSuffix = '', onClose, onGenerated }) {
   const qc = useQueryClient();
   const { toast } = useToast();
   const [selectedIds, setSelectedIds] = useState(new Set());
   const [suggestedIds, setSuggestedIds] = useState(new Set());

   console.log('[SelectEtapesModal] formulaName reçu:', formulaName);
   console.log('[SelectEtapesModal] nameSuffix reçu:', nameSuffix);

  const { data: etapes = [], isLoading: loadingEtapes } = useQuery({
    queryKey: ['etapes-bibliotheque'],
    queryFn: () => base44.entities.EtapeBibliotheque.list('ordre', 500),
  });

  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['catalogue-items-alimentaire'],
    queryFn: () => base44.entities.CatalogueItem.filter({ section: 'alimentaire' }),
  });

  const isLoading = loadingEtapes || loadingMenu;

  useEffect(() => {
    if (isLoading || etapes.length === 0) return;
    const labelsSuggérés = analyserCatalogueEtapes(menuItems, formulaName);
    const idsSuggérés = new Set(etapes.filter(e => labelsSuggérés.has(e.nom)).map(e => e.id));
    setSuggestedIds(idsSuggérés);
    const incluses = new Set(etapes.filter(e => e.etat === 'incluse').map(e => e.id));
    setSelectedIds(new Set([...incluses, ...idsSuggérés]));
  }, [isLoading, etapes.length, menuItems.length, formulaName]);

  const grouped = useMemo(() => CATEGORIES.reduce((acc, cat) => {
    const items = etapes.filter(e => e.categorie === cat && e.etat !== 'archivee').sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {}), [etapes]);

  const detectedSections = useMemo(() => {
    if (!menuItems.length) return [];
    const items = menuItems.filter(i => i.toutes_formules || (i.formules_associees || []).includes(formulaName));
    return [...new Set(items.map(i => i.categorie))];
  }, [menuItems, formulaName]);

  const generateModele = useMutation({
    mutationFn: async () => {
      const selectedEtapes = etapes
        .filter(e => selectedIds.has(e.id) && e.etat !== 'archivee')
        .sort((a, b) => (a.ordre ?? 9999) - (b.ordre ?? 9999));

      const etapesModele = selectedEtapes.map(e => ({
        id: e.id,
        nom: e.nom,
        duree_heures: e.duree_heures || 0,
        duree_minutes: e.duree_minutes || 0,
        categorie: e.categorie,
        heure: '',
      }));

      const nomProgramme = `Programme — ${formulaName}${nameSuffix ? ` ${nameSuffix}` : ''}`;
       console.log('[SelectEtapesModal] Création du programme avec nom:', nomProgramme);
       await base44.entities.ModeleProgramme.create({
         nom: nomProgramme,
         etapes: etapesModele,
       });
       console.log('[SelectEtapesModal] ✅ Programme créé avec succès');
    },
    onSuccess: () => {
      toast({ title: '✅ Programme généré avec succès' });
      qc.invalidateQueries(['modeles-programme']);
      onClose();
      onGenerated?.();
    },
    onError: (error) => {
      toast({ title: '❌ Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const toggleEtape = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <AmandaProcessing size="md" message="Analyse du catalogue…" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-base">📚 Sélectionner les étapes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedIds.size} étape{selectedIds.size !== 1 ? 's' : ''} sélectionnée{selectedIds.size !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
            <X size={16} />
          </button>
        </div>

        {detectedSections.length > 0 && (
          <div className="px-5 py-3 bg-primary/5 border-b border-primary/20 flex items-start gap-2.5">
            <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Pré-sélection intelligente</span> — Catégories détectées dans <strong>{formulaName}</strong> : {detectedSections.join(', ')}.
            </p>
          </div>
        )}

        <div className="p-4 space-y-4 pr-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
              <div className="space-y-1.5">
                {items.map(e => {
                  const isSelected = selectedIds.has(e.id);
                  const isSuggested = suggestedIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEtape(e.id)}
                      disabled={generateModele.isPending}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      } disabled:opacity-50`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground bg-transparent'
                      }`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.nom}</p>
                        <p className="text-xs text-muted-foreground">{e.duree_heures ? `${e.duree_heures}h` : ''}{e.duree_minutes ? ` ${e.duree_minutes}min` : ''}</p>
                      </div>
                      {isSuggested && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">✨ suggéré</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <Button variant="outline" onClick={onClose} disabled={generateModele.isPending}>Annuler</Button>
          <Button onClick={() => generateModele.mutate()} disabled={selectedIds.size === 0 || generateModele.isPending}>
            {generateModele.isPending ? <><Loader2 size={14} className="animate-spin" /> Génération…</> : '✓ Générer le programme'}
          </Button>
        </div>
      </div>
    </div>
  );
}