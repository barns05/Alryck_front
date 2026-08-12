import { useState } from 'react';

export function calcLigneHT(ligne) {
  const brut = (ligne.quantite || 0) * (ligne.prix_unitaire_ht || 0);
  if (ligne.remise_type === 'pct') return brut * (1 - (ligne.remise || 0) / 100);
  if (ligne.remise_type === 'fixe') return Math.max(0, brut - (ligne.remise || 0));
  return brut;
}

export function calculerTotaux(lignes, remiseGlobale = 0, remiseGlobaleType = 'pct') {
  let sousTotalHT = 0;
  const tvaMap = {};

  lignes.forEach(l => {
    const ht = calcLigneHT(l);
    sousTotalHT += ht;
    const taux = l.tva_taux ?? 20;
    tvaMap[taux] = (tvaMap[taux] || 0) + ht * (taux / 100);
  });

  let montantRemiseGlobale = 0;
  if (remiseGlobaleType === 'pct') {
    montantRemiseGlobale = sousTotalHT * (remiseGlobale / 100);
  } else {
    montantRemiseGlobale = Math.min(remiseGlobale, sousTotalHT);
  }

  const ratio = sousTotalHT > 0 ? (sousTotalHT - montantRemiseGlobale) / sousTotalHT : 1;
  const totalHT = sousTotalHT - montantRemiseGlobale;

  const tvaMapAjuste = {};
  Object.entries(tvaMap).forEach(([taux, montant]) => {
    tvaMapAjuste[taux] = montant * ratio;
  });

  const totalTVA = Object.values(tvaMapAjuste).reduce((a, b) => a + b, 0);
  const totalTTC = totalHT + totalTVA;

  return { sousTotalHT, montantRemiseGlobale, totalHT, totalTVA, tvaMap: tvaMapAjuste, totalTTC };
}

import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

export default function DevisTotaux({ lignes, remiseGlobale = 0, remiseGlobaleType = 'pct', onRemiseChange, modeSaisie = 'ht' }) {
  const { settings } = useOwnerCompanySettings();
  const assujetti = settings?.assujetti_tva !== false;
  const { sousTotalHT, montantRemiseGlobale, totalHT, tvaMap, totalTVA, totalTTC } = calculerTotaux(lignes, remiseGlobale, remiseGlobaleType);
  const isTTC = modeSaisie === 'ttc';
  const [showRemise, setShowRemise] = useState((remiseGlobale || 0) > 0);

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-1.5 ml-auto">

        {/* Remise globale dépliable */}
        {showRemise ? (
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground shrink-0">Remise globale</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={remiseGlobale || ''}
                onChange={e => onRemiseChange?.('remise_globale', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="h-7 w-20 rounded border border-input bg-background px-2 text-sm text-right"
              />
              <select
                value={remiseGlobaleType}
                onChange={e => onRemiseChange?.('remise_globale_type', e.target.value)}
                className="h-7 rounded border border-input bg-background px-1 text-sm"
              >
                <option value="pct">%</option>
                <option value="fixe">€</option>
              </select>
              <button
                onClick={() => { setShowRemise(false); onRemiseChange?.('remise_globale', 0); }}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="Retirer la remise"
              >✕</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowRemise(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors pb-1"
          >
            + Remise globale
          </button>
        )}

        {montantRemiseGlobale > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Remise appliquée</span>
            <span>- {montantRemiseGlobale.toFixed(2)} €</span>
          </div>
        )}

        {!assujetti ? (
          <div className="flex justify-between text-2xl font-bold pt-2 border-t border-border mt-2">
            <span>Total</span>
            <span className="text-primary">{totalHT.toFixed(2)} €</span>
          </div>
        ) : isTTC ? (
          <>
            <div className="flex justify-between text-2xl font-bold pt-2 border-t border-border mt-2">
              <span>Total TTC</span>
              <span className="text-primary">{totalTTC.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Dont TVA</span>
              <span>{totalTVA.toFixed(2)} €</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-sm pt-1">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="font-medium">{sousTotalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-medium">{totalHT.toFixed(2)} €</span>
            </div>
            {Object.entries(tvaMap).map(([taux, montant]) => (
              <div key={taux} className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA {taux}%</span>
                <span className="font-medium">{montant.toFixed(2)} €</span>
              </div>
            ))}
            <div className="flex justify-between text-2xl font-bold pt-2 border-t border-border mt-2">
              <span>Total TTC</span>
              <span className="text-primary">{totalTTC.toFixed(2)} €</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}