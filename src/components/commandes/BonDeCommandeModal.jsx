import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Mail, Download, FileText, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

function calcQte(regle, nbAdultes, nbAdolescents, nbEnfants) {
  const raw = (regle.qte_adulte || 0) * nbAdultes
    + (regle.qte_adolescent || 0) * nbAdolescents
    + (regle.qte_enfant || 0) * nbEnfants;
  if (raw === 0) return 0;
  return regle.arrondi === 'inférieur' ? Math.floor(raw) : Math.ceil(raw);
}

export default function BonDeCommandeModal({ evenement, regles, fournisseurs, optionsValidees, onClose }) {
  const [regroupement, setRegroupement] = useState('fournisseur'); // 'fournisseur' | 'categorie' | 'les_deux'
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});

  const nbAdultes = evenement?.nb_adultes || evenement?.nb_invites || 0;
  const nbAdolescents = evenement?.nb_adolescents || 0;
  const nbEnfants = evenement?.nb_enfants || 0;

  // Options validées pour cet événement (IDs ou noms)
  const optionsValideesSet = useMemo(() => {
    if (!optionsValidees) return null; // null = toutes
    const ids = typeof optionsValidees === 'string'
      ? optionsValidees.split(',').map(s => s.trim())
      : optionsValidees;
    return new Set(ids);
  }, [optionsValidees]);

  // Regles filtrées selon les options validées
  const reglesActives = useMemo(() => {
    if (!optionsValideesSet) return regles;
    return regles.filter(r =>
      optionsValideesSet.has(r.option_prestation_id) || optionsValideesSet.has(r.option_prestation_nom)
    );
  }, [regles, optionsValideesSet]);

  // Calcul des bons par fournisseur — supporte multi-produits
  const bonsByFournisseur = useMemo(() => {
    const map = {};
    reglesActives.forEach(regle => {
      const fId = regle.fournisseur_id || regle.fournisseur_nom;
      const fourn = fournisseurs.find(f => f.id === fId) || { nom: regle.fournisseur_nom, email: '', mode_commande: 'email' };
      if (!map[fId]) map[fId] = { fournisseur: fourn, lignes: [] };

      if (regle.produits?.length > 0) {
        // Nouvelle structure multi-produits
        regle.produits.forEach(p => {
          let qte;
          if (p.mode_qte === 'fixe') {
            qte = parseFloat(p.qte_fixe) || 0;
          } else {
            const raw = (p.qte_adulte || 0) * nbAdultes
              + (p.qte_adolescent || 0) * nbAdolescents
              + (p.qte_enfant || 0) * nbEnfants;
            qte = p.arrondi === 'inférieur' ? Math.floor(raw) : Math.ceil(raw);
          }
          if (qte > 0) {
            map[fId].lignes.push({ nom: p.nom || regle.option_prestation_nom, qte, unite: p.unite, contexte: regle.option_prestation_nom });
          }
        });
      } else {
        // Legacy : un seul produit
        const qte = calcQte(regle, nbAdultes, nbAdolescents, nbEnfants);
        if (qte > 0) {
          map[fId].lignes.push({ nom: regle.option_prestation_nom, qte, unite: regle.unite, arrondi: regle.arrondi });
        }
      }
    });
    return Object.values(map).filter(b => b.lignes.length > 0);
  }, [reglesActives, nbAdultes, nbAdolescents, nbEnfants, fournisseurs]);

  const handleSendEmail = async (bon) => {
    if (!bon.fournisseur.email) return;
    setSending(s => ({ ...s, [bon.fournisseur.nom]: true }));
    try {
      const lignesText = bon.lignes.map(l => `• ${l.nom} : ${l.qte} ${l.unite}`).join('\n');
      await base44.integrations.Core.SendEmail({
        to: bon.fournisseur.email,
        subject: `Bon de commande — ${evenement?.nom || 'Événement'} (${evenement?.date || ''})`,
        body: `Bonjour,\n\nVoici le bon de commande pour l'événement "${evenement?.nom}" du ${evenement?.date} :\n\n${lignesText}\n\nMerci de confirmer la commande.\n\nCordialement`,
      });
      setSent(s => ({ ...s, [bon.fournisseur.nom]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setSending(s => ({ ...s, [bon.fournisseur.nom]: false }));
    }
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text(`Bons de commande — ${evenement?.nom || 'Événement'}`, 15, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Date : ${evenement?.date || ''} | Convives : ${nbAdultes} adultes, ${nbAdolescents} ados, ${nbEnfants} enfants`, 15, y); y += 12;

    bonsByFournisseur.forEach(bon => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(bon.fournisseur.nom, 15, y); y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      if (bon.fournisseur.email) { doc.text(`Email : ${bon.fournisseur.email}`, 15, y); y += 5; }
      bon.lignes.forEach(l => {
        doc.text(`  • ${l.nom} : ${l.qte} ${l.unite}`, 15, y); y += 5;
      });
      y += 6;
    });

    doc.save(`bons-commande-${evenement?.nom || 'evenement'}.pdf`);
  };

  const handleBonCreated = () => {
    alert('✓ Bons de commande créés avec succès ! Vous pouvez maintenant les envoyer par email ou exporter en PDF.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="font-semibold">Bons de commande</p>
            <p className="text-xs text-muted-foreground">{evenement?.nom} · {nbAdultes} adultes, {nbAdolescents} ados, {nbEnfants} enfants</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Regroupement */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Regroupement des bons</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { v: 'fournisseur', l: '🏪 Par fournisseur' },
                { v: 'categorie', l: '📦 Par catégorie' },
                { v: 'les_deux', l: '🗂️ Les deux' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setRegroupement(v)}
                  className={`text-sm px-4 py-2 rounded-xl border font-medium transition-colors ${
                    regroupement === v ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Aperçu des bons */}
          {bonsByFournisseur.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune règle de commande applicable pour cet événement.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bonsByFournisseur.map((bon, i) => (
                <div key={i} className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{bon.fournisseur.nom}</p>
                      {bon.fournisseur.email && (
                        <p className="text-xs text-muted-foreground">{bon.fournisseur.email}</p>
                      )}
                      {bon.fournisseur.mode_commande && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          bon.fournisseur.mode_commande === 'bon_de_commande' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {bon.fournisseur.mode_commande === 'email' ? '📧 Email' :
                           bon.fournisseur.mode_commande === 'téléphone' ? '📞 Téléphone' :
                           bon.fournisseur.mode_commande === 'bon_de_commande'
                             ? `📄 Bon${bon.fournisseur.bon_commande_usage === 'envoi_fournisseur' ? ' — envoi auto' : ' — usage interne'}`
                             : '🔗 Autre'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {bon.fournisseur.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          disabled={sending[bon.fournisseur.nom] || sent[bon.fournisseur.nom]}
                          onClick={() => handleSendEmail(bon)}
                        >
                          {sending[bon.fournisseur.nom] ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : sent[bon.fournisseur.nom] ? (
                            <Check size={11} className="text-emerald-500" />
                          ) : (
                            <Mail size={11} />
                          )}
                          {sent[bon.fournisseur.nom] ? 'Envoyé ✓' : 'Envoyer'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {bon.lignes.map((l, j) => (
                      <div key={j} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <div>
                          <span className="text-foreground">{l.nom}</span>
                          {l.contexte && l.contexte !== l.nom && (
                            <span className="ml-2 text-xs text-muted-foreground">({l.contexte})</span>
                          )}
                        </div>
                        <span className="font-semibold text-primary">{l.qte} {l.unite}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
         <div className="px-6 py-4 border-t border-border flex justify-between items-center gap-3 shrink-0">
           <Button variant="outline" className="gap-2" onClick={() => { handleExportPDF(); handleBonCreated(); }}>
             <Download size={15} /> Exporter en PDF
           </Button>
           <Button variant="outline" onClick={onClose}>Fermer</Button>
         </div>
      </div>
    </div>
  );
}