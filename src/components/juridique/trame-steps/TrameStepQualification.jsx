import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TypeEvenementMultiSelect from '@/components/bibliotheque/TypeEvenementMultiSelect';
import { inputCls, labelCls } from './trameConstants';

export default function TrameStepQualification({
  fields, setField, company, categorie, categorieLabel,
  addEcheance, removeEcheance, updateEcheance,
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nom du modèle *</label>
        <Input value={fields.NOM_MODELE} onChange={e => setField('NOM_MODELE', e.target.value)} placeholder="ex: Contrat mariage standard" autoComplete="off" autoCorrect="off" spellCheck={false} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Type(s) d'événement</label>
        <TypeEvenementMultiSelect
          value={fields.TYPE_EVENEMENT || []}
          onChange={(arr) => setField('TYPE_EVENEMENT', arr)}
        />
      </div>
      {company?.metier && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          Métier détecté : <strong>{company.metier}</strong>
          {categorieLabel && <> · Catégorie : <strong>{categorieLabel}</strong></>}
          {!categorie && <> · Aucun article spécifique au métier ne sera ajouté.</>}
        </div>
      )}

      {/* Qualification juridique */}
      <div className="border-t border-border pt-3 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualification juridique</p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type de client *</label>
          <select value={fields.TYPE_CLIENT} onChange={e => setField('TYPE_CLIENT', e.target.value)} className={inputCls}>
            <option value="particulier">Particulier (consommateur)</option>
            <option value="professionnel">Professionnel / Entreprise</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            Détermine les clauses de rétractation, de médiation et de pénalités applicables.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Mode de versement initial *</label>
          <select value={fields.MODE_VERSEMENT} onChange={e => setField('MODE_VERSEMENT', e.target.value)} className={inputCls}>
            <option value="arrhes">Arrhes (rétractation possible en perdant la somme)</option>
            <option value="acompte">Acompte (engagement ferme des deux parties)</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            Arrhes : le client peut se rétracter en perdant la somme versée ; le prestataire qui annule doit restituer le double.
            Acompte : engagement ferme des deux parties, aucune rétractation unilatérale.
          </p>
        </div>

        {/* Mode de tarification */}
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mode de tarification</p>
          <select value={fields.MODE_TARIFICATION} onChange={e => setField('MODE_TARIFICATION', e.target.value)} className={inputCls}>
            <option value="pourcentage">Pourcentage (acompte en % du montant)</option>
            <option value="echeancier">Échéancier à montants fixes</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            {fields.MODE_TARIFICATION === 'pourcentage'
              ? "Vous fixez le taux de TVA et le pourcentage d'acompte une fois pour toutes. Le montant HT sera saisi par client. Les montants dérivés (TVA, TTC, acompte, solde) sont calculés automatiquement."
              : "Vous définissez une liste d'échéances à montants fixes. Ces montants étant fixes, aucune variable n'est à remplir par client — le texte du contrat est généré directement avec les vraies valeurs."}
          </p>
        </div>

        {/* Base de calcul de l'acompte — Mode A uniquement */}
        {fields.MODE_TARIFICATION === 'pourcentage' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Base de calcul de l'acompte</label>
            <select value={fields.BASE_CALCUL_ACOMPTE} onChange={e => setField('BASE_CALCUL_ACOMPTE', e.target.value)} className={inputCls}>
              <option value="TTC">Sur le montant TTC (le plus courant)</option>
              <option value="HT">Sur le montant HT</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              L'acompte/les arrhes sont calculés sur le montant {fields.BASE_CALCUL_ACOMPTE === 'HT' ? 'HT' : 'TTC'}.
            </p>
          </div>
        )}

        {/* Echeancier builder — Mode B */}
        {fields.MODE_TARIFICATION === 'echeancier' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Échéances de paiement</p>
            {(fields.ECHEANCIER || []).map((ech, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={ech.libelle || ''}
                  onChange={e => updateEcheance(i, 'libelle', e.target.value)}
                  placeholder="Libellé (ex: Acompte à la réservation)"
                  className={inputCls}
                />
                <input
                  type="number"
                  value={ech.montant || ''}
                  onChange={e => updateEcheance(i, 'montant', e.target.value)}
                  placeholder="€"
                  className={`${inputCls} w-20 shrink-0`}
                />
                <input
                  type="text"
                  value={ech.delai || ''}
                  onChange={e => updateEcheance(i, 'delai', e.target.value)}
                  placeholder="Délai (ex: 4 mois avant)"
                  className={inputCls}
                />
                <button
                  onClick={() => removeEcheance(i)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addEcheance}
              className="text-xs font-medium text-primary hover:underline"
            >
              + Ajouter une échéance
            </button>
          </div>
        )}

        <div className="space-y-1.5 border-t border-border pt-3">
          <label className="text-sm font-medium">Prestation à date déterminée</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.DATE_DETERMINEE}
              onChange={e => setField('DATE_DETERMINEE', e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <span className="text-xs text-muted-foreground">
              L'événement est lié à une date fixe (mariage, anniversaire, séminaire…). Coché par défaut.
              Décocher uniquement pour une prestation sans date fixe (abonnement, prestation récurrente).
            </span>
          </label>
          {fields.TYPE_CLIENT === 'particulier' && (
            <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-1">
              {fields.DATE_DETERMINEE
                ? "✓ Une date déterminée déclenche l'exception au droit de rétractation (art. L221-28 du Code de la consommation). Le client n'aura pas de délai de 14 jours."
                : "⚠️ Sans date déterminée, le client particulier disposera d'un droit de rétractation de 14 jours."}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Droit à l'image</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.DROIT_IMAGE_AUTORISE}
              onChange={e => setField('DROIT_IMAGE_AUTORISE', e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <span className="text-xs text-muted-foreground">
              Autorisez-vous à utiliser des photos de cet événement pour votre communication (site, réseaux sociaux) ?
              Le client peut refuser, cela ne change rien à la prestation.
            </span>
          </label>
          {fields.DROIT_IMAGE_AUTORISE && (
            <div className="space-y-1 ml-6">
              <label className={labelCls}>Durée de l'autorisation (années)</label>
              <input type="number" value={fields.DUREE_DROIT_IMAGE} onChange={e => setField('DUREE_DROIT_IMAGE', e.target.value)} className={inputCls} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}