/**
 * etapeIcons — Bibliothèque d'icônes intelligentes pour les étapes du programme.
 *
 * Associe automatiquement une icône lucide-react (outline, monochrome) à chaque
 * étape en fonction de son nom. Retourne une icône générique (Sparkles) si aucun
 * type n'est reconnu.
 *
 * Exporte également cleanEventName() pour supprimer la redondance du type
 * d'événement dans le nom (ex: "Mariage Jean & Marie" → "Jean & Marie").
 */
import {
  MapPin, Landmark, Church, Leaf, Wine, UtensilsCrossed,
  Camera, Music, Moon, BedDouble, Bus, Cake, Sparkles,
} from 'lucide-react';

const ICON_RULES = [
  { keywords: ['rendez-vous', 'rdv', 'point de rendez', 'accueil', 'arrivée', 'arrivee'], icon: MapPin },
  { keywords: ['cérémonie civile', 'ceremonie civile', 'mairie', 'civil'], icon: Landmark },
  { keywords: ['religieuse', 'église', 'eglise', 'messe', 'paroisse', 'temple'], icon: Church },
  { keywords: ['laïque', 'laic', 'profane'], icon: Leaf },
  { keywords: ['cocktail', "vin d'honneur", 'vinneur', 'apéritif', 'aperitif', 'vin dhonneur'], icon: Wine },
  { keywords: ['repas', 'dîner', 'diner', 'banquet', 'déjeuner', 'dejeuner', 'brunch', 'table'], icon: UtensilsCrossed },
  { keywords: ['photo', 'shooting', 'portrait', 'séance photo', 'seance photo', 'album'], icon: Camera },
  { keywords: ['danse', 'dansante', 'disco', 'piste', 'dj', 'soirée dansante'], icon: Music },
  { keywords: ['dessert', 'gâteau', 'gateau', 'wedding cake', 'pièce montée', 'piece montee'], icon: Cake },
  { keywords: ['hébergement', 'hebergement', 'chambre', 'hôtel', 'hotel', 'logement', 'dormir', 'nuitée', 'nuitee'], icon: BedDouble },
  { keywords: ['fin de soirée', 'fin de', 'départ', 'coucher', 'extinction'], icon: Moon },
  { keywords: ['navette', 'bus', 'transport', 'voiture'], icon: Bus },
];

export function getEtapeIcon(nom) {
  if (!nom) return Sparkles;
  const lower = nom.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.icon;
    }
  }
  return Sparkles;
}

/**
 * Supprime la redondance du type d'événement dans le nom.
 * Ex: "Mariage Marilyn & Elvis" + type "Mariage" → "Marilyn & Elvis"
 *     "Anniversaire de Jean" + type "Anniversaire" → "Jean"
 */
export function cleanEventName(nom, typeEvenement) {
  if (!nom) return nom;
  let cleaned = nom.trim();
  if (!typeEvenement) return cleaned;

  const typeLower = typeEvenement.toLowerCase();
  const cleanedLower = cleaned.toLowerCase();

  if (cleanedLower.startsWith(typeLower)) {
    cleaned = cleaned.substring(typeEvenement.length);
    // Strip leading separators and articles (de, du, d')
    cleaned = cleaned.replace(/^[\s\-:,]+/, '').replace(/^(de|du|d')\s+/i, '').trim();
  }

  return cleaned || nom;
}