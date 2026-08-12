import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DispoGroupeeModal({ extras, evenements, onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1); // 1, 2, ou 3
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [customizeByExtra, setCustomizeByExtra] = useState(false);
  const [datesByExtra, setDatesByExtra] = useState({}); // { extra_id: [dates] }
  const [message, setMessage] = useState('');

  // Filtrer les événements à venir
  const futureEvenements = evenements
    .filter(e => e.date && new Date(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date));

  // Dates uniques des événements à venir (pour l'affichage côté admin = par événement)
  // Pour l'email destinataire : on déduplique avant envoi

  const toggleExtra = (extraId) => {
    setSelectedExtras(prev =>
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  const toggleAllExtras = (checked) => {
    setSelectedExtras(checked ? extras.map(e => e.id) : []);
  };

  const toggleDate = (dateStr) => {
    setSelectedDates(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const toggleAllDates = (checked) => {
    const allDates = [...new Set(futureEvenements.map(e => e.date))];
    setSelectedDates(checked ? allDates : []);
  };

  const toggleDateForExtra = (extraId, dateStr) => {
    setDatesByExtra(prev => {
      const current = prev[extraId] || [];
      const updated = current.includes(dateStr)
        ? current.filter(d => d !== dateStr)
        : [...current, dateStr];
      return { ...prev, [extraId]: updated };
    });
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Créer DispoExtraGroupee
      const disposGroupee = await base44.entities.DispoExtraGroupee.create({
        nom: `Demande groupée du ${format(new Date(), 'd MMM yyyy', { locale: fr })}`,
        extras_ids: selectedExtras,
        dates_demandees: customizeByExtra ? [] : selectedDates,
        dates_par_extra: customizeByExtra ? datesByExtra : {},
        message: message || undefined,
        statut: 'En cours'
      });

      // Créer DispoExtraReponse pour chaque extra/date unique
      const reponsesToCreate = [];
      
      selectedExtras.forEach(extraId => {
        const extra = extras.find(e => e.id === extraId);
        const dates = customizeByExtra ? (datesByExtra[extraId] || []) : selectedDates;
        // Dédupliquer les dates (plusieurs événements peuvent tomber le même jour)
        const uniqueDates = [...new Set(dates)];
        
        uniqueDates.forEach(dateStr => {
          reponsesToCreate.push({
            dispo_groupee_id: disposGroupee.id,
            extra_id: extraId,
            extra_nom: extra?.nom || '',
            date: dateStr,
            statut: 'En attente'
          });
        });
      });

      if (reponsesToCreate.length > 0) {
        await base44.entities.DispoExtraReponse.bulkCreate(reponsesToCreate);
      }

      // Envoyer un email par extra avec les dates uniques (pas par événement)
      for (const extraId of selectedExtras) {
        const extra = extras.find(e => e.id === extraId);
        if (extra?.email) {
          const datesToRequest = customizeByExtra ? (datesByExtra[extraId] || []) : selectedDates;
          // Dédupliquer et trier les dates avant l'email
          const uniqueSortedDates = [...new Set(datesToRequest)].sort();
          
          const datesList = uniqueSortedDates
            .map(d => `• ${format(parseISO(d), 'EEEE d MMMM yyyy', { locale: fr })}`)
            .join('\n');
          
          await base44.integrations.Core.SendEmail({
            to: extra.email,
            subject: 'Demande de disponibilité',
            body: `Bonjour ${extra.nom},\n\nPouvez-vous confirmer votre disponibilité pour les dates suivantes ?\n\n${datesList}\n\n${message ? `${message}\n\n` : ''}Merci !`
          });
        }
      }

      return disposGroupee;
    },
    onSuccess: () => {
      qc.invalidateQueries(['dispo-reponses']);
      onClose();
    }
  });

  const canContinue = step === 1 && selectedExtras.length > 0 || step === 2 && selectedDates.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Demande de disponibilité groupée</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={16} /></button>
        </div>

        {/* Étape 1: Sélection des extras */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Étape 1 — Sélectionnez les extras concernés</p>
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <input
                type="checkbox"
                id="selectAll"
                checked={selectedExtras.length === extras.length && extras.length > 0}
                onChange={e => toggleAllExtras(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
                Tout sélectionner / Tout désélectionner
              </label>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {extras.map(extra => (
                <label key={extra.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedExtras.includes(extra.id)}
                    onChange={() => toggleExtra(extra.id)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm">{extra.nom}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2: Sélection des dates */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Étape 2 — Sélectionnez les dates de disponibilité
            </p>

            {!customizeByExtra ? (
              <>
                {/* Dédupliquer par date pour l'affichage — la demande destinataire est par date unique */}
                {(() => {
                  const seen = new Set();
                  const uniqueByDate = futureEvenements.filter(ev => {
                    if (seen.has(ev.date)) return false;
                    seen.add(ev.date);
                    return true;
                  });
                  const allDatesUnique = uniqueByDate.map(e => e.date);
                  return (
                    <>
                      <div className="flex items-center gap-2 pb-3 border-b border-border">
                        <input
                          type="checkbox"
                          id="selectAllDates"
                          checked={allDatesUnique.length > 0 && allDatesUnique.every(d => selectedDates.includes(d))}
                          onChange={e => setSelectedDates(e.target.checked ? allDatesUnique : [])}
                          className="w-4 h-4 rounded accent-primary"
                        />
                        <label htmlFor="selectAllDates" className="text-sm font-medium cursor-pointer">
                          Sélectionner toutes les dates
                        </label>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {uniqueByDate.map(ev => {
                          // Trouver tous les événements du même jour
                          const sameDay = futureEvenements.filter(e => e.date === ev.date);
                          return (
                            <label key={ev.date} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedDates.includes(ev.date)}
                                onChange={() => toggleDate(ev.date)}
                                className="w-4 h-4 rounded accent-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {format(parseISO(ev.date), 'd MMMM yyyy', { locale: fr })}
                                  {sameDay.length > 1 && (
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                                      ({sameDay.length} événements ce jour)
                                    </span>
                                  )}
                                </p>
                                {sameDay.length === 1 && (
                                  <p className="text-xs text-muted-foreground">{ev.nom}</p>
                                )}
                                {sameDay.length > 1 && (
                                  <p className="text-xs text-muted-foreground">{sameDay.map(e => e.nom).join(', ')}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-3">
                <p className="text-xs text-muted-foreground italic">Assurez chaque extra des dates à demander :</p>
                {selectedExtras.map(extraId => {
                  const extra = extras.find(e => e.id === extraId);
                  return (
                    <div key={extraId} className="border border-border rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium">{extra?.nom}</p>
                      <div className="space-y-1">
                        {futureEvenements.map(ev => (
                          <label key={ev.id} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(datesByExtra[extraId] || []).includes(ev.date)}
                              onChange={() => toggleDateForExtra(extraId, ev.date)}
                              className="w-3 h-3 rounded accent-primary"
                            />
                            {format(parseISO(ev.date), 'd MMM', { locale: fr })}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="checkbox"
                checked={customizeByExtra}
                onChange={e => setCustomizeByExtra(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm font-medium">Personnaliser par extra</span>
            </label>
          </div>
        )}

        {/* Étape 3: Confirmation et message */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Étape 3 — Confirmation et envoi</p>
            
            {/* Récapitulatif */}
            <div className="bg-muted/40 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Récapitulatif</p>
              {selectedExtras.map(extraId => {
                const extra = extras.find(e => e.id === extraId);
                const dates = customizeByExtra ? (datesByExtra[extraId] || []) : selectedDates;
                return (
                  <div key={extraId} className="text-xs border-t border-border pt-2">
                    <p className="font-medium">{extra?.nom}</p>
                    <p className="text-muted-foreground">
                      {dates.length > 0
                        ? dates.map(d => format(parseISO(d), 'd MMM', { locale: fr })).join(', ')
                        : 'Aucune date'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Message optionnel */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Message personnalisé (optionnel)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ajoutez un message à la demande..."
                className="w-full rounded border border-input bg-transparent px-3 py-2 text-sm min-h-24 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="gap-2"
          >
            {step === 1 ? 'Annuler' : <>
              <ChevronLeft size={14} /> Retour
            </>}
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Étape {step} / 3
          </div>
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
              className="gap-2"
            >
              Suivant <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="gap-2"
            >
              {sendMutation.isPending ? 'Envoi...' : 'Envoyer les demandes'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}