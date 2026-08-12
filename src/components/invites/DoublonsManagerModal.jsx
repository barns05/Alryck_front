/**
 * DoublonsManagerModal — Gestion des doublons d'invités
 * Props: fiches (array d'invités en doublon), onClose, onDone (callback après action)
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

const ALLERGENE_LABELS = {
  gluten: 'Gluten', crustaces: 'Crustacés', oeufs: 'Œufs', poissons: 'Poissons',
  arachides: 'Arachides', soja: 'Soja', lait: 'Lait', fruits_coque: 'Fruits à coque',
  celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites',
  lupin: 'Lupin', mollusques: 'Mollusques',
};

const STATUT_STYLES = {
  'Confirmé':   { bg: '#f0fdf4', color: '#16a34a', dot: '🟢' },
  'Absent':     { bg: '#fff1f2', color: '#be123c', dot: '🔴' },
  'En attente': { bg: '#f9fafb', color: '#6b7280', dot: '⚪' },
  'Peut-être':  { bg: '#fff7ed', color: '#c2410c', dot: '🟠' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

export default function DoublonsManagerModal({ fiches, onClose, onDone }) {
  const [selectedId, setSelectedId] = useState(fiches[0]?.id || null);
  const [loading, setLoading] = useState(false);

  const ficheGardee = fiches.find(f => f.id === selectedId);
  const fichesSuppr = fiches.filter(f => f.id !== selectedId);

  const handleFusionner = async () => {
    if (!ficheGardee) return;
    setLoading(true);

    // Fusionner les données utiles des autres fiches sur la fiche gardée
    const patch = {};

    if (!ficheGardee.table_attribuee) {
      const src = fichesSuppr.find(f => f.table_attribuee);
      if (src) patch.table_attribuee = src.table_attribuee;
    }

    if (!ficheGardee.regime_alimentaire) {
      const src = fichesSuppr.find(f => f.regime_alimentaire);
      if (src) patch.regime_alimentaire = src.regime_alimentaire;
    }

    if (!ficheGardee.besoin_hebergement) {
      const src = fichesSuppr.find(f => f.besoin_hebergement);
      if (src) patch.besoin_hebergement = src.besoin_hebergement;
    }

    // Fusionner les allergènes (union)
    const allergenesFusionnes = Array.from(new Set([
      ...(ficheGardee.allergenes || []),
      ...fichesSuppr.flatMap(f => f.allergenes || []),
    ]));
    if (allergenesFusionnes.length > (ficheGardee.allergenes || []).length) {
      patch.allergenes = allergenesFusionnes;
    }

    if (Object.keys(patch).length > 0) {
      await base44.entities.Invite.update(ficheGardee.id, patch);
    }

    // Supprimer les autres fiches
    await Promise.all(fichesSuppr.map(f => base44.entities.Invite.delete(f.id)));

    setLoading(false);
    onDone();
  };

  const handleSupprimerSansFusion = async () => {
    setLoading(true);
    await Promise.all(fichesSuppr.map(f => base44.entities.Invite.delete(f.id)));
    setLoading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>⚠️ Gérer les doublons</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {fiches.length} fiches pour <span className="font-semibold">{fiches[0]?.prenom} {fiches[0]?.nom}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">
            Sélectionnez la fiche à <span className="font-semibold text-green-700">conserver</span>. Les autres seront supprimées.
          </p>

          {fiches.map((fiche, idx) => {
            const statut = fiche.statut_rsvp || 'En attente';
            const style = STATUT_STYLES[statut] || STATUT_STYLES['En attente'];
            const allergenes = (fiche.allergenes || []).map(a => ALLERGENE_LABELS[a] || a);
            const isSelected = fiche.id === selectedId;

            return (
              <button
                key={fiche.id}
                onClick={() => setSelectedId(fiche.id)}
                className="w-full text-left rounded-2xl border-2 p-4 space-y-2 transition-all"
                style={{
                  borderColor: isSelected ? '#16a34a' : '#e2e8f0',
                  background: isSelected ? '#f0fdf4' : '#fafafa',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: isSelected ? '#16a34a' : '#d1d5db' }}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-green-600" />}
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>
                      Fiche {idx + 1}
                      {isSelected && <span className="ml-2 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">À conserver</span>}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.color }}>
                    {style.dot} {statut}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-7">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Catégorie</p>
                    <p className="text-xs font-medium text-gray-700">
                      {fiche.categorie || 'Adulte'}{fiche.age ? ` · ${fiche.age} ans` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mode</p>
                    <p className="text-xs font-medium text-gray-700">{fiche.mode_invitation || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Table</p>
                    <p className="text-xs font-medium text-gray-700">{fiche.table_attribuee || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Hébergement</p>
                    <p className="text-xs font-medium text-gray-700">{fiche.besoin_hebergement ? 'Oui' : 'Non'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Allergènes</p>
                    <p className="text-xs font-medium text-gray-700">
                      {allergenes.length > 0 ? allergenes.join(', ') : '—'}
                    </p>
                  </div>
                  {fiche.regime_alimentaire && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Régime</p>
                      <p className="text-xs font-medium text-gray-700">{fiche.regime_alimentaire}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Créé le</p>
                    <p className="text-xs font-medium text-gray-700">{formatDate(fiche.created_date)}</p>
                  </div>
                </div>
              </button>
            );
          })}

          {fichesSuppr.length > 0 && (
            <div className="rounded-xl px-4 py-2.5 text-xs" style={{ background: '#fef9c3', color: '#854d0e' }}>
              ℹ️ En fusionnant, les données utiles des {fichesSuppr.length} autre{fichesSuppr.length > 1 ? 's' : ''} fiche{fichesSuppr.length > 1 ? 's' : ''} (table, allergènes, régime, hébergement) seront reportées sur la fiche conservée avant suppression.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0 space-y-2" style={{ borderColor: '#f1f5f9' }}>
          <div className="flex gap-2">
            <button
              onClick={handleFusionner}
              disabled={loading || !selectedId}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: '#16a34a' }}>
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✅ Fusionner et supprimer les autres'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSupprimerSansFusion}
              disabled={loading || !selectedId}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2 disabled:opacity-40"
              style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
              🗑️ Supprimer sans fusionner
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2"
              style={{ borderColor: '#e2e8f0', color: '#6b7280' }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}