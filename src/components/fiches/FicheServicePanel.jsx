import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Send, CheckCircle2, Clock, Circle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const DEST_LABELS = {
  extras_salle: '👥 Extras Salle',
  extras_cuisine: '👨‍🍳 Extras Cuisine',
  prestataires: '🎯 Prestataires',
  responsable_soir: '👔 Responsable soir',
  tous: '🌐 Tous',
};

const STATUS_CONFIG = {
  'Non generee': { color: 'bg-gray-100 text-gray-500', icon: Circle, label: 'Non générée' },
  'Generee': { color: 'bg-blue-100 text-blue-700', icon: FileText, label: 'Générée' },
  'Prete': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Prête — J-1 9h' },
  'Envoyee': { color: 'bg-yellow-100 text-yellow-700', icon: Send, label: 'Envoyée' },
  'Vue': { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Vue' },
};

export default function FicheServicePanel({ evenement_id, allergenesMeta = null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches', evenement_id],
    queryFn: () => base44.entities.FicheService.filter({ evenement_id }),
  });

  const handleSendNow = async (fiche) => {
    setSendingId(fiche.id);

    // Notifier chaque destinataire actif
    const actifs = (fiche.destinataires || []).filter(d => d.actif);
    for (const dest of actifs) {
      await base44.functions.invoke('createNotification', {
        titre: '📋 Fiche de service disponible',
        message: `Votre fiche de service pour ${fiche.evenement_nom || 'l\'événement'} du ${fiche.evenement_date ? format(parseISO(fiche.evenement_date), 'd MMMM yyyy', { locale: fr }) : '—'} est disponible.${fiche.consigne ? '\n\n📝 ' + fiche.consigne : ''}`,
        type: 'service',
      });
    }

    await base44.entities.FicheService.update(fiche.id, {
      statut: 'Envoyee',
      date_envoi: new Date().toISOString(),
      destinataires: (fiche.destinataires || []).map(d => d.actif ? { ...d, envoye: true } : d),
    });

    qc.invalidateQueries({ queryKey: ['fiches', evenement_id] });
    toast({ title: '📤 Fiche envoyée aux destinataires' });
    setSendingId(null);
  };

  if (fiches.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">📋 Fiches de service</h4>

      {/* Alerte allergènes — remontée sur la fiche */}
      {allergenesMeta?.conflits?.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-red-800">⚠️ Attention allergènes — {allergenesMeta.conflits.length} conflit(s)</p>
            <div className="flex flex-wrap gap-1">
              {allergenesMeta.conflits.map(label => (
                <span key={label} className="text-[10px] bg-red-200 text-red-900 px-2 py-0.5 rounded-full font-medium">{label}</span>
              ))}
            </div>
            {allergenesMeta.detail && <p className="text-[11px] text-red-700 mt-1">{allergenesMeta.detail}</p>}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {fiches.map(fiche => {
          const config = STATUS_CONFIG[fiche.statut] || STATUS_CONFIG['Non generee'];
          const Icon = config.icon;
          const isExpanded = expandedId === fiche.id;
          const canSend = fiche.statut === 'Prete' || fiche.statut === 'Generee';

          return (
            <div key={fiche.id} className="border border-border rounded-xl overflow-hidden bg-card">
              <button
                onClick={() => setExpandedId(isExpanded ? null : fiche.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.color}`}>
                    <Icon size={12} />
                    {config.label}
                  </div>
                  <span className="text-sm font-medium truncate">{fiche.modele_nom || 'Fiche'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canSend && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={sendingId === fiche.id}
                      onClick={(e) => { e.stopPropagation(); handleSendNow(fiche); }}
                    >
                      {sendingId === fiche.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      Envoyer
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-2.5">
                  {/* Destinataires */}
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Destinataires</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(fiche.destinataires || []).filter(d => d.actif).map(d => (
                        <span key={d.type} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          d.envoye ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'
                        }`}>
                          {DEST_LABELS[d.type] || d.type} {d.envoye && '✓'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Consigne */}
                  {fiche.consigne && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <p className="text-[11px] font-medium text-amber-800">📝 Consigne</p>
                      <p className="text-xs text-amber-700 mt-0.5 whitespace-pre-wrap">{fiche.consigne}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    {fiche.date_generation && (
                      <p>📅 Préparée le {format(parseISO(fiche.date_generation), 'd MMM yyyy à HH:mm', { locale: fr })}</p>
                    )}
                    {fiche.statut === 'Prete' && fiche.evenement_date && (
                      <p className="text-emerald-600 font-medium">
                        ⏰ Envoi auto le {format(new Date(new Date(fiche.evenement_date).getTime() - 86400000), 'd MMM yyyy', { locale: fr })} à 9h00
                      </p>
                    )}
                    {fiche.date_envoi && (
                      <p>📤 Envoyée le {format(parseISO(fiche.date_envoi), 'd MMM yyyy à HH:mm', { locale: fr })}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}