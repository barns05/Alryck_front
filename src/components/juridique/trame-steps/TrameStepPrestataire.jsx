import { useState } from 'react';
import { Info } from 'lucide-react';
import { inputCls, labelCls } from './trameConstants';

export default function TrameStepPrestataire({ fields, setField }) {
  const [showMediateurInfo, setShowMediateurInfo] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2.5">
        ℹ️ Ces informations sont pré-remplies depuis vos paramètres entreprise. Vous pouvez les ajuster pour ce modèle.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'NOM_ENTREPRISE', label: "Nom de l'entreprise" },
          { key: 'SIRET', label: 'SIRET' },
          { key: 'ADRESSE_ENTREPRISE', label: 'Adresse du siège' },
          { key: 'ADRESSE_VILLE', label: 'Code postal + Ville' },
          { key: 'EMAIL_ENTREPRISE', label: 'Email' },
          { key: 'TELEPHONE_ENTREPRISE', label: 'Téléphone' },
          { key: 'REFERENT_PRESTATAIRE', label: 'Référent prestataire' },
          { key: 'TELEPHONE_REFERENT_PRESTATAIRE', label: 'Tél. référent' },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <label className={labelCls}>{label}</label>
            <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
          </div>
        ))}
      </div>
      {/* Options avancées (repliable) */}
      <details className="border-t border-border pt-3">
        <summary className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
          Informations complémentaires (optionnel)
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[
            { key: 'FORME_JURIDIQUE', label: 'Forme juridique' },
            { key: 'NOM_ASSUREUR', label: "Nom de l'assureur RC Pro" },
            { key: 'NUMERO_POLICE', label: 'N° de police assurance' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className={labelCls}>{label}</label>
              <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} autoComplete="off" />
            </div>
          ))}
        </div>
        {fields.TYPE_CLIENT === 'particulier' && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Médiateur de la consommation (B2C)</p>
              <button
                type="button"
                onClick={() => setShowMediateurInfo(v => !v)}
                className="p-0.5 rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
                aria-label="Plus d'informations sur le médiateur de la consommation"
              >
                <Info size={14} />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2">
              Un médiateur est un organisme indépendant que votre client peut saisir gratuitement en cas de litige avec vous, avant d'aller au tribunal. C'est obligatoire de lui indiquer ses coordonnées si votre client est un particulier. Vous pouvez chercher « médiateur de la consommation » + votre secteur d'activité pour en trouver un, ou laisser vide pour l'instant et compléter plus tard.
            </p>
            {showMediateurInfo && (
              <p className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2.5 leading-relaxed">
                Depuis 2015, tout professionnel qui vend à des particuliers doit leur donner accès gratuitement à un médiateur de la consommation en cas de litige, avant un éventuel passage au tribunal. Cela implique deux obligations : désigner un médiateur agréé (inscrit sur la liste officielle de la CECMC) avec lequel vous avez signé une convention, et indiquer ses coordonnées de manière visible dans vos contrats. L'absence de médiateur désigné peut entraîner une amende administrative allant jusqu'à 15 000€, et l'oubli de la mention jusqu'à 3 000€. En pratique, cela ne change rien à votre activité au quotidien — le médiateur n'intervient qu'en cas de litige réel. Pour trouver un médiateur agréé, recherchez « médiateur de la consommation agréé CECMC » — plusieurs organismes généralistes acceptent les professionnels de tous secteurs moyennant une cotisation annuelle modeste. Vous pouvez laisser ces champs vides pour l'instant et les compléter dès que vous aurez choisi un médiateur.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Nom du médiateur</label>
                <input type="text" value={fields.NOM_MEDIATEUR} onChange={e => setField('NOM_MEDIATEUR', e.target.value)} className={inputCls} placeholder="ex: Médiation de la consommation" autoComplete="off" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Adresse du médiateur</label>
                <input type="text" value={fields.ADRESSE_MEDIATEUR} onChange={e => setField('ADRESSE_MEDIATEUR', e.target.value)} className={inputCls} placeholder="ex: 3 place de Fontenoy, 75007 Paris" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className={labelCls}>Site web du médiateur</label>
                <input type="text" value={fields.SITE_MEDIATEUR} onChange={e => setField('SITE_MEDIATEUR', e.target.value)} className={inputCls} placeholder="ex: www.mediationconso-ame.com" />
              </div>
            </div>
          </div>
        )}
      </details>
    </div>
  );
}