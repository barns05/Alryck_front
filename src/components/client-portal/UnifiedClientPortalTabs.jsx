/**
 * UnifiedClientPortalTabs
 *
 * Navigation à onglets pour l'espace client unifié (4 onglets).
 *
 * - Tab "Événement"   : ClientPortalTiles + TileDrawer (inchangés)
 * - Tab "Organisation": MonEspaceTab
 * - Tab "Mes favoris" : SelectionTab (ancien « Trouver un prestataire »)
 * - Tab "Recherche"   : annuaire géolocalisé (à venir) — état « Bientôt disponible »
 *
 * Les pastilles des 4 onglets sont désormais rendues en bas d'écran par BottomNav.
 * Le swipe horizontal (TabCarousel) reste synchronisé via le store partagé.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import EvenementTab from './EvenementTab';
import TileDrawer from './TileDrawer';
import SelectionTab from './SelectionTab';
import AnnuaireTab from './AnnuaireTab';
import MonEspaceTab from './MonEspaceTab';
import TabCarousel from './TabCarousel';
import { usePortalActiveTab, setActiveTabId, TAB_IDS } from './portalTabStore';



export default function UnifiedClientPortalTabs({
  evenement,
  clientId,
  clientNom,
  prospect,
  settings,
  espaceScrollTarget,
  onEspaceScrollDone,
  onNavigateToMessages,
}) {
  const activeTab = usePortalActiveTab();
  const activeIndex = TAB_IDS.indexOf(activeTab);
  const [activeTile, setActiveTile] = useState(null);
  const programmaticScroll = useRef(false);

  // Basculer sur Organisation quand espaceScrollTarget est défini
  useEffect(() => {
    if (espaceScrollTarget) {
      programmaticScroll.current = true;
      setActiveTabId('organisation');
      setActiveTile(null);
      setTimeout(() => { programmaticScroll.current = false; }, 400);
    }
  }, [espaceScrollTarget]);

  const handleIndexChange = useCallback((index) => {
    if (programmaticScroll.current) return;
    setActiveTabId(TAB_IDS[index]);
    if (index !== 0) setActiveTile(null);
  }, []);

  return (
    <div className="pb-24">
      {/* Contenu — carrousel swipable */}
      <div className="pt-2">
        {evenement && (
          <TabCarousel activeIndex={activeIndex} onIndexChange={handleIndexChange}>
            {/* ── Événement ─────────────────────────────────────────── */}
            <div>
              <EvenementTab
                evenement={evenement}
                clientId={clientId}
                clientNom={clientNom}
                onSelectTile={setActiveTile}
              />
              {activeTile && (
                <TileDrawer
                  tileId={activeTile}
                  evenement={evenement}
                  clientId={clientId}
                  clientNom={clientNom}
                  onClose={() => setActiveTile(null)}
                />
              )}
            </div>

            {/* ── Organisation ──────────────────────────────────────── */}
            <div>
              <MonEspaceTab
                evenement={evenement}
                clientId={clientId}
                clientNom={clientNom}
              />
            </div>

            {/* ── Mes favoris (ancien « Trouver un prestataire ») ─────── */}
            <div>
              <SelectionTab
                evenementId={evenement.id}
                evenementNom={evenement.nom}
                clientNom={clientNom}
                evenement={evenement}
                onNavigateToMessages={onNavigateToMessages}
              />
            </div>

            {/* ── Recherche : annuaire géolocalisé ────────────────────── */}
            <div>
              <AnnuaireTab
                evenementId={evenement.id}
                evenementNom={evenement.nom}
                evenement={evenement}
                clientNom={clientNom}
                onNavigateToMessages={onNavigateToMessages}
              />
            </div>
          </TabCarousel>
        )}
      </div>
    </div>
  );
}