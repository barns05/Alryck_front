/**
 * TableEditModal — Création / Édition d'une table et assignation d'invités
 * Props: table (null = mode assignation seul), evenementId, allTables, invites, onClose, onSaved
 */
import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Trash2, Plus, X, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { tableDisplayName } from '@/lib/tableName';

const AVATAR_COLORS = [
  '#1e1b4b', '#7c3aed', '#1d4ed8', '#0f766e', '#15803d',
  '#c2410c', '#b91c1c', '#be185d', '#6d28d9', '#0369a1',
];

function getAvatarColor(name) {
  const idx = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ prenom, nom, size = 32 }) {
  const initiales = `${(prenom || '?')[0]}${(nom || '')[0] || ''}`.toUpperCase();
  const color = getAvatarColor(prenom);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
    }}>
      {initiales}
    </div>
  );
}

export default function TableEditModal({ table, evenementId, allTables, invites, onClose, onSaved }) {
  const isNew = !table;
  const [nomPerso, setNomPerso] = useState(table?.nom_perso || '');
  const [capacite, setCapacite] = useState(table?.capacite || null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDeplace, setConfirmDeplace] = useState(null); // { inv, ancienneTableNom }
  const scrollRef = useRef(null);
  const savedScrollTop = useRef(null);

  // IDs des invités assignés localement (state local pour éviter de fermer la modal)
  const initialAssignes = table
    ? invites.filter(i => i.table_attribuee === table.id).map(i => i.id)
    : [];
  const [assignesIds, setAssignesIds] = useState(initialAssignes);

  // Invités actuellement à cette table (source locale)
  const invitesTable = invites.filter(i => assignesIds.includes(i.id));

  // Invités disponibles (non assignés à cette table selon l'état local)
  const invitesDispo = invites.filter(inv => {
    if (assignesIds.includes(inv.id)) return false;
    if (!search) return true;
    return `${inv.prenom} ${inv.nom}`.toLowerCase().includes(search.toLowerCase());
  });

  const isOver = capacite && invitesTable.length > capacite;

  const handleSave = async () => {
    setSaving(true);
    if (isNew) {
      await base44.entities.TableEvenement.create({
        evenement_id: evenementId,
        nom: `Table ${allTables.length + 1}`,
        nom_perso: nomPerso.trim() || null,
        capacite: capacite || null,
        ordre: allTables.length,
      });
    } else {
      await base44.entities.TableEvenement.update(table.id, {
        nom_perso: nomPerso.trim() || null,
        capacite: capacite || null,
      });
    }
    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!table) return;
    setDeleting(true);
    await Promise.all(
      invitesTable.map(inv => base44.entities.Invite.update(inv.id, { table_attribuee: '', date_assignation_table: null }))
    );
    await base44.entities.TableEvenement.delete(table.id);
    setDeleting(false);
    onSaved();
  };

  // Restaurer le scroll après chaque ajout
  useEffect(() => {
    if (savedScrollTop.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = savedScrollTop.current;
      savedScrollTop.current = null;
    }
  }, [assignesIds]);

  const doAddInvite = async (inv) => {
    if (scrollRef.current) {
      savedScrollTop.current = scrollRef.current.scrollTop;
    }
    const newTable = table ? table.id : '';
    const cur = inv.table_attribuee || '';
    setAssignesIds(prev => [...prev, inv.id]);
    // On ne date l'assignation QUE si la table change réellement de valeur.
    if (cur !== newTable) {
      await base44.entities.Invite.update(inv.id, {
        table_attribuee: newTable,
        date_assignation_table: newTable ? new Date().toISOString() : null,
      });
    }
  };

  const handleAddInvite = (inv) => {
    // Garde-fou anti-doublon
    if (assignesIds.includes(inv.id)) return;
    // Si déjà assigné à une autre table, demander confirmation
    if (inv.table_attribuee && inv.table_attribuee !== (table?.id || '')) {
      const ancienneTableNom = tableDisplayName(allTables.find(t => t.id === inv.table_attribuee)) || inv.table_attribuee;
      setConfirmDeplace({ inv, ancienneTableNom });
      return;
    }
    doAddInvite(inv);
  };

  const handleRemoveInvite = async (inv) => {
    // Mise à jour locale immédiate — la modal reste ouverte
    setAssignesIds(prev => prev.filter(id => id !== inv.id));
    if ((inv.table_attribuee || '') !== '') {
      await base44.entities.Invite.update(inv.id, { table_attribuee: '', date_assignation_table: null });
    }
  };

  // Fermeture : rafraîchir le parent sans recharger la modal
  const handleClose = () => {
    onSaved();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 mr-1">
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>
              {isNew ? '✨ Nouvelle table' : `✏️ ${tableDisplayName(table) || 'Modifier la table'}`}
            </h3>
          </div>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <div ref={scrollRef} className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
          {/* Nom de la table */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom personnalisé (optionnel)</label>
            <div className="flex items-center gap-3 border rounded-2xl px-3 py-2.5" style={{ borderColor: '#e2e8f0' }}>
              <span className="text-xl shrink-0">🪑</span>
              <input
                type="text"
                value={nomPerso}
                onChange={e => setNomPerso(e.target.value)}
                placeholder="ex : Tulipe, Table des mariés…"
                className="flex-1 bg-transparent outline-none text-sm font-medium"
                style={{ color: '#1e1b4b', fontSize: 16 }}
              />
            </div>
            {!isNew && table?.nom && (
              <p className="text-[11px] text-gray-400">Référence : {table.nom}</p>
            )}
          </div>

          {/* Capacité */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacité (optionnelle)</label>
            <div className="flex items-center gap-3 border rounded-2xl px-4 py-3" style={{ borderColor: '#e2e8f0' }}>
              <button
                onClick={() => setCapacite(c => c && c > 1 ? c - 1 : null)}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-colors hover:bg-slate-50"
                style={{ borderColor: '#e2e8f0', color: '#374151' }}>
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-xl font-bold" style={{ color: '#1e1b4b' }}>{capacite || '∞'}</span>
                <span className="text-xs text-gray-400 ml-1">places</span>
              </div>
              <button
                onClick={() => setCapacite(c => (c || 0) + 1)}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-colors hover:bg-slate-50"
                style={{ borderColor: '#e2e8f0', color: '#374151' }}>
                +
              </button>
            </div>
          </div>

          {/* Invités à cette table */}
          {!isNew && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Invités à cette table
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: isOver ? '#fef2f2' : '#eef2ff', color: isOver ? '#dc2626' : '#4338ca' }}>
                  {invitesTable.length}{capacite ? ` / ${capacite}` : ''}
                </span>
              </div>
              {isOver && (
                <p className="text-xs text-red-500 pl-1">⚠️ {invitesTable.length - capacite} invité{invitesTable.length - capacite > 1 ? 's' : ''} en trop</p>
              )}
              {invitesTable.length === 0 ? (
                <p className="text-xs text-gray-300 italic">Aucun invité assigné à cette table</p>
              ) : (
                <div className="space-y-2">
                  {invitesTable.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                      style={{ borderColor: '#f1f5f9' }}>
                      <Avatar prenom={inv.prenom} nom={inv.nom} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1e1b4b' }}>
                          {inv.prenom} {inv.nom}
                          {inv.categorie === 'Mineur' && (
                            <span className="text-[10px] font-normal text-violet-500 ml-1">
                              ({inv.age ? `${inv.age} ans` : 'Mineur'})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {((inv.allergenes || []).length > 0 || inv.regime_alimentaire) && (
                            <span className="text-[10px] font-medium" style={{ color: '#be123c' }}>
                              🌿 {inv.regime_alimentaire
                                ? inv.regime_alimentaire
                                : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveInvite(inv)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bandeau confirmation déplacement */}
          {confirmDeplace && (
            <div className="rounded-2xl border-2 p-4 space-y-3" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
              <p className="text-sm font-semibold" style={{ color: '#c2410c' }}>
                ⚠️ Déplacer cet invité ?
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{confirmDeplace.inv.prenom} {confirmDeplace.inv.nom}</span> est actuellement à la <span className="font-semibold">{confirmDeplace.ancienneTableNom}</span>. Voulez-vous le déplacer vers cette table ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { doAddInvite(confirmDeplace.inv); setConfirmDeplace(null); }}
                  className="flex-1 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: '#c2410c' }}>
                  Oui, déplacer
                </button>
                <button
                  onClick={() => setConfirmDeplace(null)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border-2"
                  style={{ borderColor: '#e2e8f0', color: '#374151' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Ajouter des invités */}
          {!isNew && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ajouter des invités</p>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2" style={{ borderColor: '#e2e8f0' }}>
                <Search size={14} className="text-gray-300 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un invité…"
                  style={{ fontSize: 16 }}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {invitesDispo.length === 0 ? (
                  <p className="text-xs text-gray-300 italic text-center py-3">
                    {search ? 'Aucun résultat' : 'Tous les invités sont déjà assignés à cette table'}
                  </p>
                ) : (
                  invitesDispo.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors">
                      <Avatar prenom={inv.prenom} nom={inv.nom} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1e1b4b' }}>
                          {inv.prenom} {inv.nom}
                          {inv.categorie === 'Mineur' && (
                            <span className="text-[10px] font-normal text-violet-500 ml-1">
                              ({inv.age ? `${inv.age} ans` : 'Mineur'})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inv.table_attribuee && !assignesIds.includes(inv.id) && (
                            <span className="text-[10px] text-orange-500">
                              → {tableDisplayName(allTables.find(t => t.id === inv.table_attribuee)) || inv.table_attribuee}
                            </span>
                          )}
                          {((inv.allergenes || []).length > 0 || inv.regime_alimentaire) && (
                            <span className="text-[10px] font-medium" style={{ color: '#be123c' }}>
                              🌿 {inv.regime_alimentaire
                                ? inv.regime_alimentaire
                                : `${inv.allergenes.length} allergie${inv.allergenes.length > 1 ? 's' : ''}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddInvite(inv)}
                        disabled={assignesIds.includes(inv.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-30"
                        style={{ background: '#c2410c' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 pb-8 pt-3 border-t shrink-0 flex gap-3" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={handleClose}
            className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
            style={{ borderColor: '#e2e8f0' }}>
            {isNew ? 'Annuler' : 'Fermer'}
          </button>
          {(isNew || nomPerso !== (table?.nom_perso || '') || capacite !== table?.capacite) && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#1e1b4b' }}>
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : '✅ Enregistrer'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}