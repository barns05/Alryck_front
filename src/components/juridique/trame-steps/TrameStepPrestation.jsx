import { inputCls, labelCls } from './trameConstants';

export default function TrameStepPrestation({ fields, setField }) {
  const isPourcentage = fields.MODE_TARIFICATION === 'pourcentage';

  return (
    <div className="space-y-4">
      {isPourcentage && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'MONTANT_HT', label: 'Montant HT (€)', type: 'number' },
              { key: 'TAUX_TVA', label: 'Taux TVA (%)', type: 'number' },
              { key: 'POURCENTAGE_ACOMPTE', label: 'Acompte/arrhes (%)', type: 'number' },
            ].map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <label className={labelCls}>{label}</label>
                <input type={type} value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
              </div>
            ))}
          </div>
          {/* Montants calculés — Mode A uniquement */}
          {(() => {
            const ht = parseFloat(fields.MONTANT_HT) || 0;
            const tvaRate = parseFloat(fields.TAUX_TVA) || 0;
            const tva = ht * tvaRate / 100;
            const ttc = ht + tva;
            const pct = parseFloat(fields.POURCENTAGE_ACOMPTE) || 0;
            const baseAcompte = fields.BASE_CALCUL_ACOMPTE === 'HT' ? ht : ttc;
            const calc = {
              MONTANT_TVA: tva.toFixed(2),
              MONTANT_TTC: ttc.toFixed(2),
              MONTANT_ACOMPTE: (baseAcompte * pct / 100).toFixed(2),
              MONTANT_SOLDE: (ttc - baseAcompte * pct / 100).toFixed(2),
            };
            return (
              <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-3">
                {[
                  { key: 'MONTANT_TVA', label: 'TVA calculée (€)' },
                  { key: 'MONTANT_TTC', label: 'Total TTC (€)' },
                  { key: 'MONTANT_ACOMPTE', label: 'Acompte/arrhes (€)' },
                  { key: 'MONTANT_SOLDE', label: 'Solde (€)' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className={labelCls}>{label}</label>
                    <input type="text" readOnly value={calc[key] || '—'} className={`${inputCls} bg-white text-muted-foreground`} />
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
      <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2">
        {fields.MODE_TARIFICATION === 'echeancier'
          ? "ℹ️ Le mode échéancier génère directement les montants fixes dans le texte du contrat. Les informations client (nom, adresse, lieu, date) seront saisies au moment de créer un contrat client depuis ce modèle."
          : "ℹ️ Le montant HT sera saisi par client. Le taux de TVA et le pourcentage d'acompte sont fixes (politique du prestataire). Les informations client (nom, adresse, lieu, date) seront saisies au moment de créer un contrat client depuis ce modèle."}
      </p>
    </div>
  );
}