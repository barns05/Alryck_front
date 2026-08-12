import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Send, ChevronRight, ChevronLeft, Users, Calendar, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { getPromoLabel } from '@/components/promotions/PromoOffreBadge';
import { NOTIFICATION_CHANNELS } from '@/lib/notificationChannels';

const FILTRES_STATUT = ['Tous', 'Confirmés', 'En attente'];
const FILTRES_TYPE = ['Tous', 'Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];
const FILTRES_PERIODE = ['Tous', '≤ 3 mois', '≤ 6 mois', '≤ 12 mois', '> 12 mois'];

export default function PromotionSendModal({ promo, reponses = [], onClose, onSent }) {
  const { toast } = useToast();
  const [etape, setEtape] = useState(1);
  
  // Étape 1 — Paramétrage
  const [dateLimite, setDateLimite] = useState(promo.date_validite || '');
  const [messagePerso, setMessagePerso] = useState('');
  
  // Étape 2 — Filtres
  const [filtreStatut, setFiltreStatut] = useState('Tous');
  const [filtreType, setFiltreType] = useState('Tous');
  const [filtrePeriode, setFiltrePeriode] = useState('Tous');
  const [selected, setSelected] = useState(new Set());
  
  // Étape 3 — Confirmation
  const [sending, setSending] = useState(false);

  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements'],
    queryFn: () => base44.entities.Evenement.list('-created_date', 500),
  });

  // IDs des événements déjà ciblés
  const dejaCiblesIds = useMemo(() => new Set(reponses.map(r => r.evenement_id)), [reponses]);

  // Construire la liste complète des clients
  const allClients = useMemo(() => {
    return evenements
      .map(e => ({
        evenementId: e.id,
        evenementNom: e.nom,
        clientNom: e.client_nom || '',
        clientEmail: e.client_email || '',
        clientId: e.client_id || '',
        typeEvenement: e.type_evenement || '',
        date: e.date || '',
        statut: e.statut || 'En préparation',
        dejaRecu: dejaCiblesIds.has(e.id),
      }));
  }, [evenements, dejaCiblesIds]);

  // Appliquer les filtres
  const filtered = useMemo(() => {
    return allClients.filter(c => {
      // Filtre statut
      if (filtreStatut === 'Confirmés' && !['Confirmé', 'En cours', 'Terminé'].includes(c.statut)) return false;
      if (filtreStatut === 'En attente' && ['Confirmé', 'En cours', 'Terminé'].includes(c.statut)) return false;
      
      // Filtre type
      if (filtreType !== 'Tous' && c.typeEvenement !== filtreType) return false;
      
      // Filtre période
      if (filtrePeriode !== 'Tous' && c.date) {
        const eventDate = parseISO(c.date);
        const now = new Date();
        const monthsDiff = (eventDate.getFullYear() - now.getFullYear()) * 12 + (eventDate.getMonth() - now.getMonth());
        
        if (filtrePeriode === '≤ 3 mois' && monthsDiff > 3) return false;
        if (filtrePeriode === '≤ 6 mois' && monthsDiff > 6) return false;
        if (filtrePeriode === '≤ 12 mois' && monthsDiff > 12) return false;
        if (filtrePeriode === '> 12 mois' && monthsDiff <= 12) return false;
      }
      
      return true;
    });
  }, [allClients, filtreStatut, filtreType, filtrePeriode]);

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.evenementId)));
    }
  };

  const selectedClients = allClients.filter(c => selected.has(c.evenementId));
  const nbNouveaux = selectedClients.filter(c => !c.dejaRecu).length;
  const nbRenvois = selectedClients.filter(c => c.dejaRecu).length;
  const allChecked = filtered.length > 0 && filtered.every(c => selected.has(c.evenementId));

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    const label = getPromoLabel(promo);
    const config = NOTIFICATION_CHANNELS.PROMOTIONS; // Double canal
    let nbEmailsEnvoyes = 0;
    try {
      for (const cible of selectedClients) {
        // 1. Canal in-app : notification dans l'espace client (PromotionReponse)
        const existingRep = reponses.find(r => r.evenement_id === cible.evenementId);
        if (existingRep) {
          // Si la réponse existe déjà, garder le statut sauf si c'était "Envoyé"
          if (existingRep.reponse === 'Envoyé' || existingRep.reponse === 'Vu') {
            // Ne rien changer, le statut reste tel quel
          }
        } else {
          await base44.entities.PromotionReponse.create({
            promotion_id: promo.id,
            promotion_titre: promo.titre,
            promotion_prix: promo.prix || 0,
            evenement_id: cible.evenementId,
            evenement_nom: cible.evenementNom,
            client_id: cible.clientId,
            client_nom: cible.clientNom,
            client_email: cible.clientEmail,
            reponse: 'Envoyé',
            date_reponse: new Date().toISOString(),
          });
        }
        
        // 2. Canal email : si email disponible
        if (cible.clientEmail && config.channels.includes('email')) {
          try {
            await base44.integrations.Core.SendEmail({
              to: cible.clientEmail,
              subject: `🎯 Offre spéciale : ${promo.titre}`,
              body: `${messagePerso ? messagePerso + '\n\n' : ''}Bonjour ${cible.clientNom || ''},\n\nNous avons une offre exclusive pour vous !\n\n🎯 ${promo.titre}\n${promo.description || ''}\n${label ? `\n${label}` : ''}${dateLimite ? `\n📅 Valable jusqu'au ${format(parseISO(dateLimite), 'd MMMM yyyy', { locale: fr })}` : ''}\n\nConnectez-vous à votre espace client pour accepter ou refuser cette offre.\n\nCordialement,\nL'équipe`,
            });
            nbEmailsEnvoyes++;
          } catch (_) {}
        }
      }
      await base44.entities.Promotion.update(promo.id, {
        statut: 'Envoyée',
        date_validite: dateLimite || promo.date_validite || '',
        nb_envois: (promo.nb_envois || 0) + nbNouveaux,
      });
      toast({ title: `✅ Promotion envoyée à ${selected.size} client(s) (${nbEmailsEnvoyes} emails)` });
      setTimeout(() => onSent(), 3000);
    } catch (e) {
      toast({ title: '❌ Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const resetSelection = () => setSelected(new Set());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-lg">Envoyer la promotion</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{promo.titre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Progress steps */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            {[
              { num: 1, label: 'Paramétrage', icon: Calendar },
              { num: 2, label: 'Destinataires', icon: Users },
              { num: 3, label: 'Confirmation', icon: CheckCircle2 },
            ].map((step, idx) => (
              <div key={step.num} className="flex-1 flex flex-col items-center">
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  etape === step.num 
                    ? 'bg-primary text-white shadow-lg scale-105' 
                    : etape > step.num 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <step.icon size={16} />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
              style={{ width: `${((etape - 1) / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          
          {/* ÉTAPE 1 — Paramétrage */}
          {etape === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Cette offre expire le</label>
                <input 
                  type="date" 
                  value={dateLimite} 
                  onChange={e => setDateLimite(e.target.value)} 
                  className="mt-1 w-full px-3 py-2.5 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" 
                />
                <p className="text-xs text-muted-foreground mt-1.5">Laisser vide si pas de date limite</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Message personnalisé (optionnel)</label>
                <textarea 
                  value={messagePerso} 
                  onChange={e => setMessagePerso(e.target.value)} 
                  rows={4}
                  placeholder="ex: Bonjour ! Voici une offre exclusive pour votre mariage..."
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" 
                />
                <p className="text-xs text-muted-foreground mt-1">Ce message apparaîtra en haut de l'email envoyé aux clients</p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Aperçu de l'offre</p>
                <div className="flex items-start gap-3">
                  {promo.visuel_url && <img src={promo.visuel_url} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                  <div>
                    <p className="font-semibold text-sm">{promo.titre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {getPromoLabel(promo)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Destinataires */}
          {etape === 2 && (
            <div className="space-y-4">
              {/* Filtres */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Statut de l'événement</label>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {FILTRES_STATUT.map(f => (
                      <button key={f} onClick={() => { setFiltreStatut(f); resetSelection(); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          filtreStatut === f ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type d'événement</label>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {FILTRES_TYPE.map(f => (
                      <button key={f} onClick={() => { setFiltreType(f); resetSelection(); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          filtreType === f ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Période</label>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {FILTRES_PERIODE.map(f => (
                      <button key={f} onClick={() => { setFiltrePeriode(f); resetSelection(); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          filtrePeriode === f ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sélectionner tout */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-primary" />
                  Tout sélectionner ({filtered.length})
                </label>
                {selected.size > 0 && (
                  <span className="text-xs font-semibold text-primary">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                )}
              </div>

              {/* Liste clients */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">Aucun client ne correspond aux filtres</p>
                )}
                {filtered.map(c => (
                  <label key={c.evenementId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selected.has(c.evenementId) ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.evenementId)}
                      onChange={() => toggleOne(c.evenementId)}
                      className="w-4 h-4 accent-primary shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.clientNom || 'Client sans nom'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.typeEvenement}{c.typeEvenement && c.evenementNom ? ' · ' : ''}{c.evenementNom}
                        {c.date ? ` · ${format(parseISO(c.date), 'd MMM yyyy', { locale: fr })}` : ''}
                        {c.statut ? ` · ${c.statut}` : ''}
                      </p>
                      {!c.clientEmail && (
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">📱 In-app uniquement</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!c.clientEmail && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          📱
                        </span>
                      )}
                      {c.dejaRecu ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={10} /> Déjà reçu
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Nouveau
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Confirmation */}
          {etape === 3 && (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-medium text-primary mb-1">📊 Récapitulatif de l'envoi</p>
                <p className="text-2xl font-bold text-primary">{selected.size} clients</p>
                <div className="flex gap-3 mt-2 text-xs">
                  {nbNouveaux > 0 && (
                    <span className="text-emerald-600 font-medium">{nbNouveaux} nouveau{nbNouveaux > 1 ? 'x' : ''}</span>
                  )}
                  {nbRenvois > 0 && (
                    <span className="text-amber-600 font-medium">{nbRenvois} renvoi{nbRenvois > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {dateLimite && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">📅 Date limite</p>
                  <p className="text-sm font-semibold">{format(parseISO(dateLimite), 'EEEE d MMMM yyyy', { locale: fr })}</p>
                </div>
              )}

              {messagePerso && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">✉️ Message personnalisé</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{messagePerso}</p>
                </div>
              )}

              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">🎯 Promotion</p>
                <div className="flex items-start gap-3">
                  {promo.visuel_url && <img src={promo.visuel_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                  <div>
                    <p className="font-semibold text-sm">{promo.titre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {getPromoLabel(promo)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border shrink-0">
          {etape < 3 ? (
            <Button 
              onClick={() => setEtape(e => e + 1)} 
              size="lg"
              className="w-full h-12 text-base font-semibold gap-2"
            >
              Suivant <ChevronRight size={18} />
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setEtape(e => e - 1)} 
                className="h-12 px-6 text-sm font-medium"
              >
                <ChevronLeft size={16} /> Retour
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={selected.size === 0 || sending} 
                size="lg"
                className="flex-1 h-12 text-base font-semibold gap-2 bg-primary"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Confirmer l'envoi ({selected.size})
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}