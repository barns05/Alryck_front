import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Pencil, Trash2, MapPin, Phone, Mail, Users, MessageCircle, Share2, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import LieuModal from '@/components/lieux/LieuModal';
import LieuChatModal from '@/components/lieux/LieuChatModal';
import EmptyState from '@/components/EmptyState';
import ShareLieuPortalModal from '@/components/lieux/ShareLieuPortalModal';
import ImportDocumentGenericModal from '@/components/imports/ImportDocumentGenericModal';
import { Input as FieldInput } from '@/components/ui/input';
import PageCard from '@/components/PageCard';

const TYPE_COLORS = {
  'Salle de réception': 'bg-blue-100 text-blue-700',
  'Château': 'bg-purple-100 text-purple-700',
  'Restaurant': 'bg-orange-100 text-orange-700',
  'Hôtel': 'bg-indigo-100 text-indigo-700',
  'Plein air': 'bg-green-100 text-green-700',
  'Autre': 'bg-gray-100 text-gray-600',
};

const CATS_LIEUX = [
  { id: 'chateau', emoji: '🏰', label: 'Château / Domaine', types: ['Château'] },
  { id: 'jardin', emoji: '🌿', label: 'Jardin / Extérieur', types: ['Plein air'] },
  { id: 'salle', emoji: '🏛️', label: 'Salle de réception', types: ['Salle de réception'] },
  { id: 'ceremonie', emoji: '⛪', label: 'Lieu de cérémonie', types: [] },
  { id: 'hotel', emoji: '🏨', label: 'Hôtel', types: ['Hôtel', 'Restaurant'] },
  { id: 'autre', emoji: '📋', label: 'Autre', types: ['Autre', null, undefined] },
];

function getCatLieu(type_lieu) {
  return CATS_LIEUX.find(c => c.types.includes(type_lieu)) || CATS_LIEUX[CATS_LIEUX.length - 1];
}

function LieuxListe() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [vue, setVue] = useState('global');
  const [catActive, setCatActive] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLieu, setEditLieu] = useState(null);
  const [chatLieu, setChatLieu] = useState(null);
  const [shareLieu, setShareLieu] = useState(null);
  const [showDocImport, setShowDocImport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [ongletArchive, setOngletArchive] = useState('actifs'); // 'actifs' | 'archives'

  const { data: lieux = [] } = useQuery({
    queryKey: ['lieux'],
    queryFn: () => base44.entities.Lieu.list('-created_date', 200),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }) => base44.entities.Lieu.update(id, { archived }),
    onSuccess: () => qc.invalidateQueries(['lieux']),
  });

  const deleteLieu = useMutation({
    mutationFn: (id) => base44.entities.Lieu.delete(id),
    onSuccess: () => qc.invalidateQueries(['lieux']),
  });

  const lieuxActifs = lieux.filter(l => !l.archived);
  const lieuxArchives = lieux.filter(l => l.archived);
  const baseLieux = ongletArchive === 'archives' ? lieuxArchives : lieuxActifs;

  const filtered = baseLieux.filter(l => `${l.nom} ${l.ville} ${l.adresse}`.toLowerCase().includes(search.toLowerCase()));
  const filteredByCat = catActive ? filtered.filter(l => getCatLieu(l.type_lieu)?.id === catActive) : filtered;

  return (
    <div className="space-y-5">
      {/* Onglets Actifs / Archivés */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setOngletArchive('actifs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ongletArchive === 'actifs' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Actifs ({lieuxActifs.length})
        </button>
        <button
          onClick={() => setOngletArchive('archives')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${ongletArchive === 'archives' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          🗃️ Archivés ({lieuxArchives.length})
        </button>
      </div>

      {ongletArchive === 'archives' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
          Lieux archivés — restaurez ou supprimez définitivement
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{lieuxActifs.length} lieu{lieuxActifs.length > 1 ? 'x' : ''}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted rounded-full p-0.5 border border-border">
            <button onClick={() => setVue('categorie')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${ vue === 'categorie' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Par catégorie</button>
            <button onClick={() => { setVue('global'); setCatActive(null); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${ vue === 'global' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Vue globale</button>
          </div>
          <Button variant="outline" className="gap-2 text-sm" onClick={() => setShowDocImport(true)}><Sparkles size={15} /> Via document</Button>
          <Button className="gap-2" onClick={() => setModalOpen(true)}><Plus size={16} /> Nouveau lieu</Button>
        </div>
      </div>

      {vue === 'categorie' && (
        <div className="flex flex-wrap gap-2">
          {CATS_LIEUX.map(cat => {
            const count = lieux.filter(l => getCatLieu(l.type_lieu)?.id === cat.id).length;
            if (count === 0) return null;
            const isActive = catActive === cat.id;
            return (
              <button key={cat.id} onClick={() => setCatActive(isActive ? null : cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${ isActive ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                {cat.emoji} {cat.label} <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filteredByCat.length === 0 ? (
        <EmptyState icon={MapPin} title="Aucun lieu trouvé" description={lieux.length === 0 ? "Créez ou importez vos premiers lieux." : "Affinez votre recherche."} actionLabel={lieux.length === 0 ? "Créer un lieu" : undefined} onAction={lieux.length === 0 ? () => setModalOpen(true) : undefined} />
      ) : vue === 'categorie' ? (
        <div className="space-y-6">
          {CATS_LIEUX.map(cat => {
            const items = filteredByCat.filter(l => getCatLieu(l.type_lieu)?.id === cat.id);
            if (catActive && catActive !== cat.id) return null;
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">{cat.emoji} {cat.label} <span className="text-muted-foreground font-normal">({items.length})</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                           {items.map(l => <LieuCard key={l.id} l={l} setEditLieu={setEditLieu} setModalOpen={setModalOpen} setChatLieu={setChatLieu} setShareLieu={setShareLieu} setConfirmDelete={setConfirmDelete} onArchive={lx => archiveMutation.mutate({ id: lx.id, archived: true })} onRestore={lx => archiveMutation.mutate({ id: lx.id, archived: false })} />)}
                         </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredByCat.map(l => <LieuCard key={l.id} l={l} setEditLieu={setEditLieu} setModalOpen={setModalOpen} setChatLieu={setChatLieu} setShareLieu={setShareLieu} setConfirmDelete={setConfirmDelete} onArchive={lx => archiveMutation.mutate({ id: lx.id, archived: true })} onRestore={lx => archiveMutation.mutate({ id: lx.id, archived: false })} />)}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lieu ?</AlertDialogTitle>
            <AlertDialogDescription>Voulez-vous vraiment supprimer <strong>{confirmDelete?.nom}</strong> ? Irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteLieu.mutate(confirmDelete.id); setConfirmDelete(null); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {modalOpen && <LieuModal lieu={editLieu} onClose={() => { setModalOpen(false); setEditLieu(null); }} />}
      {chatLieu && <LieuChatModal lieu={chatLieu} onClose={() => setChatLieu(null)} />}
      {shareLieu && <ShareLieuPortalModal lieu={shareLieu} onClose={() => setShareLieu(null)} />}
      {showDocImport && (
        <ImportDocumentGenericModal
          title="Importer un lieu"
          subtitle="Amanda extrait les infos depuis un PDF ou une photo"
          entityName="Lieu"
          queryKey="lieux"
          prompt="Analyse ce document et extrait les informations d'un lieu de réception. Retourne: nom (string), adresse (string), ville (string), code_postal (string), telephone (string), email (string), capacite (number), type_lieu (string, l'un de: Salle de réception, Château, Restaurant, Hôtel, Plein air, Autre), notes (string)."
          jsonSchema={{ type: 'object', properties: { nom: { type: 'string' }, adresse: { type: 'string' }, ville: { type: 'string' }, code_postal: { type: 'string' }, telephone: { type: 'string' }, email: { type: 'string' }, capacite: { type: 'number' }, type_lieu: { type: 'string' }, notes: { type: 'string' } } }}
          buildPayload={d => ({ ...d })}
          renderEditor={(d, set) => (
            <div className="space-y-3">
              {[{ k: 'nom', l: 'Nom du lieu' }, { k: 'adresse', l: 'Adresse' }, { k: 'ville', l: 'Ville' }, { k: 'code_postal', l: 'Code postal' }, { k: 'telephone', l: 'Téléphone' }, { k: 'email', l: 'Email' }, { k: 'type_lieu', l: 'Type de lieu' }, { k: 'notes', l: 'Notes' }].map(({ k, l }) => (
                <div key={k} className="space-y-1"><label className="text-xs font-medium text-muted-foreground">{l}</label><FieldInput value={d[k] || ''} onChange={e => set(k, e.target.value)} className="text-sm h-8" /></div>
              ))}
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Capacité (personnes)</label><FieldInput type="number" value={d.capacite || ''} onChange={e => set('capacite', parseInt(e.target.value) || undefined)} className="text-sm h-8" /></div>
            </div>
          )}
          onClose={() => setShowDocImport(false)}
        />
      )}
    </div>
  );
}

function LieuCard({ l, setEditLieu, setModalOpen, setChatLieu, setShareLieu, setConfirmDelete, onArchive, onRestore }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-base">{l.nom}</p>
          {l.type_lieu && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[l.type_lieu] || TYPE_COLORS['Autre']}`}>{l.type_lieu}</span>}
        </div>
        <div className="flex gap-1">
          {!l.archived && <button onClick={() => setChatLieu(l)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><MessageCircle size={16} /></button>}
          {!l.archived && <button onClick={() => { setEditLieu(l); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>}
          {!l.archived && (
            <button onClick={() => onArchive(l)} title="Archiver" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-600 transition-colors text-sm">🗃️</button>
          )}
          {l.archived && (
            <button onClick={() => onRestore(l)} title="Restaurer" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-600 transition-colors text-sm">↩️</button>
          )}
          <button onClick={() => setConfirmDelete(l)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        {(l.adresse || l.ville) && (
          <div className="flex items-center gap-2">
            {l.lien_google_maps ? (
              <a href={l.lien_google_maps} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline truncate"><MapPin size={16} /><span className="truncate">{[l.adresse, l.ville, l.code_postal].filter(Boolean).join(', ')}</span></a>
            ) : (
              <><MapPin size={16} /><span className="truncate">{[l.adresse, l.ville, l.code_postal].filter(Boolean).join(', ')}</span></>
            )}
          </div>
        )}
        {l.telephone && <div className="flex items-center gap-2"><Phone size={16} /><span>{l.telephone}</span></div>}
        {l.email && <div className="flex items-center gap-2"><Mail size={16} /><span className="truncate">{l.email}</span></div>}
        {l.capacite && <div className="flex items-center gap-2"><Users size={16} /><span>Capacité : {l.capacite} pers.</span></div>}
      </div>
      {l.notes && <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 line-clamp-2">{l.notes}</p>}
      <div className="border-t border-border pt-2">
        <button onClick={() => setShareLieu(l)} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Share2 size={11} /> Partager l'espace lieu</button>
      </div>
    </div>
  );
}

export default function Lieux({ embedded = false }) {
  if (embedded) return <div className="space-y-5"><LieuxListe /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Lieux</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos salles et espaces de réception</p>
      </div>
      <LieuxListe />
    </div>
  );
}