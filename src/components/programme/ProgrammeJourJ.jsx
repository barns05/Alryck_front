/**
 * ProgrammeJourJ — Interface organisateur du Programme du Jour J.
 *
 * Sections :
 *   1. Blocs à afficher (cases à cocher)
 *   2. Message de bienvenue (si activé)
 *   3. Programme détaillé (étapes CRUD + réordonnancement + bibliothèque)
 *   4. Prestataires (sélection + rôle personnalisé)
 *   5. Lien universel (copie + QR code)
 *
 * Props: evenement (entité Evenement complète)
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, ChevronRight, BookOpen, Eye, Palette } from 'lucide-react';
import { getTemplateForType } from './programmeTemplates';
import EtapeBibliothequeModal from './EtapeBibliothequeModal';
import LienUniverselSection from './LienUniverselSection';
import ProgrammePreview from './ProgrammePreview';
import { getTheme } from './programmeTheme';

const BLOCS_CONFIG = [
  { key: 'afficher_infos_evenement', label: "Informations de l'événement", icon: '📋' },
  { key: 'afficher_moments', label: "Étapes de l'événement", icon: '⏰' },
  { key: 'afficher_plan_de_table', label: 'Plan de table (table de l\'invité)', icon: '🪑' },
  { key: 'afficher_programme_detaille', label: 'Programme détaillé', icon: '🗓️' },
  { key: 'afficher_prestataires', label: 'Prestataires', icon: '👥' },
  { key: 'afficher_lieu_gps', label: 'Lieu & GPS', icon: '📍' },
  { key: 'afficher_message_perso', label: 'Message de bienvenue personnalisé', icon: '💬' },
];

const DEFAULT_BLOCS = {
  afficher_infos_evenement: true,
  afficher_moments: true,
  afficher_plan_de_table: false,
  afficher_programme_detaille: true,
  afficher_prestataires: false,
  afficher_lieu_gps: true,
  afficher_message_perso: false,
};

function generateToken() {
  return 'prog_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
}

export default function ProgrammeJourJ({ evenement }) {
  const qc = useQueryClient();
  const [showBiblio, setShowBiblio] = useState(false);
  const [templateChecked, setTemplateChecked] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [expandedEtapes, setExpandedEtapes] = useState(new Set());
  const [previewThemeId, setPreviewThemeId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedEtapes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Load or create ProgrammeJourJ ────────────────────────────────────────────
  const { data: programme, isLoading } = useQuery({
    queryKey: ['programme-jourj', evenement.id],
    queryFn: async () => {
      const existing = await base44.entities.ProgrammeJourJ.filter({ evenement_id: evenement.id });
      if (existing.length > 0) return existing[0];
      return await base44.entities.ProgrammeJourJ.create({
        evenement_id: evenement.id,
        blocs_actifs: DEFAULT_BLOCS,
        lien_universel_token: generateToken(),
        prestataires_affiches: [],
      });
    },
  });

  // ── Load etapes ──────────────────────────────────────────────────────────────
  const { data: etapes = [], isLoading: etapesLoading } = useQuery({
    queryKey: ['etapes-programme', evenement.id],
    queryFn: () => base44.entities.EtapeProgramme.filter({ evenement_id: evenement.id }),
    enabled: !!programme,
  });

  // ── Load EvenementPrestataire ────────────────────────────────────────────────
  const { data: epList = [] } = useQuery({
    queryKey: ['ep-programme', evenement.id],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: evenement.id }),
    enabled: !!programme,
  });

  // ── Auto-load template if no etapes ──────────────────────────────────────────
  useEffect(() => {
    if (programme && !etapesLoading && etapes.length === 0 && !templateChecked) {
      setTemplateChecked(true);
      const template = getTemplateForType(evenement.type_evenement);
      base44.entities.EtapeProgramme.bulkCreate(
        template.map((etape, i) => ({
          evenement_id: evenement.id,
          nom: etape.nom,
          ordre: i,
        }))
      ).then(() => {
        qc.invalidateQueries(['etapes-programme', evenement.id]);
      });
    }
  }, [programme, etapes, etapesLoading, templateChecked, evenement, qc]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const updateProgramme = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProgrammeJourJ.update(id, data),
    onSuccess: () => qc.invalidateQueries(['programme-jourj', evenement.id]),
  });

  const createEtape = useMutation({
    mutationFn: (data) => base44.entities.EtapeProgramme.create(data),
    onSuccess: () => qc.invalidateQueries(['etapes-programme', evenement.id]),
  });

  const updateEtape = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EtapeProgramme.update(id, data),
    onSuccess: () => qc.invalidateQueries(['etapes-programme', evenement.id]),
  });

  const deleteEtape = useMutation({
    mutationFn: (id) => base44.entities.EtapeProgramme.delete(id),
    onSuccess: () => qc.invalidateQueries(['etapes-programme', evenement.id]),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const sortedEtapes = [...etapes].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const handleToggleBloc = (key) => {
    if (!programme) return;
    const blocs = programme.blocs_actifs || DEFAULT_BLOCS;
    updateProgramme.mutate({
      id: programme.id,
      data: { blocs_actifs: { ...blocs, [key]: !blocs[key] } },
    });
  };

  const handleAddCustomEtape = () => {
    const maxOrdre = sortedEtapes.length > 0 ? Math.max(...sortedEtapes.map(e => e.ordre || 0)) : 0;
    createEtape.mutate({
      evenement_id: evenement.id,
      nom: 'Nouvelle étape',
      ordre: maxOrdre + 1,
    });
  };

  const handleAddFromBiblio = (suggestion) => {
    const maxOrdre = sortedEtapes.length > 0 ? Math.max(...sortedEtapes.map(e => e.ordre || 0)) : 0;
    createEtape.mutate({
      evenement_id: evenement.id,
      nom: suggestion.nom,
      ordre: maxOrdre + 1,
    });
  };

  const handleDuplicateEtape = (etape) => {
    const maxOrdre = sortedEtapes.length > 0 ? Math.max(...sortedEtapes.map(e => e.ordre || 0)) : 0;
    createEtape.mutate({
      evenement_id: evenement.id,
      nom: etape.nom + ' (copie)',
      heure: etape.heure,
      lieu: etape.lieu,
      gps_lien: etape.gps_lien,
      description: etape.description,
      ordre: maxOrdre + 1,
      moments_ids: etape.moments_ids,
    });
  };

  const handleMoveEtape = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sortedEtapes.length) return;
    const a = sortedEtapes[idx];
    const b = sortedEtapes[newIdx];
    base44.entities.EtapeProgramme.bulkUpdate([
      { id: a.id, ordre: b.ordre ?? newIdx },
      { id: b.id, ordre: a.ordre ?? idx },
    ]).then(() => qc.invalidateQueries(['etapes-programme', evenement.id]));
  };

  const handleTogglePrestataire = (ep) => {
    if (!programme) return;
    const current = programme.prestataires_affiches || [];
    const exists = current.find(p => p.prestataire_id === ep.prestataire_id);
    let newList;
    if (exists) {
      newList = current.filter(p => p.prestataire_id !== ep.prestataire_id);
    } else {
      newList = [...current, { prestataire_id: ep.prestataire_id, role_personnalise: ep.prestataire_domaine || '' }];
    }
    updateProgramme.mutate({ id: programme.id, data: { prestataires_affiches: newList } });
  };

  const handleUpdateRole = (prestataireId, role) => {
    if (!programme) return;
    const current = programme.prestataires_affiches || [];
    const newList = current.map(p =>
      p.prestataire_id === prestataireId ? { ...p, role_personnalise: role } : p
    );
    updateProgramme.mutate({ id: programme.id, data: { prestataires_affiches: newList } });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!programme) {
    return <p className="text-sm text-gray-400 text-center py-6">Impossible de charger le programme.</p>;
  }

  const blocs = programme.blocs_actifs || DEFAULT_BLOCS;

  // ── Mode prévisualisation ─────────────────────────────────────────────────────
  if (previewMode) {
    return (
      <ProgrammePreview
        programme={programme}
        evenement={evenement}
        initialThemeId={previewThemeId || programme.theme_id || 'navy_cristal'}
        onExit={() => setPreviewMode(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Thème visuel — lecture seule (configurable depuis l'onglet Organisation) */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2" style={{ borderColor: '#e0e7ff', background: '#faf5ff' }}>
        <Palette size={14} style={{ color: '#6366f1' }} />
        <span className="text-xs font-semibold" style={{ color: '#6366f1' }}>
          Thème : {getTheme(programme.theme_id || 'navy_cristal')?.name || 'Navy Cristal'}
        </span>
      </div>

      {/* Sous-titre + bouton prévisualiser */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Partagez tout avec vos invités</p>
        <button
          onClick={() => { setPreviewThemeId(programme.theme_id || 'navy_cristal'); setPreviewMode(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-colors shrink-0"
          style={{ borderColor: '#fbbf24', color: '#b45309', background: '#fffbeb' }}>
          <Eye size={14} /> Prévisualiser
        </button>
      </div>

      {/* Blocs à afficher */}
      <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: '#e0e7ff', background: '#fafbff' }}>
        <div className="flex items-center gap-2 pb-1" style={{ borderBottom: '1px solid #e0e7ff' }}>
          <span className="text-base">🎛️</span>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#4f46e5' }}>Blocs à afficher</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
          {BLOCS_CONFIG.map(b => (
            <label key={b.key} className="flex items-center gap-2.5 cursor-pointer py-2 px-2 -mx-2 rounded-lg hover:bg-white transition-colors">
              <input
                type="checkbox"
                checked={!!blocs[b.key]}
                onChange={() => handleToggleBloc(b.key)}
                className="w-4 h-4 rounded shrink-0"
              />
              <span className="text-sm" style={{ color: '#1e1b4b' }}>{b.icon} {b.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Message de bienvenue */}
      {blocs.afficher_message_perso && (
        <div className="rounded-2xl border-2 p-4 space-y-2" style={{ borderColor: '#e9d5ff', background: '#faf5ff' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7c3aed' }}>💬 Message de bienvenue</p>
          <textarea
            defaultValue={programme.message_bienvenue || ''}
            onBlur={e => {
              if (e.target.value !== (programme.message_bienvenue || '')) {
                updateProgramme.mutate({ id: programme.id, data: { message_bienvenue: e.target.value } });
              }
            }}
            placeholder="Votre message aux invités…"
            rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#e9d5ff' }}
          />
        </div>
      )}

      {/* Programme détaillé */}
      {blocs.afficher_programme_detaille && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#1e1b4b' }}>Programme détaillé</p>

          {etapesLoading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {!etapesLoading && sortedEtapes.map((etape, idx) => {
            const isExpanded = expandedEtapes.has(etape.id);
            return (
              <div key={etape.id} className="rounded-xl border overflow-hidden" style={{ borderColor: '#e2e8f0', background: '#f8faff' }}>
                {/* Header — replié par défaut, clic sur le titre déplie la carte */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    onClick={() => toggleExpand(etape.id)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    {isExpanded
                      ? <ChevronDown size={15} className="shrink-0" style={{ color: '#0369a1' }} />
                      : <ChevronRight size={15} className="shrink-0" style={{ color: '#0369a1' }} />}
                    {isExpanded ? (
                      <input
                        defaultValue={etape.nom}
                        onClick={e => e.stopPropagation()}
                        onBlur={e => {
                          if (e.target.value !== etape.nom) {
                            updateEtape.mutate({ id: etape.id, data: { nom: e.target.value } });
                          }
                        }}
                        className="flex-1 border rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>{etape.nom}</span>
                    )}
                  </button>
                  {/* Boutons de réordonnancement — toujours visibles */}
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleMoveEtape(idx, -1)} disabled={idx === 0}
                      className="p-1 rounded-lg border disabled:opacity-30" style={{ borderColor: '#e2e8f0' }}>
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => handleMoveEtape(idx, 1)} disabled={idx === sortedEtapes.length - 1}
                      className="p-1 rounded-lg border disabled:opacity-30" style={{ borderColor: '#e2e8f0' }}>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                {/* Contenu déplié */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        defaultValue={etape.heure || ''}
                        onBlur={e => {
                          if (e.target.value !== (etape.heure || '')) {
                            updateEtape.mutate({ id: etape.id, data: { heure: e.target.value } });
                          }
                        }}
                        placeholder="Heure"
                        className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                      <input
                        defaultValue={etape.lieu || ''}
                        onBlur={e => {
                          if (e.target.value !== (etape.lieu || '')) {
                            updateEtape.mutate({ id: etape.id, data: { lieu: e.target.value } });
                          }
                        }}
                        placeholder="Lieu"
                        className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    </div>
                    <input
                      defaultValue={etape.gps_lien || ''}
                      onBlur={e => {
                        if (e.target.value !== (etape.gps_lien || '')) {
                          updateEtape.mutate({ id: etape.id, data: { gps_lien: e.target.value } });
                        }
                      }}
                      placeholder="Lien Google Maps (optionnel)"
                      className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                    <textarea
                      defaultValue={etape.description || ''}
                      onBlur={e => {
                        if (e.target.value !== (etape.description || '')) {
                          updateEtape.mutate({ id: etape.id, data: { description: e.target.value } });
                        }
                      }}
                      placeholder="Description (optionnelle)"
                      rows={2}
                      className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none resize-none"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleDuplicateEtape(etape)}
                        className="flex-1 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1"
                        style={{ borderColor: '#e2e8f0', color: '#6b7280' }}>
                        <Copy size={11} /> Dupliquer
                      </button>
                      <button onClick={() => { if (confirm('Supprimer cette étape ?')) deleteEtape.mutate(etape.id); }}
                        className="flex-1 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1"
                        style={{ borderColor: '#fecaca', color: '#dc2626' }}>
                        <Trash2 size={11} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-2">
            <button onClick={() => setShowBiblio(true)}
              className="flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ borderColor: '#bae6fd', color: '#0369a1', background: 'white' }}>
              <BookOpen size={13} /> Depuis la bibliothèque
            </button>
            <button onClick={handleAddCustomEtape}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: '#0369a1' }}>
              <Plus size={13} /> Étape personnalisée
            </button>
          </div>
        </div>
      )}

      {/* Prestataires */}
      {blocs.afficher_prestataires && (
        <div className="rounded-2xl border-2 p-4 space-y-2" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#c2410c' }}>👥 Prestataires à afficher</p>
          {epList.length === 0 && (
            <p className="text-xs text-gray-400 py-2">Aucun prestataire associé à cet événement.</p>
          )}
          {epList.map(ep => {
            const current = (programme.prestataires_affiches || []).find(p => p.prestataire_id === ep.prestataire_id);
            const isChecked = !!current;
            return (
              <div key={ep.prestataire_id} className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleTogglePrestataire(ep)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm" style={{ color: '#1e1b4b' }}>{ep.prestataire_nom}</span>
                </label>
                {isChecked && (
                  <input
                    defaultValue={current?.role_personnalise || ''}
                    onBlur={e => {
                      if (e.target.value !== (current?.role_personnalise || '')) {
                        handleUpdateRole(ep.prestataire_id, e.target.value);
                      }
                    }}
                    placeholder="Rôle personnalisé (ex : Notre photographe, Notre DJ, Notre traiteur…)"
                    className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    style={{ borderColor: '#fed7aa' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Section partage — mise en valeur pour les invités */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📲</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>Partager le programme</p>
            <p className="text-xs text-gray-400">Envoyez ce lien à vos invités pour qu'ils accèdent au programme en un clic</p>
          </div>
        </div>
        <LienUniverselSection programme={programme} />
      </div>

      {/* Bibliothèque modal */}
      {showBiblio && (
        <EtapeBibliothequeModal
          onClose={() => setShowBiblio(false)}
          onAdd={(suggestion) => handleAddFromBiblio(suggestion)}
        />
      )}

    </div>
  );
}