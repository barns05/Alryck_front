/**
 * AnnuaireTab — Onglet 🔍 Recherche : annuaire géolocalisé des prestataires.
 *
 * Accès : déverrouillé uniquement quand un prestataire initiateur est Confirmé
 * sur l'événement du client (EvenementPrestataire.initiateur === true && statut === 'Confirmé').
 *
 * Centre géographique = coordonnées du prestataire initiateur (le lieu confirmé ≈ localisation de l'événement).
 * Filtres : Métier (toujours visible) + Zone (rayon autour du centre, ajustable) + filtres avancés repliés
 *   (équipements, points forts, budget, capacité).
 * Matching géo : Haversine(centre, prestataire) comparé au rayon client ; couverture prestataire
 *   (zone_deplacement_rayon_km si rayon, départements sinon, région lenient en attendant le géocodage).
 * Affichage : liste (défaut) ou carte Leaflet (bascule). Recommandés en premier (badge « Recommandé par X »).
 * Ouverture fiche : VitrineProfil mode_decouverte, même parcours « Confirmer la mise en relation ».
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ArrowLeft,
  MapPin,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Lock,
  X,
  LocateFixed,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import VitrineProfil from '@/components/vitrine/VitrineProfil';
import AnnuaireMap from './AnnuaireMap';
import PrestataireCard from './PrestataireCard';
import ConfirmRelationModal from './ConfirmRelationModal';
import { Input } from '@/components/ui/input';
import { haversineKm } from '@/lib/geocodeAddress';
import { REGIONS, DEPARTEMENTS } from '@/lib/geoZone';
import { getCommunesByDept } from '@/lib/communesReference';
import {
  getMetierConfig,
  getDomaineFromMetier,
  getPointsFortsCategories,
} from '@/config/metierConfig';
import MetierPickerModal from './MetierPickerModal';
import TypePickerModal from './TypePickerModal';


function metierFilterLabel(f) {
  if (f === 'groupe:Lieux et réception') return 'Lieux de réception';
  return f;
}
function metierFilterIcon(f) {
  if (f === 'groupe:Lieux et réception') return '🏛️';
  return getMetierConfig(f).icone_defaut;
}

// Groupes bénéficiant d'un filtre « Type » dédié (visible directement sous le
// champ métier). Mapping groupe → titre de catégorie Points forts.
const TYPE_FILTER_BY_GROUP = {
  'Lieux et réception': 'Type de bâtisse',
  'Restauration et traiteur': 'Type de cuisine',
  'Musique et animation': 'Répertoire',
};

function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}
// Code département (2 chiffres métropole, 3 pour DOM 97x) à partir du code postal.
function csDept(cs) {
  const cp = String(cs.adresse_code_postal || '');
  if (!/^\d{5}$/.test(cp)) return null;
  return cp.startsWith('97') ? cp.slice(0, 3) : cp.slice(0, 2);
}

export default function AnnuaireTab({ evenementId, evenementNom, evenement, clientNom }) {
  const qc = useQueryClient();
  const [view, setView] = useState('liste');
  const [metierFilter, setMetierFilter] = useState('all');
  const [zoneRadiusKm, setZoneRadiusKm] = useState(50);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selEquipements, setSelEquipements] = useState([]);
  const [selPointsForts, setSelPointsForts] = useState([]);
  const [selTypes, setSelTypes] = useState([]);
  const [budgetMax, setBudgetMax] = useState('');
  const [capaciteValeur, setCapaciteValeur] = useState('');    // nb d'invités pour le filtre capacité (pré-rempli depuis l'événement)
  const [capaciteFilterOn, setCapaciteFilterOn] = useState(true); // filtre capacité actif par défaut
  const [profilOuvert, setProfilOuvert] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [metierPickerOpen, setMetierPickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  // Cascade de localisation (sélecteurs natifs) + « Autour de moi » (géoloc indépendante)
  const [selRegion, setSelRegion] = useState('all');   // 'all' = Toutes régions
  const [selDept, setSelDept] = useState('all');        // 'all' = Tous départements
  const [selVille, setSelVille] = useState('all');      // 'all' = Toutes les villes du département
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [villeLibre, setVilleLibre] = useState('');
  const [villeRayonKm, setVilleRayonKm] = useState(20);
  const eventRegionInit = useRef(false);
  const capaciteInitRef = useRef(false);

  const { data: evPrestataires = [] } = useQuery({
    queryKey: ['ev-prestataires-annuaire', evenementId],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });
  const { data: allCompanySettings = [] } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  // ── Déverrouillage : initiateur Confirmé OU événement auto-créé par le client ──
  // - Événement créé par le client (cree_par_client) : annuaire déverrouillé immédiatement,
  //   le client découvre la plateforme seul et doit pouvoir chercher un prestataire directement.
  // - Événement créé côté admin/prestataire (flux classique) : règle inchangée, initiateur Confirmé requis.
  const initiateur =
    evPrestataires.find((ep) => ep.initiateur === true && ep.statut === 'Confirmé') || null;
  const unlocked = evenement?.cree_par_client === true || !!initiateur;

  // Pré-remplir la région avec celle du prestataire initiateur (lieu de l'événement),
  // une seule fois au chargement des données.
  useEffect(() => {
    if (eventRegionInit.current || !allCompanySettings.length || !initiateur) return;
    const cs = allCompanySettings.find((c) => c.prestataire_id === initiateur.prestataire_id);
    const d = csDept(cs || {});
    if (!d) return;
    const reg = Object.entries(REGIONS).find(([, codes]) => codes.includes(d));
    if (reg) {
      setSelRegion(reg[0]);
      eventRegionInit.current = true;
    }
  }, [allCompanySettings, initiateur]);

  // Pré-remplir le filtre Capacité avec le nb_invites de l'événement (une seule fois,
  // dès que l'événement est disponible). Le client peut ensuite ajuster la valeur.
  useEffect(() => {
    if (capaciteInitRef.current) return;
    if (evenement?.nb_invites != null && evenement.nb_invites > 0) {
      setCapaciteValeur(String(evenement.nb_invites));
      setCapaciteFilterOn(true);
      capaciteInitRef.current = true;
    }
  }, [evenement?.nb_invites]);

  // Départements proposés : ceux de la région sélectionnée, ou toute la France
  // (métropole + DOM à la fin) en « Toutes régions ».
  const deptOptions = useMemo(() => {
    if (selRegion === 'all') {
      const dom = ['971', '972', '973', '974', '976'];
      const metro = Object.entries(DEPARTEMENTS).filter(([c]) => !dom.includes(c));
      const domEntries = dom.map((c) => [c, DEPARTEMENTS[c]]);
      return [...metro, ...domEntries];
    }
    return (REGIONS[selRegion] || []).map((c) => [c, DEPARTEMENTS[c]]);
  }, [selRegion]);

  // Villes de référence du département sélectionné (communes significatives,
  // issues d'un référentiel statique national — voir communesReference.js),
  // triées par population décroissante. Couvre toute la France sans charger
  // les 35 000 communes ; les petites communes non listées restent accessibles
  // via la saisie libre complémentaire plus bas.
  const villesDuDept = useMemo(() => {
    if (selDept === 'all') return [];
    return getCommunesByDept(selDept);
  }, [selDept]);

  // Ville de référence sélectionnée (centre pour le filtrage par rayon).
  const villeSelObj = useMemo(() => {
    if (selVille === 'all') return null;
    return villesDuDept.find((v) => v.nom === selVille) || null;
  }, [selVille, villesDuDept]);

  // Centre actif pour le filtrage par distance : « Autour de moi » (géoloc) en
  // priorité, sinon la ville de référence sélectionnée dans la cascade. Les deux
  // fournissent un centre + un rayon ; la saisie libre, elle, filtre par texte.
  const villeCenter = villeSelObj ? { lat: villeSelObj.lat, lng: villeSelObj.lng } : null;
  const activeCenter = userCoords || villeCenter;
  const centerLabel = userCoords ? 'autour de moi' : villeCenter ? selVille : null;

  const handleRegionChange = (v) => { setSelRegion(v); setSelDept('all'); setSelVille('all'); };
  const handleDeptChange = (v) => { setSelDept(v); setSelVille('all'); };
  const handleVilleChange = (v) => setSelVille(v);

  const handleSelectMetier = (v) => {
    setMetierFilter(v);
    setSelEquipements([]);
    setSelPointsForts([]);
    setSelTypes([]);
    setBudgetMax('');
    setAdvancedOpen(false);
    setMetierPickerOpen(false);
  };

  // « Autour de moi » : géolocalisation navigateur (demande de permission standard)
  const handleUseMyPosition = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par ce navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Position indisponible. Vérifiez l'autorisation de localisation.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Recommandés pour cet événement
  const recommandeMap = useMemo(() => {
    const m = {};
    evPrestataires.forEach((ep) => {
      if (ep.statut === 'Recommandé') m[ep.prestataire_id] = ep.recommande_par || '';
    });
    return m;
  }, [evPrestataires]);

  // Favoris du client sur cet événement (statut « Favori » — marqueur personnel,
  // aucun effet de bord : pas de Prospect, ni notification, ni conversation).
  const favoriMap = useMemo(() => {
    const m = {};
    evPrestataires.forEach((ep) => {
      if (ep.statut === 'Favori') m[ep.prestataire_id] = ep.id;
    });
    return m;
  }, [evPrestataires]);

  // Dataset annuaire = tous les CompanySettings non-propriétaires. Les prestataires
  // sans GPS mais avec ville/CP sont inclus (filtrage par texte de la cascade) ;
  // ils apparaissent dans la liste, pas sur la carte.
  const dataset = useMemo(
    () => allCompanySettings.filter((cs) => !cs.is_owner),
    [allCompanySettings]
  );

  // Options filtres avancés (union du dataset)
  // Bibliothèques d'équipements / points forts : propres à chaque métier.
  // On restreint donc les options proposées au métier actuellement sélectionné
  // (évite d'afficher des chips irrelevant et l'ET impossible inter-métiers).
  const scopedDataset = useMemo(() => {
    if (metierFilter === 'all') return dataset;
    if (metierFilter === 'groupe:Lieux et réception') {
      return dataset.filter((cs) => getMetierConfig(cs.metier).groupe === 'Lieux et réception');
    }
    return dataset.filter((cs) => cs.metier === metierFilter);
  }, [dataset, metierFilter]);

  // Groupe actif du filtre métier courant (pilote le filtre « Type » dédié).
  const activeGroup = useMemo(() => {
    if (metierFilter === 'all') return null;
    if (metierFilter === 'groupe:Lieux et réception') return 'Lieux et réception';
    return getMetierConfig(metierFilter).groupe;
  }, [metierFilter]);

  // Items de la catégorie « Type » dédiée au groupe actif. Vide si le groupe
  // n'en a pas → le raffinement reste uniquement dans « Plus de filtres ».
  const typeCategoryItems = useMemo(() => {
    if (!activeGroup) return [];
    const catTitle = TYPE_FILTER_BY_GROUP[activeGroup];
    if (!catTitle) return [];
    const cat = getPointsFortsCategories(activeGroup).find((c) => c.titre === catTitle);
    return cat ? cat.items : [];
  }, [activeGroup]);

  const equipementsOptions = useMemo(() => {
    const s = new Set();
    scopedDataset.forEach((cs) => (cs.equipements || []).forEach((e) => s.add(e)));
    return [...s].sort();
  }, [scopedDataset]);
  const pointsFortsOptions = useMemo(() => {
    const s = new Set();
    scopedDataset.forEach((cs) => {
      (cs.style_tags || []).forEach((p) => s.add(p));
      (cs.points_forts_personnalises || []).forEach((p) => s.add(p));
    });
    const exclude = new Set(typeCategoryItems);
    return [...s].filter((p) => !exclude.has(p)).sort();
  }, [scopedDataset, typeCategoryItems]);

  // ── Filtrage ──
  // Cascade (texte) : Région → Département → Ville, combinées en ET. « Autour de
  // moi » (distance) s'applique en complément quand il est actif (indépendant).
  const results = useMemo(() => {
    if (!unlocked) return [];
    const regionCodes = selRegion !== 'all' ? REGIONS[selRegion] : null;
    const zddOf = (cs) => (cs.zone_deplacement_departements || []).map((d) => String(d));
    const out = [];
    for (const cs of dataset) {
      if (metierFilter !== 'all') {
        if (metierFilter === 'groupe:Lieux et réception') {
          if (getMetierConfig(cs.metier).groupe !== 'Lieux et réception') continue;
        } else if (cs.metier !== metierFilter) continue;
      }
      // Région
      if (regionCodes) {
        const d = csDept(cs);
        const dd = zddOf(cs);
        if (!regionCodes.includes(d) && !dd.some((z) => regionCodes.includes(z))) continue;
      }
      // Département
      if (selDept !== 'all') {
        const d = csDept(cs);
        const dd = zddOf(cs);
        if (d !== selDept && !dd.includes(selDept)) continue;
      }
      // Saisie libre complémentaire : correspondance partielle (insensible à la
      // casse) sur la commune renseignée par le prestataire — pas de calcul de
      // distance, juste du texte. Couvre les petites communes hors villes de réf.
      if (villeLibre.trim()) {
        const q = villeLibre.trim().toLowerCase();
        if (!(cs.adresse_ville || '').toLowerCase().includes(q)) continue;
      }
      // Filtrage par distance (centre = « Autour de moi » OU ville de référence)
      let dist = null;
      if (activeCenter) {
        if (cs.latitude == null || cs.longitude == null) continue;
        dist = haversineKm(activeCenter.lat, activeCenter.lng, cs.latitude, cs.longitude);
        const rayon = userCoords ? zoneRadiusKm : villeRayonKm;
        if (dist > rayon) continue;
        // « Autour de moi » : respecte aussi le rayon de déplacement du prestataire
        if (userCoords && cs.zone_deplacement_type === 'rayon' && dist > (cs.zone_deplacement_rayon_km || 0)) continue;
      }
      if (selEquipements.length && !selEquipements.every((e) => (cs.equipements || []).includes(e))) continue;
      const allPf = [...(cs.style_tags || []), ...(cs.points_forts_personnalises || [])];
      if (selTypes.length && !selTypes.some((t) => allPf.includes(t))) continue;
      if (selPointsForts.length && !selPointsForts.every((p) => allPf.includes(p))) continue;
      // Budget : exclut seulement les prestataires dont le tarif est renseigné ET
      // dépasse le budget saisi. Les prestataires sans tarif restent affichés.
      if (budgetMax !== '' && Number(budgetMax) > 0 && cs.tarif_a_partir_de != null && cs.tarif_a_partir_de > Number(budgetMax)) continue;
      // Capacité : recouvrement entre la valeur saisie (par défaut nb_invites de
      // l'événement) et la fourchette [capacite_min, capacite_max] du prestataire.
      // Actif uniquement si coché. No-op pour les prestataires sans fourchette.
      if (capaciteFilterOn) {
        const nb = Number(capaciteValeur);
        if (capaciteValeur !== '' && nb > 0) {
          const min = cs.capacite_min ?? 0;
          const max = cs.capacite_max ?? Infinity;
          if (nb < min || nb > max) continue;
        }
      }
      out.push({ cs, dist, recommandePar: recommandeMap[cs.prestataire_id] || null });
    }
    out.sort((a, b) => (b.recommandePar ? 1 : 0) - (a.recommandePar ? 1 : 0) || (a.dist ?? Infinity) - (b.dist ?? Infinity));
    return out;
  }, [dataset, unlocked, selRegion, selDept, selVille, activeCenter, userCoords, villeRayonKm, villeLibre, metierFilter, zoneRadiusKm, selEquipements, selPointsForts, selTypes, budgetMax, capaciteFilterOn, capaciteValeur, recommandeMap]);

  // ── Centrage carte (point 1) ──
  // « Autour de moi » prioritaire ; sinon, si un filtre géo est actif, on cadre
  // sur les résultats filtrés (ville → serré, département → étendue, région →
  // étendue) ; sinon France entière.
  const geoFilterActive = selRegion !== 'all' || selDept !== 'all' || selVille !== 'all';
  const fitBoundsArr = useMemo(() => {
    if (activeCenter || !geoFilterActive) return null;
    const coords = results
      .filter((r) => r.cs.latitude != null && r.cs.longitude != null)
      .map((r) => [r.cs.latitude, r.cs.longitude]);
    return coords.length > 0 ? coords : null;
  }, [results, activeCenter, geoFilterActive]);

  // ── Filet de sécurité : libère user-select sur <html>/<body> à chaque bascule
  // de vue. La carte reste montée, mais un pan interrompu (touchcancel iOS) peut
  // laisser -webkit-user-select: none sur <html> et bloquer les <select> natifs. ──
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    ['userSelect', 'webkitUserSelect', 'WebkitUserSelect', 'MozUserSelect', 'msUserSelect', 'OUserSelect'].forEach((prop) => {
      targets.forEach((el) => { try { el.style[prop] = ''; } catch {} });
    });
    document.ondragstart = null;
    document.onselectstart = null;
  }, [view]);

  // ── Confirmer la mise en relation (même parcours que SelectionTab) ──
  const handleConfirm = async (message) => {
    const cs = profilOuvert?.cs;
    if (!cs || !cs.prestataire_id) return;
    setConfirmingId(cs.id);
    const parts = (clientNom || '').trim().split(/\s+/);
    const prenom = parts[0] || '';
    const nom = parts.slice(1).join(' ') || prenom;
    let clientTelephone = evenement?.client_telephone || null;
    let clientEmail = evenement?.client_email || null;
    if ((!clientTelephone || !clientEmail) && evenement?.client_id) {
      try {
        const found = await base44.entities.Client.filter({ id: evenement.client_id });
        const c = found[0];
        if (c) {
          clientTelephone = clientTelephone || c.telephone || null;
          clientEmail = clientEmail || c.email || null;
        }
      } catch {}
    }
    let ep = evPrestataires.find((e) => e.prestataire_id === cs.prestataire_id);
    if (!ep) {
      ep = await base44.entities.EvenementPrestataire.create({
        evenement_id: evenementId,
        evenement_nom: evenementNom,
        prestataire_id: cs.prestataire_id,
        prestataire_nom: cs.company_name,
        prestataire_domaine: getDomaineFromMetier(cs.metier),
        statut: 'Contacté',
      });
    } else {
      await base44.entities.EvenementPrestataire.update(ep.id, { statut: 'Contacté' });
    }
    await base44.entities.Prospect.create({
      prenom,
      nom,
      telephone: clientTelephone,
      email: clientEmail,
      lien_token: genToken(),
      prestataire_id: cs.prestataire_id,
      source: 'Recommandation prestataire',
      type_evenement: evenement?.type_evenement,
      date_evenement_souhaitee: evenement?.date,
      nb_invites_estime: evenement?.nb_invites,
      lieu_nom: evenement?.lieu_nom,
      statut: 'Nouveau',
    });
    await base44.entities.Notification.create({
      titre: 'Nouvelle mise en relation',
      message: `${clientNom || 'Un client'} souhaite vous contacter pour son ${evenement?.type_evenement || 'événement'}${evenement?.date ? ` du ${evenement.date}` : ''}.`,
      type: 'prestataire',
      lien: '/Clients?tab=prospects',
    });
    await base44.entities.Notification.create({
      titre: 'Demande envoyée',
      message: `Le prestataire ${cs.company_name} a bien reçu votre demande de mise en relation. Il reviendra vers vous rapidement.`,
      type: 'info',
      lu: false,
    });
    const clientIdForConv = evenement?.client_id || `guest-${evenementId}`;
    const conv = await base44.entities.Conversation.create({
      client_id: clientIdForConv,
      evenement_id: evenementId,
      evenement_nom: evenementNom,
      client_nom: clientNom,
      prestataire_id: cs.prestataire_id,
      prestataire_nom: cs.company_name,
    });

    // Premier message de la conversation = texte saisi par le client
    const premierMessage = (message || '').trim();
    if (premierMessage) {
      await base44.entities.Message.create({
        conversation_id: conv.id,
        auteur: 'client',
        auteur_nom: clientNom,
        contenu: premierMessage,
        lu: false,
      });
      await base44.entities.Conversation.update(conv.id, {
        dernier_message: premierMessage,
        date_dernier_message: new Date().toISOString(),
        non_lus_admin: 1,
      });
    }
    toast.success(`Votre demande a été transmise à ${cs.company_name}. Il vous contactera prochainement.`, {
      duration: 3000,
      icon: '✅',
    });
    setConfirmingId(null);
    setProfilOuvert(null);
    qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] });
    qc.invalidateQueries({ queryKey: ['ev-prestataires-client', evenementId] });
    qc.invalidateQueries({ queryKey: ['ev-prestataires-annuaire', evenementId] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  // ── Favori : marqueur personnel (aucun effet de bord) ──
  const handleToggleFavori = async (cs) => {
    if (!cs || !cs.prestataire_id) return;
    const existingId = favoriMap[cs.prestataire_id];
    if (existingId) {
      // Retirer le favori : l'EP « Favori » est un marqueur pur, on le supprime.
      await base44.entities.EvenementPrestataire.delete(existingId);
    } else {
      // Ne pas écraser une vraie relation existante (Recommandé/Contacté/Confirmé/Annulé).
      const real = evPrestataires.find((e) => e.prestataire_id === cs.prestataire_id);
      if (real) {
        toast.error('Ce prestataire est déjà dans une relation en cours.');
        return;
      }
      await base44.entities.EvenementPrestataire.create({
        evenement_id: evenementId,
        evenement_nom: evenementNom,
        prestataire_id: cs.prestataire_id,
        prestataire_nom: cs.company_name,
        prestataire_domaine: getDomaineFromMetier(cs.metier),
        statut: 'Favori',
      });
    }
    qc.invalidateQueries({ queryKey: ['ev-prestataires-annuaire', evenementId] });
    qc.invalidateQueries({ queryKey: ['ev-prestataires-selection', evenementId] });
  };

  // ── État verrouillé ──
  if (!unlocked) {
    return (
      <div className="px-4 py-12 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(30,27,75,0.06)' }}>
          <Lock size={26} style={{ color: '#1e1b4b' }} />
        </div>
        <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>Annuaire verrouillé</p>
        <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: '#9ca3af' }}>
          L'annuaire géolocalisé s'ouvre dès que votre lieu initiateur est confirmé sur cet
          événement. Une fois confirmé, accédez à tous les prestataires par catégorie et autour
          de votre lieu.
        </p>
      </div>
    );
  }

  const singleMetier = metierFilter !== 'all';
  const toggleArr = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // Résumé affiché dans le champ « Type » (modale multi-choix).
  const typeSummary =
    selTypes.length === 0
      ? 'Tous les types'
      : selTypes.length === 1
        ? selTypes[0]
        : selTypes.length === 2
          ? `${selTypes[0]}, ${selTypes[1]}`
          : `${selTypes.length} types sélectionnés`;

  return (
    <div className="px-4 pt-3 pb-8 space-y-4" style={{ overflowX: 'clip', minWidth: 0, maxWidth: '100%' }}>
      {/* Filtres permanents */}
      <div className="rounded-2xl border p-3 space-y-3" style={{ background: '#fff', borderColor: '#e8e4dc' }}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>
          <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#C5A059' }} />
          Annuaire des prestataires
          <span style={{ flex: 1, height: 1, background: 'rgba(197,160,89,0.3)' }} />
        </div>
        {/* Métier */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold" style={{ color: '#9a7b1f' }}>Que recherchez-vous ?</label>
          <button
            type="button"
            onClick={() => setMetierPickerOpen(true)}
            className="flex h-9 w-full items-center justify-between rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40"
            style={{ border: '1.5px solid #C5A059', background: '#FFFBF0' }}
          >
            <span className="flex items-center gap-2 truncate">
              {metierFilter !== 'all' ? (
                <>
                  <span>{metierFilterIcon(metierFilter)}</span>
                  <span className="truncate" style={{ color: '#1e1b4b' }}>{metierFilterLabel(metierFilter)}</span>
                </>
              ) : (
                <span style={{ color: '#9ca3af' }}>Tout afficher</span>
              )}
            </span>
            <ChevronDown size={16} style={{ color: '#9ca3af' }} />
          </button>
        </div>

        {/* Filtre « Type » dédié — champ tappable (modale multi-choix), 3 groupes */}
        {typeCategoryItems.length > 0 && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Type</label>
            <button
              type="button"
              onClick={() => setTypePickerOpen(true)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="truncate" style={{ color: selTypes.length ? '#1e1b4b' : '#9ca3af' }}>
                  {typeSummary}
                </span>
              </span>
              <ChevronDown size={16} style={{ color: '#9ca3af' }} />
            </button>
          </div>
        )}

        {/* Filtre « Capacité » dédié — visible pour Lieux et réception / Restauration et traiteur.
            Pré-rempli avec le nb_invites de l'événement, activé par défaut. Valeur modifiable
            (brunch du lendemain, événement annexe plus petit…). Lien de réinitialisation. */}
        {(activeGroup === 'Lieux et réception' || activeGroup === 'Restauration et traiteur') && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Users size={12} /> Capacité
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={capaciteFilterOn}
                onChange={(e) => setCapaciteFilterOn(e.target.checked)}
                className="w-4 h-4 rounded accent-[#1e1b4b] shrink-0"
              />
              <Input
                type="number"
                min="0"
                value={capaciteValeur}
                onChange={(e) => setCapaciteValeur(e.target.value)}
                placeholder="Ex : 95"
                className="h-9"
              />
              <span className="text-[11px] font-medium shrink-0" style={{ color: '#9ca3af' }}>invités</span>
            </div>
            {evenement?.nb_invites != null && evenement.nb_invites > 0 &&
              (String(capaciteValeur) !== String(evenement.nb_invites) || !capaciteFilterOn) && (
              <button
                onClick={() => { setCapaciteValeur(String(evenement.nb_invites)); setCapaciteFilterOn(true); }}
                className="text-[11px] font-semibold inline-flex items-center gap-1"
                style={{ color: '#1e1b4b' }}
              >
                ↺ Réinitialiser sur mon événement ({evenement.nb_invites})
              </button>
            )}
          </div>
        )}

        {/* Cascade Région → Département → Ville + « Autour de moi » (indépendant) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Localisation</label>
          <div className="space-y-1.5">
            <select
              value={selRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Toutes régions</option>
              {Object.keys(REGIONS).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={selDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tous départements</option>
              {deptOptions.map(([code, name]) => (
                <option key={code} value={code}>{code} — {name}</option>
              ))}
            </select>
            <select
              value={selVille}
              onChange={(e) => handleVilleChange(e.target.value)}
              disabled={selDept === 'all'}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="all">Toutes les villes du département</option>
              {villesDuDept.map((v) => (
                <option key={v.nom} value={v.nom}>{v.nom}</option>
              ))}
            </select>
            <button
              onClick={handleUseMyPosition}
              disabled={locating}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-semibold border transition-all disabled:opacity-50"
              style={
                userCoords
                  ? { background: '#1e1b4b', color: '#fff', borderColor: '#1e1b4b' }
                  : { background: 'rgba(30,27,75,0.04)', color: '#1e1b4b', borderColor: '#e8e4dc' }
              }
            >
              <LocateFixed size={13} /> {locating ? 'Localisation…' : userCoords ? 'Autour de moi (actif)' : 'Autour de moi'}
            </button>
          </div>
          {centerLabel && (
            <p className="text-[11px] inline-flex items-center gap-1" style={{ color: '#9ca3af' }}>
              <MapPin size={11} /> Recherche autour de {centerLabel}
            </p>
          )}
        </div>

        {/* Rayon — visible si un centre est défini (« Autour de moi » OU ville de référence) */}
        {activeCenter && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Rayon de recherche</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: '#1e1b4b' }}>{(userCoords ? zoneRadiusKm : villeRayonKm)} km</span>
            </label>
            <input
              type="range"
              min={5}
              max={userCoords ? 300 : 100}
              step={5}
              value={userCoords ? zoneRadiusKm : villeRayonKm}
              onChange={(e) => (userCoords ? setZoneRadiusKm(Number(e.target.value)) : setVilleRayonKm(Number(e.target.value)))}
              className="w-full"
            />
          </div>
        )}

        {/* Saisie libre complémentaire : commune non listée dans les villes de référence */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Ou tapez une commune non listée</label>
          <Input
            type="text"
            value={villeLibre}
            onChange={(e) => setVilleLibre(e.target.value)}
            placeholder="Ex : La Bouilladisse, Peypin…"
          />
          {villeLibre.trim() && (
            <button
              onClick={() => setVilleLibre('')}
              className="text-[11px] font-semibold inline-flex items-center gap-1"
              style={{ color: '#9ca3af' }}
            >
              <X size={11} /> Effacer la commune saisie
            </button>
          )}
        </div>

        {/* Plus de filtres — réservés à un métier unique (bibliothèques spécifiques par métier) */}
        {singleMetier ? (
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold py-1.5 px-2 rounded-lg"
            style={{ background: 'rgba(30,27,75,0.05)', color: '#1e1b4b' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal size={13} /> Plus de filtres
            </span>
            <ChevronDown
              size={16}
              style={{ transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>
        ) : (
          <div
            className="w-full flex items-center gap-1.5 text-xs font-medium py-1.5 px-2 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.03)', color: '#9ca3af' }}
          >
            <SlidersHorizontal size={13} /> Sélectionnez un seul métier pour affiner
          </div>
        )}
        <AnimatePresence initial={false}>
          {advancedOpen && singleMetier && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Budget max (€)</label>
                    <Input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="Ex : 5000" />
                  </div>
                </div>
                {equipementsOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Équipements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {equipementsOptions.map((e) => {
                        const on = selEquipements.includes(e);
                        return (
                          <button
                            key={e}
                            onClick={() => toggleArr(selEquipements, setSelEquipements, e)}
                            className="text-[11px] px-2.5 py-1 rounded-full border transition-all"
                            style={
                              on
                                ? { background: '#1e1b4b', color: '#fff', borderColor: '#1e1b4b' }
                                : { background: 'rgba(30,27,75,0.04)', color: '#1e1b4b', borderColor: '#e8e4dc' }
                            }
                          >
                            {e}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {pointsFortsOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Points forts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pointsFortsOptions.map((p) => {
                        const on = selPointsForts.includes(p);
                        return (
                          <button
                            key={p}
                            onClick={() => toggleArr(selPointsForts, setSelPointsForts, p)}
                            className="text-[11px] px-2.5 py-1 rounded-full border transition-all"
                            style={
                              on
                                ? { background: '#C5A059', color: '#fff', borderColor: '#C5A059' }
                                : { background: 'rgba(197,160,89,0.06)', color: '#7a5f1a', borderColor: 'rgba(197,160,89,0.3)' }
                            }
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(selEquipements.length > 0 || selPointsForts.length > 0 || budgetMax !== '') && (
                  <button
                    onClick={() => { setSelEquipements([]); setSelPointsForts([]); setBudgetMax(''); }}
                    className="text-[11px] font-semibold inline-flex items-center gap-1"
                    style={{ color: '#9ca3af' }}
                  >
                    <X size={11} /> Réinitialiser les filtres
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bascule liste / carte + compte */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: '#1e1b4b' }}>
          {results.length} prestataire{results.length > 1 ? 's' : ''}
        </p>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(30,27,75,0.06)' }}>
          <button
            onClick={() => setView('liste')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={view === 'liste' ? { background: '#fff', color: '#1e1b4b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}
          >
            <List size={14} /> Liste
          </button>
          <button
            onClick={() => setView('carte')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={view === 'carte' ? { background: '#fff', color: '#1e1b4b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}
          >
            <MapIcon size={14} /> Carte
          </button>
        </div>
      </div>

      {/* Carte — toujours montée (pas de cycle montage/démontage à chaque bascule,
          cause des blocages de <select> natifs sur iOS au retour sur Liste),
          masquée en CSS hors vue Carte. <MapController> recentre selon les filtres. */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: '#e8e4dc', height: '60vh', display: view === 'carte' ? 'block' : 'none' }}
      >
        <AnnuaireMap
          prestataires={results.map((r) => ({ ...r.cs, _recommandePar: r.recommandePar, _favori: !!favoriMap[r.cs.prestataire_id] }))}
          center={activeCenter}
          fitBounds={fitBoundsArr}
          visible={view === 'carte'}
          onSelect={(cs) => setProfilOuvert({ cs })}
          onToggleFavori={handleToggleFavori}
        />
      </div>

      {/* Liste — rendu conditionnel (pas de fuite au montage/démontage côté liste) */}
      {view === 'liste' && (
        results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="text-3xl mb-2">🔎</span>
            <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>
              Aucun prestataire ne correspond
            </p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
              Élargissez le rayon ou modifiez les filtres.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {results.map((r) => (
                <PrestataireCard
                  key={r.cs.id}
                  context="annuaire"
                  cs={r.cs}
                  dist={r.dist}
                  recommandePar={r.recommandePar}
                  favori={!!favoriMap[r.cs.prestataire_id]}
                  onToggleFavori={() => handleToggleFavori(r.cs)}
                  onOpen={() => setProfilOuvert({ cs: r.cs })}
                />
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      {/* Fiche prestataire — mode découverte (portal plein écran).
          z-[1000] : au-dessus des couches internes Leaflet (popup-pane = 700)
          pour que la fiche passe au premier plan depuis la vue Carte ET Liste. */}
      {profilOuvert &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex flex-col bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: '#e8e4dc' }}>
              <button
                onClick={() => setProfilOuvert(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: '#f3f4f6', color: '#1e1b4b' }}
              >
                <ArrowLeft size={20} />
              </button>
              <p className="font-semibold text-sm truncate px-2" style={{ color: '#1e1b4b' }}>
                {profilOuvert.cs.company_name}
              </p>
              <div className="w-10" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <VitrineProfil
                mode="prestataire"
                prestataire_id={profilOuvert.cs.prestataire_id}
                mode_decouverte
                mode_recommandation
                contactMasque={true}
                onConfirm={handleConfirm}
                onBack={() => setProfilOuvert(null)}
                confirming={confirmingId === profilOuvert.cs.id}
              />
            </div>
            <div
              className="shrink-0 px-4 py-3 bg-white border-t"
              style={{ borderColor: '#e8e4dc', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => setConfirmModalOpen(true)}
                disabled={confirmingId === profilOuvert.cs.id}
                className="w-full py-3.5 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.97] disabled:opacity-60"
                style={{ background: '#1e1b4b' }}
              >
                {confirmingId === profilOuvert.cs.id ? 'Confirmation…' : 'Mise en relation'}
              </button>
            </div>
            <ConfirmRelationModal
              open={confirmModalOpen}
              onClose={() => setConfirmModalOpen(false)}
              onConfirm={(msg) => handleConfirm(msg)}
              prestataireNom={profilOuvert.cs.company_name}
              evenement={evenement}
              confirming={!!confirmingId}
            />
          </div>,
          document.body
        )}

      <MetierPickerModal
        open={metierPickerOpen}
        selected={metierFilter}
        onSelect={handleSelectMetier}
        onClose={() => setMetierPickerOpen(false)}
      />
      <TypePickerModal
        open={typePickerOpen}
        title={TYPE_FILTER_BY_GROUP[activeGroup] || 'Type'}
        items={typeCategoryItems}
        selected={selTypes}
        onToggle={(t) => toggleArr(selTypes, setSelTypes, t)}
        onClear={() => setSelTypes([])}
        onClose={() => setTypePickerOpen(false)}
      />
    </div>
  );
}