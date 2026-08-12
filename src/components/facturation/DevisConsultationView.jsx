import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Download, RefreshCw, Copy, Send, ArrowLeft, FileMinus, MoreVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { calculerTotaux } from './DevisTotaux';
import EcheancesPanel from './EcheancesPanel';
import { exportDevisPDF } from './exportDevisPDF';
import { DOCUMENT_STATUT_COLORS } from '@/constants/colors';
import DevisModal from './DevisModal';
import { getEmailTemplate, interpolateTemplate } from '@/lib/emailUtils';
import SuperPDPStatusBadge from './SuperPDPStatusBadge';
import SuperPDPTransmitButton from './SuperPDPTransmitButton';

// Affiche une ligne label / valeur en lecture seule
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

// Tableau des lignes en lecture seule
function LignesTable({ lignes, assujetti }) {
  if (!lignes?.length) return <p className="text-sm text-muted-foreground">Aucun article.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-semibold">Description</th>
            <th className="text-center px-3 py-2 text-xs font-semibold">Unité</th>
            <th className="text-center px-3 py-2 text-xs font-semibold">Qté</th>
            <th className="text-right px-3 py-2 text-xs font-semibold">PU {assujetti ? 'HT' : ''} (€)</th>
            {assujetti && <th className="text-right px-3 py-2 text-xs font-semibold">TVA %</th>}
            <th className="text-right px-3 py-2 text-xs font-semibold">Remise</th>
            <th className="text-right px-3 py-2 text-xs font-semibold">Total {assujetti ? 'HT' : ''} (€)</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            let montantRemise = 0;
            if (l.remise) {
              montantRemise = l.remise_type === 'pct'
                ? (l.quantite || 0) * (l.prix_unitaire_ht || 0) * (l.remise / 100)
                : l.remise;
            }
            const totalHT = (l.quantite || 0) * (l.prix_unitaire_ht || 0) - montantRemise;
            return (
              <tr key={l.id || i} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                <td className="px-3 py-2 text-sm">{l.description || '—'}</td>
                <td className="px-3 py-2 text-center text-xs text-muted-foreground">{l.unite || 'pers'}</td>
                <td className="px-3 py-2 text-center">{l.quantite ?? 0}</td>
                <td className="px-3 py-2 text-right">{(l.prix_unitaire_ht || 0).toFixed(2)}</td>
                {assujetti && <td className="px-3 py-2 text-right text-xs text-muted-foreground">{l.tva_taux ?? 20}%</td>}
                <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                  {montantRemise > 0 ? `-${montantRemise.toFixed(2)} €` : '—'}
                </td>
                <td className="px-3 py-2 text-right font-semibold">{totalHT.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Bloc totaux en lecture seule — aligné pleine largeur
function TotauxBlock({ devis, assujetti }) {
  const { totalHT, tvaMap, totalTVA, totalTTC } = calculerTotaux(
    devis.lignes || [],
    devis.remise_globale || 0,
    devis.remise_globale_type || 'pct'
  );

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-1.5 ml-auto">
        {assujetti && (
          <>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total HT</span>
              <span>{totalHT.toFixed(2)} €</span>
            </div>
            {Object.entries(tvaMap).map(([taux, montant]) => (
              <div key={taux} className="flex justify-between text-sm text-muted-foreground">
                <span>TVA {taux}%</span>
                <span>{montant.toFixed(2)} €</span>
              </div>
            ))}
          </>
        )}
        <div className="flex justify-between text-2xl font-bold border-t border-border pt-2 mt-2 text-primary">
          <span>TOTAL {assujetti ? 'TTC' : ''}</span>
          <span>{(assujetti ? totalTTC : totalHT).toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}

export default function DevisConsultationView({
  devis,
  company,
  onClose,
  onOuvreNouveauDevis,
  onOuvreEmailPreview,
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('document');
  const [relancing, setRelancing] = useState(false);
  const [showAvoirModal, setShowAvoirModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const assujetti = company?.assujetti_tva !== false;

  const updateStatutMutation = useMutation({
    mutationFn: (newStatut) => base44.entities.Devis.update(devis.id, { statut: newStatut }),
    onSuccess: () => {
      qc.invalidateQueries(['devis']);
      toast.success('✓ Statut mis à jour');
    },
    onError: () => toast.error('❌ Erreur lors de la mise à jour'),
  });

  const { data: echeances = [] } = useQuery({
    queryKey: ['echeances', devis.id],
    queryFn: () => base44.entities.Echeance.filter({ devis_id: devis.id }),
    enabled: !!devis.id,
  });

  const handleExport = async () => {
    setShowMenu(false);
    await exportDevisPDF({ devis, echeances, company });
  };

  const handleRelancer = () => {
    setShowMenu(false);
    if (!devis.client_email) { toast.error('Aucun email client renseigné.'); return; }
    const typeLabel = devis.type_document || 'Devis';
    const vars = {
      client_nom: devis.client_nom || '',
      client_email: devis.client_email,
      numero: devis.numero || '',
      type_document: typeLabel,
      lien_portail: '',
      company_name: company?.company_name || '',
      email_contact: company?.email_contact || '',
      telephone: company?.telephone || '',
      site_web: company?.site_web || '',
    };

    let subject, body;
    const template = getEmailTemplate(company, typeLabel);
    if (template) {
      subject = interpolateTemplate(`Rappel — ${template.subject}`, vars);
      body = interpolateTemplate(template.body, vars);
    } else {
      subject = `Rappel — ${typeLabel} ${devis.numero}`;
      body = `Bonjour ${devis.client_nom || ''},\n\nNous vous rappelons que votre ${typeLabel.toLowerCase()} ${devis.numero} est en attente de réponse.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement`;
    }

    onOuvreEmailPreview?.({ subject, body });
  };

  const handleDupliquer = () => {
    setShowMenu(false);
    onOuvreNouveauDevis?.(devis.id, 'duplicate');
  };

  // --- Calcul du CTA principal contextuel ---
  const TYPES_FACTURES = ["Facture", "Facture d'acompte", 'Facture intermédiaire', 'Solde'];
  const estFacture = TYPES_FACTURES.includes(devis.type_document);
  const estDevis = devis.type_document === 'Devis';
  const estVerrouille = (devis.statut === 'Envoyé' || devis.statut === 'Accepté');

  const peutAvoir = estFacture && estVerrouille;
  const peutConvertirFacture = estDevis && devis.statut === 'Accepté';
  const peutRelancer = devis.statut === 'Envoyé' && devis.client_email;
  const peutDupliquer = ['Refusé', 'Annulé'].includes(devis.statut);

  // Transitions manuelles disponibles : classique + Annulé depuis tout statut actif non terminal.
  // "Annulé" est terminal : aucune transition sortante n'est proposée.
  const transitionsStatut = estDevis ? {
    'Brouillon': ['Annulé'],
    'Envoyé': ['Accepté', 'Refusé', 'Annulé'],
    'Accepté': ['Annulé'],
    'Refusé': ['Envoyé', 'Annulé'],
  }[devis.statut] || [] : [];
  const transitionsDisponibles = transitionsStatut;

  // Détermine le CTA principal unique
  const ctaPrincipal = peutConvertirFacture
    ? { label: 'Convertir en facture', icon: RefreshCw, variant: 'default', action: () => onOuvreNouveauDevis?.(devis.id, 'Facture') }
    : peutAvoir
    ? { label: 'Créer un avoir', icon: FileMinus, variant: 'default', action: () => setShowAvoirModal(true), className: 'bg-orange-600 hover:bg-orange-700' }
    : peutRelancer
    ? { label: 'Relancer', icon: Send, variant: 'default', action: handleRelancer, className: 'bg-primary' }
    : null;

  const dateFormatee = (d) => {
    try { return d ? format(parseISO(d), 'd MMM yyyy', { locale: fr }) : null; } catch { return d; }
  };

  if (showAvoirModal) {
    return (
      <DevisModal
        initialTypeDocument="Avoir"
        clientNom={devis.client_nom}
        clientEmail={devis.client_email}
        clientTelephone={devis.client_telephone}
        evenementId={devis.evenement_id}
        onClose={() => setShowAvoirModal(false)}
        onSaved={() => { setShowAvoirModal(false); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-4 md:px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </button>

            {/* Titre + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm md:text-base">{devis.type_document || 'Document'}</p>
                <span className="font-mono text-xs text-muted-foreground">{devis.numero}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DOCUMENT_STATUT_COLORS[devis.statut] || 'bg-slate-100 text-slate-600'}`}>
                  {devis.statut}
                </span>
                <SuperPDPStatusBadge statut={devis.superpdp_statut} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{devis.client_nom}{devis.objet ? ` — ${devis.objet}` : ''}</p>
            </div>

            {/* CTA principal unique + transmission électronique + menu secondaire */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Transmission électronique SuperPDP — factures finalisées non encore transmises */}
              {estFacture && estVerrouille && !devis.est_pro_forma && !devis.superpdp_transmission_id && (
                <SuperPDPTransmitButton
                  devisId={devis.id}
                  onSuccess={() => qc.invalidateQueries(['devis'])}
                />
              )}
              {ctaPrincipal && (
                <Button
                  size="sm"
                  variant={ctaPrincipal.variant}
                  className={`gap-1.5 h-8 text-xs ${ctaPrincipal.className || ''}`}
                  onClick={ctaPrincipal.action}
                >
                  <ctaPrincipal.icon size={13} /> {ctaPrincipal.label}
                </Button>
              )}

              {/* Menu trois points : actions secondaires */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Plus d'actions"
                >
                  <MoreVertical size={16} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-9 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px]">
                      <button onClick={handleExport} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                        <Download size={14} className="text-muted-foreground" /> Télécharger PDF
                      </button>
                      {peutDupliquer && (
                        <button onClick={handleDupliquer} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                          <Copy size={14} className="text-muted-foreground" /> Dupliquer
                        </button>
                      )}
                      {estDevis && transitionsDisponibles.length > 0 && (
                        <div className="border-t border-border mt-1 pt-1">
                          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Changer le statut</p>
                          {transitionsDisponibles.map(s => (
                            <button
                              key={s}
                              onClick={() => {
                                if (s === 'Annulé') {
                                  if (!window.confirm('Annuler ce devis ? Cette action est rarement réversible.')) return;
                                }
                                updateStatutMutation.mutate(s);
                                setShowMenu(false);
                              }}
                              disabled={updateStatutMutation.isPending}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${s === 'Annulé' ? 'text-destructive' : ''}`}
                            >
                              <ChevronDown size={14} className="text-muted-foreground" /> {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border shrink-0">
          <button onClick={() => setTab('document')} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'document' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Document
          </button>
          {devis.id && (
            <button onClick={() => setTab('echeances')} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'echeances' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              Échéances
            </button>
          )}
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {tab === 'document' && (
            <>
              {/* Mention avoir */}
              {devis.facture_origine_numero && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-700 font-medium">
                  En annulation et remplacement de la facture <strong>{devis.facture_origine_numero}</strong>
                </div>
              )}

              {/* Bloc client + infos document — sans encadrés, empilement vertical */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
                  <p className="font-semibold text-sm">{devis.client_nom || '—'}</p>
                  {devis.client_email && <p className="text-sm text-muted-foreground">{devis.client_email}</p>}
                  {devis.client_telephone && <p className="text-sm text-muted-foreground">{devis.client_telephone}</p>}
                  {devis.client_adresse && <p className="text-sm text-muted-foreground">{devis.client_adresse}</p>}
                </div>

                {/* Infos document */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Informations</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <InfoRow label="Numéro" value={devis.numero} />
                    <InfoRow label="Date" value={dateFormatee(devis.date_devis)} />
                    {devis.date_validite && <InfoRow label="Validité" value={dateFormatee(devis.date_validite)} />}
                    {devis.date_prestation && <InfoRow label="Prestation" value={dateFormatee(devis.date_prestation)} />}
                    {devis.evenement_nom && <InfoRow label="Événement" value={devis.evenement_nom} />}
                    {devis.objet && <div className="col-span-2"><InfoRow label="Objet" value={devis.objet} /></div>}
                  </div>
                </div>
              </div>

              {/* Articles */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Articles & Prestations</p>
                <LignesTable lignes={devis.lignes} assujetti={assujetti} />
              </div>

              {/* Totaux */}
              <TotauxBlock devis={devis} assujetti={assujetti} />

              {/* Conditions de paiement — sans encadré */}
              {devis.conditions_paiement && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Conditions de paiement</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{devis.conditions_paiement}</p>
                </div>
              )}

              {/* Notes internes — sans encadré */}
              {devis.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes internes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{devis.notes}</p>
                </div>
              )}
            </>
          )}

          {tab === 'echeances' && (
            <EcheancesPanel
              devisId={devis.id}
              evenementId={devis.evenement_id}
              totalTTC={calculerTotaux(devis.lignes || [], devis.remise_globale || 0, devis.remise_globale_type || 'pct').totalTTC}
              disabled={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}