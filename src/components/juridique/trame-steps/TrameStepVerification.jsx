export default function TrameStepVerification({ fields, allClauses, blocA, blocB, categorieLabel }) {
  return (
    <div className="space-y-3">
      <div className="bg-muted/30 rounded-xl p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Articles inclus ({allClauses.length} total)
        </p>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Bloc universel ({blocA.length})</p>
          {blocA.map((c, i) => (
            <p key={c.id} className="text-xs text-muted-foreground pl-3">Art. {i + 1} — {c.titre}</p>
          ))}
        </div>
        {blocB.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium text-foreground">Bloc {categorieLabel} ({blocB.length})</p>
            {blocB.map((c, i) => (
              <p key={`${c.id}-${i}`} className="text-xs text-muted-foreground pl-3">Art. {blocA.length + i + 1} — {c.titre}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
          + bloc signature (prestataire / client)
        </p>
      </div>
      {/* Récap qualification */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1">
        <p className="font-semibold text-blue-900">Récapitulatif qualification</p>
        <p>• Type de client : <strong>{fields.TYPE_CLIENT === 'particulier' ? 'Particulier' : 'Professionnel'}</strong></p>
        <p>• Versement : <strong>{fields.MODE_VERSEMENT === 'acompte' ? 'Acompte' : 'Arrhes'}</strong></p>
        <p>• Tarification : <strong>{fields.MODE_TARIFICATION === 'echeancier' ? 'Échéancier fixe' : 'Pourcentage'}</strong></p>
        <p>• Date déterminée : <strong>{fields.DATE_DETERMINEE ? 'Oui' : 'Non'}</strong></p>
        <p>• Droit à l'image : <strong>{fields.DROIT_IMAGE_AUTORISE ? 'Autorisé' : 'Refusé'}</strong></p>
      </div>
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900">
        <p className="font-semibold mb-1">Modèle dynamique</p>
        <p>
          Ce modèle n'est pas encore un contrat prêt à envoyer. Quand vous créerez un contrat pour un client précis,
          l'app vous demandera les infos manquantes (nom du client, date, etc.) et générera automatiquement le PDF final.
        </p>
      </div>
    </div>
  );
}