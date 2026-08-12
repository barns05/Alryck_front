/**
 * ParametresEntreprise — Page dédiée aux réglages internes de l'entreprise.
 * Reprend les 9 cartes du bloc « Paramètres avancés » de l'ancienne MaFiche.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, AlertCircle } from 'lucide-react';
import SettingsFacturation from '@/components/settings/SettingsFacturation';
import SettingsFichesService from '@/components/settings/SettingsFichesService';
import SettingsTypesEvenement from '@/components/settings/SettingsTypesEvenement';
import SettingsAnalyse from '@/components/settings/SettingsAnalyse';
import SettingsNotifications from '@/components/settings/SettingsNotifications';
import BlocParametresApp from '@/components/bibliotheque/BlocParametresApp';
import SettingsSecurite from '@/components/settings/SettingsSecurite';
import SetupSecuriteModal from '@/components/settings/SetupSecuriteModal';
import SettingsModuleRH from '@/components/settings/SettingsModuleRH';
import Automatisations from '@/pages/Automatisations';

const ADVANCED_CARDS = [
  { id: 'facturation', emoji: '💶', title: 'Facturation', desc: 'IBAN, TVA, conditions de paiement' },
  { id: 'fiches', emoji: '📋', title: 'Fiches de service', desc: "Délai et heure d'envoi par défaut" },
  { id: 'types', emoji: '🎭', title: "Types d'événements", desc: 'Activer / désactiver les types' },
  { id: 'analyse', emoji: '📊', title: 'Analyse', desc: "Objectif annuel d'événements" },
  { id: 'notifications', emoji: '🔔', title: 'Notifications', desc: "Préférences d'envoi" },
  { id: 'modules', emoji: '⚙️', title: "Paramètres de l'application", desc: 'Activer / désactiver les modules' },
  { id: 'rh', emoji: '👥', title: 'Configuration Équipe', desc: 'Taux horaire, alertes, timings' },
  { id: 'securite', emoji: '🔒', title: 'Sécurité & Conformité', desc: 'Contrôles, registre ERP' },
  { id: 'automatisations', emoji: '⚡', title: 'Automatisations', desc: 'Règles de déclenchement' },
];

export default function ParametresEntreprise() {
  const [searchParams] = useSearchParams();
  const [advancedView, setAdvancedView] = useState(searchParams.get('advanced') || null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSetupSecurite, setShowSetupSecurite] = useState(false);

  const { data: moduleSecurite = [] } = useQuery({
    queryKey: ['module-securite'],
    queryFn: () => base44.entities.ModuleSecurite.list(),
  });

  const handleBack = () => { setAdvancedView(null); setIsDirty(false); };

  // ─── Vue paramètre avancé ───
  if (advancedView) {
    const card = ADVANCED_CARDS.find(c => c.id === advancedView);
    return (
      <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Retour aux Paramètres
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-muted">
            {card.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold">{card.title}</h1>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
          </div>
        </div>
        {isDirty && (
          <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3 -mx-4 md:-mx-6">
            <AlertCircle size={16} className="text-amber-700 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">Modifications non sauvegardées</p>
          </div>
        )}
        {advancedView === 'facturation' && <SettingsFacturation onSaved={handleBack} />}
        {advancedView === 'fiches' && <SettingsFichesService onSaved={handleBack} setIsDirty={setIsDirty} />}
        {advancedView === 'types' && <SettingsTypesEvenement onSaved={handleBack} setIsDirty={setIsDirty} />}
        {advancedView === 'analyse' && <SettingsAnalyse onSaved={handleBack} setIsDirty={setIsDirty} />}
        {advancedView === 'notifications' && <SettingsNotifications onSaved={handleBack} setIsDirty={setIsDirty} />}
        {advancedView === 'modules' && <BlocParametresApp />}
        {advancedView === 'rh' && <SettingsModuleRH />}
        {advancedView === 'securite' && <SettingsSecurite onSaved={handleBack} setIsDirty={setIsDirty} />}
        {advancedView === 'automatisations' && <Automatisations />}
        {showSetupSecurite && <SetupSecuriteModal onClose={() => setShowSetupSecurite(false)} />}
      </div>
    );
  }

  // ─── Vue principale : 9 cartes ───
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">⚙️ Paramètres de l'entreprise</h2>
        <p className="text-muted-foreground text-sm mt-1">Configuration interne et fonctionnement de votre espace</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ADVANCED_CARDS.map(card => {
          if (card.id === 'securite') {
            const isActive = moduleSecurite?.[0]?.actif;
            return (
              <button
                key={card.id}
                onClick={() => isActive ? setAdvancedView(card.id) : setShowSetupSecurite(true)}
                className="bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-muted">{card.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
                </div>
                {isActive
                  ? <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">Actif</span>
                  : <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0">Inactif</span>
                }
              </button>
            );
          }
          return (
            <button
              key={card.id}
              onClick={() => setAdvancedView(card.id)}
              className="bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md hover:border-primary/30 transition-all flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-muted">{card.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>

      {showSetupSecurite && <SetupSecuriteModal onClose={() => setShowSetupSecurite(false)} />}
    </div>
  );
}