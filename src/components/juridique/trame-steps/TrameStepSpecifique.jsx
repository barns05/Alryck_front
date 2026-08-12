import { inputCls, textareaCls, labelCls } from './trameConstants';

export default function TrameStepSpecifique({ fields, setField, categorie }) {
  if (!categorie) return null;

  if (categorie === 'lieux_traiteurs') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'DELAI_VALIDATION_MENU', label: 'Délai validation menu (jours)' },
            { key: 'CAPACITE_MAX_ERP', label: 'Capacité max ERP (pers.)' },
            { key: 'CAPACITE_MAX_ASSIS', label: 'Capacité max assise (pers.)' },
            { key: 'CAPACITE_MAX_DEBOUT', label: 'Capacité max debout (pers.)' },
            { key: 'DELAI_RESTITUTION_CAUTION', label: 'Délai restitution caution (jours)' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className={labelCls}>{label}</label>
              <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
            </div>
          ))}
        </div>
        <div className="col-span-2 space-y-1">
          <label className={labelCls}>Mobilier et équipements fournis</label>
          <textarea value={fields.MOBILIER_FOURNI} onChange={e => setField('MOBILIER_FOURNI', e.target.value)} rows={2} className={textareaCls} />
        </div>
        <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2">
          ℹ️ Les champs variables (horaires d'installation, tarif heure supp, caution, stationnement, accès veille…)
          restent comme balises {'{{CHAMP}}'} dans le modèle, à remplir lors de la création d'un contrat client.
        </p>
        <details className="border-t border-border pt-2">
          <summary className="text-[11px] font-semibold uppercase text-muted-foreground cursor-pointer select-none">
            Options avancées (besoins techniques, matériel)
          </summary>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { key: 'BESOIN_ELECTRICITE', label: 'Besoin électrique' },
              { key: 'BESOIN_ESPACE', label: 'Besoin espace' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className={labelCls}>{label}</label>
                <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Conditions d'accès</label>
              <input type="text" value={fields.CONDITIONS_ACCES} onChange={e => setField('CONDITIONS_ACCES', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Matériel prêté/loué (détail)</label>
              <textarea value={fields.MATERIEL_PRETE_DETAIL} onChange={e => setField('MATERIEL_PRETE_DETAIL', e.target.value)} rows={2} className={textareaCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Dépôt garantie matériel (€)</label>
              <input type="text" value={fields.DEPOT_GARANTIE_MATERIEL} onChange={e => setField('DEPOT_GARANTIE_MATERIEL', e.target.value)} className={inputCls} />
            </div>
          </div>
        </details>
      </div>
    );
  }

  if (categorie === 'image_son_deco') {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <label className={labelCls}>Détail de la cession de droits</label>
          <textarea value={fields.CESSION_DROITS_DETAIL} onChange={e => setField('CESSION_DROITS_DETAIL', e.target.value)} rows={3} className={textareaCls} placeholder="ex: Cession des droits de reproduction et de représentation pour usage privé" />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Usage cédé</label>
          <input type="text" value={fields.USAGE_CEDE} onChange={e => setField('USAGE_CEDE', e.target.value)} className={inputCls} placeholder="ex: tirages photo, album, diffusion familiale" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'DUREE_CONSERVATION_FICHIERS', label: 'Conservation fichiers (mois)' },
            { key: 'NOMBRE_RETOUCHES_INCLUSES', label: 'Retouches incluses (nb)' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className={labelCls}>{label}</label>
              <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Conditions de repas prestataire</label>
          <textarea value={fields.DETAILS_REPAS_PRESTATAIRE} onChange={e => setField('DETAILS_REPAS_PRESTATAIRE', e.target.value)} rows={2} className={textareaCls} />
        </div>
        <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2">
          ℹ️ Les champs variables (délai de livraison, tarif retouche supp, dépôt garantie…)
          restent comme balises {'{{CHAMP}}'} dans le modèle.
        </p>
        <details className="border-t border-border pt-2">
          <summary className="text-[11px] font-semibold uppercase text-muted-foreground cursor-pointer select-none">
            Options avancées (besoins techniques, matériel)
          </summary>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { key: 'BESOIN_ELECTRICITE', label: 'Besoin électrique' },
              { key: 'BESOIN_ESPACE', label: 'Besoin espace' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className={labelCls}>{label}</label>
                <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Conditions d'accès</label>
              <input type="text" value={fields.CONDITIONS_ACCES} onChange={e => setField('CONDITIONS_ACCES', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Matériel prêté/loué (détail)</label>
              <textarea value={fields.MATERIEL_PRETE_DETAIL} onChange={e => setField('MATERIEL_PRETE_DETAIL', e.target.value)} rows={2} className={textareaCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Dépôt garantie matériel (€)</label>
              <input type="text" value={fields.DEPOT_GARANTIE_MATERIEL} onChange={e => setField('DEPOT_GARANTIE_MATERIEL', e.target.value)} className={inputCls} />
            </div>
          </div>
        </details>
      </div>
    );
  }

  if (categorie === 'beaute_securite') {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <label className={labelCls}>Conditions spécifiques au métier</label>
          <textarea value={fields.CONDITIONS_SPECIFIQUES_METIER} onChange={e => setField('CONDITIONS_SPECIFIQUES_METIER', e.target.value)} rows={3} className={textareaCls} placeholder="ex: Déplacement à domicile, produits utilisés, durée" />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Détails sécurité / conformité</label>
          <textarea value={fields.DETAILS_SECURITE} onChange={e => setField('DETAILS_SECURITE', e.target.value)} rows={2} className={textareaCls} placeholder="ex: Agents habilités, agrément CNAPS" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'NUMERO_CNAPS', label: 'N° CNAPS' },
            { key: 'EFFECTIF_AGENTS', label: "Effectif d'agents" },
            { key: 'PERIMETRE_MISSION_SECURITE', label: 'Périmètre de mission' },
            { key: 'TEMPS_ATTENTE_INCLUS', label: 'Temps attente inclus (min)' },
            { key: 'DELAI_TOLERANCE_RETARD', label: 'Tolérance retard (min)' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className={labelCls}>{label}</label>
              <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg p-2">
          ℹ️ Les champs variables (tarifs attente, barème frais supp…)
          restent comme balises {'{{CHAMP}}'} dans le modèle.
        </p>
        <details className="border-t border-border pt-2">
          <summary className="text-[11px] font-semibold uppercase text-muted-foreground cursor-pointer select-none">
            Options avancées (habilitation, besoins techniques)
          </summary>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1">
              <label className={labelCls}>Habilitation spécifique</label>
              <input type="text" value={fields.HABILITATION_SPECIFIQUE} onChange={e => setField('HABILITATION_SPECIFIQUE', e.target.value)} className={inputCls} />
            </div>
            {[
              { key: 'BESOIN_ELECTRICITE', label: 'Besoin électrique' },
              { key: 'BESOIN_ESPACE', label: 'Besoin espace' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className={labelCls}>{label}</label>
                <input type="text" value={fields[key]} onChange={e => setField(key, e.target.value)} className={inputCls} />
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <label className={labelCls}>Conditions d'accès</label>
              <input type="text" value={fields.CONDITIONS_ACCES} onChange={e => setField('CONDITIONS_ACCES', e.target.value)} className={inputCls} />
            </div>
          </div>
        </details>
      </div>
    );
  }

  return null;
}