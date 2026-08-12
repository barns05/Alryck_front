import { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const statutColors = {
  'Confirmé':   'bg-emerald-500 text-white',
  'En attente': 'bg-amber-400 text-white',
  'Dispo':      'bg-blue-400 text-white',
  'Indispo':    'bg-slate-400 text-white',
  'Annulé':     'bg-gray-300 text-gray-600',
};

/**
 * Cellule avec menu déroulant pour sélectionner le poste d'un extra sur un événement précis.
 * 
 * Props:
 * - extra: objet extra
 * - evenement: objet événement
 * - assignments: tous les assignments de la session
 * - services: tous les services du mois
 * - activePostes: postes actifs pour ce type d'événement
 * - evAssignments: assignments de cet extra pour cet événement
 */
export default function PosteDropdownCell({ extra, evenement, assignments, services, activePostes, evAssignments, allEvenements = [] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [conflictDialog, setConflictDialog] = useState(null); // { poste, otherEv, overlap }
  const ref = useRef(null);
  const qc = useQueryClient();

  // Fermer sur clic extérieur
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Compétences de l'extra (postes qu'il peut faire)
  const extraPostes = (() => {
    if (extra.competences && extra.competences.length > 0) return extra.competences;
    if (extra.poste) return [extra.poste];
    return activePostes;
  })();

  // Postes proposés = compétences de l'extra intersectées avec les postes actifs de l'événement
  // On part des compétences de l'extra, pas de tous les postes actifs
  const availablePostes = extraPostes.filter(p => activePostes.includes(p));

  // Assignment actuel pour cet extra sur cet événement (on prend le premier actif)
  const currentAssignment = evAssignments.find(a => a.statut !== 'Annulé');
  const currentService = currentAssignment
    ? services.find(s => s.id === currentAssignment.service_id)
    : null;
  const currentPoste = currentService?.poste || null;
  const currentStatut = currentAssignment?.statut || null;

  // Vérifie si deux plages horaires se chevauchent
  const timesOverlap = (start1, end1, start2, end2) => {
    if (!start1 || !end1 || !start2 || !end2) return false;
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return toMin(start1) < toMin(end2) && toMin(start2) < toMin(end1);
  };

  const doAssign = async (poste) => {
    setPending(true);
    try {
      if (poste === null) {
        // Désassigner
        if (currentAssignment) {
          await base44.entities.ServiceAssignment.delete(currentAssignment.id);
        }
      } else {
        // Trouver ou créer le service pour ce poste + cet événement
        let service = services.find(s =>
          s.poste === poste &&
          (s.evenement_id === evenement.id ||
            (s.date === evenement.date && !s.evenement_id))
        );
        if (!service) {
          service = await base44.entities.Service.create({
            date: evenement.date,
            poste,
            evenement_id: evenement.id,
            evenement_nom: evenement.nom,
            lieu: evenement.lieu_nom || '',
            statut: 'Ouvert',
          });
        }
        // Supprimer l'ancien assignment si différent
        if (currentAssignment && currentAssignment.service_id !== service.id) {
          await base44.entities.ServiceAssignment.delete(currentAssignment.id);
        }
        // Créer le nouvel assignment si pas déjà sur ce service
        const alreadyOnService = assignments.find(a =>
          a.service_id === service.id &&
          (a.extra_id === extra.id || a.extra_id === extra.email || a.extra_email === extra.email)
        );
        if (!alreadyOnService) {
          await base44.entities.ServiceAssignment.create({
            service_id: service.id,
            extra_id: extra.id,
            extra_nom: extra.nom,
            extra_email: extra.email || '',
            statut: 'En attente',
          });
        }
      }
      qc.invalidateQueries(['assignments']);
      qc.invalidateQueries(['services']);
    } finally {
      setPending(false);
    }
  };

  const handleSelect = async (poste) => {
    setOpen(false);
    if (poste === currentPoste) return;
    if (poste === null) { doAssign(null); return; }

    // Vérifier si l'extra est déjà assigné sur un autre événement le même jour
    const otherEvServices = services.filter(s =>
      s.date === evenement.date && s.evenement_id && s.evenement_id !== evenement.id
    );
    const otherEvServiceIds = new Set(otherEvServices.map(s => s.id));
    const conflictAssignment = assignments.find(a =>
      otherEvServiceIds.has(a.service_id) && a.statut !== 'Annulé' &&
      (a.extra_id === extra.id || a.extra_id === extra.email || a.extra_email === extra.email)
    );

    if (conflictAssignment) {
      const otherSvc = otherEvServices.find(s => s.id === conflictAssignment.service_id);
      const otherEv = allEvenements.find(e => e.id === otherSvc?.evenement_id) || { nom: otherSvc?.evenement_nom || 'un autre événement' };
      const overlap = timesOverlap(evenement.heure_debut, evenement.heure_fin, otherEv.heure_debut, otherEv.heure_fin);
      setConflictDialog({ poste, otherEv, overlap });
      return;
    }

    doAssign(poste);
  };

  if (conflictDialog) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={e => e.stopPropagation()}>
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className={conflictDialog.overlap ? 'text-red-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
            <div className="space-y-1.5">
              <p className="font-semibold text-sm">
                {extra.nom} est déjà assigné sur <span className="text-primary">{conflictDialog.otherEv.nom}</span> ce jour
              </p>
              <p className="text-xs text-muted-foreground">
                Voulez-vous l'assigner sur <span className="font-medium">{evenement.nom}</span> également ?
              </p>
              {conflictDialog.overlap && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
                  ⚠️ Attention — les horaires se chevauchent. Êtes-vous sûr ?
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setConflictDialog(null); doAssign(conflictDialog.poste); }}
              className="flex-1 text-xs font-medium py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Oui, assigner sur les deux
            </button>
            <button
              onClick={() => setConflictDialog(null)}
              className="flex-1 text-xs font-medium py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Non, choisir un autre
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (availablePostes.length === 0) {
    return (
      <div className="w-full h-6 flex items-center justify-center">
        <span className="text-[9px] text-muted-foreground/40">—</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        className={`w-full flex items-center justify-between gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium leading-tight transition-colors ${
          pending ? 'opacity-50' : ''
        } ${
          currentPoste && currentStatut
            ? (statutColors[currentStatut] || 'bg-gray-100 text-gray-600')
            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
        }`}
      >
        <span className="truncate max-w-[60px]">
          {pending ? '...' : currentPoste || 'Choisir'}
        </span>
        <ChevronDown size={8} className="shrink-0 opacity-70" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-0.5 min-w-[100px] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Option "Aucun" si déjà assigné */}
          {currentPoste && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full text-left px-2.5 py-1.5 text-[10px] text-red-500 hover:bg-red-50 transition-colors border-b border-border"
            >
              ✕ Retirer
            </button>
          )}
          {availablePostes.map(poste => (
            <button
              key={poste}
              onClick={() => handleSelect(poste)}
              className={`w-full text-left px-2.5 py-1.5 text-[10px] font-medium hover:bg-primary/10 transition-colors ${
                poste === currentPoste ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
              }`}
            >
              {poste}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}