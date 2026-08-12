import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Share2, Pencil, Trash2 } from 'lucide-react';
import { POSTE_COLORS } from '@/constants/colors';
import CollaborateurModal from '@/components/equipe/CollaborateurModal';

export default function CollaborateursCardsSection() {
  const qc = useQueryClient();
  const [editingCollab, setEditingCollab] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: collaborateurs = [] } = useQuery({
    queryKey: ['collaborateurs'],
    queryFn: () => base44.entities.Collaborateur.list(),
  });

  const activeCollabs = collaborateurs.filter(c => c.actif !== false);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Collaborateur.delete(id),
    onSuccess: () => qc.invalidateQueries(['collaborateurs']),
  });

  const typeContratColors = {
    'CDI': 'bg-emerald-100 text-emerald-700',
    'CDD': 'bg-blue-100 text-blue-700',
    'Stage': 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Collaborateurs ({activeCollabs.length})</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Personnel régulier et permanent</p>
        </div>
      </div>

      {activeCollabs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
          <p className="text-sm font-medium">Aucun collaborateur actif</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCollabs.map(collab => (
            <div
              key={collab.id}
              onClick={() => { setEditingCollab(collab); setModalOpen(true); }}
              className="bg-card rounded-2xl border border-border p-4 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer"
            >
              {/* Header avec avatar */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm bg-blue-100 text-blue-700">
                    {collab.nom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{collab.nom}</p>
                    {collab.poste && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POSTE_COLORS[collab.poste] || POSTE_COLORS['Autre']}`}>
                        {collab.poste}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Type de contrat */}
              <div className="mb-3 pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Type de contrat</p>
                {collab.type_contrat ? (
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${typeContratColors[collab.type_contrat] || 'bg-muted text-muted-foreground'}`}>
                    {collab.type_contrat}
                  </span>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">Non spécifié</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  title="Messagerie"
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-primary"
                >
                  <MessageCircle size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  title="Partager le lien"
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-primary"
                >
                  <Share2 size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingCollab(collab); setModalOpen(true); }}
                  title="Modifier"
                  className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(collab.id); }}
                  title="Supprimer"
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <CollaborateurModal collab={editingCollab} onClose={() => { setModalOpen(false); setEditingCollab(null); }} />}
    </div>
  );
}