import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { getPrixPourAnnee } from '@/lib/prixUtils';

/**
 * Hook qui génère automatiquement les lignes d'un devis depuis :
 * - Les tarifs catalogue correspondant à la formule de l'événement
 * - Les options/prestations cochées dans le formulaire de préparation
 */
export function useGenererLignesDevis(evenement, formulaireReponses) {
  const { settings } = useOwnerCompanySettings();
  const tvaTaux = settings?.tva_taux_defaut ?? 20;

  const TYPES_CALCUL_DERIVES = ['deduction_montant', 'deduction_pourcentage', 'supplement_montant', 'supplement_pourcentage'];

  const { data: catalogueTarifs = [] } = useQuery({
    queryKey: ['catalogue-tarifs-gen'],
    queryFn: () => base44.entities.CatalogueItem.filter({ actif: true }),
    select: items => items.filter(i => {
      if (i.section !== 'tarifs') return false;
      // Accepter : prix fixe valide OU tarif dérivé (même si prix = 0)
      const estFixeValide = i.prix > 0;
      const estDerive = TYPES_CALCUL_DERIVES.includes(i.type_calcul);
      if (!estFixeValide && !estDerive) return false;
      const formuleEv = evenement?.formule_nom;
      if (i.type_tarif === 'formule') {
        // Garder uniquement la formule choisie par le client
        return !!formuleEv && i.nom === formuleEv;
      }
      // Pour les autres types (ado, enfant, prestataire…)
      if (!formuleEv) return false;
      return i.toutes_formules === true || (i.formules_associees || []).includes(formuleEv);
    }),
    enabled: !!evenement,
  });

  const { data: optionsPrestations = [] } = useQuery({
    queryKey: ['options-prestations-gen'],
    queryFn: () => base44.entities.OptionPrestation.list(),
    enabled: !!evenement,
  });

  function calculerPrixDerive(item, prixFormule) {
    if (!prixFormule) return 0;
    switch (item.type_calcul) {
      case 'deduction_montant':      return Math.max(0, prixFormule - (item.valeur_calcul || 0));
      case 'deduction_pourcentage':  return prixFormule * (1 - (item.valeur_calcul || 0) / 100);
      case 'supplement_montant':     return prixFormule + (item.valeur_calcul || 0);
      case 'supplement_pourcentage': return prixFormule * (1 + (item.valeur_calcul || 0) / 100);
      default:                       return item.prix || 0;
    }
  }

  function generer() {
    const lignes = [];
    const nbAdultes = evenement?.nb_adultes || 0;
    const nbAdos = evenement?.nb_adolescents || 0;
    const nbEnfants = evenement?.nb_enfants || 0;
    const nbPrestataires = evenement?.nb_prestataires || 0;
    const nbInvites = evenement?.nb_invites || 0;
    const formuleEv = evenement?.formule_nom;
    const anneeEvenement = evenement?.date ? new Date(evenement.date).getFullYear() : null;

    // Quantités par type de tarif
    const typeQte = {
      formule: nbAdultes || nbInvites,
      ado: nbAdos,
      enfant: nbEnfants,
      prestataire: nbPrestataires,
    };

    if (!formuleEv) {
      // Pas de formule choisie : ligne générique forfait
      const qte = nbInvites || nbAdultes;
      if (qte > 0) {
        lignes.push({
          id: crypto.randomUUID(),
          description: 'Forfait événement',
          quantite: qte,
          prix_unitaire_ht: 0,
          tva_taux: tvaTaux,
          total_ht: 0,
          remise: 0,
          remise_type: 'pct',
        });
      }
      return lignes;
    }

    // Formule : on ne prend que le premier match nom === formuleEv
    const itemFormule = catalogueTarifs.find(i => i.type_tarif === 'formule' && i.nom === formuleEv);
    if (itemFormule) {
      const qte = typeQte.formule;
      const prixFormuleUnitaire = getPrixPourAnnee(itemFormule, anneeEvenement);
      if (qte > 0) {
        lignes.push({
          id: crypto.randomUUID(),
          description: itemFormule.nom + (itemFormule.description ? ` — ${itemFormule.description}` : ''),
          quantite: qte,
          prix_unitaire_ht: prixFormuleUnitaire,
          tva_taux: tvaTaux,
          total_ht: qte * prixFormuleUnitaire,
          remise: 0,
          remise_type: 'pct',
        });
      }
    }

    // Tarifs dérivés (ado, enfant, prestataire…) depuis le catalogue
    const prixFormule = itemFormule ? getPrixPourAnnee(itemFormule, anneeEvenement) : 0;
    const typesTrouves = new Set();
    catalogueTarifs.filter(i => i.type_tarif !== 'formule').forEach(item => {
      const qte = typeQte[item.type_tarif];
      if (qte === undefined || qte <= 0) return;
      typesTrouves.add(item.type_tarif);
      const prixUnitaire = TYPES_CALCUL_DERIVES.includes(item.type_calcul)
        ? calculerPrixDerive(item, prixFormule)
        : getPrixPourAnnee(item, anneeEvenement);
      lignes.push({
        id: crypto.randomUUID(),
        description: item.nom + (item.description ? ` — ${item.description}` : ''),
        quantite: qte,
        prix_unitaire_ht: prixUnitaire,
        tva_taux: tvaTaux,
        total_ht: qte * prixUnitaire,
        remise: 0,
        remise_type: 'pct',
      });
    });

    // Lignes génériques pour les effectifs sans tarif catalogue correspondant
    const fallbacks = [
      { type: 'ado',         label: 'Menu adolescent',  qte: nbAdos },
      { type: 'enfant',      label: 'Menu enfant',      qte: nbEnfants },
      { type: 'prestataire', label: 'Repas prestataire', qte: nbPrestataires },
    ];
    fallbacks.forEach(({ type, label, qte }) => {
      if (qte > 0 && !typesTrouves.has(type)) {
        lignes.push({
          id: crypto.randomUUID(),
          description: label,
          quantite: qte,
          prix_unitaire_ht: 0,
          tva_taux: tvaTaux,
          total_ht: 0,
          remise: 0,
          remise_type: 'pct',
        });
      }
    });

    // Options cochées dans le formulaire (champ options_grouped)
    if (formulaireReponses && optionsPrestations.length > 0) {
      // Trouver les IDs d'options cochées (valeurs array dans les réponses)
      const optionsCochees = Object.values(formulaireReponses)
        .filter(v => Array.isArray(v))
        .flat();

      optionsCochees.forEach(optId => {
        const opt = optionsPrestations.find(o => o.id === optId);
        if (!opt || !opt.actif) return;
        const qte = opt.unite === 'Par personne' ? nbAdultes : 1;
        const prixOpt = getPrixPourAnnee(opt, anneeEvenement);
        lignes.push({
          id: crypto.randomUUID(),
          description: opt.nom + (opt.description ? ` — ${opt.description}` : ''),
          quantite: qte,
          prix_unitaire_ht: prixOpt,
          tva_taux: tvaTaux,
          total_ht: qte * prixOpt,
          remise: 0,
          remise_type: 'pct',
        });
      });
    }

    return lignes;
  }

  const peutGenerer = !!evenement && (evenement.nb_adultes > 0 || evenement.nb_invites > 0);

  return { generer, peutGenerer };
}