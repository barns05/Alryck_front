/**
 * EspaceEditor — Éditeur SVG pour le prestataire (lieu)
 * Outils : Rectangle (drag pour tracer) et Polygone (clic-sommets).
 * Choix des dimensions (ratio canvas), nommage, sauvegarde en EspaceLieu.
 * Toutes les coordonnées des zones sont en % (0-100).
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Square, Hexagon, Trash2, Check, Undo2, FileUp, Loader2, AlertTriangle, Hand, Sparkles } from 'lucide-react';
import AmandaProcessing from '@/components/AmandaProcessing';
import { toast } from 'sonner';
import { centerOf } from '@/lib/espaceCoords';
import PropositionsCurationModal from './PropositionsCurationModal.jsx';

const PALETTE = ['#c7d2fe', '#bbf7d0', '#fed7aa', '#fbcfe8', '#e9d5ff', '#bae6fd'];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function EspaceEditor({ espace, onClose, onSaved, initialImportFile }) {
  const qc = useQueryClient();
  const svgRef = useRef(null);

  const [nom, setNom] = useState(espace?.nom || '');
  const [largeur, setLargeur] = useState(espace?.largeur || 100);
  const [hauteur, setHauteur] = useState(espace?.hauteur || 70);
  const [zones, setZones] = useState(espace?.zones || []);
  const [tool, setTool] = useState('navigation'); // navigation | rectangle | polygone
  const [color, setColor] = useState(PALETTE[0]);
  const [rectStart, setRectStart] = useState(null);
  const [rectCur, setRectCur] = useState(null);
  const [polyDraft, setPolyDraft] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lieuId, setLieuId] = useState(espace?.lieu_id || null);
  const [zoneCategorie, setZoneCategorie] = useState('table'); // 'table' | 'exclusion'
  const [zoneNom, setZoneNom] = useState(''); // nom libre pour la prochaine zone d'exclusion
  const [formats, setFormats] = useState(espace?.formats_tables || []);
  const [tableHonneur, setTableHonneur] = useState(espace?.table_honneur || { active: false, forme: 'ronde', capacite: 0 });
  const [capDebout, setCapDebout] = useState(espace?.capacite_max_debout ?? null);
  const [capChaises, setCapChaises] = useState(espace?.capacite_max_chaises ?? null);
  const [nbTablesMin, setNbTablesMin] = useState(espace?.nb_tables_min ?? 1);
  const [nbTablesMax, setNbTablesMax] = useState(espace?.nb_tables_max ?? null);
  const [generating, setGenerating] = useState(false);
  const [curationOpen, setCurationOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importWarning, setImportWarning] = useState(null);
  const [dimHint, setDimHint] = useState(null); // { largeur, hauteur, label } dims détectées par l'IA
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const [dispSize, setDispSize] = useState({ w: 0, h: 0 });

  const { data: companyList = [] } = useQuery({
    queryKey: ['company-owner'],
    queryFn: () => base44.entities.CompanySettings.list(),
    staleTime: 60000,
  });
  const owner = companyList.find((c) => c.is_owner === true);

  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux-all'],
    queryFn: () => base44.entities.Lieu.list(),
    staleTime: 60000,
  });

  // Si un seul Lieu et pas de rattachement explicite → auto-lier
  useEffect(() => {
    if (lieux.length === 1 && !lieuId) setLieuId(lieux[0].id);
  }, [lieux, lieuId]);

  // Zoom-to-fit : calcule une taille d'affichage bornée (largeur conteneur / 55vh)
  // pour que le canvas tienne toujours dans la zone visible, quel que soit le ratio.
  useLayoutEffect(() => {
    const compute = () => {
      const cw = containerRef.current?.clientWidth || 600;
      const maxW = Math.max(120, cw - 4);
      const maxH = Math.max(160, window.innerHeight * 0.55);
      const L = Math.max(1, Number(largeur) || 1);
      const H = Math.max(1, Number(hauteur) || 1);
      const ratio = L / H;
      let dispW, dispH;
      if (maxW / ratio <= maxH) {
        dispW = maxW;
        dispH = maxW / ratio;
      } else {
        dispH = maxH;
        dispW = maxH * ratio;
      }
      setDispSize({ w: Math.round(dispW), h: Math.round(dispH) });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [largeur, hauteur]);

  const toPct = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const onPointerDown = (e) => {
    if (tool === 'navigation') return;
    if (tool !== 'rectangle') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toPct(e);
    setRectStart(p);
    setRectCur(p);
  };
  const onPointerMove = (e) => {
    if (tool === 'navigation') return;
    if (tool !== 'rectangle' || !rectStart) return;
    setRectCur(toPct(e));
  };
  const onPointerUp = () => {
    if (tool === 'navigation') return;
    if (tool !== 'rectangle' || !rectStart || !rectCur) return;
    const x1 = Math.min(rectStart.x, rectCur.x);
    const x2 = Math.max(rectStart.x, rectCur.x);
    const y1 = Math.min(rectStart.y, rectCur.y);
    const y2 = Math.max(rectStart.y, rectCur.y);
    if (x2 - x1 > 2 && y2 - y1 > 2) {
      const isExcl = zoneCategorie === 'exclusion';
      setZones((z) => [
        ...z,
        {
          id: uid(),
          type: 'rectangle',
          points: [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x2, y: y2 },
            { x: x1, y: y2 },
          ],
          categorie: zoneCategorie,
          nom: isExcl ? (zoneNom.trim() || `Zone ${z.length + 1}`) : `Zone ${z.length + 1}`,
          couleur: isExcl ? '#cbd5e1' : color,
        },
      ]);
      if (isExcl) setZoneNom('');
      setTool('navigation');
    }
    setRectStart(null);
    setRectCur(null);
  };

  const onSvgClick = (e) => {
    if (tool === 'navigation') return;
    if (tool !== 'polygone') return;
    const p = toPct(e);
    setPolyDraft((d) => [...d, p]);
  };
  const finishPolygone = () => {
    if (polyDraft.length >= 3) {
      const isExcl = zoneCategorie === 'exclusion';
      setZones((z) => [
        ...z,
        {
          id: uid(),
          type: 'polygone',
          points: polyDraft,
          categorie: zoneCategorie,
          nom: isExcl ? (zoneNom.trim() || `Zone ${z.length + 1}`) : `Zone ${z.length + 1}`,
          couleur: isExcl ? '#cbd5e1' : color,
        },
      ]);
      if (isExcl) setZoneNom('');
      setTool('navigation');
    }
    setPolyDraft([]);
  };

  const removeZone = (id) => setZones((z) => z.filter((zz) => zz.id !== id));

  // Logique d'import IA partagée : accepte un File directement (utilisé par le bouton
  // « 📄 Importer un plan » et par le lancement auto quand un fichier est passé à l'ouverture).
  const runImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportWarning(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error("Échec de l'upload du fichier.");

      const res = await base44.functions.invoke('extraireContourEspace', { file_url });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);

      const contour = Array.isArray(data?.contour) ? data.contour : [];
      if (contour.length < 3) {
        throw new Error("L'IA n'a pas pu extraire un contour exploitable. Utilisez le dessin manuel.");
      }

      const clamped = contour.map((p) => ({
        x: Math.max(0, Math.min(100, p.x)),
        y: Math.max(0, Math.min(100, p.y)),
      }));
      setZones((z) => [
        ...z,
        { id: uid(), type: 'polygone', points: clamped, categorie: 'table', nom: 'Contour IA', couleur: color },
      ]);

      const confiance = data.confiance || 'faible';
      const isPlan = data.source_type === 'plan';
      setImportWarning(
        isPlan && (confiance === 'haute' || confiance === 'moyenne')
          ? "Contour proposé depuis votre document — vérifiez et ajustez les sommets si besoin avant d'enregistrer."
          : "Le résultat depuis une photo est approximatif — nous recommandons d'utiliser un plan/document coté (vue de dessus) pour un contour fiable. Vérifiez attentivement chaque sommet avant d'enregistrer."
      );

      const lh = data.largeur_hint;
      const hh = data.hauteur_hint;
      if (typeof lh === 'number' && typeof hh === 'number' && lh > 0 && hh > 0) {
        setDimHint({ largeur: lh, hauteur: hh, label: data.dimensions_detectees || `${lh} × ${hh}` });
      } else if (data.dimensions_detectees) {
        setDimHint({ largeur: null, hauteur: null, label: data.dimensions_detectees });
      }
    } catch (err) {
      setImportError(
        (err?.message || "Erreur lors de l'analyse du fichier.") +
        " — Vous pouvez dessiner le contour manuellement avec les outils Rectangle ou Polygone."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleImportPlan = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset pour permettre de ré-importer le même fichier
    runImport(file);
  };

  // Lancement auto de l'import IA si un fichier est transmis à l'ouverture (via « + Créer »)
  useEffect(() => {
    if (initialImportFile) runImport(initialImportFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDimHint = () => {
    if (dimHint?.largeur && dimHint?.hauteur) {
      setLargeur(dimHint.largeur);
      setHauteur(dimHint.hauteur);
    }
  };

  const handleSave = async () => {
    if (!nom.trim() || !owner?.prestataire_id) return;
    setSaving(true);
    const payload = {
      prestataire_id: owner.prestataire_id,
      lieu_id: lieuId || null,
      nom: nom.trim(),
      largeur: Number(largeur),
      hauteur: Number(hauteur),
      zones,
      formats_tables: formats,
      table_honneur: tableHonneur,
      capacite_max_debout: capDebout ?? null,
      capacite_max_chaises: capChaises ?? null,
      nb_tables_min: Number(nbTablesMin) || 1,
      nb_tables_max: nbTablesMax ? Number(nbTablesMax) : null,
      actif: espace?.actif !== false,
    };
    try {
      if (espace?.id) await base44.entities.EspaceLieu.update(espace.id, payload);
      else await base44.entities.EspaceLieu.create(payload);
      qc.invalidateQueries(['espaces-lieu']);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const toggleFormat = (forme) => {
    setFormats((f) => {
      if (f.some((x) => x.forme === forme)) return f.filter((x) => x.forme !== forme);
      return [...f, { forme, capacite_max: forme === 'ronde' ? 8 : 10, dimension: forme === 'rectangulaire' ? 6 : 4 }];
    });
  };
  const setFormatCapacite = (forme, val) =>
    setFormats((f) => f.map((x) => (x.forme === forme ? { ...x, capacite_max: Number(val) || 0 } : x)));
  const setFormatMin = (forme, val) =>
    setFormats((f) => f.map((x) => (x.forme === forme ? { ...x, capacite_min: Number(val) || 0 } : x)));

  const handleGenerer = async () => {
    if (!espace?.id) { toast.error("Enregistrez d'abord l'espace avant de générer les propositions."); return; }
    if (formats.length === 0) { toast.error("Renseignez au moins un format de table avant de générer."); return; }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('genererPropositionsEspace', { espace_lieu_id: espace.id });
      const data = res?.data || res;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`${data.generees || 0} propositions générées (${data.conservees_validees || 0} validées conservées).`);
      setCurationOpen(true);
    } catch (e) {
      toast.error("Erreur lors de la génération des propositions.");
    } finally {
      setGenerating(false);
    }
  };

  // Aperçu rectangle en cours
  const previewPoints = (() => {
    if (!rectStart || !rectCur) return null;
    const x1 = Math.min(rectStart.x, rectCur.x);
    const x2 = Math.max(rectStart.x, rectCur.x);
    const y1 = Math.min(rectStart.y, rectCur.y);
    const y2 = Math.max(rectStart.y, rectCur.y);
    return `${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}`;
  })();

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-card rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">
            {espace?.id ? 'Modifier l’espace' : '✦ Dessiner un espace'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Dimensions + nom */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom *</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Salle principale"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-base"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Lieu rattaché</label>
            <select
              value={lieuId || ''}
              onChange={(e) => setLieuId(e.target.value || null)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-base"
            >
              <option value="">Aucun (générique)</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Largeur (ratio)</label>
            <input
              type="number"
              value={largeur}
              onChange={(e) => setLargeur(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-base"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Hauteur (ratio)</label>
            <input
              type="number"
              value={hauteur}
              onChange={(e) => setHauteur(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-base"
            />
          </div>
        </div>

        {/* Catégorie de zone + nom (exclusion) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            <button
              onClick={() => setZoneCategorie('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                zoneCategorie === 'table' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              🪑 Zone tables
            </button>
            <button
              onClick={() => setZoneCategorie('exclusion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                zoneCategorie === 'exclusion' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              🚫 Zone sans table
            </button>
          </div>
          {zoneCategorie === 'exclusion' && (
            <input
              value={zoneNom}
              onChange={(e) => setZoneNom(e.target.value)}
              placeholder="Nom : Bar, WC, Piste de danse…"
              className="h-8 flex-1 min-w-[140px] rounded-md border border-input bg-transparent px-2 text-sm"
            />
          )}
        </div>

        {/* Formats de table & table d'honneur & modes additionnels */}
        <div className="space-y-3 border border-border rounded-xl p-3 bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formats de table</p>
          <div className="flex flex-wrap gap-2">
            {['ronde', 'rectangulaire'].map((forme) => {
              const active = formats.some((f) => f.forme === forme);
              return (
                <button
                  key={forme}
                  onClick={() => toggleFormat(forme)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground'
                  }`}
                >
                  {forme === 'ronde' ? '🪑 Ronde' : '▭ Rectangulaire'}
                </button>
              );
            })}
          </div>
          {formats.map((f) => (
            <div key={f.forme} className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium capitalize w-28">{f.forme}</span>
              <label className="text-[11px] text-muted-foreground">Min / table</label>
              <input
                type="number"
                min={0}
                value={f.capacite_min ?? ''}
                onChange={(e) => setFormatMin(f.forme, e.target.value)}
                className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
                placeholder={String(f.capacite_max ?? '')}
              />
              <label className="text-[11px] text-muted-foreground">Max / table</label>
              <input
                type="number"
                min={1}
                value={f.capacite_max || ''}
                onChange={(e) => setFormatCapacite(f.forme, e.target.value)}
                className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-sm"
              />
              <span className="text-[11px] text-muted-foreground">pers.</span>
            </div>
          ))}

          {/* Table d'honneur */}
          <div className="border-t border-border pt-2 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={!!tableHonneur.active}
                onChange={(e) => setTableHonneur({ ...tableHonneur, active: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              Table d'honneur
            </label>
            {tableHonneur.active && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <select
                  value={tableHonneur.forme || 'ronde'}
                  onChange={(e) => setTableHonneur({ ...tableHonneur, forme: e.target.value })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="ronde">Ronde</option>
                  <option value="rectangulaire">Rectangulaire</option>
                </select>
                <label className="text-[11px] text-muted-foreground">Capacité</label>
                <input
                  type="number"
                  min={1}
                  value={tableHonneur.capacite || ''}
                  onChange={(e) => setTableHonneur({ ...tableHonneur, capacite: Number(e.target.value) || 0 })}
                  className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm"
                />
                <span className="text-[11px] text-muted-foreground">pers.</span>
              </div>
            )}
          </div>

          {/* Modes debout / chaises */}
          <div className="border-t border-border pt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block">Mode debout — capacité max (pers.)</label>
              <input
                type="number"
                min={0}
                value={capDebout ?? ''}
                onChange={(e) => setCapDebout(e.target.value ? Number(e.target.value) : null)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                placeholder="—"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block">Mode chaises — capacité max (pers.)</label>
              <input
                type="number"
                min={0}
                value={capChaises ?? ''}
                onChange={(e) => setCapChaises(e.target.value ? Number(e.target.value) : null)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                placeholder="—"
              />
            </div>
          </div>

          {/* Plage de génération (nb tables min/max) */}
          <div className="border-t border-border pt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block">Nb. tables minimum</label>
              <input
                type="number"
                min={1}
                value={nbTablesMin ?? ''}
                onChange={(e) => setNbTablesMin(e.target.value ? Number(e.target.value) : 1)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block">Nb. tables maximum</label>
              <input
                type="number"
                min={1}
                value={nbTablesMax ?? ''}
                onChange={(e) => setNbTablesMax(e.target.value ? Number(e.target.value) : null)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                placeholder="max géométrique"
              />
            </div>
          </div>

          {(() => {
            const lo = Number(nbTablesMin) || 1;
            const hi = Number(nbTablesMax) || null;
            const nbFormats = formats.length;
            const thActive = !!tableHonneur.active;
            const estimate = nbFormats > 0 && hi != null && hi >= lo
              ? nbFormats * (hi - lo + 1) * (thActive ? 2 : 1)
              : null;
            if (!estimate || estimate <= 40) return null;
            return (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Cette fourchette va générer environ <strong>{estimate}</strong> propositions — réduisez l'écart entre min et max pour un résultat plus gérable.
                </span>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleGenerer}
              disabled={generating || !espace?.id || formats.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              {generating ? <AmandaProcessing size="sm" message="" /> : <Sparkles size={13} />}
              {generating ? 'Génération…' : '✦ Générer les propositions'}
            </button>
            {espace?.id && (
              <button
                onClick={() => setCurationOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted"
              >
                <Check size={13} /> Revoir / valider les propositions
              </button>
            )}
          </div>
          {!espace?.id && (
            <p className="text-[11px] text-amber-600">Enregistrez d'abord l'espace pour générer les propositions.</p>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            <button
              onClick={() => setTool('navigation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                tool === 'navigation' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Hand size={13} /> Naviguer
            </button>
            <button
              onClick={() => setTool('rectangle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                tool === 'rectangle' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Square size={13} /> Créer rectangle
            </button>
            <button
              onClick={() => setTool('polygone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                tool === 'polygone' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Hexagon size={13} /> Créer polygone
            </button>
          </div>

          {/* Couleur */}
          <div className="flex items-center gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-transform"
                style={{ background: c, borderColor: color === c ? '#1e1b4b' : 'transparent' }}
              />
            ))}
          </div>

          {tool === 'polygone' && polyDraft.length > 0 && (
            <button
              onClick={finishPolygone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground"
            >
              <Check size={13} /> Terminer ({polyDraft.length} pts)
            </button>
          )}
          {tool === 'polygone' && polyDraft.length > 0 && (
            <button
              onClick={() => setPolyDraft([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border"
            >
              <Undo2 size={13} /> Annuler
            </button>
          )}

          {/* Import IA d'un plan / document */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleImportPlan}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted disabled:opacity-60"
          >
            {importing ? <AmandaProcessing size="sm" message="" /> : <FileUp size={13} />}
            {importing ? 'Analyse en cours…' : '📄 Importer un plan'}
          </button>

          <span className="text-[11px] text-muted-foreground ml-auto">
            {tool === 'navigation'
              ? 'Mode navigation — activez « Créer… » pour dessiner'
              : tool === 'rectangle'
              ? 'Glissez pour tracer un rectangle'
              : 'Cliquez pour poser chaque sommet, puis Terminer'}
          </span>
        </div>

        {/* Messages d'import IA */}
        {importError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{importError}</span>
            <button onClick={() => setImportError(null)} className="ml-auto text-red-500 hover:text-red-700 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {importWarning && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{importWarning}</span>
            <button onClick={() => setImportWarning(null)} className="ml-auto text-amber-500 hover:text-amber-700 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {dimHint && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            <span>
              Dimensions détectées : <strong>{dimHint.label}</strong>
            </span>
            {dimHint.largeur && dimHint.hauteur && (
              <button
                onClick={applyDimHint}
                className="ml-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700"
              >
                Appliquer {dimHint.largeur} × {dimHint.hauteur}
              </button>
            )}
            <button onClick={() => setDimHint(null)} className="ml-auto text-blue-500 hover:text-blue-700">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Canvas SVG — zoom-to-fit borné (largeur conteneur / 55vh) */}
        <div ref={containerRef} className="w-full flex justify-center">
          <div
            ref={svgRef}
            className={`relative rounded-2xl border-2 border-border overflow-hidden bg-white ${
              tool === 'navigation' ? '' : 'touch-none'
            }`}
            style={{
              width: dispSize.w ? dispSize.w : '100%',
              height: dispSize.h ? dispSize.h : 320,
            }}
          >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onSvgClick}
          >
            {/* Grille */}
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`v${i}`} x1={(i + 1) * 10} y1={0} x2={(i + 1) * 10} y2={100} stroke="#e8e4dc" strokeWidth={0.2} />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={(i + 1) * 10} x2={100} y2={(i + 1) * 10} stroke="#e8e4dc" strokeWidth={0.2} />
            ))}

            <defs>
              <pattern id="excl-hatch-edit" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="3" stroke="#94a3b8" strokeWidth="0.8" />
              </pattern>
            </defs>
            {/* Zones */}
            {zones.map((z) => {
              const isExcl = z.categorie === 'exclusion';
              return (
                <polygon
                  key={z.id}
                  points={(z.points || []).map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={isExcl ? 'url(#excl-hatch-edit)' : z.couleur || '#c7d2fe'}
                  fillOpacity={isExcl ? 0.7 : 0.5}
                  stroke={isExcl ? '#64748b' : '#1e1b4b'}
                  strokeWidth={0.4}
                />
              );
            })}

            {/* Aperçu rectangle en cours */}
            {previewPoints && (
              <polygon points={previewPoints} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.4} strokeDasharray="1,1" />
            )}

            {/* Polygone en cours */}
            {polyDraft.length > 0 && (
              <>
                <polyline
                  points={polyDraft.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.5}
                  strokeDasharray="1,1"
                />
                {polyDraft.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={1} fill={color} stroke="#1e1b4b" strokeWidth={0.2} />
                ))}
              </>
            )}
          </svg>

          {/* Labels des zones d'exclusion (overlay HTML pour éviter la distorsion SVG) */}
          {zones
            .filter((z) => z.categorie === 'exclusion' && z.nom)
            .map((z) => {
              const c = centerOf(z.points || []);
              return (
                <div
                  key={z.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-600 bg-white/70 px-1.5 py-0.5 rounded pointer-events-none"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  {z.nom}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste des zones */}
        {zones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Zones ({zones.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {zones.map((z) => {
                const isExcl = z.categorie === 'exclusion';
                return (
                  <div key={z.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg">
                    <span
                      className="w-3 h-3 rounded"
                      style={{
                        background: isExcl
                          ? 'repeating-linear-gradient(45deg,#94a3b8,#94a3b8 2px,transparent 2px,transparent 4px)'
                          : z.couleur,
                      }}
                    />
                    <span className="text-xs font-medium">{z.nom}</span>
                    <span className={`text-[10px] font-semibold ${isExcl ? 'text-slate-500' : 'text-muted-foreground'}`}>
                      {isExcl ? '🚫 sans table' : <span className="capitalize">{z.type}</span>}
                    </span>
                    <button
                      onClick={() => removeZone(z.id)}
                      className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!nom.trim() || saving || !owner?.prestataire_id}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Enregistrer
          </button>
        </div>
        {!owner?.prestataire_id && (
          <p className="text-xs text-amber-600">
            Aucune fiche prestataire propriétaire trouvée — reliez votre fiche entreprise avant de créer un espace.
          </p>
        )}
      </div>

      {curationOpen && espace?.id && (
        <PropositionsCurationModal espace_lieu_id={espace.id} onClose={() => setCurationOpen(false)} />
      )}
    </div>
  );
}