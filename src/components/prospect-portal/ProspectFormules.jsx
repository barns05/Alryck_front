import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ProspectToujoursInteresse from './ProspectToujoursInteresse';

const STATUT_COLORS = {
  'Envoyé': 'bg-blue-100 text-blue-700',
  'Accepté': 'bg-emerald-100 text-emerald-700',
  'Refusé': 'bg-red-100 text-red-600',
};

function sAppliqueA(item, typeEvenement) {
  const list = item.s_applique_a || [];
  return list.length === 0 || list.includes(typeEvenement);
}

// ─── Brochures PDF ────────────────────────────────────────────────────────────
function BrochuresSection({ typeEvenement }) {
  const { data: brochures = [] } = useQuery({
    queryKey: ['brochures-prospect', typeEvenement],
    queryFn: () => base44.entities.BrochureCatalogue.filter({ actif: true }),
    select: (list) => list.filter(b => {
      if (b.fichier_type !== 'pdf') return false;
      // Nouveau format : types_evenement (array)
      if (Array.isArray(b.types_evenement)) {
        return b.types_evenement.length === 0 || b.types_evenement.includes(typeEvenement);
      }
      // Rétrocompat ancien champ type_evenement (string)
      return !b.type_evenement || b.type_evenement === 'Tous' || b.type_evenement === typeEvenement;
    }),
  });

  if (brochures.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📄 Nos brochures</p>
      <div className="space-y-2">
        {brochures.map(b => (
          <a
            key={b.id}
            href={b.fichier_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 active:bg-muted/60 transition-colors"
          >
            <span className="text-xl shrink-0">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{b.nom}</p>
              <p className="text-[11px] text-muted-foreground">Appuyer pour télécharger</p>
            </div>
            <span className="text-xs text-primary font-semibold shrink-0">PDF ↓</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Formulaire demande de devis ──────────────────────────────────────────────
function DemandeDevisForm({ prospect, formules, options, tarifAdo, tarifEnfant, tarifPrestataire, onSent }) {
  const [formuleId, setFormuleId] = useState(prospect?.formule_id || '');
  const [formuleNom, setFormuleNom] = useState(prospect?.formule_nom || '');
  const [formuleAutre, setFormuleAutre] = useState('');
  const [nbAdultes, setNbAdultes] = useState(prospect?.nb_invites_estime || '');
  const [nbAdos, setNbAdos] = useState('');
  const [nbEnfants, setNbEnfants] = useState('');
  const [nbPrestataires, setNbPrestataires] = useState('');
  const [optionsIds, setOptionsIds] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleOption = (id) =>
    setOptionsIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectFormule = (f) => {
    setFormuleId(f.id);
    setFormuleNom(f.nom);
    setFormuleAutre('');
  };

  const handleSelectAutre = () => {
    setFormuleId('autre');
    setFormuleNom('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    const nomFormule = formuleId === 'autre' ? (formuleAutre || 'Autre') : formuleNom;
    const optionsChoisies = options.filter(o => optionsIds.includes(o.id));
    const optionsNoms = optionsChoisies.map(o => o.nom).join(', ');

    const nba = parseInt(nbAdultes) || 0;
    const nbad = parseInt(nbAdos) || 0;
    const nbe = parseInt(nbEnfants) || 0;
    const nbp = parseInt(nbPrestataires) || 0;

    const parts = [
      `📋 ${prospect.prenom} ${prospect.nom} demande un devis :`,
      nba > 0 ? `${nba} adulte${nba > 1 ? 's' : ''}` : null,
      nbad > 0 && tarifAdo ? `${nbad} ${tarifAdo.nom}` : null,
      nbe > 0 && tarifEnfant ? `${nbe} ${tarifEnfant.nom}` : null,
      nbp > 0 && tarifPrestataire ? `${nbp} ${tarifPrestataire.nom}` : null,
      nomFormule ? `Formule : ${nomFormule}` : null,
      optionsNoms ? `Options : ${optionsNoms}` : null,
      message ? `Message : ${message}` : null,
      `prospect_id:${prospect.id}`,
      prospect.email ? `prospect_email:${prospect.email}` : null,
      'Cliquez pour voir la fiche prospect.',
    ].filter(Boolean).join('\n');

    await base44.entities.ProspectMessage.create({
      prospect_id: prospect.id,
      auteur: 'prospect',
      message: `DEMANDE_DEVIS:${JSON.stringify({
        prospect_id: prospect.id,
        client_nom: prospect.prenom + ' ' + prospect.nom,
        client_email: prospect.email,
        nb_adultes: parseInt(nbAdultes) || 0,
        nb_ados: parseInt(nbAdos) || 0,
        nb_enfants: parseInt(nbEnfants) || 0,
        nb_prestataires: parseInt(nbPrestataires) || 0,
        formule_nom: nomFormule,
        options: optionsNoms ? optionsNoms.split(',').map(o => o.trim()) : [],
        message,
        date: new Date().toISOString(),
      })}`,
    });

    await base44.functions.invoke('createNotification', {
      type: 'devis_demande',
      titre: `📋 Demande de devis — ${prospect.prenom} ${prospect.nom}`,
      message: parts,
      lien: `/Clients?tab=prospects`,
    });

    setLoading(false);
    toast.success('Votre demande a bien été envoyée ! Nous vous répondrons rapidement.');
    onSent();
  };

  return (
    <div className="space-y-5 pt-2">

      {/* 1. Formule souhaitée — cartes visuelles */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">🍽️ Formule souhaitée</p>
        <div className="grid grid-cols-1 gap-3">
          {formules.map(f => {
            const selected = formuleId === f.id;
            // Prix : priorité prix_par_annee de l'année en cours, sinon prix_ttc, sinon prix
            const annee = new Date().getFullYear();
            const prixAnnee = (f.prix_par_annee || []).find(p => p.annee === annee)?.prix;
            const prixAffiche = prixAnnee ?? f.prix_ttc ?? f.prix ?? null;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFormule(f)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {/* Photo ou emoji */}
                {f.photo_url ? (
                  <img src={f.photo_url} alt={f.nom} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${selected ? 'text-primary' : 'text-foreground'}`}>{f.nom}</p>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.description}</p>
                  )}
                  {prixAffiche != null && (
                    <p className="text-xs font-semibold text-primary mt-1">À partir de {prixAffiche.toLocaleString('fr-FR')} €/pers.</p>
                  )}
                </div>
                {selected && <span className="text-primary text-lg shrink-0">✓</span>}
              </button>
            );
          })}
          {/* Carte "Autre" */}
          <button
            type="button"
            onClick={handleSelectAutre}
            className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
              formuleId === 'autre'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl shrink-0">✨</div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${formuleId === 'autre' ? 'text-primary' : 'text-foreground'}`}>Autre souhait</p>
              <p className="text-xs text-muted-foreground mt-0.5">Précisez votre demande personnalisée</p>
            </div>
            {formuleId === 'autre' && <span className="text-primary text-lg shrink-0">✓</span>}
          </button>
        </div>
        {formuleId === 'autre' && (
          <input
            type="text"
            value={formuleAutre}
            onChange={e => setFormuleAutre(e.target.value)}
            placeholder="Précisez votre souhait…"
            className="mt-2 flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}
      </div>

      {/* 2. Effectifs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">👥 Nombre de personnes</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Adultes</label>
            <input
              type="number" inputMode="numeric" min="0"
              value={nbAdultes} onChange={e => setNbAdultes(e.target.value)}
              placeholder="Ex: 80"
              className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {tarifAdo && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{tarifAdo.nom}</label>
              <input
                type="number" inputMode="numeric" min="0"
                value={nbAdos} onChange={e => setNbAdos(e.target.value)}
                placeholder="0"
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
          {tarifEnfant && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{tarifEnfant.nom}</label>
              <input
                type="number" inputMode="numeric" min="0"
                value={nbEnfants} onChange={e => setNbEnfants(e.target.value)}
                placeholder="0"
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
          {tarifPrestataire && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{tarifPrestataire.nom}</label>
              <input
                type="number" inputMode="numeric" min="0"
                value={nbPrestataires} onChange={e => setNbPrestataires(e.target.value)}
                placeholder="0"
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Options cochables — noms uniquement */}
      {options.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">✨ Options souhaitées</p>
          <div className="flex flex-wrap gap-2">
            {options.map(o => {
              const checked = optionsIds.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOption(o.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all active:scale-[0.97] ${
                    checked
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground'
                  }`}
                >
                  {o.nom}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Message libre */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">💬 Message complémentaire</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Questions, souhaits particuliers, contraintes…"
          className="flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none placeholder:text-muted-foreground"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? 'Envoi en cours…' : '📤 Envoyer ma demande'}
      </button>
    </div>
  );
}

// ─── Ligne document compacte ──────────────────────────────────────────────────
function DevisRow({ devis, onNavigate }) {
  const dateStr = devis.date_devis
    ? new Date(devis.date_devis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : devis.created_date
      ? new Date(devis.created_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      {/* Icône PDF */}
      <span className="text-xl shrink-0">📄</span>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{devis.numero || devis.type_document || 'Document'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {dateStr && <span className="text-[11px] text-muted-foreground">{dateStr}</span>}
          {devis.total_ttc > 0 && (
            <span className="text-[11px] font-semibold text-primary">{devis.total_ttc.toLocaleString('fr-FR')} €</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUT_COLORS[devis.statut] || 'bg-muted text-muted-foreground'}`}>
            {devis.statut}
          </span>
        </div>
      </div>

      {/* Actions droite */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {devis.statut === 'Accepté' && onNavigate && (
          <button
            onClick={() => onNavigate('prereservation')}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold active:scale-[0.97] transition-all"
          >
            🔐 Réserver
          </button>
        )}
        {devis.pdf_url && (
          <a
            href={devis.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-muted/40 text-sm active:bg-muted transition-colors"
            title="Télécharger"
          >
            ↓
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ProspectFormules({ prospect, onNavigate, scrollRef }) {
  const [showDemandeForm, setShowDemandeForm] = useState(false);
  const qc = useQueryClient();

  const typeEvenement = prospect?.type_evenement;

  const { data: demandesMessages = [] } = useQuery({
    queryKey: ['prospect-demandes-devis', prospect?.id],
    queryFn: () => base44.entities.ProspectMessage.filter({ prospect_id: prospect.id, auteur: 'prospect' }),
    enabled: !!prospect?.id,
    select: (msgs) => msgs.filter(m => m.message?.startsWith('DEMANDE_DEVIS:')),
  });
  const demandeSent = demandesMessages.length > 0;

  const { data: tarifsItems = [] } = useQuery({
    queryKey: ['catalogue-tarifs-prospect'],
    queryFn: () => base44.entities.CatalogueItem.filter({ section: 'tarifs', actif: true }),
  });

  const { data: optionsAll = [] } = useQuery({
    queryKey: ['options-prestations-prospect'],
    queryFn: () => base44.entities.OptionPrestation.filter({ actif: true }),
  });

  const { data: devisList = [] } = useQuery({
    queryKey: ['devis-prospect', prospect?.id, prospect?.email],
    queryFn: async () => {
      if (!prospect) return [];
      const results = [];
      if (prospect.id) {
        const byId = await base44.entities.Devis.filter({ prospect_id: prospect.id });
        results.push(...byId);
      }
      if (prospect.email) {
        const byEmail = await base44.entities.Devis.filter({ client_email: prospect.email });
        byEmail.forEach(d => { if (!results.find(r => r.id === d.id)) results.push(d); });
      }
      return results.filter(d => ['Envoyé', 'Accepté'].includes(d.statut));
    },
    enabled: !!prospect,
  });

  const formules = tarifsItems.filter(i =>
    i.type_tarif === 'formule' &&
    i.type_calcul === 'fixe' &&
    sAppliqueA(i, typeEvenement)
  );

  const tarifAdo = tarifsItems.find(i => i.type_tarif === 'ado' && sAppliqueA(i, typeEvenement)) || null;
  const tarifEnfant = tarifsItems.find(i => i.type_tarif === 'enfant' && sAppliqueA(i, typeEvenement)) || null;
  const tarifPrestataire = tarifsItems.find(i => i.type_tarif === 'prestataire' && sAppliqueA(i, typeEvenement)) || null;

  const options = optionsAll.filter(o => sAppliqueA(o, typeEvenement));

  const onSent = () => {
    qc.invalidateQueries(['prospect-demandes-devis', prospect?.id]);
    setShowDemandeForm(false);
    scrollRef?.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pt-2 pb-8">

      {/* Toujours intéressé */}
      <ProspectToujoursInteresse prospect={prospect} />

      {/* Brochures */}
      <BrochuresSection typeEvenement={typeEvenement} />

      {/* Mes documents — liste compacte */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">📁 Mes documents</p>

        {devisList.length > 0 ? (
          <div className="space-y-2">
            {devisList.map(devis => (
              <DevisRow key={devis.id} devis={devis} onNavigate={onNavigate} />
            ))}
          </div>
        ) : demandeSent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-sm text-emerald-800">Demande envoyée !</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Notre équipe vous prépare un devis personnalisé.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-semibold text-sm mb-1">Pas encore de devis reçu</p>
            <p className="text-xs text-muted-foreground mb-4">Faites votre demande et nous vous préparerons une offre personnalisée.</p>
            <button
              onClick={() => setShowDemandeForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition-all">
              📋 Demander un devis
            </button>
          </div>
        )}

        {/* Formulaire de demande / modification */}
        {showDemandeForm && (
          <div className="mt-4 bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">
                {devisList.length > 0 ? '✏️ Demande de modification' : '📋 Demande de devis'}
              </p>
              <button onClick={() => setShowDemandeForm(false)} className="text-muted-foreground text-xl leading-none">✕</button>
            </div>
            <DemandeDevisForm
              prospect={prospect}
              formules={formules}
              options={options}
              tarifAdo={tarifAdo}
              tarifEnfant={tarifEnfant}
              tarifPrestataire={tarifPrestataire}
              onSent={onSent}
            />
          </div>
        )}

        {/* Bouton global "Demander une modification" — affiché si devis reçus et form fermé */}
        {devisList.length > 0 && !showDemandeForm && (
          <button
            onClick={() => setShowDemandeForm(true)}
            className="mt-3 w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground active:bg-muted/50 transition-all"
          >
            ✏️ Demander une modification
          </button>
        )}
      </div>
    </div>
  );
}