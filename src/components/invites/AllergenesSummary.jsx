/**
 * AllergenesSummary — Synthèse nominative des allergènes pour le traiteur
 * Architecture plate : chaque invité est une personne indépendante
 * Props: invites (array)
 */

const ALLERGENE_META = {
  gluten:      { label: 'Gluten',         emoji: '🌾' },
  crustaces:   { label: 'Crustacés',      emoji: '🦐' },
  oeufs:       { label: 'Œufs',           emoji: '🥚' },
  poissons:    { label: 'Poissons',       emoji: '🐟' },
  arachides:   { label: 'Arachides',      emoji: '🥜' },
  soja:        { label: 'Soja',           emoji: '🫘' },
  lait:        { label: 'Lait',           emoji: '🥛' },
  fruits_coque:{ label: 'Fruits à coque', emoji: '🌰' },
  celeri:      { label: 'Céleri',         emoji: '🥬' },
  moutarde:    { label: 'Moutarde',       emoji: '🟡' },
  sesame:      { label: 'Sésame',         emoji: '✨' },
  sulfites:    { label: 'Sulfites',       emoji: '🍷' },
  lupin:       { label: 'Lupin',          emoji: '🌿' },
  mollusques:  { label: 'Mollusques',     emoji: '🦪' },
};

function getPersonnesParAllergene(invites) {
  const map = {};
  invites.forEach(invite => {
    const nom = `${invite.prenom} ${invite.nom}`;
    (invite.allergenes || []).forEach(alg => {
      if (!map[alg]) map[alg] = [];
      map[alg].push(nom);
    });
  });
  return map;
}

function getPersonnesAvecRegime(invites) {
  return invites
    .filter(i => i.regime_alimentaire?.trim())
    .map(i => ({ nom: `${i.prenom} ${i.nom}`, regime: i.regime_alimentaire }));
}

export default function AllergenesSummary({ invites = [] }) {
  const confirmes = invites.filter(i => i.statut_rsvp === 'Confirmé');
  const allergeneMap = getPersonnesParAllergene(confirmes);
  const regimes = getPersonnesAvecRegime(confirmes);
  const hasData = Object.keys(allergeneMap).length > 0 || regimes.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-3xl">✅</p>
        <p className="text-sm text-gray-400">Aucune allergie ni régime déclaré parmi les confirmés</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        Basé sur {confirmes.length} personne{confirmes.length > 1 ? 's' : ''} confirmée{confirmes.length > 1 ? 's' : ''}
      </p>

      {Object.entries(allergeneMap).map(([algId, personnes]) => {
        const meta = ALLERGENE_META[algId] || { label: algId, emoji: '⚠️' };
        return (
          <div key={algId} className="rounded-2xl border overflow-hidden" style={{ borderColor: '#fee2e2' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#fff1f2' }}>
              <span className="text-base">{meta.emoji}</span>
              <span className="font-semibold text-sm text-rose-800">{meta.label}</span>
              <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                {personnes.length} personne{personnes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-4 py-2 space-y-1 bg-white">
              {personnes.map((nom, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="text-gray-300">•</span>
                  <span className="font-medium">{nom}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {regimes.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#bfdbfe' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#eff6ff' }}>
            <span className="text-base">🍽️</span>
            <span className="font-semibold text-sm text-blue-800">Régimes spéciaux</span>
            <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              {regimes.length} personne{regimes.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="px-4 py-2 space-y-1 bg-white">
            {regimes.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                <span className="text-gray-300">•</span>
                <span className="font-medium">{r.nom}</span>
                <span className="text-gray-500">→ {r.regime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}