/**
 * AnnuaireMap — Carte interactive des prestataires (Leaflet / OpenStreetMap).
 *
 * Composant isolé volontairement : toute la logique de rendu carte est contenue ici.
 * Pour basculer vers Google Maps Platform plus tard (migration Vercel/Supabase),
 * remplacer uniquement ce fichier par une implémentation Google Maps équivalente
 * (mêmes props : prestataires, center, onSelect) — AnnuaireTab n'a pas besoin de changer.
 *
 * Aucune clé API requise (tuiles OpenStreetMap standard, publiques).
 */
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function pinIcon(recommande) {
  const bg = recommande ? '#C5A059' : '#1e1b4b';
  const symbol = recommande ? '⭐' : '📍';
  const border = recommande ? '3px solid #fff' : '2px solid #fff';
  const shadow = recommande
    ? '0 0 0 4px rgba(197,160,89,0.35), 0 3px 8px rgba(0,0,0,0.35)'
    : '0 2px 6px rgba(0,0,0,0.35)';
  return L.divIcon({
    className: 'annuaire-pin',
    html:
      '<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' +
      bg +
      ';border:' + border + ';box-shadow:' + shadow + '">' +
      '<span style="transform:rotate(45deg);color:#fff;font-size:13px">' + symbol + '</span>' +
      '</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

// Recentre la carte selon les filtres actifs et invalide la taille quand la
// carte devient visible. La carte reste montée en permanence (masquée en CSS hors
// vue Carte) pour éviter le cycle montage/démontage de MapContainer, responsable
// des blocages des <select> natifs au retour sur Liste (iOS Safari).
// Seuil de zoom (inclusive) au-dessus duquel les pins classiques sont remplacés
// par des mini-cartes photo (type Airbnb). En dessous : pins simples (vue large).
const PHOTO_ZOOM_THRESHOLD = 12;

function escapeAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Marqueur « mini-carte » : photo de couverture arrondie + logo en overlay +
// pointe basse. Fallback lettre si pas de cover. Le logo et la pointe sont des
// siblings de la boîte image (overflow hidden) pour ne pas être clippés.
function photoIcon(p, recommande) {
  const size = 46;
  const ring = recommande ? '#C5A059' : '#fff';
  const cover = p.company_cover_url;
  const logo = p.company_logo_url;
  const initial = (p.company_name || '?').trim().charAt(0).toUpperCase();
  const imgBox = cover
    ? '<img src="' + escapeAttr(cover) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>'
    : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#1e1b4b;color:#fff;font-size:18px;font-weight:700">' + initial + '</div>';
  const logoHtml = logo
    ? '<img src="' + escapeAttr(logo) + '" alt="" style="position:absolute;bottom:-4px;right:-4px;width:20px;height:20px;border-radius:50%;object-fit:cover;background:#fff;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);z-index:2"/>'
    : '';
  const starHtml = recommande
    ? '<div style="position:absolute;top:-6px;left:-6px;width:18px;height:18px;border-radius:50%;background:#C5A059;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);z-index:3">⭐</div>'
    : '';
  const shadow = recommande ? '0 0 0 4px rgba(197,160,89,0.30), 0 4px 12px rgba(0,0,0,0.35)' : '0 3px 10px rgba(0,0,0,0.35)';
  const html =
    '<div style="position:relative;width:' + size + 'px;height:' + size + 'px">' +
      '<div style="width:100%;height:100%;border-radius:14px;overflow:hidden;border:3px solid ' + ring + ';box-shadow:' + shadow + '">' + imgBox + '</div>' +
      logoHtml +
      starHtml +
      '<div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid ' + ring + ';z-index:1"></div>' +
    '</div>';
  return L.divIcon({
    className: 'annuaire-photo-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size + 6],
    popupAnchor: [0, -size],
  });
}

// ── Jitter déterministe pour les pins superposés ─────────────────────────────
// Certains prestataires partagent des coordonnées identiques (données au niveau
// ville, pas d'adresse précise) : leurs pins se superposent exactement et un seul
// reste visible/cliquable. On regroupe les marqueurs par coordonnées arrondies
// (≈11m) ; les singletons gardent leur position réelle, les membres d'un cluster
// sont étalés sur une spirale « sunflower » (angle d'or) indexée par id — stable
// à chaque chargement. L'offset est calculé en mètres à partir d'une séparation
// cible en pixels (constante à l'écran, quel que soit le zoom) puis converti en
// degrés : display-only, les coordonnées réelles en base ne sont jamais modifiées.
const COORD_ROUND = 10000; // 0.0001° ≈ 11m
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const JITTER_PX = 50; // séparation cible entre pins d'un même cluster (px à l'écran)
const JITTER_MIN_ZOOM = 11; // en dessous : pas de jitter (vue trop large, spread absurde)
const JITTER_MAX_METERS = 1500; // borne géographique de l'offset (évite un spread de plusieurs km)

function clusterKey(p) {
  return Math.round(p.latitude * COORD_ROUND) + '|' + Math.round(p.longitude * COORD_ROUND);
}

function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

// Retourne une Map id → [lat, lng] offsetée, uniquement pour les marqueurs
// appartenant à un cluster (≥2 marqueurs au même point). Les singletons sont
// absents de la Map → position réelle utilisée par défaut.
function buildJitteredPositions(markers, zoom) {
  const groups = new Map();
  markers.forEach((p) => {
    const k = clusterKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });
  const positions = new Map();
  groups.forEach((arr) => {
    if (arr.length === 1) return;
    const sorted = [...arr].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    sorted.forEach((p, i) => {
      const radiusPx = (i === 0 ? 0 : Math.sqrt(i)) * JITTER_PX;
      const angle = i * GOLDEN_ANGLE;
      const mpp = metersPerPixel(p.latitude, zoom);
      const radiusMeters = Math.min(radiusPx * mpp, JITTER_MAX_METERS);
      const cosLat = Math.cos((p.latitude * Math.PI) / 180) || 1e-6;
      const dLat = (radiusMeters * Math.sin(angle)) / 111320;
      const dLng = (radiusMeters * Math.cos(angle)) / (111320 * cosLat);
      positions.set(p.id, [p.latitude + dLat, p.longitude + dLng]);
    });
  });
  return positions;
}

// Suit le niveau de zoom de la carte et signale au parent quand le seuil photo
// est franchi (montée ou descente). On ne déclenche un setState que lorsque la
// valeur bascule, pour limiter les re-rendus lors d'un zoom continu. Reporte
// aussi le zoom courant au parent pour le calcul du jitter (séparation constante
// à l'écran, recalculée à chaque zoomend).
function ZoomTracker({ threshold, onThresholdChange, onZoomChange }) {
  const map = useMap();
  const [usePhoto, setUsePhoto] = useState(() => map.getZoom() >= threshold);
  useEffect(() => {
    const sync = () => {
      const z = map.getZoom();
      onZoomChange(z);
      const v = z >= threshold;
      setUsePhoto((prev) => (prev === v ? prev : v));
    };
    sync();
    map.on('zoomend', sync);
    return () => map.off('zoomend', sync);
  }, [map, threshold, onZoomChange]);
  useEffect(() => { onThresholdChange(usePhoto); }, [usePhoto, onThresholdChange]);
  return null;
}

function MapController({ center, fitBounds, visible }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    map.invalidateSize();
    if (center && center.lat != null && center.lng != null) {
      // « Autour de moi » prioritaire
      map.setView([center.lat, center.lng], 11);
    } else if (fitBounds && fitBounds.length > 0) {
      // Filtre géo actif : cadre sur les résultats filtrés (ville → serré,
      // département → étendue du département, région → étendue de la région).
      map.fitBounds(L.latLngBounds(fitBounds), { padding: [40, 40], maxZoom: 13 });
    } else {
      // Aucun filtre géo : France entière.
      map.setView([46.603354, 2.4], 6);
    }
  }, [center, fitBounds, visible, map]);
  return null;
}

export default function AnnuaireMap({ prestataires = [], center, fitBounds, visible, onSelect, onToggleFavori, highlightedId }) {
  const [usePhotoMarkers, setUsePhotoMarkers] = useState(false);
  const [zoom, setZoom] = useState(13);
  // Filet de sécurité au démontage final de l'onglet (la carte n'est plus
  // démontée à chaque bascule Carte↔Liste — elle reste montée, masquée en CSS —
  // donc ce cleanup ne concerne que la sortie de l'onglet Recherche). Leaflet
  // peut laisser `-webkit-user-select: none` sur <html> à l'issue d'un pan
  // interrompu ; on libère <html> ET <body> pour toutes les variantes de la
  // propriété afin de ne pas empoisonner d'autres écrans.
  useEffect(() => {
    return () => {
      const targets = [document.documentElement, document.body];
      ['userSelect', 'webkitUserSelect', 'WebkitUserSelect', 'MozUserSelect', 'msUserSelect', 'OUserSelect'].forEach((prop) => {
        targets.forEach((el) => {
          try { el.style[prop] = ''; } catch {}
        });
      });
      document.ondragstart = null;
      document.onselectstart = null;
    };
  }, []);

  const markers = useMemo(() => prestataires.filter((p) => p.latitude != null && p.longitude != null), [prestataires]);
  // Positions offsetées (jitter display-only) pour les pins superposés.
  const jittered = useMemo(
    () => (zoom >= JITTER_MIN_ZOOM ? buildJitteredPositions(markers, zoom) : new Map()),
    [markers, zoom]
  );
  // Le centrage réel est piloté par <MapController> (la carte reste montée). On
  // passe une init statique France ; le controller recentre à l'affichage.
  return (
    <MapContainer
      center={[46.603354, 2.4]}
      zoom={6}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={OSM_URL} attribution={OSM_ATTR} />
      <ZoomTracker threshold={PHOTO_ZOOM_THRESHOLD} onThresholdChange={setUsePhotoMarkers} onZoomChange={setZoom} />
      {markers.map((p) => (
        <Marker
          key={p.id}
          position={jittered.get(p.id) || [p.latitude, p.longitude]}
          icon={usePhotoMarkers ? photoIcon(p, !!p._recommandePar) : pinIcon(!!p._recommandePar)}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{p.company_name}</p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 6px' }}>
                {p.metier}
                {p.adresse_ville ? ` · ${p.adresse_ville}` : ''}
              </p>
              {p._recommandePar && (
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#fff', background: '#C5A059', borderRadius: 999, padding: '3px 9px', margin: '0 0 6px' }}>
                  ⭐ Recommandé par {p._recommandePar}
                </span>
              )}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => onSelect && onSelect(p)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1e1b4b',
                    background: 'rgba(30,27,75,0.06)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Voir la fiche
                </button>
                <button
                  onClick={() => onToggleFavori && onToggleFavori(p)}
                  title={p._favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  style={{
                    fontSize: 14,
                    color: p._favori ? '#ef4444' : '#9ca3af',
                    background: p._favori ? 'rgba(239,68,68,0.10)' : 'rgba(0,0,0,0.04)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 8px',
                    cursor: 'pointer',
                  }}
                >
                  {p._favori ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      <MapController center={center} fitBounds={fitBounds} visible={visible} />
    </MapContainer>
  );
}