import { useState } from 'react';
import { X, Settings2, Archive, ArchiveRestore } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import RappelBouton from '@/components/rappels/RappelBouton';
import { STATUT_EVENEMENT_DETAIL_COLORS } from '@/constants/statutColors';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatEvenementDate, isEvenementDateExacte } from '@/lib/evenementDate';
import StatutGlobalDevisBadge from '@/components/facturation/StatutGlobalDevisBadge';

export default function EvenementDetailHeader({ ev, activeTab, onClose, setShowAutomations }) {
  const qc = useQueryClient();
  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Evenement.update(id, { archived }),
    onSuccess: () => { qc.invalidateQueries(['evenements']); },
    onError: () => toast.error('❌ Erreur lors de l\'archivage'),
  });
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (activeTab === 'logistique') {
    return (
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">← Retour</button>
        <div>
          <h3 className="font-bold text-lg">{ev.nom}</h3>
          {ev.date && <p className="text-muted-foreground text-xs capitalize">{isEvenementDateExacte(ev) ? format(parseISO(ev.date), 'EEEE d MMMM yyyy', { locale: fr }) : formatEvenementDate(ev).label}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 border-b border-border flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-bold text-xl">{ev.nom}</h3>
          {ev.type_evenement && <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{ev.type_evenement}</span>}
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUT_EVENEMENT_DETAIL_COLORS[ev.statut] || ''}`}>{ev.statut}</span>
          <StatutGlobalDevisBadge evenementId={ev.id} />
        </div>
        {ev.date && <p className="text-muted-foreground text-sm capitalize">{isEvenementDateExacte(ev) ? format(parseISO(ev.date), 'EEEE d MMMM yyyy', { locale: fr }) : formatEvenementDate(ev).label}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RappelBouton context={{ type: 'evenement', id: ev.id, nom: ev.nom }} />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAutomations(true)}>
          <Settings2 size={14} /> <span className="hidden sm:inline">Relances</span>
        </Button>
        {ev.archived ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-emerald-600 hover:text-emerald-700"
            title="Restaurer"
            disabled={archiveMutation.isPending}
            onClick={() => archiveMutation.mutate({ id: ev.id, archived: false })}
          >
            <ArchiveRestore size={14} /> <span className="hidden sm:inline">Restaurer</span>
          </Button>
        ) : ['Terminé', 'Annulé'].includes(ev.statut) && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-amber-500 hover:text-amber-600"
            title="Archiver"
            disabled={archiveMutation.isPending}
            onClick={() => setConfirmArchive(true)}
          >
            <Archive size={14} /> <span className="hidden sm:inline">Archiver</span>
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onClose}><X size={16} /></Button>
      </div>
    </div>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>Il restera consultable dans l'historique du client mais disparaîtra de la liste principale.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => { archiveMutation.mutate({ id: ev.id, archived: true }); setConfirmArchive(false); }}>Archiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}