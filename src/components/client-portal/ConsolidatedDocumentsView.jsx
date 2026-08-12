/**
 * ConsolidatedDocumentsView
 * Tous les documents reçus groupés par catégorie/prestataire.
 * Dévis, contrats, brochures — téléchargeables au clic.
 */
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, ExternalLink, PenTool } from 'lucide-react';
import PortalBackButton from './PortalBackButton';
import { useClientContrats } from '@/hooks/useClientContrats';
import { CONTRAT_STATUT_COLORS } from '@/constants/colors';

const TYPE_ICON = {
  'Devis':                '📋',
  'Contrat':              '📝',
  'Facture d\'acompte':   '🧾',
  'Facture intermédiaire':'🧾',
  'Facture':              '🧾',
  'Avoir':                '↩️',
  'Solde':                '🧾',
  'Brochure':             '📕',
};

const TYPE_COLOR = {
  'Devis':      { bg: '#eff6ff', color: '#1d4ed8' },
  'Contrat':    { bg: '#f0fdf4', color: '#16a34a' },
  'Facture':    { bg: '#fefce8', color: '#854d0e' },
  'Brochure':   { bg: '#faf5ff', color: '#7c3aed' },
  'default':    { bg: '#f8fafc', color: '#475569' },
};

function getDocColor(type) {
  if (!type) return TYPE_COLOR.default;
  for (const key of Object.keys(TYPE_COLOR)) {
    if (type.startsWith(key)) return TYPE_COLOR[key];
  }
  return TYPE_COLOR.default;
}

const DOMAINE_ICONS = {
  'Traiteur': '🍽️', 'DJ / Musique': '🎵', 'Photographe': '📷', 'Vidéaste': '🎬',
  'Fleuriste': '💐', 'Décoration': '✨', 'Animation': '🎭', 'Transport': '🚗',
  'Sécurité': '🛡️', 'Sono / Lumières': '💡', 'Lieu de réception': '🏛️',
  'Organisation': '📋', 'Beauté & Bien-être': '💆', 'Logistique': '📦', 'Autre': '🤝',
};

function DocRow({ doc, index, prestataire }) {
  const icon = TYPE_ICON[doc.type_document] || TYPE_ICON[doc.type] || '📄';
  const color = getDocColor(doc.type_document || doc.type);
  const url = doc.pdf_url || doc.fichier_url || doc.url;
  const nom = doc.numero || doc.nom || doc.titre || 'Document';
  const type = doc.type_document || doc.type || 'Document';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="flex items-center gap-3 p-3 rounded-2xl border transition-all"
        style={{ background: '#ffffff', borderColor: '#e8e4dc' }}
      >
        {/* Lien principal — consultation (ouvre le PDF dans un nouvel onglet) */}
        <a
          href={url || '#'}
          target={url ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="flex items-center gap-3 flex-1 min-w-0"
          style={{ cursor: url ? 'pointer' : 'default' }}
        >
          {/* Icône type */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
            style={{ background: color.bg }}>
            {icon}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: '#1e1b4b' }}>{nom}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: color.bg, color: color.color }}>
                {type}
              </span>
              {doc.statut && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${CONTRAT_STATUT_COLORS[doc.statut] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {doc.statut}
                </span>
              )}
              {prestataire && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500 truncate">
                  {prestataire.logo_url ? (
                    <img src={prestataire.logo_url} alt="" className="w-4 h-4 rounded object-contain shrink-0" />
                  ) : (
                    <span className="text-[10px] shrink-0">{DOMAINE_ICONS[prestataire.domaine] || '🤝'}</span>
                  )}
                  <span className="truncate">{prestataire.nom}</span>
                </span>
              )}
            </div>
          </div>

          {/* Icône consultation */}
          {url ? (
            <ExternalLink size={16} className="text-gray-300 shrink-0" />
          ) : (
            <span className="text-[10px] text-gray-300 shrink-0 italic">À venir</span>
          )}
        </a>

        {/* Bouton signature électronique (si lien Youtrust disponible et statut "En attente") */}
        {doc.yousign_signature_url && doc.statut === 'En attente de signature' && !doc.contrat_signe_url && (
          <a
            href={doc.yousign_signature_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Signer le contrat en ligne"
            className="p-2 rounded-lg hover:bg-violet-50 text-violet-600 hover:text-violet-700 transition-colors shrink-0"
          >
            <PenTool size={15} />
          </a>
        )}

        {/* Bouton téléchargement */}
        {url && (
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            title="Télécharger"
            className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <Download size={15} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function ConsolidatedDocumentsView({ clientId, evenementId, clientEmail }) {
  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', clientId, evenementId],
    queryFn: () => clientId
      ? base44.entities.ClientDocument.filter({ client_id: clientId }, '-created_date', 100)
      : [],
    enabled: !!clientId,
  });

  const { data: devis = [] } = useQuery({
    queryKey: ['devis-client-portal', evenementId],
    queryFn: () => base44.entities.Devis.filter({ evenement_id: evenementId }),
    enabled: !!evenementId,
  });

  const { data: brochures = [] } = useQuery({
    queryKey: ['brochures-client'],
    queryFn: () => base44.entities.BrochureCatalogue.filter({ actif: true }),
  });

  // Contrats du client (lecture seule — logique partagée via useClientContrats)
  const { contrats: clientContrats = [] } = useClientContrats({ clientId, evenementId });

  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires-all'],
    queryFn: () => base44.entities.Prestataire.list(),
  });
  const { data: allCompanySettings = [] } = useQuery({
    queryKey: ['company-settings-all'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  // Résolution du prestataire source de chaque document :
  //  - Devis : via prestataire_id (chaque devis est rattaché à un prestataire).
  //  - Brochures : BrochureCatalogue n'a pas de prestataire_id → elles appartiennent
  //    au prestataire propriétaire de l'app (CompanySettings.is_owner).
  //  - ClientDocument : aucun rattachement prestataire → source masquée.
  const prestataireMap = {};
  prestataires.forEach(p => { prestataireMap[p.id] = p; });
  const ownerCs = (allCompanySettings || []).find(c => c.is_owner === true);
  const ownerPrestataire = ownerCs ? prestataireMap[ownerCs.prestataire_id] : null;

  // Devis non brouillon uniquement
  const devisVis = devis.filter(d => d.statut !== 'Brouillon');

  // Grouper par type
  const groups = [];

  if (devisVis.length > 0) {
    groups.push({
      label: 'Devis & Factures',
      emoji: '📋',
      docs: devisVis.map(d => ({ ...d, type_document: d.type_document || 'Devis', prestataire: prestataireMap[d.prestataire_id] })),
    });
  }

  if (clientContrats.length > 0) {
    groups.push({
      label: 'Contrats',
      emoji: '📝',
      docs: clientContrats.map(c => ({
        ...c,
        type_document: 'Contrat',
        url: c.contrat_signe_url || c.modele_url,
        nom: c.titre,
        titre: c.titre,
        prestataire: prestataireMap[c.prestataire_id],
      })),
    });
  }

  if (documents.length > 0) {
    groups.push({
      label: 'Documents partagés',
      emoji: '📄',
      docs: documents,
    });
  }

  if (brochures.length > 0) {
    groups.push({
      label: 'Brochures',
      emoji: '📕',
      docs: brochures.map(b => ({ ...b, type: 'Brochure', url: b.fichier_url, prestataire: ownerPrestataire })),
    });
  }

  const totalDocs = devisVis.length + clientContrats.length + documents.length + brochures.length;

  return (
    <div className="px-4 py-4">
      <PortalBackButton />
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        📄 Mes documents
      </p>

      {totalDocs === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-5xl">📄</span>
          <p className="font-semibold text-sm" style={{ color: '#1e1b4b' }}>Aucun document disponible</p>
          <p className="text-xs text-gray-400">Vos devis, contrats et brochures apparaîtront ici dès qu'ils seront partagés.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
                <span>{group.emoji}</span> {group.label}
                <span className="ml-auto">{group.docs.length}</span>
              </p>
              <div className="space-y-2">
                {group.docs.map((doc, i) => (
                  <DocRow key={doc.id} doc={doc} index={i} prestataire={doc.prestataire} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}