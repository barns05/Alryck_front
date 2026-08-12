import { createContext, useContext } from 'react';

export const MODULES_DEFAULTS = {
  formulaire: true,
  programme: true,
  plan_table: true,
  fiche_service: true,
  extras: true,
  menu: true,
  prospects: true,
  facturation: true,
  equipe: true,
  promotions: true,
  medias: true,
  securite: false,
  prestataires: true,
  lieux: true,
  developpement: true,
  analyse: true,
  logistique: false,
};

export const ModulesContext = createContext(MODULES_DEFAULTS);

export function useModules() {
  return useContext(ModulesContext);
}