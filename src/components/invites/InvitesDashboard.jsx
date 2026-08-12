/**
 * InvitesDashboard — Architecture plate
 * Une personne = un invité indépendant
 * Props: evenementId, evenementNom, onAddInvite, onViewList
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UserPlus, List, Upload, Settings, FileSpreadsheet, FileText, Loader2, Download } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import AllergenesSummary from './AllergenesSummary';
import ImportInvitesModal from './ImportInvitesModal';
import MomentsManager from './MomentsManager';
import PDFViewer from './PDFViewer';
import PDFExportModal from './PDFExportModal';
import ShareGroupeModal from './ShareGroupeModal';
import InviteModal from './InviteModal';
import DoublonsManagerModal from './DoublonsManagerModal';
import { exportInvitesExcel } from './exportInvitesExcel';
import { exportInvitesPDF } from './exportInvitesPDF';


const STATUT_STATS = [
  { key: 'confirmes', label: 'Confirmés',  color: '#16a34a', bg: '#f0fdf4' },
  { key: 'absents',   label: 'Absents',    color: '#be123c', bg: '#fff1f2' },
  { key: 'attente',   label: 'En attente', color: '#6b7280', bg: '#f9fafb' },
  { key: 'peutetre',  label: 'Peut-être',  color: '#c2410c', bg: '#fff7ed' },
];

function computeStats(invites) {
  return {
    total:     invites.length,
    confirmes: invites.filter(i => i.statut_rsvp === 'Confirmé').length,
    absents:   invites.filter(i => i.statut_rsvp === 'Absent').length,
    attente:   invites.filter(i => !i.statut_rsvp || i.statut_rsvp === 'En attente').length,
    peutetre:  invites.filter(i => i.statut_rsvp === 'Peut-être').length,
    adultes:   invites.filter(i => i.categorie !== 'Mineur').length,
    mineurs:   invites.filter(i => i.categorie === 'Mineur').length,
    allergies: invites.filter(i => (i.allergenes || []).length > 0).length,
  };
}

export default function InvitesDashboard({ evenementId, evenementNom, onAddInvite, onViewList }) {
  const [showAllergenes, setShowAllergenes] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMoments, setShowMoments] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState('tous');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfViewer, setPdfViewer] = useState(null); // { blob, fileName }
  const [showShareGroupe, setShowShareGroupe] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [doublonGere, setDoublonGere] = useState(null); // { label, fiches[] } | null

  const { data: invites = [], isLoading, refetch } = useQuery({
    queryKey: ['invites', evenementId],
    queryFn: () => base44.entities.Invite.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
    staleTime: 30000,
  });

  const { data: evenement = null } = useQuery({
    queryKey: ['evenement', evenementId],
    queryFn: () => base44.entities.Evenement.filter({ id: evenementId }).then(r => r[0] || null),
    enabled: !!evenementId,
    staleTime: 60000,
  });

  const { data: moments = [] } = useQuery({
    queryKey: ['moments', evenementId],
    queryFn: () => base44.entities.MomentEvenement.filter({ evenement_id: evenementId }, 'ordre', 50),
    enabled: !!evenementId,
    staleTime: 30000,
  });

  const sortedMoments = moments.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));

  const [ignorerDoublons, setIgnorerDoublons] = useState(false);

  // Exclure les invites ancres (archived + prenom '_groupe_')
  const invitesVisibles = invites.filter(i => !(i.archived && i.prenom === '_groupe_'));

  // Détection de doublons par prénom+nom normalisés
  const doublons = (() => {
    const groups = {};
    invitesVisibles.forEach(i => {
      const key = `${(i.prenom || '').trim().toLowerCase()} ${(i.nom || '').trim().toLowerCase()}`;
      if (!groups[key]) groups[key] = { label: `${(i.prenom || '').trim()} ${(i.nom || '').trim()}`, fiches: [] };
      groups[key].fiches.push(i);
    });
    return Object.values(groups).filter(v => v.fiches.length > 1);
  })();

  const filteredInvites = selectedMomentId === 'tous'
    ? invitesVisibles
    : invitesVisibles.filter(i => i.moment_id === selectedMomentId);

  const stats = computeStats(filteredInvites);

  // Récupérer le groupe_lien_token existant (s'il y en a un)
  const groupeLienToken = invites.find(i => i.groupe_lien_token)?.groupe_lien_token || null;
  const confirmedInvites = filteredInvites.filter(i => i.statut_rsvp === 'Confirmé');

  const handleDownloadQR = async () => {
    if (!groupeLienToken) return;
    setDownloadingQR(true);
    try {
      const lien = `${window.location.origin}/invite-portal?groupe=${groupeLienToken}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(lien)}`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_invitation_${(evenementNom || 'groupe').replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur téléchargement QR:', e);
    } finally {
      setDownloadingQR(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Section Moments ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {sortedMoments.length > 0
            ? `${sortedMoments.length} temps fort${sortedMoments.length > 1 ? 's' : ''}`
            : 'Temps forts de l\'événement'}
        </p>
        <button onClick={() => setShowMoments(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors"
          style={{ borderColor: '#e2e8f0', color: '#4338ca' }}>
          <Settings size={15} /> Configurer votre invitation
        </button>
      </div>

      {sortedMoments.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedMomentId('tous')}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
            style={{
              borderColor: selectedMomentId === 'tous' ? '#1e1b4b' : '#e2e8f0',
              background: selectedMomentId === 'tous' ? '#1e1b4b' : 'white',
              color: selectedMomentId === 'tous' ? 'white' : '#374151',
            }}>
            Tous
          </button>
          {sortedMoments.map(m => (
            <button key={m.id} onClick={() => setSelectedMomentId(m.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
              style={{
                borderColor: selectedMomentId === m.id ? '#1e1b4b' : '#e2e8f0',
                background: selectedMomentId === m.id ? '#1e1b4b' : 'white',
                color: selectedMomentId === m.id ? 'white' : '#374151',
              }}>
              {m.nom || 'Sans nom'}
            </button>
          ))}
        </div>
      )}

      {/* Résumé principal */}
      <div className="rounded-2xl p-4 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)' }}>
        <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">
          {selectedMomentId === 'tous' ? 'Statut invitations' : (sortedMoments.find(m => m.id === selectedMomentId)?.nom || 'Statut')}
        </p>
        <p className="text-3xl font-bold">
          {stats.confirmes} <span className="text-lg font-normal text-white/60">/ {stats.total}</span>
        </p>
        <p className="text-white/70 text-sm mt-1">
          {stats.total === 0
            ? 'Aucune personne pour l\'instant'
            : `confirmée${stats.confirmes > 1 ? 's' : ''} sur ${stats.total} personne${stats.total > 1 ? 's' : ''}`}
        </p>

        {confirmedInvites.length > 0 && (stats.adultes > 0 || stats.mineurs > 0) && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-white/60 text-xs mt-0.5">
              {[
                stats.adultes > 0 && `${stats.adultes} adulte${stats.adultes > 1 ? 's' : ''}`,
                stats.mineurs > 0 && `${stats.mineurs} mineur${stats.mineurs > 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}
      </div>

      {/* Grille statuts */}
      <div className="grid grid-cols-2 gap-2">
        {STATUT_STATS.map(s => (
          <div key={s.key} className="rounded-xl p-3 text-center border border-transparent"
            style={{ background: s.bg }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{stats[s.key]}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: s.color + 'cc' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Allergènes */}
      {stats.allergies > 0 && (
        <button onClick={() => setShowAllergenes(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-colors"
          style={{
            borderColor: showAllergenes ? '#f87171' : '#fee2e2',
            background: showAllergenes ? '#fff1f2' : '#fff7f7',
            color: '#be123c',
          }}>
          <span>🌾 {stats.allergies} personne{stats.allergies > 1 ? 's' : ''} avec allergies</span>
          <span className="text-xs font-normal">{showAllergenes ? '▲ Masquer' : '▼ Voir détail'}</span>
        </button>
      )}

      {showAllergenes && <AllergenesSummary invites={filteredInvites} />}

      {/* Alerte doublons potentiels */}
      {doublons.length > 0 && !ignorerDoublons && (
        <div className="rounded-2xl border-2 px-4 py-3 space-y-2"
          style={{ borderColor: '#fbbf24', background: '#fffbeb' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                Doublons potentiels détectés
              </p>
            </div>
            <button
              onClick={() => setIgnorerDoublons(true)}
              className="text-[11px] font-medium shrink-0 mt-0.5"
              style={{ color: '#b45309' }}>
              Ignorer
            </button>
          </div>
          <ul className="space-y-1.5">
            {doublons.map(d => (
              <li key={d.label} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: '#78350f' }}>
                  · <span className="font-semibold">{d.label}</span> apparaît {d.fiches.length} fois
                </span>
                <button
                  onClick={() => setDoublonGere(d)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-colors hover:opacity-80"
                  style={{ background: '#fbbf24', color: '#78350f' }}>
                  Gérer
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px]" style={{ color: '#b45309' }}>
            Vérifiez et supprimez manuellement les doublons depuis la liste des invités.
          </p>
        </div>
      )}

      {/* Bannière lien de groupe si existant */}
      {groupeLienToken && (
        <div
          className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-semibold"
          style={{ borderColor: '#fed7aa', background: '#fff7ed', color: '#c2410c' }}>
          <span className="flex items-center gap-2 flex-1">🔗 Lien de groupe actif</span>
          <button
            onClick={handleDownloadQR}
            disabled={downloadingQR}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
            style={{ background: '#fff', border: '1.5px solid #fed7aa', color: '#c2410c' }}>
            {downloadingQR ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Télécharger
          </button>
          <button
            onClick={() => setShowShareGroupe(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: '#c2410c', color: '#fff' }}>
            Partager →
          </button>
        </div>
      )}

      {/* Actions principales */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowAddModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
          style={{ background: '#1e1b4b' }}>
          <UserPlus size={15} /> Ajouter
        </button>
        <button onClick={() => setShowImport(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold border-2"
          style={{ borderColor: '#e2e8f0', color: '#374151' }}>
          <Upload size={15} /> CSV
        </button>
        {stats.total > 0 && (
          <button onClick={onViewList}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border-2"
            style={{ borderColor: '#1e1b4b', color: '#1e1b4b' }}>
            <List size={15} /> Liste
          </button>
        )}
      </div>

      {/* Exports */}
      {stats.total > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => exportInvitesExcel({
              invites: filteredInvites,
              evenementNom: evenementNom || evenement?.nom,
              evenementDate: evenement?.date,
            })}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-colors hover:bg-green-50"
            style={{ borderColor: '#bbf7d0', color: '#15803d' }}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => setShowPDFModal(true)}
            disabled={generatingPDF}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-colors hover:bg-purple-50 disabled:opacity-60"
            style={{ borderColor: '#e9d5ff', color: '#7c3aed' }}>
            {generatingPDF
              ? <><Loader2 size={14} className="animate-spin" /> Génération…</>
              : <><FileText size={14} /> PDF</>}
          </button>
        </div>
      )}

      {showImport && (
        <ImportInvitesModal
          evenementId={evenementId}
          evenementNom={evenementNom}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refetch(); }}
        />
      )}

      {showMoments && (
        <MomentsManager evenementId={evenementId} evenement={evenement} onClose={() => setShowMoments(false)} />
      )}

      {showAddModal && (
        <InviteModal
          evenementId={evenementId}
          evenementNom={evenementNom}
          invite={null}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); refetch(); onAddInvite?.(); }}
          existingGroupeToken={groupeLienToken}
        />
      )}

      {showPDFModal && (
        <PDFExportModal
          moments={sortedMoments}
          onClose={() => setShowPDFModal(false)}
          onSelect={async (choice) => {
            setShowPDFModal(false);
            setGeneratingPDF(true);
            try {
              // Filtrer les invités selon le choix
              let invitesPDF = filteredInvites;
              let titre = evenementNom || evenement?.nom;
              let filterMoment = null;
              if (choice.type === 'moment') {
                invitesPDF = filteredInvites.filter(i =>
                  i.moment_id === choice.momentId || (!i.moment_id)
                  // On prend les invités liés à ce moment + les invités globaux (sans moment)
                );
                // Pour un filtre strict par moment : uniquement ceux ayant moment_id correspondant
                invitesPDF = filteredInvites.filter(i => i.moment_id === choice.momentId);
                titre = `${titre} – ${choice.momentNom}`;
                filterMoment = choice.momentNom;
              }
              const result = await exportInvitesPDF({
                invites: invitesPDF,
                evenementNom: titre,
                evenementDate: evenement?.date,
                coverUrl: evenement?.photo_bandeau_url || null,
                couleurTheme: evenement?.couleur_theme || null,
                filterMoment,
              });
              setPdfViewer(result);
            } finally {
              setGeneratingPDF(false);
            }
          }}
        />
      )}

      {showShareGroupe && groupeLienToken && (
        <ShareGroupeModal
          groupeLienToken={groupeLienToken}
          evenementNom={evenementNom}
          onClose={() => setShowShareGroupe(false)}
        />
      )}

      <AnimatePresence>
        {pdfViewer && (
          <PDFViewer
            pdfBlob={pdfViewer.blob}
            fileName={pdfViewer.fileName}
            onClose={() => setPdfViewer(null)}
          />
        )}
      </AnimatePresence>

      {doublonGere && (
        <DoublonsManagerModal
          fiches={doublonGere.fiches}
          onClose={() => setDoublonGere(null)}
          onDone={() => { setDoublonGere(null); refetch(); }}
        />
      )}

    </div>
  );
}