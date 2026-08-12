/**
 * Modal déclenchée lors d'un import brochure (formule catalogue).
 *
 * CAS A — Un formulaire perso existe (is_exemple: false) :
 *   Bouton 1 → Greffe les questions menu sur le formulaire existant
 *   Bouton 2 → Crée un formulaire dédié "Formulaire [formule]" + greffe
 *
 * CAS B — Aucun formulaire perso :
 *   Bouton 1 → Personnaliser l'exemple (builder)
 *   Bouton 2 → Continuer avec la version par défaut (dupliquer + greffer)
 *   Bouton 3 → Créer un formulaire dédié depuis zéro (builder vide)
 */
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SelectFormulaModal from '@/components/bibliotheque/SelectFormulaModal';
import ModeleFormulaireModal from './ModeleFormulaireModal';

const NOM_UNIVERSEL = '🌐 Formulaire universel';

function OptionCard({ icon, title, subtitle, onClick, highlighted, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${highlighted
          ? 'border-primary bg-primary/5 hover:bg-primary/10'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xl
        ${highlighted ? 'bg-primary/10' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 leading-snug">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
    </button>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="font-bold text-base text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom) + 110px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function BrochureFormulaireModal({ formulaName, modeles = [], onClose, onCreated }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState('choix'); // 'choix' | 'greffe' | 'builder'
  const [formulairePerso, setFormulairePerso] = useState(null);
  const [working, setWorking] = useState(false);

  // Détection instantanée CAS A / CAS B depuis les modèles passés en prop
  const formulairesPerso = modeles.filter(m => !m.is_exemple);
  const premierPerso = formulairesPerso[0] || null;
  const hasPerso = formulairesPerso.length > 0;
  const exemple = modeles.find(m => m.is_exemple && m.champs?.length > 0);
  const nomFormulaireDedie = `Formulaire ${formulaName?.split('—')[0]?.trim() || formulaName}`;

  // CAS A — Ajouter au formulaire existant
  const handleAjouterAuExistant = () => {
    setFormulairePerso(premierPerso);
    setStep('greffe');
  };

  // CAS A — Créer un formulaire dédié (dupliquer exemple + greffer)
  // CAS B bouton 2 — Continuer avec la version par défaut
  const handleDupliquerEtGreffer = async (nomCible = NOM_UNIVERSEL) => {
    setWorking(true);
    if (!exemple) {
      const created = await base44.entities.ModeleFormulaire.create({ nom: nomCible, champs: [] });
      setFormulairePerso(created);
      qc.invalidateQueries(['modeles-formulaire']);
      setStep('greffe');
      setWorking(false);
      return;
    }
    const copy = { ...exemple };
    delete copy.id; delete copy.created_date; delete copy.updated_date; delete copy.created_by;
    copy.nom = nomCible;
    copy.is_exemple = false;
    const created = await base44.entities.ModeleFormulaire.create(copy);
    setFormulairePerso(created);
    qc.invalidateQueries(['modeles-formulaire']);
    setWorking(false);
    setStep('greffe');
    toast({ title: '✓ Formulaire créé', description: `"${nomCible}" créé depuis le modèle exemple.` });
  };

  // CAS B bouton 1 — Personnaliser l'exemple (builder)
  // CAS B bouton 3 — Créer depuis zéro (builder vide)
  const handleOuvrirBuilder = (modele) => {
    setFormulairePerso(modele);
    setStep('builder');
  };

  // ─── Greffe via SelectFormulaModal ───
  if (step === 'greffe' && formulairePerso) {
    return (
      <SelectFormulaModal
        formulaName={formulaName}
        onClose={onClose}
        onGenerated={() => {
          toast({ title: '✓ Questions menu ajoutées', description: `Questions pour "${formulaName?.split('—')[0]?.trim()}" intégrées avec conditions.` });
          onCreated?.();
          onClose();
        }}
        isUniversel={true}
        existingModele={formulairePerso}
      />
    );
  }

  // ─── Builder formulaire ───
  if (step === 'builder') {
    return (
      <ModeleFormulaireModal
        modele={formulairePerso || null}
        onClose={() => { onCreated?.(); onClose(); }}
      />
    );
  }

  // ─── CAS A — Un formulaire perso existe ───
  if (hasPerso) {
    return (
      <ModalShell
        title="Un formulaire existe déjà"
        subtitle={`Que souhaitez-vous faire avec les questions menu de cette formule ?`}
        onClose={onClose}
      >
        <OptionCard
          icon="➕"
          title="Ajouter au formulaire existant"
          subtitle={`Greffe les questions de "${formulaName?.split('—')[0]?.trim()}" sur "${premierPerso?.nom}" sans créer de nouveau formulaire.`}
          onClick={handleAjouterAuExistant}
          highlighted
          disabled={working}
        />
        <OptionCard
          icon="📋"
          title={`Créer un formulaire dédié "${nomFormulaireDedie}"`}
          subtitle="Duplique le modèle exemple et y greffe les questions menu de cette formule. Un formulaire indépendant est créé."
          onClick={() => handleDupliquerEtGreffer(nomFormulaireDedie)}
          disabled={working}
        />
        {working && (
          <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Création en cours…</span>
          </div>
        )}
      </ModalShell>
    );
  }

  // ─── CAS B — Aucun formulaire perso ───
  return (
    <ModalShell
      title="Formulaire non configuré"
      subtitle="Votre formulaire n'est pas encore personnalisé. Comment souhaitez-vous procéder ?"
      onClose={onClose}
    >
      <OptionCard
        icon="✏️"
        title="Personnaliser d'abord"
        subtitle="Ouvrir le formulaire exemple pour le personnaliser. Vous pourrez ensuite y greffer les questions menu."
        onClick={() => handleOuvrirBuilder(exemple || null)}
        highlighted
        disabled={working}
      />
      <OptionCard
        icon="⚡"
        title="Continuer avec la version par défaut"
        subtitle="Duplique automatiquement l'exemple et greffe les questions menu de cette formule. Rapide et sans configuration."
        onClick={() => handleDupliquerEtGreffer(NOM_UNIVERSEL)}
        disabled={working}
      />
      <OptionCard
        icon="🆕"
        title="Créer un formulaire dédié"
        subtitle="Ouvre le builder de formulaire vierge avec la bibliothèque de questions pour créer un formulaire sur mesure."
        onClick={() => handleOuvrirBuilder(null)}
        disabled={working}
      />
      {working && (
        <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Création en cours…</span>
        </div>
      )}
    </ModalShell>
  );
}