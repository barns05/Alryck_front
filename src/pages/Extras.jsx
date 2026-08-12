import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Phone, Mail, Pencil, Trash2, UserCheck, UserX, UserCheck2, MessageCircle, Share2, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ExtraModal from '@/components/extras/ExtraModal';
import ExtraChatModal from '@/components/extras/ExtraChatModal';
import BulkMessageModal from '@/components/extras/BulkMessageModal';
import ShareExtraPortalModal from '@/components/extras/ShareExtraPortalModal';
import ImportExcelModal from '@/components/imports/ImportExcelModal';

const EXTRA_EXCEL_FIELDS = [
  { key: 'nom', label: 'Nom complet', required: true },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'email', label: 'Email' },
  { key: 'poste', label: 'Poste' },
  { key: 'competences', label: 'Compétences', transform: v => v ? v.split(',').map(s => s.trim()).filter(Boolean) : [] },
  { key: 'taux_horaire', label: 'Taux horaire (€)', transform: v => parseFloat(v) || undefined },
  { key: 'notes', label: 'Notes' },
];

const posteColors = {
  'Serveur':      'bg-blue-100 text-blue-700',
  'Barman':       'bg-purple-100 text-purple-700',
  'Cuisinier':    'bg-orange-100 text-orange-700',
  'Plongeur':     'bg-slate-100 text-slate-600',
  'Chef de rang': 'bg-emerald-100 text-emerald-700',
  'Hôte/Hôtesse': 'bg-pink-100 text-pink-700',
  'Autre':        'bg-gray-100 text-gray-600',
  // Prestataires
  'DJ':           'bg-violet-100 text-violet-700',
  'Chanteur':     'bg-rose-100 text-rose-700',
  'Photographe':  'bg-amber-100 text-amber-700',
  'Vidéaste':     'bg-yellow-100 text-yellow-700',
  'Animateur':    'bg-cyan-100 text-cyan-700',
  'Fleuriste':    'bg-green-100 text-green-700',
  'Traiteur':     'bg-teal-100 text-teal-700',
  'Musicien':     'bg-indigo-100 text-indigo-700',
};

export default function Extras() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'actif' | 'inactif'
  const [chatOpen, setChatOpen] = useState(false);
  const [chattingExtra, setChattingExtra] = useState(null);
  const [bulkMessageOpen, setBulkMessageOpen] = useState(false);
  const [sharePortal, setSharePortal] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [showExcelImport, setShowExcelImport] = useState(false);

  const { data: extras = [], isLoading } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (extra) => {
      // Supprimer les assignments liés à cet extra
      const assignments = await base44.entities.ServiceAssignment.filter({ extra_id: extra.id });
      await Promise.all(assignments.map(a => base44.entities.ServiceAssignment.delete(a.id)));
      // Supprimer les assignments liés par email (ancienne clé)
      if (extra.email) {
        const byEmail = await base44.entities.ServiceAssignment.filter({ extra_id: extra.email });
        await Promise.all(byEmail.map(a => base44.entities.ServiceAssignment.delete(a.id)));
      }
      return base44.entities.Extra.delete(extra.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(['extras']);
      qc.invalidateQueries(['assignments']);
    },
  });

  const toggleActifMutation = useMutation({
    mutationFn: ({ id, actif }) => base44.entities.Extra.update(id, { actif }),
    onSuccess: () => qc.invalidateQueries(['extras']),
  });

  const filtered = extras
    .filter(e => {
      const matchSearch = e.nom?.toLowerCase().includes(search.toLowerCase()) ||
        e.poste?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || (filter === 'actif' ? e.actif !== false : e.actif === false);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'nom') return (a.nom || '').localeCompare(b.nom || '');
      if (sortBy === 'poste') return (a.poste || '').localeCompare(b.poste || '');
      return 0; // 'recent' = ordre API par défaut
    });

  const handleEdit = (extra) => { setEditing(extra); setModalOpen(true); };
  const handleAdd = () => { setEditing(null); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditing(null); };
  const handleChat = (extra) => { setChattingExtra(extra); setChatOpen(true); };

  const actifCount = extras.filter(e => e.actif !== false).length;
  const inactifCount = extras.filter(e => e.actif === false).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Extras</h2>
          <p className="text-muted-foreground text-sm mt-1">{actifCount} actif{actifCount !== 1 ? 's' : ''} · {inactifCount} inactif{inactifCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkMessageOpen(true)} className="gap-2">
            <Mail size={16} /> Message groupé
          </Button>
          <Button variant="outline" onClick={() => setShowExcelImport(true)} className="gap-2">
            <FileSpreadsheet size={16} /> Excel / CSV
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus size={16} /> Nouvel extra
          </Button>
        </div>
      </div>

      {/* Search + filter */}
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
        <div className="flex items-center gap-1.5 bg-muted rounded-xl p-1">
          <ArrowUpDown size={13} className="ml-1.5 text-muted-foreground" />
          {[['recent', 'Récent'], ['nom', 'Nom'], ['poste', 'Poste']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortBy === val ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun extra trouvé</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(extra => (
            <div key={extra.id} className={`bg-card rounded-2xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${extra.actif === false ? 'opacity-60 border-border' : 'border-border'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm ${extra.actif === false ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                    {extra.nom?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{extra.nom}</p>
                    {extra.poste && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${posteColors[extra.poste] || 'bg-gray-100 text-gray-600'}`}>{extra.poste}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    title="Messagerie"
                    onClick={() => handleChat(extra)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-primary hover:text-primary"
                  >
                    <MessageCircle size={14} />
                  </button>
                  <button
                    title={extra.actif === false ? 'Réactiver' : 'Désactiver'}
                    onClick={() => toggleActifMutation.mutate({ id: extra.id, actif: extra.actif === false ? true : false })}
                    className={`p-1.5 rounded-lg transition-colors ${extra.actif === false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-muted-foreground hover:bg-amber-50 hover:text-amber-500'}`}
                  >
                    {extra.actif === false ? <UserCheck2 size={14} /> : <UserX size={14} />}
                  </button>
                  <button onClick={() => handleEdit(extra)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(extra)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {extra.telephone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone size={12} /> {extra.telephone}
                  </div>
                )}
                {extra.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={12} /> {extra.email}
                  </div>
                )}
              </div>
              {extra.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">{extra.notes}</p>}
              {extra.actif === false && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full self-start">Inactif</span>
              )}
              {/* Bouton espace extra */}
              <div className="border-t border-border pt-2">
                <button
                  onClick={() => setSharePortal(extra)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Share2 size={11} /> Partager l'espace planning
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <ExtraModal extra={editing} onClose={handleClose} />}
      {chatOpen && chattingExtra && <ExtraChatModal extra={chattingExtra} onClose={() => { setChatOpen(false); setChattingExtra(null); }} />}
      {bulkMessageOpen && <BulkMessageModal onClose={() => setBulkMessageOpen(false)} />}
      {sharePortal && <ShareExtraPortalModal extra={sharePortal} onClose={() => setSharePortal(null)} />}
      {showExcelImport && (
        <ImportExcelModal
          entityLabel="extras"
          fields={EXTRA_EXCEL_FIELDS}
          entityName="Extra"
          queryKey="extras"
          accentColor="bg-blue-100 text-blue-600"
          onClose={() => setShowExcelImport(false)}
        />
      )}
    </div>
  );
}