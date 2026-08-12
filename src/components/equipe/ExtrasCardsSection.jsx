import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Share2, Pencil, Trash2, UserX, UserCheck2 } from 'lucide-react';
import { POSTE_COLORS } from '@/constants/colors';
import ExtraModal from '@/components/extras/ExtraModal';
import ExtraChatModal from '@/components/extras/ExtraChatModal';
import ShareExtraPortalModal from '@/components/extras/ShareExtraPortalModal';

export default function ExtrasCardsSection({ onEdit }) {
  const qc = useQueryClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [chattingExtra, setChattingExtra] = useState(null);
  const [sharePortal, setSharePortal] = useState(null);
  const [editingExtra, setEditingExtra] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list('-created_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.ServiceAssignment.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('-date', 200),
  });

  const activeExtras = extras.filter(e => e.actif !== false);

  const deleteMutation = useMutation({
    mutationFn: async (extra) => {
      const assignments = await base44.entities.ServiceAssignment.filter({ extra_id: extra.id });
      await Promise.all(assignments.map(a => base44.entities.ServiceAssignment.delete(a.id)));
      if (extra.email) {
        const byEmail = await base44.entities.ServiceAssignment.filter({ extra_id: extra.email });
        await Promise.all(byEmail.map(a => base44.entities.ServiceAssignment.delete(a.id)));
      }
      return base44.entities.Extra.delete(extra.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['extras']);
      qc.invalidateQueries(['assignments']);
    },
  });

  const toggleActifMutation = useMutation({
    mutationFn: ({ id, actif }) => base44.entities.Extra.update(id, { actif }),
    onSuccess: () => qc.invalidateQueries(['extras']),
  });

  const getNextEventForExtra = (extra) => {
    const today = new Date().toISOString().split('T')[0];
    const futureAssignments = assignments
      .filter(a => (a.extra_id === extra.id || a.extra_email === extra.email) && a.statut !== 'Annulé')
      .sort((a, b) => {
        const svcA = services.find(s => s.id === a.service_id);
        const svcB = services.find(s => s.id === b.service_id);
        return (svcA?.date || '').localeCompare(svcB?.date || '');
      });

    if (futureAssignments.length > 0) {
      const svc = services.find(s => s.id === futureAssignments[0].service_id);
      return svc?.poste || 'Service prévu';
    }
    return 'Aucun événement';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Extras ({activeExtras.length})</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Personnel saisonnier et occasionnel</p>
        </div>
      </div>

      {activeExtras.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
          <p className="text-sm font-medium">Aucun extra actif</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeExtras.map(extra => (
            <div
              key={extra.id}
              onClick={() => { setEditingExtra(extra); setModalOpen(true); }}
              className="bg-card rounded-2xl border border-border p-4 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer"
            >
              {/* Header avec avatar */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm bg-purple-100 text-purple-700">
                    {extra.nom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{extra.nom}</p>
                    {extra.poste && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POSTE_COLORS[extra.poste] || POSTE_COLORS['Autre']}`}>
                        {extra.poste}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Événement suivant ou statut */}
              <div className="mb-3 pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Prochain événement</p>
                <p className="text-sm font-medium text-foreground">{getNextEventForExtra(extra)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setChattingExtra(extra); setChatOpen(true); }}
                  title="Messagerie"
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-primary"
                >
                  <MessageCircle size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSharePortal(extra); }}
                  title="Partager le lien"
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-primary"
                >
                  <Share2 size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActifMutation.mutate({ id: extra.id, actif: false }); }}
                  title="Désactiver"
                  className="ml-auto p-2 rounded-lg hover:bg-amber-50 transition-colors text-muted-foreground hover:text-amber-500"
                >
                  <UserX size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(extra); }}
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

      {modalOpen && <ExtraModal extra={editingExtra} onClose={() => { setModalOpen(false); setEditingExtra(null); }} />}
      {chatOpen && chattingExtra && <ExtraChatModal extra={chattingExtra} onClose={() => { setChatOpen(false); setChattingExtra(null); }} />}
      {sharePortal && <ShareExtraPortalModal extra={sharePortal} onClose={() => setSharePortal(null)} />}
    </div>
  );
}