import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Phone, Mail, Pencil, Trash2, UserCheck, UserX, UserCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CollaborateurModal from './CollaborateurModal';

const contratColors = {
  'CDI':              'bg-emerald-100 text-emerald-700',
  'CDD':              'bg-blue-100 text-blue-700',
  'Auto-entrepreneur':'bg-orange-100 text-orange-700',
};

export default function CollaborateursTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: collaborateurs = [], isLoading } = useQuery({
    queryKey: ['collaborateurs'],
    queryFn: () => base44.entities.Collaborateur.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Collaborateur.delete(id),
    onSuccess: () => qc.invalidateQueries(['collaborateurs']),
  });

  const toggleActifMutation = useMutation({
    mutationFn: ({ id, actif }) => base44.entities.Collaborateur.update(id, { actif }),
    onSuccess: () => qc.invalidateQueries(['collaborateurs']),
  });

  const filtered = collaborateurs.filter(c => {
    const matchSearch = c.nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.poste_fonction?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'actif' ? c.actif !== false : c.actif === false);
    return matchSearch && matchFilter;
  });

  const actifCount = collaborateurs.filter(c => c.actif !== false).length;
  const inactifCount = collaborateurs.filter(c => c.actif === false).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{actifCount} actif{actifCount !== 1 ? 's' : ''} · {inactifCount} inactif{inactifCount !== 1 ? 's' : ''}</p>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="gap-2">
          <Plus size={16} /> Nouveau collaborateur
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {[['all', 'Tous'], ['actif', 'Actifs'], ['inactif', 'Inactifs']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === val ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun collaborateur trouvé</p>
          <p className="text-sm mt-1">Ajoutez votre premier collaborateur avec le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(collab => (
            <div
              key={collab.id}
              className={`bg-card rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${collab.actif === false ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm bg-blue-100 text-blue-700`}>
                    {collab.nom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{collab.nom}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {collab.poste_fonction && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{collab.poste_fonction}</span>
                      )}
                      {collab.type_contrat && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contratColors[collab.type_contrat] || 'bg-muted text-muted-foreground'}`}>{collab.type_contrat}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    title={collab.actif === false ? 'Réactiver' : 'Désactiver'}
                    onClick={() => toggleActifMutation.mutate({ id: collab.id, actif: collab.actif === false })}
                    className={`p-1.5 rounded-lg transition-colors ${collab.actif === false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-muted-foreground hover:bg-amber-50 hover:text-amber-500'}`}
                  >
                    {collab.actif === false ? <UserCheck2 size={14} /> : <UserX size={14} />}
                  </button>
                  <button onClick={() => { setEditing(collab); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(collab.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {collab.telephone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone size={12} /> {collab.telephone}</div>}
                {collab.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail size={12} /> {collab.email}</div>}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {collab.placement_auto && (
                  <span className="text-xs bg-primary/5 border border-primary/15 rounded-lg px-2.5 py-1 font-medium text-primary">
                    ✦ Placement auto
                  </span>
                )}
                {collab.visible_planning_equipe === false && (
                  <span className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-500">
                    👁 Masqué du planning
                  </span>
                )}
              </div>

              {collab.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">{collab.notes}</p>}
              {collab.actif === false && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full self-start">Inactif</span>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && <CollaborateurModal collaborateur={editing} onClose={() => { setModalOpen(false); setEditing(null); }} />}
    </div>
  );
}