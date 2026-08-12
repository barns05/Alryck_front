/**
 * ChecklistOrganisateur
 * Module complet de checklist côté espace client (portail invités / espace perso).
 * Ultra simple, mobile-first. Une vue, des cases à cocher.
 * Props: evenementId, typeEvenement
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Circle, Lightbulb, Pencil, Trash2, AlertTriangle, RotateCcw, Plus, Check, X } from 'lucide-react';
import { getTemplateForType } from './checklistTemplates';
import BibliothequeSuggestionsModal from './BibliothequeSuggestionsModal';
import { format, isPast, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const MOIS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Fév' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Avr' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Juin' },
  { value: '07', label: 'Juil' }, { value: '08', label: 'Aoû' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Déc' },
];
const ANNEES = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i));

function buildDateFromSelects(j, m, a) {
  if (!j || !m || !a) return null;
  return `${a}-${m}-${j.padStart(2, '0')}`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try { return parseISO(dateStr); } catch { return null; }
}

function DateLimiteDisplay({ dateStr }) {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (!d) return null;
  const isLate = isPast(d);
  const diff = differenceInDays(d, new Date());
  return (
    <span
      className="flex items-center gap-0.5 text-[10px] font-medium shrink-0"
      style={{ color: isLate ? '#dc2626' : diff <= 7 ? '#c2410c' : '#6b7280' }}
    >
      {isLate && <AlertTriangle size={10} />}
      {format(d, 'd MMM', { locale: fr })}
    </span>
  );
}

// ── Formulaire d'ajout/édition inline ────────────────────────────────────────
function TacheForm({ initialTitre = '', initialDate = null, onSave, onCancel, label = 'Ajouter' }) {
  const [titre, setTitre] = useState(initialTitre);
  const initD = initialDate ? {
    j: initialDate.slice(8, 10),
    m: initialDate.slice(5, 7),
    a: initialDate.slice(0, 4),
  } : { j: '', m: '', a: '' };
  const [jour, setJour] = useState(initD.j);
  const [mois, setMois] = useState(initD.m);
  const [annee, setAnnee] = useState(initD.a);

  const jours = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const handleSave = () => {
    if (!titre.trim()) return;
    const date = buildDateFromSelects(jour, mois, annee);
    onSave({ titre: titre.trim(), date_limite: date });
  };

  return (
    <div className="rounded-2xl border-2 p-3 space-y-3" style={{ borderColor: '#1e1b4b', background: '#f8faff' }}>
      <input
        type="text"
        value={titre}
        onChange={e => setTitre(e.target.value)}
        placeholder="Titre de la tâche…"
        autoFocus
        style={{ fontSize: 16, borderColor: '#e2e8f0' }}
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
      />
      <div className="space-y-1">
        <p className="text-[10px] text-gray-400 font-medium">Date limite (optionnelle)</p>
        <div className="flex gap-1.5">
          <select value={jour} onChange={e => setJour(e.target.value)}
            className="flex-1 border rounded-lg px-1.5 py-1.5 text-xs focus:outline-none" style={{ borderColor: '#e2e8f0' }}>
            <option value="">Jour</option>
            {jours.map(j => <option key={j} value={j}>{parseInt(j, 10)}</option>)}
          </select>
          <select value={mois} onChange={e => setMois(e.target.value)}
            className="flex-1 border rounded-lg px-1.5 py-1.5 text-xs focus:outline-none" style={{ borderColor: '#e2e8f0' }}>
            <option value="">Mois</option>
            {MOIS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(e.target.value)}
            className="flex-1 border rounded-lg px-1.5 py-1.5 text-xs focus:outline-none" style={{ borderColor: '#e2e8f0' }}>
            <option value="">Année</option>
            {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-500"
          style={{ borderColor: '#e2e8f0' }}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={!titre.trim()}
          className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
          style={{ background: '#1e1b4b' }}>
          {label}
        </button>
      </div>
    </div>
  );
}

// ── Ligne de tâche ─────────────────────────────────────────────────────────────
function TacheLigne({ tache, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const isLate = tache.date_limite && !tache.complete && isPast(parseISO(tache.date_limite));

  if (editing) {
    return (
      <TacheForm
        initialTitre={tache.titre}
        initialDate={tache.date_limite}
        onSave={(data) => { onEdit(tache.id, data); setEditing(false); }}
        onCancel={() => setEditing(false)}
        label="Enregistrer"
      />
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors"
      style={{ borderColor: tache.complete ? '#e8e4dc' : isLate ? '#fecaca' : '#e8e4dc', background: tache.complete ? '#fafaf9' : isLate ? '#fff5f5' : 'white' }}
    >
      <button onClick={() => onToggle(tache.id)} className="shrink-0">
        {tache.complete
          ? <CheckCircle2 size={20} className="text-green-500" />
          : <Circle size={20} className="text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug"
          style={{ color: tache.complete ? '#9ca3af' : '#1e1b4b', textDecoration: tache.complete ? 'line-through' : 'none' }}>
          {tache.titre}
        </p>
        {tache.date_limite && !tache.complete && (
          <DateLimiteDisplay dateStr={tache.date_limite} />
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => setEditing(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 transition-colors">
          <Pencil size={12} />
        </button>
        <button onClick={() => onDelete(tache.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function ChecklistOrganisateur({ evenementId, typeEvenement }) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBibliotheque, setShowBibliotheque] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: taches = [], isLoading } = useQuery({
    queryKey: ['taches-checklist', evenementId],
    queryFn: () => base44.entities.TacheChecklist.filter({ evenement_id: evenementId }, 'ordre', 200),
    enabled: !!evenementId,
    staleTime: 15000,
  });

  // Chargement automatique du template au 1er accès (si aucune tâche)
  useEffect(() => {
    if (!isLoading && taches.length === 0 && evenementId) {
      const template = getTemplateForType(typeEvenement);
      const records = template.map((titre, i) => ({
        evenement_id: evenementId,
        titre,
        complete: false,
        ordre: i,
        source: 'Template',
      }));
      base44.entities.TacheChecklist.bulkCreate(records).then(() => {
        qc.invalidateQueries(['taches-checklist', evenementId]);
      });
    }
  }, [isLoading, taches.length, evenementId, typeEvenement]);

  const refetch = () => qc.invalidateQueries(['taches-checklist', evenementId]);

  const done = taches.filter(t => t.complete).length;
  const total = taches.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleToggle = async (id) => {
    const t = taches.find(t => t.id === id);
    if (!t) return;
    await base44.entities.TacheChecklist.update(id, { complete: !t.complete });
    refetch();
  };

  const handleEdit = async (id, data) => {
    await base44.entities.TacheChecklist.update(id, data);
    refetch();
  };

  const handleDelete = async (id) => {
    await base44.entities.TacheChecklist.delete(id);
    refetch();
  };

  const handleAdd = async (data) => {
    await base44.entities.TacheChecklist.create({
      evenement_id: evenementId,
      titre: data.titre,
      date_limite: data.date_limite || null,
      complete: false,
      ordre: taches.length,
      source: 'Personnalisée',
    });
    setShowAddForm(false);
    refetch();
  };

  const handleAddFromBibliotheque = async (titres) => {
    const records = titres.map((titre, i) => ({
      evenement_id: evenementId,
      titre,
      complete: false,
      ordre: taches.length + i,
      source: 'Bibliothèque',
    }));
    await base44.entities.TacheChecklist.bulkCreate(records);
    refetch();
  };

  const handleReset = async () => {
    setSaving(true);
    // Supprimer toutes les tâches existantes
    await Promise.all(taches.map(t => base44.entities.TacheChecklist.delete(t.id)));
    // Recharger le template
    const template = getTemplateForType(typeEvenement);
    const records = template.map((titre, i) => ({
      evenement_id: evenementId,
      titre,
      complete: false,
      ordre: i,
      source: 'Template',
    }));
    await base44.entities.TacheChecklist.bulkCreate(records);
    setSaving(false);
    setShowConfirmReset(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Sous-titre (le titre est déjà dans le header de la modal) */}
      <p className="text-sm" style={{ color: '#6b7280' }}>Vos tâches et préparatifs centralisés</p>

      {/* Barre de progression */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: '#1e1b4b' }}>
              {done} <span className="font-normal text-gray-400">sur</span> {total} <span className="font-normal text-gray-400">tâches terminées</span>
            </p>
            {done === total && <span className="text-xs text-green-600 font-semibold">🎉 Tout est prêt !</span>}
          </div>
          <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: '#e8e4dc' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#16a34a' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Liste des tâches */}
      <div className="space-y-2">
        <AnimatePresence>
          {taches.map(tache => (
            <TacheLigne
              key={tache.id}
              tache={tache}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
        {taches.length === 0 && !isLoading && (
          <p className="text-center text-sm text-gray-400 py-6">Aucune tâche pour le moment</p>
        )}
      </div>

      {/* Formulaire ajout */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <TacheForm
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
              label="Ajouter"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boutons d'action */}
      {!showAddForm && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-semibold"
            style={{ background: '#1e1b4b' }}>
            <Plus size={15} /> Ajouter une tâche
          </button>
          <button
            onClick={() => setShowBibliotheque(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-colors hover:bg-amber-50"
            style={{ borderColor: '#fde68a', color: '#92400e' }}>
            <Lightbulb size={15} />
          </button>
        </div>
      )}

      {/* Réinitialiser */}
      {taches.length > 0 && !showAddForm && (
        <>
          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
              <RotateCcw size={12} /> Réinitialiser la checklist
            </button>
          ) : (
            <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
              <p className="text-sm font-semibold text-center" style={{ color: '#dc2626' }}>
                Réinitialiser la checklist ?
              </p>
              <p className="text-xs text-center text-gray-500">
                Cette action remplacera toutes vos tâches actuelles par le template de départ.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirmReset(false)}
                  className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-500"
                  style={{ borderColor: '#e2e8f0' }}>
                  Annuler
                </button>
                <button onClick={handleReset} disabled={saving}
                  className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: '#dc2626' }}>
                  {saving ? 'En cours…' : 'Oui, réinitialiser'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal bibliothèque */}
      <AnimatePresence>
        {showBibliotheque && (
          <BibliothequeSuggestionsModal
            existingTitres={taches.map(t => t.titre)}
            onClose={() => setShowBibliotheque(false)}
            onAdd={handleAddFromBibliotheque}
          />
        )}
      </AnimatePresence>
    </div>
  );
}