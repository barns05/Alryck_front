/**
 * InviteModal — Ajout d'invités en architecture plate
 * Mode Confirmé : N personnes créées directement, statut Confirmé
 * Mode Nominatif : N personnes créées, statut En attente, 1er reçoit un lien_token
 * Mode Libre : 1 personne créée avec lien_token, les autres viendront via RSVP
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ChevronLeft } from 'lucide-react';

const MOIS = [
  { val: '01', label: 'Janvier' }, { val: '02', label: 'Février' },
  { val: '03', label: 'Mars' },    { val: '04', label: 'Avril' },
  { val: '05', label: 'Mai' },     { val: '06', label: 'Juin' },
  { val: '07', label: 'Juillet' }, { val: '08', label: 'Août' },
  { val: '09', label: 'Septembre' },{ val: '10', label: 'Octobre' },
  { val: '11', label: 'Novembre' },{ val: '12', label: 'Décembre' },
];

function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}
import ShareInviteModal from './ShareInviteModal';
import ShareGroupeModal from './ShareGroupeModal';
import InviteModeSelector from './InviteModeSelector';

function genToken() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

const GROUPES = ['Famille', 'Amis', 'Collègues', 'Témoins', 'Autres'];

function PersonneForm({ personne, onUpdate, onRemove, showRemove, label }) {
  const isMineur = personne.categorie === 'Mineur';
  return (
    <div className="space-y-2 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#1e1b4b] uppercase tracking-wide">{label || 'Personne'}</p>
        {showRemove && (
          <button type="button" onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors">
            ✕ Retirer
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" placeholder="Prénom *" value={personne.prenom}
          onChange={e => onUpdate('prenom', e.target.value)}
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
        <input type="text" placeholder="Nom *" value={personne.nom}
          onChange={e => onUpdate('nom', e.target.value)}
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
      <div className="flex gap-2">
        {['Adulte', 'Mineur'].map(c => (
          <button key={c} type="button"
            onClick={() => onUpdate('categorie', c)}
            className="flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
            style={{
              borderColor: personne.categorie === c ? '#1e1b4b' : '#e2e8f0',
              background: personne.categorie === c ? '#1e1b4b' : 'white',
              color: personne.categorie === c ? 'white' : '#374151',
            }}>
            {c}
          </button>
        ))}
      </div>
      {isMineur && (
        <input type="number" placeholder="Âge *" min={0} max={17}
          value={personne.age || ''}
          onChange={e => onUpdate('age', e.target.value ? parseInt(e.target.value) : '')}
          style={{ fontSize: 16, borderColor: '#e2e8f0' }}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      )}
    </div>
  );
}

function newPersonne() {
  return { prenom: '', nom: '', categorie: 'Adulte', age: '' };
}

export default function InviteModal({ evenementId, evenementNom, invite, onClose, onSaved, existingGroupeToken }) {
  const isEdit = !!invite;

  const [step, setStep] = useState(isEdit ? 'form' : 'mode');
  const [mode, setMode] = useState(invite?.mode_invitation || null);

  // Référent (toujours présent)
  const [prenom, setPrenom] = useState(invite?.prenom || '');
  const [nom, setNom] = useState(invite?.nom || '');
  const [email, setEmail] = useState(invite?.email || '');
  const [telephone, setTelephone] = useState(invite?.telephone || '');
  const [categorie, setCategorie] = useState(invite?.categorie || 'Adulte');
  const [age, setAge] = useState(invite?.age || '');
  const [groupe, setGroupe] = useState(invite?.groupe || '');
  // Multi-moments : tableau d'IDs sélectionnés
  const [momentsIds, setMomentsIds] = useState(
    invite?.moments_ids?.length ? invite.moments_ids
    : invite?.moment_id ? [invite.moment_id]
    : []
  );

  const toggleMoment = (id) => {
    setMomentsIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // legacy compat
  const momentId = momentsIds[0] || '';
  // Date limite : 3 selects indépendants
  const initDate = invite?.date_limite_reponse || '';
  const [dlJour, setDlJour] = useState(initDate ? initDate.slice(8, 10) : '');
  const [dlMois, setDlMois] = useState(initDate ? initDate.slice(5, 7) : '');
  const [dlAnnee, setDlAnnee] = useState(initDate ? initDate.slice(0, 4) : '');

  // Membres additionnels (modes Confirmé et Nominatif)
  const [membres, setMembres] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deadlineError, setDeadlineError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);
  const [showShare, setShowShare] = useState(false);

  const { data: moments = [] } = useQuery({
    queryKey: ['moments', evenementId],
    queryFn: () => base44.entities.MomentEvenement.filter({ evenement_id: evenementId }, 'ordre', 50),
    enabled: !!evenementId,
    staleTime: 30000,
  });

  const { data: evenement = null } = useQuery({
    queryKey: ['evenement', evenementId],
    queryFn: () => base44.entities.Evenement.filter({ id: evenementId }).then(r => r[0] || null),
    enabled: !!evenementId,
    staleTime: 60000,
  });

  const { data: client = null } = useQuery({
    queryKey: ['client', evenement?.client_id],
    queryFn: () => base44.entities.Client.filter({ id: evenement.client_id }).then(r => r[0] || null),
    enabled: !!evenement?.client_id,
    staleTime: 60000,
  });

  const organizerName = client?.prenom
    ? (client.prenom2 ? `${client.prenom} & ${client.prenom2}` : client.prenom)
    : evenementNom || '';

  const sortedMoments = moments.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const selectedMoment = sortedMoments.find(m => m.id === momentId);
  const selectedMomentsNoms = sortedMoments.filter(m => momentsIds.includes(m.id)).map(m => m.nom || 'Sans nom');

  const showMembres = mode === 'Confirmé' || mode === 'Nominatif';
  const showDeadline = mode === 'Nominatif' || mode === 'Libre';
  const isGroupe = mode === 'Groupe';

  const updateMembre = (i, field, val) => {
    setMembres(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setDeadlineError('');

    // Mode Groupe : crée un enregistrement "ancre" qui porte le groupe_lien_token
    // ⚠️ Ce bloc doit être AVANT la validation prenom/nom (pas de saisie en mode Groupe)
    // Cela permet à InvitePortal de retrouver l'événement même au premier accès
    if (mode === 'Groupe') {
      const token = genToken();
      // Créer une invite ancre (sans prenom/nom) pour stocker l'association événement ↔ token
      await base44.entities.Invite.create({
        evenement_id: evenementId,
        evenement_nom: evenementNom || '',
        mode_invitation: 'Groupe',
        groupe_lien_token: token,
        moment_id: momentId || null,
        prenom: '_groupe_',
        nom: '_ancre_',
        statut_rsvp: 'En attente',
        archived: true, // masquée des listes
      });
      setSaving(false);
      setCreatedInvite({
        evenement_id: evenementId,
        evenement_nom: evenementNom || '',
        mode_invitation: 'Groupe',
        groupe_lien_token: token,
        moment_id: momentId || null,
      });
      setShowShare(true);
      return;
    }

    // Validation prenom/nom pour tous les autres modes
    if (!prenom.trim() || !nom.trim()) {
      setSaving(false);
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }

    // Validation date limite (3 selects)
    const dateRemplie = !!(dlJour || dlMois || dlAnnee);
    const dateComplete = !!(dlJour && dlMois && dlAnnee);
    if (dateRemplie && !dateComplete) {
      setSaving(false);
      setDeadlineError('Veuillez renseigner le jour, le mois et l\'année.');
      return;
    }
    const dateLimiteValue = dateComplete ? `${dlAnnee}-${dlMois}-${dlJour}` : '';
    if (dateLimiteValue) {
      const today = new Date().toISOString().split('T')[0];
      if (dateLimiteValue <= today) {
        setSaving(false);
        setDeadlineError('La date limite doit être après aujourd\'hui.');
        return;
      }
      // Sécurité : bloquer si date limite > date événement (antérieure ou égale acceptée)
      const eventDate = evenement?.date;
      if (eventDate && dateLimiteValue > eventDate) {
        setSaving(false);
        setDeadlineError('La date limite doit être antérieure ou égale à la date de l\'événement.');
        return;
      }
    }

    const statutInitial = mode === 'Confirmé' ? 'Confirmé' : 'En attente';
    const baseData = {
      evenement_id: evenementId,
      evenement_nom: evenementNom || '',
      moment_id: momentsIds[0] || null,
      moment_nom: selectedMomentsNoms[0] || null,
      moments_ids: momentsIds.length > 0 ? momentsIds : null,
      moments_noms: selectedMomentsNoms.length > 0 ? selectedMomentsNoms : null,
      mode_invitation: mode,
      date_limite_reponse: dateLimiteValue || null,
      groupe: groupe || null,
      statut_rsvp: statutInitial,
    };

    if (isEdit) {
      await base44.entities.Invite.update(invite.id, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim() || null,
        telephone: telephone.trim() || null,
        categorie,
        age: categorie === 'Mineur' && age ? Number(age) : null,
        ...baseData,
      });
      setSaving(false);
      onSaved?.();
      onClose();
      return;
    }

    // Création — groupe_token commun si plusieurs personnes
    const allPersonnes = [
      { prenom: prenom.trim(), nom: nom.trim(), email: email.trim() || null, telephone: telephone.trim() || null, categorie, age: categorie === 'Mineur' && age ? Number(age) : null },
      ...membres.map(m => ({ prenom: m.prenom.trim(), nom: m.nom.trim(), categorie: m.categorie, age: m.categorie === 'Mineur' && m.age ? Number(m.age) : null })),
    ];

    const groupeToken = allPersonnes.length > 1 ? genToken() : null;

    if (mode === 'Libre') {
      // Mode libre : seulement le référent, avec lien_token
      const token = genToken();
      const created = await base44.entities.Invite.create({
        ...baseData,
        prenom: allPersonnes[0].prenom,
        nom: allPersonnes[0].nom,
        email: allPersonnes[0].email,
        telephone: allPersonnes[0].telephone,
        categorie: allPersonnes[0].categorie,
        age: allPersonnes[0].age,
        lien_token: token,
      });
      setSaving(false);
      // onSaved sera appelé à la fermeture de ShareInviteModal pour ne pas démonter le composant
      setCreatedInvite({ ...baseData, prenom: allPersonnes[0].prenom, nom: allPersonnes[0].nom, lien_token: token, id: created?.id });
      setShowShare(true);
    } else {
      // Modes Confirmé et Nominatif : créer N invités indépendants
      const [referent, ...autres] = allPersonnes;
      const token = genToken(); // lien_token pour le référent uniquement (mode Nominatif)

      const referentData = {
        ...baseData,
        prenom: referent.prenom,
        nom: referent.nom,
        email: referent.email,
        telephone: referent.telephone,
        categorie: referent.categorie,
        age: referent.age,
        groupe_token: groupeToken,
        lien_token: mode === 'Nominatif' ? token : null,
      };

      const created = await base44.entities.Invite.create(referentData);
      const referentId = created?.id;

      // Créer les autres membres en parallèle
      if (autres.length > 0) {
        await Promise.all(autres.map(p => base44.entities.Invite.create({
          ...baseData,
          prenom: p.prenom,
          nom: p.nom,
          categorie: p.categorie,
          age: p.age,
          groupe_token: groupeToken,
          invite_referent_id: referentId || null,
          lien_token: null,
        })));
      }

      setSaving(false);

      if (mode === 'Nominatif') {
        // onSaved sera appelé à la fermeture de ShareInviteModal pour ne pas démonter le composant
        setCreatedInvite({ ...referentData, id: referentId });
        setShowShare(true);
      } else {
        // Mode Confirmé : pas de partage, fermer directement
        onSaved?.();
        onClose();
      }
    }
  };

  if (showShare && createdInvite) {
    if (createdInvite.mode_invitation === 'Groupe') {
      return (
        <ShareGroupeModal
          groupeLienToken={createdInvite.groupe_lien_token}
          evenementNom={evenementNom}
          organizerName={organizerName}
          onClose={() => { onSaved?.(); onClose(); }}
        />
      );
    }
    // Modes Libre et Nominatif : appeler onSaved ici pour rafraîchir la liste
    return (
      <ShareInviteModal
        invite={createdInvite}
        organizerName={organizerName}
        onClose={() => { onSaved?.(); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: '#f1f5f9' }}>
          <div className="flex items-center gap-2">
            {step === 'form' && !isEdit && (
              <button onClick={() => setStep('mode')} className="text-gray-400 hover:text-gray-600 mr-1">
                <ChevronLeft size={20} />
              </button>
            )}
            <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>
              {isEdit ? '✏️ Modifier' : step === 'mode' ? '👥 Inviter des personnes' : `👥 ${mode === 'Confirmé' ? 'Présence confirmée' : mode === 'Nominatif' ? 'Invitation avec liste' : mode === 'Groupe' ? 'Lien de groupe' : 'Invitation libre'}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {step === 'mode' && (
            <InviteModeSelector selected={mode} onSelect={(m) => { setMode(m); setStep('form'); }} />
          )}

          {step === 'mode' && !mode && (
            <p className="text-[11px] text-center text-gray-400 pb-2">
              Sélectionnez un mode pour continuer
            </p>
          )}

          {step === 'form' && isGroupe && existingGroupeToken && (
            // ── Lien déjà existant : ne rien créer, proposer directement le partage ──
            <div className="space-y-4 py-2">
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
                <div className="text-4xl mb-3">🟢</div>
                <h3 className="font-bold text-base text-green-700 mb-1">Lien de groupe actif</h3>
                <p className="text-sm text-green-600 leading-relaxed">
                  Ce lien est déjà créé. Vous pouvez continuer à le partager sans en générer un nouveau.
                </p>
              </div>
              <div className="rounded-2xl border-2 px-4 py-3 bg-white" style={{ borderColor: '#bbf7d0' }}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Lien actuel</p>
                <p className="text-xs font-mono text-gray-500 truncate">
                  {`${window.location.origin}/invite-portal?groupe=${existingGroupeToken}`}
                </p>
              </div>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Les réponses déjà enregistrées sont conservées. Aucun invité ne sera affecté.
              </p>
            </div>
          )}

          {step === 'form' && isGroupe && !existingGroupeToken && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>
                <div className="text-4xl mb-3">🔗</div>
                <h3 className="font-bold text-base text-[#c2410c] mb-1">Lien de groupe prêt à partager</h3>
                <p className="text-sm text-orange-700 leading-relaxed">
                  Un lien unique à partager sur WhatsApp, Messenger, SMS ou email. Chaque personne saisit son nom et répond individuellement.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  '✅ Chaque réponse crée un invité individuel',
                  '🔍 Détection des doublons automatique',
                  '📊 Stats intégrées en temps réel',
                  '📱 Fonctionne sur iPhone & Android',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 bg-white rounded-xl px-4 py-2.5 border"
                    style={{ borderColor: '#f1f5f9' }}>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="rounded-xl px-4 py-3" style={{ background: '#f8f7ff', border: '1px solid #e0d9ff' }}>
                <p className="text-xs text-indigo-500 leading-relaxed italic">
                  Exemple : partagez ce lien dans votre groupe WhatsApp familial ou avec les invités d'un anniversaire. Chacun répondra individuellement.
                </p>
              </div>
            </div>
          )}

          {step === 'form' && !isGroupe && (
            <>
              {/* Référent */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)}
                    placeholder="Marie"
                    style={{ fontSize: 16, borderColor: '#e2e8f0' }}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={nom} onChange={e => setNom(e.target.value)}
                    placeholder="Dupont"
                    style={{ fontSize: 16, borderColor: '#e2e8f0' }}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              {/* Catégorie + Âge */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</label>
                <div className="flex gap-2">
                  {['Adulte', 'Mineur'].map(c => (
                    <button key={c} type="button" onClick={() => setCategorie(c)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={{
                        borderColor: categorie === c ? '#1e1b4b' : '#e2e8f0',
                        background: categorie === c ? '#1e1b4b' : 'white',
                        color: categorie === c ? 'white' : '#374151',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
                {categorie === 'Mineur' && (
                  <input type="number" placeholder="Âge *" min={0} max={17}
                    value={age}
                    onChange={e => setAge(e.target.value ? parseInt(e.target.value) : '')}
                    style={{ fontSize: 16, borderColor: '#e2e8f0' }}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email (optionnel)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="marie@exemple.com"
                  style={{ fontSize: 16, borderColor: '#e2e8f0' }}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Téléphone (optionnel)</label>
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  style={{ fontSize: 16, borderColor: '#e2e8f0' }}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Membres additionnels (Confirmé et Nominatif) */}
              {showMembres && (
                <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {mode === 'Confirmé' ? 'Autres membres du groupe' : 'Autres personnes à pré-remplir'}
                    </p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: membres.length > 0 ? '#eef2ff' : '#f1f5f9', color: membres.length > 0 ? '#4338ca' : '#9ca3af' }}>
                      {membres.length === 0 ? 'Aucune ajoutée' : `${membres.length} personne${membres.length > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  {membres.map((m, i) => (
                    <PersonneForm key={i} personne={m}
                      label={`Personne ${i + 2}`}
                      onUpdate={(field, val) => updateMembre(i, field, val)}
                      onRemove={() => setMembres(prev => prev.filter((_, idx) => idx !== i))}
                      showRemove={true}
                    />
                  ))}
                  <button type="button"
                    onClick={() => setMembres(prev => [...prev, newPersonne()])}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors hover:bg-indigo-50"
                    style={{ borderColor: '#c7d2fe', color: '#4338ca' }}>
                    ➕ Ajouter une personne
                  </button>
                </div>
              )}

              {showDeadline && (() => {
                const anneeCourante = new Date().getFullYear();
                const annees = [String(anneeCourante), String(anneeCourante + 1), String(anneeCourante + 2)];
                const nbJours = daysInMonth(dlMois, dlAnnee);
                const jours = Array.from({ length: nbJours }, (_, i) => String(i + 1).padStart(2, '0'));
                const selectStyle = { fontSize: 16, borderColor: '#e2e8f0', background: 'white' };
                const selectClass = "rounded-xl border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300";
                const clearAll = () => { setDlJour(''); setDlMois(''); setDlAnnee(''); setDeadlineError(''); };
                // Ajuste le jour au dernier jour valide du mois/année cibles (sans le vider)
                const ajusterJour = (mois, annee) => {
                  if (!dlJour) return;
                  const maxJ = daysInMonth(mois, annee);
                  if (parseInt(dlJour) > maxJ) {
                    setDlJour(String(maxJ).padStart(2, '0'));
                  }
                };
                return (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Date limite de réponse
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Jour */}
                      <select value={dlJour} onChange={e => { setDlJour(e.target.value); setDeadlineError(''); }}
                        style={selectStyle} className={selectClass}>
                        <option value="">Jour</option>
                        {jours.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                      {/* Mois */}
                      <select value={dlMois} onChange={e => { setDlMois(e.target.value); ajusterJour(e.target.value, dlAnnee); setDeadlineError(''); }}
                        style={selectStyle} className={`${selectClass} flex-1`}>
                        <option value="">Mois</option>
                        {MOIS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                      </select>
                      {/* Année */}
                      <select value={dlAnnee} onChange={e => { setDlAnnee(e.target.value); ajusterJour(dlMois, e.target.value); setDeadlineError(''); }}
                        style={selectStyle} className={selectClass}>
                        <option value="">Année</option>
                        {annees.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      {/* Effacer */}
                      {(dlJour || dlMois || dlAnnee) && (
                        <button type="button" onClick={clearAll}
                          className="text-gray-400 hover:text-red-400 transition-colors shrink-0 p-1">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {deadlineError && (
                      <p className="text-[11px] text-red-500 pl-1">{deadlineError}</p>
                    )}
                  </div>
                );
              })()}

              {sortedMoments.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Temps forts de l'événement (optionnel — plusieurs possibles)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sortedMoments.map(m => {
                      const sel = momentsIds.includes(m.id);
                      return (
                        <button key={m.id} type="button" onClick={() => toggleMoment(m.id)}
                          className="px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1.5"
                          style={{
                            borderColor: sel ? '#4338ca' : '#e2e8f0',
                            background: sel ? '#eef2ff' : 'white',
                            color: sel ? '#4338ca' : '#374151',
                          }}>
                          {sel && <span className="text-[10px]">✓</span>}
                          {m.nom || 'Sans nom'}
                        </button>
                      );
                    })}
                  </div>
                  {momentsIds.length === 0 && (
                    <p className="text-[11px] text-gray-400">Aucun temps fort sélectionné = invitation globale</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Groupe (optionnel)</label>
                <div className="flex flex-wrap gap-2">
                  {GROUPES.map(g => (
                    <button key={g} onClick={() => setGroupe(groupe === g ? '' : g)}
                      className="px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-colors"
                      style={{ borderColor: groupe === g ? '#1e1b4b' : '#e2e8f0', background: groupe === g ? '#1e1b4b' : 'white', color: groupe === g ? 'white' : '#374151' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
              )}
            </>
          )}
        </div>

        {step === 'form' && (
          <div className="px-5 pb-8 pt-3 border-t shrink-0 space-y-2" style={{ borderColor: '#f1f5f9' }}>
            {!isGroupe && (!prenom.trim() || !nom.trim()) && (
              <p className="text-[11px] text-center" style={{ color: '#ef4444' }}>
                Renseignez le prénom et le nom pour continuer
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl border-2 text-sm font-semibold text-gray-500"
                style={{ borderColor: '#e2e8f0' }}>
                Annuler
              </button>
              <button
                onClick={isGroupe && existingGroupeToken
                  ? () => { setCreatedInvite({ mode_invitation: 'Groupe', groupe_lien_token: existingGroupeToken }); setShowShare(true); }
                  : handleSave
                }
                disabled={saving || (!isGroupe && (!prenom.trim() || !nom.trim()))}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: isGroupe && existingGroupeToken ? '#16a34a' : isGroupe ? '#ea580c' : '#1e1b4b' }}>
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isGroupe && existingGroupeToken ? '🔗 Repartager le lien'
                  : isGroupe ? '🔗 Générer le lien de groupe'
                  : isEdit ? '✅ Enregistrer'
                  : mode === 'Libre' ? '➕ Créer l\'invitation'
                  : `✅ Ajouter ${1 + membres.length} personne${membres.length > 0 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}