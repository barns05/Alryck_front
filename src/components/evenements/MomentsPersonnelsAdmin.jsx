import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Check, X, Clock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDuree } from '@/lib/programmeUtils';

export default function MomentsPersonnelsAdmin({ evenement }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [heureEdit, setHeureEdit] = useState('');
  const [refusId, setRefusId] = useState(null);
  const [messageRefus, setMessageRefus] = useState('');
  const [pending, setPending] = useState({});

  const { data: moments = [], refetch } = useQuery({
    queryKey: ['moments-personnels', evenement?.id],
    queryFn: () => base44.entities.MomentPersonnel.filter({ evenement_id: evenement.id }),
    enabled: !!evenement?.id,
  });

  const enAttente = moments.filter(m => m.statut === 'En attente');
  const autres = moments.filter(m => m.statut !== 'En attente');

  if (moments.length === 0) return null;

  const handleValider = async (moment, heure) => {
    setPending(p => ({ ...p, [moment.id]: 'valider' }));
    await base44.entities.MomentPersonnel.update(moment.id, {
      statut: 'Validé',
      heure_validee: heure || moment.heure_souhaitee,
    });
    // Notifier le client
    if (evenement.client_email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: evenement.client_email,
          subject: `✅ Votre moment "${moment.intitule}" a été validé`,
          body: `Bonjour,\n\nVotre moment personnel "${moment.intitule}"${heure ? ` a été programmé à ${heure}` : ' a été validé et intégré au programme'}.\n\nCordialement,\nL'équipe`,
        });
      } catch (_) {}
    }
    setEditingId(null);
    setPending(p => { const n = { ...p }; delete n[moment.id]; return n; });
    refetch();
  };

  const handleRefuser = async (moment) => {
    if (!messageRefus.trim()) return;
    setPending(p => ({ ...p, [moment.id]: 'refuser' }));
    await base44.entities.MomentPersonnel.update(moment.id, {
      statut: 'Refusé',
      message_refus: messageRefus,
    });
    if (evenement.client_email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: evenement.client_email,
          subject: `❌ Votre moment "${moment.intitule}" ne peut pas être intégré`,
          body: `Bonjour,\n\nNous ne pouvons pas intégrer votre moment "${moment.intitule}" au programme pour la raison suivante :\n\n${messageRefus}\n\nN'hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,\nL'équipe`,
        });
      } catch (_) {}
    }
    setRefusId(null);
    setMessageRefus('');
    setPending(p => { const n = { ...p }; delete n[moment.id]; return n; });
    refetch();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Star size={12} className="text-amber-500" /> Moments personnels du client
        {enAttente.length > 0 && (
          <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{enAttente.length}</span>
        )}
      </p>

      {moments.map(moment => (
        <div key={moment.id} className={`rounded-xl border p-3 space-y-2 text-sm ${
          moment.statut === 'En attente' ? 'border-amber-300 bg-amber-50' :
          moment.statut === 'Validé' ? 'border-emerald-200 bg-emerald-50' :
          'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <Star size={13} className="text-amber-500 shrink-0" />
              {moment.intitule}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
              moment.statut === 'En attente' ? 'bg-amber-200 text-amber-800' :
              moment.statut === 'Validé' ? 'bg-emerald-200 text-emerald-800' :
              'bg-red-200 text-red-800'
            }`}>
              {moment.statut}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {moment.heure_souhaitee && (
              <span className="flex items-center gap-1"><Clock size={11} /> Souhaité : {moment.heure_souhaitee}</span>
            )}
            {moment.heure_validee && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium"><Clock size={11} /> Confirmé : {moment.heure_validee}</span>
            )}
            {(moment.duree_heures > 0 || moment.duree_minutes > 0) && (
              <span>{formatDuree(moment.duree_heures, moment.duree_minutes)}</span>
            )}
            {moment.client_nom && <span>Par : {moment.client_nom}</span>}
          </div>

          {moment.note_organisateur && (
            <p className="text-xs text-muted-foreground italic bg-white/60 rounded-lg px-2 py-1.5">
              💬 {moment.note_organisateur}
            </p>
          )}
          {moment.message_refus && (
            <p className="text-xs text-red-600 italic">Motif refus : {moment.message_refus}</p>
          )}

          {/* Actions admin — uniquement pour "En attente" */}
          {moment.statut === 'En attente' && (
            <>
              {/* Mode édition heure */}
              {editingId === moment.id ? (
                <div className="flex gap-2 pt-1">
                  <input
                    type="time"
                    value={heureEdit}
                    onChange={e => setHeureEdit(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs rounded-lg border border-border bg-white focus:outline-none"
                    placeholder={moment.heure_souhaitee}
                  />
                  <Button size="sm" className="text-xs h-7 px-2 bg-emerald-500 hover:bg-emerald-600 text-white gap-1" onClick={() => handleValider(moment, heureEdit)}>
                    <Check size={12} /> Valider
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setEditingId(null)}>
                    Annuler
                  </Button>
                </div>
              ) : refusId === moment.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={messageRefus}
                    onChange={e => setMessageRefus(e.target.value)}
                    placeholder="Expliquez la raison du refus au client..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-red-300 bg-white focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs h-7 px-2 bg-red-500 hover:bg-red-600 text-white gap-1" onClick={() => handleRefuser(moment)} disabled={!messageRefus.trim() || !!pending[moment.id]}>
                      <X size={12} /> Confirmer le refus
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => { setRefusId(null); setMessageRefus(''); }}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-7 bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                    disabled={!!pending[moment.id]}
                    onClick={() => handleValider(moment, moment.heure_souhaitee)}
                  >
                    <Check size={12} /> Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1 border-primary/30 text-primary"
                    onClick={() => { setEditingId(moment.id); setHeureEdit(moment.heure_souhaitee || ''); }}
                  >
                    <Pencil size={11} /> Modifier heure
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setRefusId(moment.id)}
                  >
                    <X size={12} /> Refuser
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}