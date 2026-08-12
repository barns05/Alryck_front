import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, Phone, Mail, Euro, Share2, MessageCircle, Calendar, UserPlus, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PrestataireModal from '@/components/prestataires/PrestataireModal';
import SharePrestatairePortalModal from '@/components/prestataires/SharePrestatairePortalModal';
import PrestataireChatModal from '@/components/prestataires/PrestataireChatModal';
import PrestataireDisposModal from '@/components/prestataires/PrestataireDisposModal';
import EmptyState from '@/components/EmptyState';
import InviterPrestataireModal from '@/components/prestataires/InviterPrestataireModal';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';


const domaineColors = {
  'Traiteur':        'bg-orange-100 text-orange-700',
  'DJ / Musique':    'bg-purple-100 text-purple-700',
  'Photographe':     'bg-blue-100 text-blue-700',
  'Vidéaste':        'bg-indigo-100 text-indigo-700',
  'Fleuriste':       'bg-pink-100 text-pink-700',
  'Décoration':      'bg-rose-100 text-rose-700',
  'Animation':       'bg-yellow-100 text-yellow-700',
  'Transport':       'bg-slate-100 text-slate-600',
  'Sécurité':        'bg-red-100 text-red-700',
  'Sono / Lumières': 'bg-cyan-100 text-cyan-700',
  'Autre':           'bg-gray-100 text-gray-600',
};

const CATS_PRESTA = [
  { id: 'dj', emoji: '🎵', label: 'DJ / Musique', domaines: ['DJ / Musique', 'Sono / Lumières'] },
  { id: 'fleuriste', emoji: '💐', label: 'Fleuriste', domaines: ['Fleuriste'] },
  { id: 'photo', emoji: '📸', label: 'Photographe / Vidéaste', domaines: ['Photographe', 'Vidéaste'] },
  { id: 'patissier', emoji: '🎂', label: 'Pâtissier', domaines: ['Traiteur'] },
  { id: 'animation', emoji: '🎪', label: 'Animation', domaines: ['Animation'] },
  { id: 'transport', emoji: '🚗', label: 'Transport', domaines: ['Transport'] },
  { id: 'deco', emoji: '🎨', label: 'Décoration', domaines: ['Décoration'] },
  { id: 'autre', emoji: '📋', label: 'Autre', domaines: ['Sécurité', 'Autre', null, undefined] },
];

function getCatPresta(domaine) {
  return CATS_PRESTA.find(c => c.domaines.includes(domaine)) || CATS_PRESTA[CATS_PRESTA.length - 1];
}

function PrestatairesListe() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [vue, setVue] = useState('global');
  const [catActive, setCatActive] = useState(null);
  const [modal, setModal] = useState(null);
  const [sharePortal, setSharePortal] = useState(null);
  const [chatOpen, setChatOpen] = useState(null);
  const [disposOpen, setDisposOpen] = useState(null);
  const [showInviter, setShowInviter] = useState(false);

  const { data: prestataires = [], isLoading } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => base44.entities.Prestataire.list(),
  });

  const { settings: cs } = useOwnerCompanySettings();

  const ownerPrestataireId = cs?.prestataire_id || null;
  const ownerMetier = cs?.metier || null;

  const filtered = prestataires.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    (p.domaine || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.contact || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredByCat = catActive
    ? filtered.filter(p => getCatPresta(p.domaine)?.id === catActive)
    : filtered;

  // Carte propriétaire toujours en premier
  const sorted = [...filteredByCat].sort((a, b) => {
    if (ownerPrestataireId && a.id === ownerPrestataireId) return -1;
    if (ownerPrestataireId && b.id === ownerPrestataireId) return 1;
    return 0;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{prestataires.filter(p => p.actif !== false).length} actif{prestataires.filter(p => p.actif !== false).length > 1 ? 's' : ''} sur {prestataires.length}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted rounded-full p-0.5 border border-border">
            <button onClick={() => setVue('categorie')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${ vue === 'categorie' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Par catégorie</button>
            <button onClick={() => { setVue('global'); setCatActive(null); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${ vue === 'global' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Vue globale</button>
          </div>
          <Button className="gap-2 text-sm" onClick={() => toast.info('Fonctionnalité disponible lors du lancement de la plateforme collaborative')}><UserPlus size={15} /> Inviter un partenaire</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {vue === 'categorie' && (
        <div className="flex flex-wrap gap-2">
          {CATS_PRESTA.map(cat => {
            const count = prestataires.filter(p => getCatPresta(p.domaine)?.id === cat.id).length;
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

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filteredByCat.length === 0 ? (
        <EmptyState icon={Sparkles} title="Aucun prestataire trouvé" description={prestataires.length === 0 ? "Ajoutez vos premiers intervenants externes." : "Affinez votre recherche."} actionLabel={prestataires.length === 0 ? "Créer un prestataire" : undefined} onAction={prestataires.length === 0 ? () => setModal('new') : undefined} />
      ) : vue === 'categorie' ? (
        <div className="space-y-6">
          {CATS_PRESTA.map(cat => {
            const items = sorted.filter(p => getCatPresta(p.domaine)?.id === cat.id);
            if (catActive && catActive !== cat.id) return null;
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">{cat.emoji} {cat.label} <span className="text-muted-foreground font-normal">({items.length})</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(p => <PrestataireCard key={p.id} p={p} isOwner={p.id === ownerPrestataireId} ownerMetier={ownerMetier} setChatOpen={setChatOpen} setDisposOpen={setDisposOpen} setSharePortal={setSharePortal} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(p => <PrestataireCard key={p.id} p={p} isOwner={p.id === ownerPrestataireId} ownerMetier={ownerMetier} setChatOpen={setChatOpen} setDisposOpen={setDisposOpen} setSharePortal={setSharePortal} />)}
        </div>
      )}

      {modal && <PrestataireModal prestataire={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
      {sharePortal && <SharePrestatairePortalModal prestataire={sharePortal} onClose={() => setSharePortal(null)} />}
      {chatOpen && <PrestataireChatModal prestataire={chatOpen} onClose={() => setChatOpen(null)} />}
      {disposOpen && <PrestataireDisposModal prestataire={disposOpen} onClose={() => setDisposOpen(null)} />}
      {showInviter && <InviterPrestataireModal onClose={() => setShowInviter(false)} />}
    </div>
  );
}

function getInitiales(nom = '') {
  return nom.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function PrestataireCard({ p, isOwner, ownerMetier, setChatOpen, setDisposOpen, setSharePortal }) {
  const navigate = useNavigate();
  const colorClass = domaineColors[p.domaine] || domaineColors['Autre'];

  const cardStyle = isOwner
    ? { border: '2px solid #1e1b4b', background: 'rgba(30,27,75,0.03)' }
    : {};

  const logoStyle = isOwner
    ? { background: '#1e1b4b', color: 'white' }
    : {};

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow" style={cardStyle}>
      <div className="flex items-start justify-between gap-2">
        {/* Logo ou initiales */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {p.logo_url ? (
            <img src={p.logo_url} alt={p.nom} className="w-10 h-10 rounded-xl object-contain shrink-0 border border-border bg-white" />
          ) : (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isOwner ? '' : colorClass}`}
              style={isOwner ? logoStyle : {}}
            >
              {getInitiales(p.nom)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{p.nom}</h3>
              {isOwner && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: '#1e1b4b', color: 'white' }}>
                  🪪 Mon profil
                </span>
              )}
              {!isOwner && p.actif === false && (
                <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">En attente</span>
              )}
            </div>
            {p.ville && <p className="text-xs text-muted-foreground">{p.ville}</p>}
            {!p.ville && p.contact && <p className="text-xs text-muted-foreground">{p.contact}</p>}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-1 shrink-0">
          {isOwner ? null : (
            <>
              <button onClick={() => setChatOpen(p)} className="p-1.5 rounded-lg hover:bg-purple-50 text-muted-foreground hover:text-purple-600"><MessageCircle size={16} /></button>
              <button onClick={() => setDisposOpen(p)} className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600"><Calendar size={16} /></button>
              <button
                onClick={() => toast.info('Fonctionnalité disponible lors du lancement de la plateforme collaborative')}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Inviter"
              >
                <UserPlus size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {(isOwner ? ownerMetier : p.domaine) && (
        <span
          className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${isOwner ? '' : colorClass}`}
          style={isOwner ? { background: 'rgba(30,27,75,0.1)', color: '#1e1b4b' } : {}}
        >
          {isOwner ? ownerMetier : p.domaine}
        </span>
      )}

      {p.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {p.description.length > 80 ? p.description.slice(0, 80) + '…' : p.description}
        </p>
      )}

      <div className="space-y-1">
        {p.telephone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone size={14} /> {p.telephone}</div>}
        {p.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail size={14} /> {p.email}</div>}
        {isOwner && p.site_web && <div className="flex items-center gap-2 text-xs text-muted-foreground"><ExternalLink size={14} /> {p.site_web}</div>}
        {p.tarif && !isOwner && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Euro size={14} /> Tarif indicatif : {p.tarif}€</div>}
      </div>

      <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
        <button onClick={() => setSharePortal(p)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Share2 size={11} /> Partager l'espace prestataire
        </button>
        {isOwner && (
          <button
            onClick={() => navigate('/ma-vitrine')}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ background: '#1e1b4b', color: 'white' }}
          >
            <ExternalLink size={11} /> Modifier ma vitrine
          </button>
        )}
      </div>
    </div>
  );
}

export default function Prestataires({ embedded = false }) {
  if (embedded) return <div className="space-y-5"><PrestatairesListe /></div>;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Prestataires</h2>
        <p className="text-muted-foreground text-sm mt-1">Annuaire des passeports professionnels</p>
      </div>
      <PrestatairesListe />
    </div>
  );
}