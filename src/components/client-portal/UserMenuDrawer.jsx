/**
 * UserMenuDrawer
 * Bottom-sheet drawer avec 4 onglets : Profil / Personnalisation / Notifications / Confidentialité
 * Extrait de MonEspaceTab et de ClientPortal pour centraliser la gestion du compte client.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, User, Bell, Lock, ShieldAlert } from 'lucide-react';
import PersonnalisationContent from './PersonnalisationContent';
import AnnulationEvenementClient from './AnnulationEvenementClient';
import ChangementDateClient from './ChangementDateClient';

const TABS = [
  { id: 'profil',          label: 'Profil',           icon: User },
  { id: 'notifications',   label: 'Notifications',     icon: Bell },
  { id: 'confidentialite', label: 'Confidentialité',   icon: Lock },
  { id: 'evenement',       label: 'Événement',         icon: ShieldAlert },
];

export default function UserMenuDrawer({ open, onClose, initialTab = 'profil', clientId, evenement, onEvenementUpdate }) {
  const qc = useQueryClient();
  const isPersonnalisation = initialTab === 'personnalisation';
  const [activeTab, setActiveTab] = useState(isPersonnalisation ? 'profil' : initialTab);

  useEffect(() => {
    if (open) setActiveTab(isPersonnalisation ? 'profil' : initialTab);
  }, [open, initialTab, isPersonnalisation]);

  const { data: client } = useQuery({
    queryKey: ['client-espace', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }).then(r => r[0] || null),
    enabled: !!clientId && open,
  });

  const clientNom = client
    ? (`${client.prenom || ''} ${client.nom || ''}`.trim() + (client.prenom2 ? ' & ' + client.prenom2 + ' ' + (client.nom2 || client.nom) : ''))
    : '';

  const updateClient = useMutation({
    mutationFn: (data) => base44.entities.Client.update(clientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-espace', clientId] }),
  });

  return (
    <AnimatePresence>
      {open && (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/45" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: '75vh', maxHeight: '600px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <h3 className="font-bold text-base" style={{ color: '#1e1b4b' }}>{isPersonnalisation ? 'Personnalisation' : 'Mon compte'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {isPersonnalisation ? (
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <PersonnalisationContent
              evenement={evenement}
              clientId={clientId}
              clientNom={clientNom}
              onClose={onClose}
            />
          </div>
        ) : (
          <>
            {/* Onglets */}
            <div className="flex border-b px-2 gap-0 overflow-x-auto shrink-0" style={{ borderColor: '#e8e4dc' }}>
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0"
                    style={activeTab === tab.id
                      ? { borderColor: '#1e1b4b', color: '#1e1b4b' }
                      : { borderColor: 'transparent', color: '#9ca3af' }
                    }
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ── PROFIL ── */}
              {activeTab === 'profil' && (
                <ProfilPanel client={client} clientId={clientId} updateClient={updateClient} qc={qc} />
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === 'notifications' && (
                <NotificationsPanel client={client} updateClient={updateClient} />
              )}

              {/* ── CONFIDENTIALITÉ ── */}
              {activeTab === 'confidentialite' && (
                <ConfidentialitePanel clientId={clientId} updateClient={updateClient} qc={qc} onClose={onClose} />
              )}

              {/* ── GESTION DE L'ÉVÉNEMENT (date + annulation) ── */}
              {activeTab === 'evenement' && (
                evenement?.statut === 'Annulé'
                  ? <p className="text-xs text-gray-400 text-center py-6">Cet événement est annulé.</p>
                  : (
                    <div className="space-y-5">
                      <ChangementDateClient evenement={evenement} clientToken={client?.lien_client_token} />
                      <AnnulationEvenementClient evenement={evenement} clientToken={client?.lien_client_token} />
                    </div>
                  )
              )}

            </div>
          </>
        )}
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Profil ────────────────────────────────────────────────────────────────────
function ProfileField({ label, value, onChange, placeholder, type = 'text', multiline = false }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
          style={{ borderColor: '#e8e4dc' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-1"
          style={{ borderColor: '#e8e4dc' }}
        />
      )}
    </div>
  );
}

function ProfilPanel({ client, clientId, updateClient, qc }) {
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    prenom2: '', nom2: '', telephone2: '', email2: '',
    adresse: '', code_postal: '', ville: '', pays: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        prenom: client.prenom || '',
        nom: client.nom || '',
        email: client.email || '',
        telephone: client.telephone || '',
        prenom2: client.prenom2 || '',
        nom2: client.nom2 || '',
        telephone2: client.telephone2 || '',
        email2: client.email2 || '',
        adresse: client.adresse || '',
        code_postal: client.code_postal || '',
        ville: client.ville || '',
        pays: client.pays || '',
      });
    }
  }, [client]);

  const hasChanges = () => Object.keys(form).some(k => (form[k] || '') !== (client?.[k] || ''));

  const saveAll = () => {
    const payload = {};
    Object.keys(form).forEach(k => {
      if ((form[k] || '') !== (client?.[k] || '')) payload[k] = form[k];
    });
    updateClient.mutate(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Coordonnées principales */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>Vos coordonnées</p>
        <ProfileField label="Prénom" value={form.prenom} onChange={v => setForm({ ...form, prenom: v })} placeholder="Prénom" />
        <ProfileField label="Nom" value={form.nom} onChange={v => setForm({ ...form, nom: v })} placeholder="Nom" />
        <ProfileField label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="email@exemple.com" />
        <ProfileField label="Téléphone" type="tel" value={form.telephone} onChange={v => setForm({ ...form, telephone: v })} placeholder="06 00 00 00 00" />
        <ProfileField label="Adresse" value={form.adresse} onChange={v => setForm({ ...form, adresse: v })} placeholder="N° et rue" />
        <ProfileField label="Code postal" value={form.code_postal} onChange={v => setForm({ ...form, code_postal: v })} placeholder="Code postal" />
        <ProfileField label="Ville" value={form.ville} onChange={v => setForm({ ...form, ville: v })} placeholder="Ville" />
        <ProfileField label="Pays" value={form.pays} onChange={v => setForm({ ...form, pays: v })} placeholder="France" />
      </div>

      {/* Deuxième contact */}
      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1e1b4b' }}>Deuxième contact</p>
        <ProfileField label="Prénom" value={form.prenom2} onChange={v => setForm({ ...form, prenom2: v })} placeholder="Prénom" />
        <ProfileField label="Nom" value={form.nom2} onChange={v => setForm({ ...form, nom2: v })} placeholder="Nom" />
        <ProfileField label="Email" type="email" value={form.email2} onChange={v => setForm({ ...form, email2: v })} placeholder="email@exemple.com" />
        <ProfileField label="Téléphone" type="tel" value={form.telephone2} onChange={v => setForm({ ...form, telephone2: v })} placeholder="06 00 00 00 00" />
      </div>

      {/* Bouton unique de sauvegarde */}
      <button
        onClick={saveAll}
        disabled={!hasChanges()}
        className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
        style={{ background: '#1e1b4b', color: '#fff' }}
      >
        {saved ? '✓ Enregistré' : 'Enregistrer'}
      </button>
    </div>
  );
}

// ── Notifications ──────────────────────────────────────────────────────────────
function NotificationsPanel({ client, updateClient }) {
  const fields = [
    { field: 'notifications_email', label: 'Recevoir les rappels par email',       value: client?.notifications_email !== false },
    { field: 'notifications_sms',   label: 'Recevoir les rappels par SMS',         value: !!client?.notifications_sms },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Gérez comment vous souhaitez être informé(e) des évolutions de votre dossier.</p>
      <div className="space-y-3">
        {fields.map(({ field, label, value }) => (
          <div key={field} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: '#e8e4dc' }}>
            <p className="text-sm" style={{ color: '#1e1b4b' }}>{label}</p>
            <button
              onClick={() => updateClient.mutate({ [field]: !value })}
              className="relative w-11 h-6 rounded-full transition-colors shrink-0"
              style={{ background: value ? '#1e1b4b' : '#e2e8f0' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Confidentialité ───────────────────────────────────────────────────────────
function ConfidentialitePanel({ clientId, updateClient, qc, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleAnonymise = async () => {
    setDeleteLoading(true);
    await base44.entities.Client.update(clientId, {
      nom: 'Anonyme', prenom: 'Anonyme',
      email: `supprime_${clientId}@anonyme.local`,
      email2: '', telephone: '', telephone2: '', adresse: '', code_postal: '', ville: '', pays: '', notes: '',
    });
    qc.invalidateQueries({ queryKey: ['client-espace', clientId] });
    setDeleteLoading(false);
    setConfirmDelete(false);
    onClose?.();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Conformément au RGPD, vous pouvez demander la suppression de vos données personnelles à tout moment.</p>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold transition-colors active:bg-red-100"
        >
          Supprimer mes données personnelles
        </button>
      ) : (
        <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-700 font-medium">⚠️ Cette action est irréversible. Vos données personnelles seront anonymisées.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border text-sm text-gray-500" style={{ borderColor: '#e8e4dc' }}>
              Annuler
            </button>
            <button onClick={handleAnonymise} disabled={deleteLoading} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
              {deleteLoading ? '…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}