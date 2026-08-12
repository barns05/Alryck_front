/**
 * BlocInfosDecouverte — Affiche les champs CompanySettings en mode découverte.
 * Blocs conditionnels : Chiffres clés, Accueil, Équipements (limité + extension),
 * Tags style (visuellement distincts des équipements), Langues.
 * Chaque bloc ne s'affiche que si au moins un champ est renseigné.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getChampsSpecifiques, EQUIPEMENTS_EMOJIS, metierAAccueilEtEquipements, metierAutoriseDeplacement, getEquipementDisplayLabel } from '@/config/metierConfig';

const EQUIPEMENT_PREVIEW = 6;

const CHAMP_SPECIFIQUE_DISPLAY = {
  nb_photos_livrees: { emoji: '📸', label: 'Photos livrées', format: v => `${v} photos` },
  delai_livraison: { emoji: '⏱', label: 'Délai livraison', format: v => v },
  video_incluse: { emoji: '🎥', label: 'Vidéo', format: v => v ? 'Incluse' : null },
  type_musique: { emoji: '🎵', label: 'Style musical', format: v => v },
  materiel_inclus: { emoji: '🔊', label: 'Matériel', format: v => Array.isArray(v) ? v.join(', ') : v },
  style_floral: { emoji: '🌸', label: 'Style floral', format: v => v },
  prestations_florales: { emoji: '💐', label: 'Prestations', format: v => Array.isArray(v) ? v.join(', ') : v },
};

function ChiffreCle({ emoji, label, value, emphasis = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`shrink-0 ${emphasis ? 'text-lg' : 'text-base'}`}>{emoji}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">{label}</p>
        <p
          className={`leading-tight mt-0.5 truncate ${emphasis ? 'text-[15px] font-bold' : 'text-sm font-medium text-slate-700'}`}
          style={emphasis ? { color: '#1e1b4b' } : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function BlocInfosDecouverte({ vitrineData }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedTags, setExpandedTags] = useState(false);
  if (!vitrineData) return null;

  const chiffres = [];
  if (vitrineData.capacite_min != null && vitrineData.capacite_max != null) {
    chiffres.push({ emoji: '👥', label: 'Capacité', value: `${vitrineData.capacite_min} à ${vitrineData.capacite_max} invités` });
  } else if (vitrineData.capacite_max != null) {
    chiffres.push({ emoji: '👥', label: 'Capacité', value: `Jusqu'à ${vitrineData.capacite_max} invités` });
  } else if (vitrineData.capacite_min != null) {
    chiffres.push({ emoji: '👥', label: 'Capacité', value: `À partir de ${vitrineData.capacite_min} invités` });
  }
  // Localisation — critère de décision prioritaire : 1re ligne de la carte,
  // juste après Capacité, mise en valeur (emphasis = navy + gras + légèrement plus grand).
  const villeCp = [vitrineData.adresse_ville, vitrineData.adresse_code_postal].filter(Boolean).join(' ');
  if (villeCp) {
    chiffres.push({ emoji: '📍', label: 'Localisation', value: villeCp, emphasis: true });
  }
  if (vitrineData.tarif_a_partir_de != null) {
    chiffres.push({ emoji: '💰', label: 'Tarif', value: `À partir de ${vitrineData.tarif_a_partir_de}€` });
  }
  // Délai de réponse : non affiché sur la fiche découverte (donnée déclarative
  // non vérifiable). Champ conservé en base + éditable admin pour réutilisation
  // future (calcul réel basé sur les temps de réponse effectifs en messagerie).
  // Zone de déplacement — intégré à la carte chiffres (plus de pastille flottante).
  // Icône 🧳 (valise) distincte de l'équipement Parking 🚗 pour éviter la confusion visuelle.
  if (vitrineData.accueil_deplacement && metierAutoriseDeplacement(vitrineData?.metier)) {
    const zType = vitrineData.zone_deplacement_type;
    let deplValue = null;
    if (zType === 'rayon' && vitrineData.zone_deplacement_rayon_km != null && vitrineData.zone_deplacement_rayon_km !== '') {
      deplValue = `Rayon de ${vitrineData.zone_deplacement_rayon_km} km`;
    } else if (zType === 'departements' && Array.isArray(vitrineData.zone_deplacement_departements) && vitrineData.zone_deplacement_departements.length > 0) {
      deplValue = vitrineData.zone_deplacement_departements.join(', ');
    } else if (zType === 'region' && vitrineData.zone_deplacement_region) {
      deplValue = vitrineData.zone_deplacement_region;
    }
    chiffres.push({ emoji: '🧳', label: 'Déplacement', value: deplValue || 'Se déplace' });
  }
  // Accueil sur place — intégré à la carte chiffres (plus de pastille flottante).
  // Masqué pour les métiers Lieux/Traiteurs (l'adresse rend le badge redondant).
  const isLieuTraiteur = metierAAccueilEtEquipements(vitrineData?.metier);
  if (vitrineData.accueil_sur_place && !isLieuTraiteur) {
    chiffres.push({ emoji: '📍', label: 'Accueil', value: 'Sur place' });
  }
  if (vitrineData.hebergement === true) {
    chiffres.push({ emoji: '🏠', label: 'Hébergement', value: 'Disponible sur place' });
  }
  if (vitrineData.type_lieu) {
    chiffres.push({ emoji: '🏗️', label: 'Type de lieu', value: vitrineData.type_lieu });
  }

  // ─── Champs spécifiques au métier (hors champs communs déjà gérés ci-dessus) ──
  const champsSpecifiques = getChampsSpecifiques(vitrineData?.metier);
  for (const champ of champsSpecifiques) {
    const display = CHAMP_SPECIFIQUE_DISPLAY[champ];
    if (!display) continue;
    const raw = vitrineData[champ];
    if (raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)) continue;
    const formatted = display.format(raw);
    if (formatted) chiffres.push({ emoji: display.emoji, label: display.label, value: formatted });
  }

  // Points forts affichés en liste plate : prédéfinis (style_tags) + personnalisés (points_forts_personnalises)
  const styleTags = [
    ...(Array.isArray(vitrineData.style_tags) ? vitrineData.style_tags : []),
    ...(Array.isArray(vitrineData.points_forts_personnalises) ? vitrineData.points_forts_personnalises : []),
  ];
  const langues = vitrineData.langues_parlees?.length ? vitrineData.langues_parlees : [];
  const equipements = Array.isArray(vitrineData.equipements) ? vitrineData.equipements : [];

  if (chiffres.length === 0 && styleTags.length === 0 && langues.length === 0 && equipements.length === 0) return null;

  const reste = equipements.length - EQUIPEMENT_PREVIEW;
  const equipementsVisibles = equipements.slice(0, EQUIPEMENT_PREVIEW);
  const equipementsRestants = equipements.slice(EQUIPEMENT_PREVIEW);

  // Points forts : même logique de troncature que les équipements (même seuil)
  const resteTags = styleTags.length - EQUIPEMENT_PREVIEW;
  const tagsVisibles = styleTags.slice(0, EQUIPEMENT_PREVIEW);
  const tagsRestants = styleTags.slice(EQUIPEMENT_PREVIEW);

  return (
    <div className="space-y-3">
      {chiffres.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {chiffres.map((c, i) => (
              <ChiffreCle key={i} emoji={c.emoji} label={c.label} value={c.value} emphasis={c.emphasis} />
            ))}
          </div>
        </div>
      )}

      {equipements.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">Équipements</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {equipementsVisibles.map((eq, i) => {
              const emoji = EQUIPEMENTS_EMOJIS[eq] || EQUIPEMENTS_EMOJIS.__default;
              return (
                <div key={i} className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] leading-none shrink-0">{emoji}</span>
                  <span className="text-xs text-slate-700 truncate">{getEquipementDisplayLabel(eq)}</span>
                </div>
              );
            })}
            <AnimatePresence initial={false}>
              {expanded && equipementsRestants.map((eq, i) => {
                const emoji = EQUIPEMENTS_EMOJIS[eq] || EQUIPEMENTS_EMOJIS.__default;
                return (
                  <motion.div
                    key={`extra-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex items-center gap-2 min-w-0"
                  >
                    <span className="text-[13px] leading-none shrink-0">{emoji}</span>
                    <span className="text-xs text-slate-700 truncate">{getEquipementDisplayLabel(eq)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {reste > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs font-semibold text-primary hover:underline mt-1"
            >
              {expanded ? 'Réduire ▲' : `+ ${reste} autres équipements ▼`}
            </button>
          )}
        </div>
      )}

      {styleTags.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">Points forts</p>
          <div className="flex gap-1.5 flex-wrap">
            {tagsVisibles.map((tag, i) => (
              <span
                key={i}
                className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs italic font-semibold whitespace-nowrap"
                style={{ background: '#FDF6E3', color: '#7a5f1a', border: '1px solid rgba(197,160,89,0.42)' }}
              >
                {tag}
              </span>
            ))}
            <AnimatePresence initial={false}>
              {expandedTags && tagsRestants.map((tag, i) => (
                <motion.span
                  key={`tag-extra-${i}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs italic font-semibold whitespace-nowrap"
                  style={{ background: '#FDF6E3', color: '#7a5f1a', border: '1px solid rgba(197,160,89,0.42)' }}
                >
                  {tag}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          {resteTags > 0 && (
            <button
              onClick={() => setExpandedTags(v => !v)}
              className="text-xs font-semibold text-primary hover:underline mt-1"
            >
              {expandedTags ? 'Réduire ▲' : `+ ${resteTags} autres ▾`}
            </button>
          )}
        </div>
      )}

      {langues.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-base">🗣️</span>
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-500">Langues : </span>
            {langues.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}