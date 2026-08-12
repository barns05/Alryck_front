import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Phone, Mail, Package, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FournisseurModal from '@/components/commandes/FournisseurModal';
import RegleCommandeModal from '@/components/commandes/RegleCommandeModal';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import BulkSelectionBar from '@/components/ui/BulkSelectionBar';

const CAT_COLORS = {
  'Viande': 'bg-red-100 text-red-700',
  'Poisson': 'bg-blue-100 text-blue-700',
  'Boulangerie': 'bg-amber-100 text-amber-700',
  'Pâtisserie': 'bg-pink-100 text-pink-700',
  'Vins': 'bg-purple-100 text-purple-700',
  'Alcools': 'bg-indigo-100 text-indigo-700',
  'Champagne': 'bg-yellow-100 text-yellow-700',
  'Légumes': 'bg-green-100 text-green-700',
  'Épicerie': 'bg-orange-100 text-orange-700',
  'Autre': 'bg-slate-100 text-slate-600',
};

export default function BlocCommandes() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('fournisseurs');
  const [showFourn, setShowFourn] = useState(false);
  const [editFourn, setEditFourn] = useState(null);
  const [showRegle, setShowRegle] = useState(false);
  const [editRegle, setEditRegle] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'fourn'|'regle', id, nom }
  const [selectedFourn, setSelectedFourn] = useState([]);
  const [selectedRegles, setSelectedRegles] = useState([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  const { data: fournisseurs = [] } = useQuery({
    queryKey: ['fournisseurs'],
    queryFn: () => base44.entities.Fournisseur.list('-created_date', 200),
  });
  const { data: regles = [] } = useQuery({
    queryKey: ['regles-commande'],
    queryFn: () => base44.entities.RegleCommande.list('-created_date', 500),
  });
  const { data: options = [] } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.list(),
  });

  const deleteFourn = useMutation({
    mutationFn: (id) => base44.entities.Fournisseur.delete(id),
    onSuccess: () => { qc.invalidateQueries(['fournisseurs']); setDeleteConfirm(null); },
  });
  const deleteRegle = useMutation({
    mutationFn: (id) => base44.entities.RegleCommande.delete(id),
    onSuccess: () => { qc.invalidateQueries(['regles-commande']); setDeleteConfirm(null); },
  });

  const bulkDeleteFourn = useMutation({
    mutationFn: () => Promise.all(selectedFourn.map(id => base44.entities.Fournisseur.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['fournisseurs']); setSelectedFourn([]); setBulkDeleteModal(false); },
  });
  const bulkDeleteRegles = useMutation({
    mutationFn: () => Promise.all(selectedRegles.map(id => base44.entities.RegleCommande.delete(id))),
    onSuccess: () => { qc.invalidateQueries(['regles-commande']); setSelectedRegles([]); setBulkDeleteModal(false); },
  });

  const toggleFourn = (id) => setSelectedFourn(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleRegle = (id) => setSelectedRegles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const activeCount = activeTab === 'fournisseurs' ? selectedFourn.length : selectedRegles.length;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {[
          { k: 'fournisseurs', l: `🏪 Fournisseurs (${fournisseurs.length})` },
          { k: 'regles', l: `📐 Règles de commande (${regles.length})` },
        ].map(({ k, l }) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === k ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ──────────── FOURNISSEURS ──────────── */}
      {activeTab === 'fournisseurs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? 's' : ''} enregistré{fournisseurs.length !== 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditFourn(null); setShowFourn(true); }}>
              <Plus size={14} /> Nouveau fournisseur
            </Button>
          </div>

          {fournisseurs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun fournisseur. Créez votre premier contact fournisseur.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <input type="checkbox"
                  checked={fournisseurs.length > 0 && fournisseurs.every(f => selectedFourn.includes(f.id))}
                  onChange={e => e.target.checked ? setSelectedFourn(fournisseurs.map(f => f.id)) : setSelectedFourn([])}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground">Tout sélectionner</span>
              </div>
              {fournisseurs.map(f => (
                <div key={f.id} className={`bg-card border border-border rounded-xl p-4 ${selectedFourn.includes(f.id) ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{f.nom}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          f.mode_commande === 'email' ? 'bg-blue-100 text-blue-700' :
                          f.mode_commande === 'téléphone' ? 'bg-green-100 text-green-700' :
                          f.mode_commande === 'bon_de_commande' ? 'bg-violet-100 text-violet-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {f.mode_commande === 'email' ? '📧' :
                           f.mode_commande === 'téléphone' ? '📞' :
                           f.mode_commande === 'bon_de_commande' ? `📄 Bon de commande${f.bon_commande_usage === 'envoi_fournisseur' ? ' (envoi)' : ' (interne)'}` :
                           '🔗 Autre'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {f.telephone && <span className="flex items-center gap-1"><Phone size={11} />{f.telephone}</span>}
                        {f.email && <span className="flex items-center gap-1"><Mail size={11} />{f.email}</span>}
                      </div>
                      {f.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {f.categories.map(c => (
                            <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[c] || CAT_COLORS['Autre']}`}>{c}</span>
                          ))}
                        </div>
                      )}
                      {f.notes && <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1">{f.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="checkbox" checked={selectedFourn.includes(f.id)} onChange={() => toggleFourn(f.id)} className="accent-primary" />
                      <button onClick={() => { setEditFourn(f); setShowFourn(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'fourn', id: f.id, nom: f.nom })} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────── RÈGLES DE COMMANDE ──────────── */}
      {activeTab === 'regles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{regles.length} règle{regles.length !== 1 ? 's' : ''} configurée{regles.length !== 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditRegle(null); setShowRegle(true); }}
              disabled={fournisseurs.length === 0}
              title={fournisseurs.length === 0 ? 'Créez d\'abord un fournisseur' : ''}>
              <Plus size={14} /> Nouvelle règle
            </Button>
          </div>

          {fournisseurs.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              ⚠️ Créez d'abord vos fournisseurs dans l'onglet "Fournisseurs" avant d'ajouter des règles.
            </div>
          )}

          {regles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpDown size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune règle. Associez vos prestations à des fournisseurs avec les quantités par convive.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1">
                <input type="checkbox"
                  checked={regles.length > 0 && regles.every(r => selectedRegles.includes(r.id))}
                  onChange={e => e.target.checked ? setSelectedRegles(regles.map(r => r.id)) : setSelectedRegles([])}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground">Tout sélectionner</span>
              </div>
              {regles.map(r => (
                <div key={r.id} className={`bg-card border border-border rounded-xl p-4 ${selectedRegles.includes(r.id) ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.option_prestation_nom}</p>
                        <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                        <p className="text-sm text-primary font-medium">{r.fournisseur_nom}</p>
                      </div>
                      {/* Multi-produits */}
                      {r.produits?.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {r.produits.map((p, i) => (
                            <div key={p.id || i} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                              <span className="font-medium text-foreground">{p.nom}</span>
                              {p.mode_qte === 'fixe'
                                ? <span>— {p.qte_fixe} {p.unite} (fixe)</span>
                                : <span>— {p.qte_adulte || 0} {p.unite}/adulte
                                    {p.qte_adolescent > 0 ? `, ${p.qte_adolescent} ${p.unite}/ado` : ''}
                                    {p.qte_enfant > 0 ? `, ${p.qte_enfant} ${p.unite}/enf.` : ''}
                                  </span>
                              }
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {r.qte_adulte > 0 && <span>Adulte : {r.qte_adulte} {r.unite}</span>}
                          {r.qte_adolescent > 0 && <span>Ado : {r.qte_adolescent} {r.unite}</span>}
                          {r.qte_enfant > 0 && <span>Enfant : {r.qte_enfant} {r.unite}</span>}
                          <span className="bg-muted px-1.5 py-0.5 rounded">
                            {r.arrondi === 'supérieur' ? '⬆️ Arrondi supérieur' : '⬇️ Arrondi inférieur'}
                          </span>
                        </div>
                      )}
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="checkbox" checked={selectedRegles.includes(r.id)} onChange={() => toggleRegle(r.id)} className="accent-primary" />
                      <button onClick={() => { setEditRegle(r); setShowRegle(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm({ type: 'regle', id: r.id, nom: r.option_prestation_nom })} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showFourn && <FournisseurModal fournisseur={editFourn} onClose={() => { setShowFourn(false); setEditFourn(null); }} />}
      {showRegle && (
        <RegleCommandeModal
          regle={editRegle}
          options={options}
          fournisseurs={fournisseurs}
          onClose={() => { setShowRegle(false); setEditRegle(null); }}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteConfirm}
        title={`Supprimer « ${deleteConfirm?.nom} » ?`}
        onConfirm={() => deleteConfirm?.type === 'fourn' ? deleteFourn.mutate(deleteConfirm.id) : deleteRegle.mutate(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteFourn.isPending || deleteRegle.isPending}
      />
      <DeleteConfirmModal
        open={bulkDeleteModal}
        title={`Supprimer ${activeCount} élément(s) ?`}
        onConfirm={() => activeTab === 'fournisseurs' ? bulkDeleteFourn.mutate() : bulkDeleteRegles.mutate()}
        onCancel={() => setBulkDeleteModal(false)}
        loading={bulkDeleteFourn.isPending || bulkDeleteRegles.isPending}
      />
      <BulkSelectionBar
        count={activeCount}
        onDelete={() => setBulkDeleteModal(true)}
        onClear={() => activeTab === 'fournisseurs' ? setSelectedFourn([]) : setSelectedRegles([])}
      />
    </div>
  );
}