/**
 * ModelesSection — liste des gabarits réutilisables (Contrat type='modele').
 *
 * Affiché dans l'onglet « Mes modèles » de ContractsPanel. Filtrage par
 * type_evenement (select compact). Création via ModeleCreateModal (modal à 2
 * écrans : upload simple ou accompagnement Amanda).
 * Badge « Modèle » au lieu d'un badge de statut. Badge « IA » pour les modèles dynamiques.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileCheck, Plus, Download, Trash2, Sparkles, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTypesEvenement } from '@/hooks/useTypesEvenement';
import { normalizeTypes, typesLabel } from '@/components/bibliotheque/TypeEvenementMultiSelect';
import ModeleCreateModal from './ModeleCreateModal';
import ModeleEditModal from './ModeleEditModal';

export default function ModelesSection() {
  const qc = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModele, setEditingModele] = useState(null);
  const [filterType, setFilterType] = useState('Tous');
  const { activeNoms = [] } = useTypesEvenement();

  const { data: modeles = [] } = useQuery({
    queryKey: ['modeles'],
    queryFn: () => base44.entities.Contrat.filter({ type: 'modele' }, '-created_date', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contrat.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['modeles']);
      toast.success('Modèle supprimé');
    },
  });

  const filteredModeles = filterType === 'Tous'
    ? modeles
    : modeles.filter(m => {
        const types = normalizeTypes(m.type_evenement);
        return types.length === 0 || types.includes(filterType);
      });

  const showFilter = modeles.length > 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Modèles ({filteredModeles.length})
          </p>
          {showFilter && (
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-7 rounded-md border border-input bg-transparent px-2 py-0 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[140px]"
            >
              <option value="Tous">Toutes les catégories</option>
              {activeNoms.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} /> Nouveau modèle
        </Button>
      </div>

      {/* Liste */}
      {filteredModeles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Aucun modèle. Créez-en un via « Upload simple », « Avec Amanda » ou « Questionnaire guidé ».
        </div>
      ) : (
        <div className="space-y-2">
          {filteredModeles.map(m => (
            <div key={m.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <FileCheck size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.titre || 'Modèle'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {typesLabel(normalizeTypes(m.type_evenement))}
                </p>
              </div>
              {m.contenu_dynamique && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 bg-violet-100 text-violet-700 border-violet-200 flex items-center gap-0.5">
                  <Sparkles size={9} /> IA
                </span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 bg-slate-100 text-slate-600 border-slate-200">
                Modèle
              </span>
              {m.contenu_dynamique && (
                <button
                  onClick={() => setEditingModele(m)}
                  title="Éditer le modèle"
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  <Pencil size={14} />
                </button>
              )}
              {m.modele_url && (
                <a
                  href={m.modele_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Télécharger"
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  <Download size={14} />
                </a>
              )}
              <button
                onClick={() => deleteMutation.mutate(m.id)}
                disabled={deleteMutation.isPending}
                title="Supprimer"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <ModeleCreateModal onClose={() => setShowCreateModal(false)} />}
      {editingModele && <ModeleEditModal modele={editingModele} onClose={() => setEditingModele(null)} />}
    </div>
  );
}