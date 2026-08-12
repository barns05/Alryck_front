import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Plus, NotebookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AjoutRapideModal from '@/components/bibliotheque/AjoutRapideModal';
import BlocProgramme from '@/components/bibliotheque/BlocProgramme';
import BlocFormulaires from '@/components/bibliotheque/BlocFormulaires';
import BlocFichesService from '@/components/bibliotheque/BlocFichesService';
import BlocOptions from '@/components/bibliotheque/BlocOptions';
import BlocPlanTable from '@/components/bibliotheque/BlocPlanTable';
import BlocCommandes from '@/components/bibliotheque/BlocCommandes';
import BlocCatalogue from '@/components/bibliotheque/BlocCatalogue';
import BlocBrochures from '@/components/bibliotheque/BlocBrochures';
import EffectifSettings from './EffectifSettings';
import AllergenesVueGlobale from '@/components/allergenes/AllergenesVueGlobale';
import BlocLogistique from '@/components/bibliotheque/BlocLogistique';
import SettingsSecurite from '@/components/settings/SettingsSecurite';
import { useModules } from '@/hooks/useModules';

function CarteAccueil({ emoji, titre, count, label, subtitle, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left bg-card border border-border rounded-2xl p-6 flex items-center justify-between gap-4 transition-all
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/40 hover:shadow-md hover:bg-primary/5 cursor-pointer'}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl">{emoji}</span>
        <div>
          <p className="font-semibold text-base">{titre}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {disabled ? 'Fonctionnalité à venir' : subtitle ?? `${count} ${label}`}
          </p>
        </div>
      </div>
      {!disabled && <ChevronRight size={20} className="text-muted-foreground shrink-0" />}
      {disabled && <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0">Bientôt</span>}
    </button>
  );
}

export default function Bibliotheque() {
  const modules = useModules();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || null;
  const goToSection = (s) => {
    setSearchParams(s ? { section: s } : {});
    window.scrollTo({ top: 0, behavior: 'instant' });
  };;
  const [showAjoutRapide, setShowAjoutRapide] = useState(false);

  const { data: modelesProg = [] } = useQuery({
    queryKey: ['modeles-programme'],
    queryFn: () => base44.entities.ModeleProgramme.list(),
  });

  const { data: modelesForm = [] } = useQuery({
    queryKey: ['modeles-formulaire'],
    queryFn: () => base44.entities.ModeleFormulaire.list(),
  });

  const { data: modelesFiche = [] } = useQuery({
    queryKey: ['modeles-fiche-service'],
    queryFn: () => base44.entities.ModeleFicheService.list(),
  });

  const { data: optionsPrestations = [] } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.list(),
  });

  const { data: plansSalle = [] } = useQuery({
    queryKey: ['plans-salle'],
    queryFn: () => base44.entities.PlanSalle.list(),
  });

  const { data: brochures = [] } = useQuery({
    queryKey: ['brochures-catalogue'],
    queryFn: () => base44.entities.BrochureCatalogue.list('-created_date', 200),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {section && (
            <button
              onClick={() => goToSection(null)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronRight size={14} className="rotate-180" /> Retour
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold">
            {section === 'programme' ? '📋 Programme de la journée' :
             section === 'formulaires' ? '📝 Questionnaires' :
             section === 'fiches' ? '📋 Fiches de service' :
             section === 'options' ? '🎯 Options & Prestations' :
             section === 'plan_table' ? '🗺️ Plans de salle' :
             section === 'commandes' ? '📦 Commandes' :
             section === 'catalogue' ? '🍽️ Formules & Menus' :
             section === 'brochures' ? '📄 Brochures commerciales' :
             section === 'effectif' ? '👥 Paramètres effectifs' :
             section === 'allergenes' ? '⚠️ Allergènes' :
             section === 'logistique' ? '📦 Logistique & Livraisons' :
             section === 'securite' ? '📕 Registre ERP' :
             'Bibliothèque'}
          </h2>
            {!section && <p className="text-muted-foreground text-sm mt-1">Ressources réutilisables pour vos événements</p>}
          </div>
        </div>
        {!section && (
          <Button onClick={() => setShowAjoutRapide(true)} className="gap-2 shrink-0">
            <Plus size={16} /> Ajouter
          </Button>
        )}
      </div>

      {showAjoutRapide && (
        <AjoutRapideModal
          onClose={() => setShowAjoutRapide(false)}
          onCreated={(catId) => {
            const map = { menu: 'menus', plan_table: 'plan_table', option: 'options', programme: 'programme', formulaire: 'formulaires', fiche: 'fiches' };
            if (map[catId]) goToSection(map[catId]);
          }}
        />
      )}

      {/* Accueil — cartes */}
      {!section && (
        <div className="space-y-3">
          <CarteAccueil
            emoji="📄"
            titre="Brochures commerciales"
            count={brochures.length}
            label={`brochure${brochures.length !== 1 ? 's' : ''}`}
            onClick={() => goToSection('brochures')}
          />
          <CarteAccueil
            emoji="🍽️"
            titre="Formules & Menus"
            subtitle="Vos formules complètes avec menus, boissons et services inclus"
            onClick={() => goToSection('catalogue')}
          />
          <CarteAccueil
            emoji="🎯"
            titre="Options & Prestations"
            subtitle="Services et extras proposés à vos clients en complément des formules"
            onClick={() => goToSection('options')}
          />
          <CarteAccueil
            emoji="📋"
            titre="Programme de la journée"
            subtitle="Déroulé horaire de vos événements"
            onClick={() => goToSection('programme')}
          />
          <CarteAccueil
            emoji="📝"
            titre="Questionnaires"
            subtitle="Questions envoyées à vos clients"
            onClick={() => goToSection('formulaires')}
          />
          <CarteAccueil
            emoji="📋"
            titre="Fiches de service"
            subtitle="Instructions pour vos équipes"
            onClick={() => goToSection('fiches')}
          />

          <CarteAccueil
            emoji="🗺️"
            titre="Plans de salle"
            subtitle="Configuration de vos espaces de réception"
            onClick={() => goToSection('plan_table')}
          />
          <CarteAccueil
            emoji="📦"
            titre="Commandes"
            subtitle="Gestion de vos achats et fournisseurs"
            onClick={() => goToSection('commandes')}
          />
          <CarteAccueil
            emoji="👥"
            titre="Paramètres effectifs"
            subtitle="Règles de calcul des besoins en personnel par événement"
            onClick={() => goToSection('effectif')}
          />
          <CarteAccueil
            emoji="⚠️"
            titre="Allergènes"
            subtitle="Vue globale de tous les allergènes par plat et option"
            onClick={() => goToSection('allergenes')}
          />
          <CarteAccueil
            emoji={<NotebookText size={28} className="text-red-600" />}
            titre="Registre ERP"
            subtitle="Contrôles obligatoires et registre de sécurité"
            onClick={() => goToSection('securite')}
          />
          {modules.logistique && (
            <CarteAccueil
              emoji="🚚"
              titre="Logistique & Livraisons"
              subtitle="Matériel, véhicules et organisation de vos livraisons"
              onClick={() => goToSection('logistique')}
            />
          )}
        </div>
      )}

      {section === 'programme' && <BlocProgramme />}
      {section === 'formulaires' && <BlocFormulaires />}
      {section === 'fiches' && <BlocFichesService />}
      {section === 'options' && <BlocOptions />}
      {section === 'plan_table' && <BlocPlanTable />}
      {section === 'commandes' && <BlocCommandes />}
      {section === 'catalogue' && <BlocCatalogue />}
      {section === 'brochures' && <BlocBrochures />}
      {section === 'effectif' && <EffectifSettings />}
      {section === 'allergenes' && <AllergenesVueGlobale />}
      {section === 'logistique' && <BlocLogistique />}
      {section === 'securite' && <SettingsSecurite />}
    </div>
  );
}