import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, MapPin, Users, Clock, Euro } from 'lucide-react';
import { useClientPortal } from '@/hooks/useClientPortal';
import AssocierPrestataireModal from '@/components/prestataires/AssocierPrestataireModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AutomationEvenementModal from '@/components/automatisations/AutomationEvenementModal';
import FacturationPanel from '@/components/facturation/FacturationPanel';
import MomentsPersonnelsAdmin from '@/components/evenements/MomentsPersonnelsAdmin';
import FicheServicePanel from '@/components/fiches/FicheServicePanel';
import AlerteAllergenes from '@/components/allergenes/AlerteAllergenes';
import LogistiqueEvenementTab from '@/components/evenements/LogistiqueEvenementTab';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

import EvenementDetailHeader from '@/components/evenements/EvenementDetailHeader';
import ConvivesFormuleSection from '@/components/evenements/ConvivesFormuleSection';
import ClientInfoSection from '@/components/evenements/ClientInfoSection';
import ModulesStatusGrid from '@/components/evenements/ModulesStatusGrid';
import AllocationSection from '@/components/evenements/AllocationSection';
import RecommandationBandeau from '@/components/evenements/RecommandationBandeau';
import PropositionDateRecap from '@/components/evenements/PropositionDateRecap';
import DemandeAnnulationRecap from '@/components/evenements/DemandeAnnulationRecap';
import AnnulerEvenementButton from '@/components/evenements/AnnulerEvenementButton';
import AcompteSuggestionBanner from '@/components/evenements/AcompteSuggestionBanner';
import EspaceSelector from '@/components/invites/EspaceSelector';

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label} : </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

export default function EvenementDetail({ evenement: ev, onClose, initialTab }) {
  const qc = useQueryClient();
  const [activeTab] = useState(initialTab || 'general');
  const [showAutomations, setShowAutomations] = useState(false);
  const [showFacturation, setShowFacturation] = useState(false);
  const [showPrestataires, setShowPrestataires] = useState(false);

  useEffect(() => {
    return () => { qc.invalidateQueries(['evenements']); };
  }, [qc]);

  const { data: lieu } = useQuery({
    queryKey: ['lieu-ev', ev.lieu_id],
    queryFn: () => base44.entities.Lieu.filter({ id: ev.lieu_id }).then(r => r[0] || null),
    enabled: !!ev.lieu_id,
  });

  // Lieux typés associés (entité LieuEvenement — cérémonie, réception, etc.)
  const { data: lieuxEvenement = [] } = useQuery({
    queryKey: ['lieux-evenement', ev.id],
    queryFn: () => base44.entities.LieuEvenement.filter({ evenement_id: ev.id }),
  });

  const { copyLink, sendLink, sendingLink } = useClientPortal(ev);

  const { data: prestatairesEv = [] } = useQuery({
    queryKey: ['evenement-prestataires', ev.id],
    queryFn: () => base44.entities.EvenementPrestataire.filter({ evenement_id: ev.id }),
  });

  const { data: formulaireData = [] } = useQuery({
    queryKey: ['formulaire-prep', ev.id],
    queryFn: () => base44.entities.FormulairePreparation.filter({ evenement_id: ev.id }),
  });
  const formulaire = formulaireData[0] || null;
  const formulaireComplete = formulaire?.statut === 'Complété' || formulaire?.statut === 'Clôturé';

  const { data: catalogueFormuleItems = [] } = useQuery({
    queryKey: ['catalogue-formule-items', ev.formule_nom],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
    enabled: !!ev.formule_nom,
    select: (items) => items.filter(i =>
      i.toutes_formules !== false ||
      (i.formules_associees || []).includes(ev.formule_nom)
    ),
  });

  const { data: optionsList = [], isLoading: loadingOptions } = useQuery({
    queryKey: ['options-prestations'],
    queryFn: () => base44.entities.OptionPrestation.list(),
  });

  const nbInvites = (() => {
    const total = (ev.nb_adultes || 0) + (ev.nb_adolescents || 0) + (ev.nb_enfants || 0);
    return total > 0 ? total : ev.nb_invites;
  })();

  // Seuls les lieux validés s'affichent comme lieux officiels (les propositions client en attente et refusées restent gérables dans LieuxSection)
  const lieuxValides = lieuxEvenement.filter((le) => (le.statut_validation || 'valide') === 'valide');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

          <EvenementDetailHeader
            ev={ev}
            activeTab={activeTab}
            onClose={onClose}
            setShowAutomations={setShowAutomations}
          />

          <div className="p-6 space-y-6">
            {activeTab === 'logistique' ? (
              <LogistiqueEvenementTab key={ev.id} evenement={ev} onSaved={onClose} />
            ) : (
              <>
                <RecommandationBandeau evenement={ev} prestatairesEv={prestatairesEv} onRecommander={() => setShowPrestataires(true)} />

                <PropositionDateRecap evenementId={ev.id} />

                <DemandeAnnulationRecap evenementId={ev.id} />

                <AcompteSuggestionBanner evenement={ev} />

                {/* Infos générales */}
                <Section title="Informations générales">
                  <div className="space-y-1.5">
                    <InfoRow icon={Calendar} label="Date" value={ev.date ? format(parseISO(ev.date), 'd MMMM yyyy', { locale: fr }) : null} />
                    <InfoRow icon={Clock} label="Horaires" value={ev.heure_debut && ev.heure_fin ? `${ev.heure_debut} – ${ev.heure_fin}` : null} />
                    {lieuxValides.length > 0 ? (
                      <div className="space-y-1.5">
                        {lieuxValides.map((le) => (
                          <div key={le.id} className="flex items-start gap-2 text-sm">
                            <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {le.type && (
                                  <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {le.type}
                                  </span>
                                )}
                                {le.lieu_lien_google_maps ? (
                                  <a href={le.lieu_lien_google_maps} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{le.lieu_nom}</a>
                                ) : (
                                  <span className="font-medium">{le.lieu_nom}</span>
                                )}
                                {le.lieu_ville && <span className="text-xs text-muted-foreground">· {le.lieu_ville}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : ev.lieu_nom && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Lieu : </span>
                          {lieu?.lien_google_maps ? (
                            <a href={lieu.lien_google_maps} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{ev.lieu_nom}</a>
                          ) : (
                            <span className="font-medium">{ev.lieu_nom}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {ev.lieu_id && (
                      <div className="pt-1">
                        <EspaceSelector evenement={ev} />
                      </div>
                    )}
                    {nbInvites > 0 && <InfoRow icon={Users} label="Invités" value={`${nbInvites} personne${nbInvites > 1 ? 's' : ''}`} />}
                    {ev.budget && <InfoRow icon={Euro} label="Budget" value={`${ev.budget.toLocaleString('fr-FR')} €`} />}
                  </div>
                </Section>

                <ConvivesFormuleSection
                  ev={ev}
                  formulaire={formulaire}
                  optionsList={optionsList}
                  loadingOptions={loadingOptions}
                />

                <ClientInfoSection
                  ev={ev}
                  copyLink={copyLink}
                  sendLink={sendLink}
                  sendingLink={sendingLink}
                />

                {ev.notes_internes && (
                  <Section title="Notes internes (admin)">
                    <p className="text-sm bg-amber-50 text-amber-800 rounded-xl p-3">{ev.notes_internes}</p>
                  </Section>
                )}

                <ModulesStatusGrid ev={ev} formulaire={formulaire} onOpenFacturation={() => setShowFacturation(true)} />

                {formulaireComplete && <FicheServicePanel evenement_id={ev.id} />}

                <MomentsPersonnelsAdmin evenement={ev} />

                <AllocationSection
                  evenement={ev}
                  prestatairesEv={prestatairesEv}
                  onGererPrestataires={() => setShowPrestataires(true)}
                />

                {(catalogueFormuleItems.some(i => i.allergenes?.length > 0) || optionsList.some(o => o.allergenes?.length > 0)) && (
                  <AlerteAllergenes
                    formulaireReponses={formulaire?.reponses || null}
                    menuElements={catalogueFormuleItems}
                    optionsAllergenes={optionsList.filter(o => o.allergenes?.length > 0)}
                  />
                )}

                <div className="flex justify-center pt-2">
                  <AnnulerEvenementButton evenement={ev} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Sheet open={showFacturation} onOpenChange={setShowFacturation}>
        <SheetContent side="bottom" className="z-[60] overflow-y-auto rounded-t-3xl" style={{ minHeight: '85vh', maxHeight: '92vh' }}>
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4 mt-1 shrink-0" />
          <SheetHeader className="mb-5 text-center">
            <SheetTitle className="text-lg font-bold">Facturation</SheetTitle>
          </SheetHeader>
          <div className="px-1 pb-8">
            {showFacturation && <FacturationPanel
              evenementId={ev.id}
              evenement={ev}
              formulaireReponses={formulaire?.reponses}
              clientNom={ev.client_nom}
              clientEmail={ev.client_email}
              clientTelephone={ev.client_telephone}
            />}
          </div>
        </SheetContent>
      </Sheet>

      {showAutomations && <AutomationEvenementModal evenement={ev} onClose={() => setShowAutomations(false)} />}
      {showPrestataires && <AssocierPrestataireModal evenement={ev} onClose={() => setShowPrestataires(false)} />}
    </>
  );
}