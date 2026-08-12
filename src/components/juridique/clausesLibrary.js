/**
 * clausesLibrary.js — Bibliothèque de clauses pour la Trame Alryck.
 *
 * Bloc A : Articles universels (tous métiers) — inclus systématiquement.
 * Bloc B : Articles conditionnels par catégorie de métier (3 catégories).
 *
 * La catégorisation réutilise `getMetierConfig(metier).groupe` de metierConfig.js.
 *
 * Deux types de clauses :
 * - Statique : { id, titre, corps }
 * - Dynamique : { id, titre, generate: (answers) => string | null }
 *   Retourne null si la clause ne doit pas être incluse.
 *
 * Le numéro d'article est assigné séquentiellement par le générateur PDF,
 * les titres ne contiennent PAS le numéro.
 *
 * Syntaxe des placeholders : {{CHAMP}} (double accolades) — unifiée avec
 * l'extraction IA et le mécanisme de substitution de ContractModal.jsx.
 */
import { getMetierConfig } from '@/config/metierConfig';

// ─── Mapping groupe métier → catégorie commerciale ───────────────────────────
const GROUPE_VERS_CATEGORIE = {
  'Lieux et réception': 'lieux_traiteurs',
  'Restauration et traiteur': 'lieux_traiteurs',
  'Image et souvenir': 'image_son_deco',
  'Musique et animation': 'image_son_deco',
  'Décoration et floral': 'image_son_deco',
  'Logistique et technique': 'image_son_deco',
  'Beauté et bien-être': 'beaute_securite',
  'Sécurité événementielle': 'beaute_securite',
  'Transport de prestige': 'beaute_securite',
  'Organisation': 'image_son_deco',
  'Autre': null,
};

export function getCategorieMetier(metier) {
  const groupe = getMetierConfig(metier).groupe;
  return GROUPE_VERS_CATEGORIE[groupe] || null;
}

// ─── Bloc A : Articles universels ─────────────────────────────────────────────
export const BLOC_A = [
  {
    id: 'objet',
    titre: "Objet et caractéristiques essentielles de la prestation",
    corps: `Le présent contrat a pour objet la prestation de services décrite ci-après.

Prestataire : {{NOM_ENTREPRISE}}
Client : {{PRENOM_NOM_CLIENT}}{{PRENOM_NOM_CLIENT_2}}

Description de la prestation : {{DESCRIPTION_PRESTATION}}
Date de l'événement : {{DATE_EVENEMENT}}
Lieu de l'événement : {{LIEU_EVENEMENT}}
Horaires : {{HEURE_DEBUT_EVENEMENT}} à {{HEURE_FIN_EVENEMENT}}
Nombre de personnes : {{NB_PERSONNES}}

Les caractéristiques essentielles de la prestation sont définies dans le présent contrat et, le cas échéant, dans le devis préalablement communiqué. Toute prestation non expressément prévue au présent contrat ou dans le devis ne sera pas incluse dans le prix et fera l'objet d'une facturation complémentaire.`,
  },
  {
    id: 'cgv',
    titre: "Acceptation des conditions générales",
    corps: `Le Client déclare avoir pris connaissance et accepté sans réserve les conditions générales de vente (CGV) du Prestataire, telles que communiquées préalablement à la signature du présent contrat. Les CGV font partie intégrante du présent contrat. En cas de contradiction entre les CGV et le présent contrat, ce dernier prévaut.`,
  },
  {
    id: 'reservation',
    titre: "Réservation et acompte",
    generate: (a) => {
      const mode = a.mode_versement || 'arrhes';
      const terme = mode === 'acompte' ? "acompte" : "arrhes";
      const regime = mode === 'acompte'
        ? `L'acompte constitue un versement à valoir sur le prix et engage définitivement les deux parties. En cas d'annulation par le Client, l'acompte est conservé par le Prestataire. En cas d'annulation par le Prestataire pour un motif autre que la force majeure, l'acompte est restitué au Client.`
        : `Conformément à l'article L214-1 du Code de la consommation, les arrhes sont versées à titre d'avance. En cas d'annulation par le Client, les arrhes sont conservées par le Prestataire. En cas d'annulation par le Prestataire pour un motif autre que la force majeure, les arrhes sont restituées au Client en double.`;

      // ─── Mode B : échéancier à montants fixes (pas de placeholders) ───
      if (a.mode_paiement === 'echeancier' && a.echeancier && a.echeancier.length > 0) {
        const lignes = a.echeancier.map(e => `- ${e.libelle} : ${e.montant} € (${e.delai})`).join('\n');
        const total = a.echeancier.reduce((s, e) => s + (parseFloat(e.montant) || 0), 0);
        return `La réservation devient définitive à la signature du présent contrat et selon l'échéancier de paiement suivant :

${lignes}

Montant total : ${total.toFixed(2)} €

${regime}`;
      }

      // ─── Mode A : pourcentage (comportement équivalent à avant) ───
      const baseLabel = (a.base_calcul_acompte || 'TTC') === 'HT' ? 'montant HT' : 'montant TTC';
      return `La réservation devient définitive à la signature du présent contrat et au versement d'un ${terme} de {{POURCENTAGE_ACOMPTE}}% du ${baseLabel}, soit la somme de {{MONTANT_ACOMPTE}} €.

${regime}

Calendrier de versement :
- ${terme === 'acompte' ? 'Acompte' : 'Arrhes'} à la signature : {{MONTANT_ACOMPTE}} €
- Solde le jour de l'événement : {{MONTANT_SOLDE}} €`;
    },
  },
  {
    id: 'tarifs',
    titre: "Tarifs et modalités de paiement",
    generate: (a) => {
      // ─── Mode B : échéancier à montants fixes ───
      if (a.mode_paiement === 'echeancier' && a.echeancier && a.echeancier.length > 0) {
        const lignes = a.echeancier.map(e => `- ${e.libelle} : ${e.montant} € (${e.delai})`).join('\n');
        const total = a.echeancier.reduce((s, e) => s + (parseFloat(e.montant) || 0), 0);
        return `Le montant total de la prestation est fixé à ${total.toFixed(2)} € TTC, réparti selon l'échéancier suivant :

${lignes}

Modalités de paiement : virement bancaire, espèces ou chèque. Le détail des échéances est précisé à l'article « Réservation et acompte ».`;
      }

      // ─── Mode A : texte avec placeholders {{CHAMP}} ───
      return `Le montant total de la prestation est fixé comme suit :
- Montant HT : {{MONTANT_HT}} €
- TVA ({{TAUX_TVA}}%) : {{MONTANT_TVA}} €
- Montant TTC : {{MONTANT_TTC}} €

Modalités de paiement :
- Acompte de {{POURCENTAGE_ACOMPTE}}% à la signature du présent contrat.
- Solde réglé le jour de l'événement, par virement bancaire, espèces ou chèque.`;
    },
  },
  {
    id: 'penalites',
    titre: "Pénalités de retard de paiement",
    generate: (a) => {
      if (a.type_client === 'professionnel') {
        return `Conformément à l'article L441-10 du Code de commerce, en cas de retard de paiement, le Client professionnel se verra appliquer des pénalités de retard calculées au taux de 3 fois le taux d'intérêt légal en vigueur. Une indemnité forfaitaire de 40 € pour frais de recouvrement sera également due pour chaque facture payée en retard, sans qu'un rappel soit nécessaire.`;
      }
      return `Conformément à l'article L214-2 du Code de la consommation, en cas de retard de paiement, le Client se verra appliquer des pénalités de retard calculées au taux d'intérêt légal en vigueur applicable aux particuliers. Le taux d'intérêt légal est publié annuellement par la Banque de France.`;
    },
  },
  {
    id: 'annulation',
    titre: "Annulation et modification",
    generate: (a) => {
      const terme = (a.mode_versement || 'arrhes') === 'acompte' ? "l'acompte" : "les arrhes";

      // ─── Paliers d'annulation flexibles ───
      let annulationClient;
      if (a.paliers_annulation && a.paliers_annulation.length >= 2) {
        const paliers = [...a.paliers_annulation].sort((x, y) => (y.delai_jours ?? 0) - (x.delai_jours ?? 0));
        const lignes = paliers.map((p, i) => {
          const pct = p.pourcentage_retenu;
          const consequence = (i === 0 && (pct === 0 || pct == null))
            ? `${terme} versés sont conservés par le Prestataire`
            : `${pct}% du montant total est dû au Prestataire`;
          if (i === 0) {
            return `- Plus de ${p.delai_jours} jours avant l'événement : ${consequence}`;
          }
          if (i === paliers.length - 1) {
            const prevDelai = paliers[i - 1].delai_jours;
            return `- Moins de ${prevDelai} jours avant l'événement : ${consequence}`;
          }
          const prevDelai = paliers[i - 1].delai_jours;
          return `- Entre ${prevDelai} et ${p.delai_jours} jours avant l'événement : ${consequence}`;
        });
        annulationClient = lignes.join('\n');
      } else {
        annulationClient = `- Plus de {{DELAI_ANNULATION_LOINTAIN}} jours avant l'événement : ${terme} versés sont conservés par le Prestataire.
- Entre {{DELAI_ANNULATION_LOINTAIN}} et {{DELAI_ANNULATION_PROCHE}} jours avant l'événement : 50% du montant total est dû au Prestataire.
- Moins de {{DELAI_ANNULATION_PROCHE}} jours avant l'événement : 100% du montant total est dû au Prestataire.`;
      }

      return `Annulation par le Client :
${annulationClient}

Annulation par le Prestataire :
- En cas de force majeure : remboursement intégral des sommes versées pour les prestations non exécutées.
- Pour tout autre motif : remboursement des sommes versées au Client et proposition d'une date de report ou d'un prestataire de remplacement de compétences équivalentes.

Toute modification de la prestation (date, nombre de personnes, options) doit faire l'objet d'un avenant écrit signé par les deux parties.`;
    },
  },
  {
    id: 'modification',
    titre: "Modification de la prestation et avenant",
    corps: `Toute modification de la prestation (date, lieu, nombre de personnes, options, prestations complémentaires) doit faire l'objet d'un avenant écrit, signé par les deux parties, avant son exécution. L'avenant précise la nature de la modification et son incidence sur le prix. Aucune modification orale ne sera prise en compte.`,
  },
  {
    id: 'sous_traitance',
    titre: "Sous-traitance et remplacement du prestataire",
    corps: `Le Prestataire s'engage à exécuter personnellement la prestation. Toutefois, il peut faire appel à des sous-traitants pour certaines parties de la prestation, à condition d'en informer préalablement le Client. Le Prestataire reste responsable de l'exécution de la prestation confiée à un sous-traitant.

En cas d'indisponibilité du Prestataire pour raison de santé ou autre motif légitime, il s'engage à proposer un remplaçant de compétences équivalentes. Si le Client refuse ce remplacement sans motif légitime, les sommes versées sont conservées par le Prestataire. Si le remplacement est impossible, les sommes versées sont intégralement restituées au Client.`,
  },
  {
    id: 'force_majeure',
    titre: "Force majeure",
    corps: `Il y a force majeure en matière contractuelle lorsqu'un événement échappant au contrôle du débiteur, qui ne pouvait être raisonnablement prévu lors de la conclusion du contrat et dont les effets ne peuvent être évités par des mesures appropriées, empêche l'exécution de son obligation par le débiteur, conformément à l'article 1218 du Code civil.

Si l'empêchement est temporaire, l'exécution de l'obligation est suspendue. Si l'empêchement est définitif, le contrat est résolu de plein droit. La partie concernée devra informer l'autre partie dans les meilleurs délais. Les sommes versées seront alors remboursées au prorata de la prestation non exécutée, ou une date de report sera proposée d'un commun accord.`,
  },
  {
    id: 'responsabilites',
    titre: "Responsabilités des parties",
    corps: `Responsabilités du Prestataire :
- Exécuter la prestation avec professionnalisme et selon les règles de l'art.
- Respecter les délais convenus et le cahier des charges défini au présent contrat.
- Disposer des autorisations et assurances nécessaires à son activité.

Responsabilités du Client :
- Fournir au Prestataire, en temps utile, toutes les informations nécessaires à la bonne exécution de la prestation.
- Garantir l'accès au lieu de l'événement dans les conditions prévues.
- Assumer la garde et la responsabilité des invités et de leurs biens durant l'événement.

Le Prestataire ne saurait être tenu responsable des dommages causés par les invités ou par un tiers non rattaché à son entreprise.`,
  },
  {
    id: 'assurance',
    titre: "Assurance responsabilité civile professionnelle",
    corps: `Lorsque la souscription d'une assurance responsabilité civile professionnelle est légalement obligatoire pour son activité ou lorsqu'elle a été volontairement souscrite, le Prestataire déclare être couvert pour les risques liés à son activité.

Assureur : {{NOM_ASSUREUR}}
Numéro de police : {{NUMERO_POLICE}}

Une attestation d'assurance peut être fournie sur simple demande du Client.`,
  },
  {
    id: 'confidentialite',
    titre: "Confidentialité et protection des données (RGPD)",
    corps: `Le Prestataire agit en qualité de responsable du traitement des données personnelles collectées dans le cadre du présent contrat, conformément au Règlement (UE) 2016/679 (RGPD).

Finalités : gestion de la relation contractuelle, exécution de la prestation, facturation et suivi.
Base juridique : exécution du contrat et, le cas échéant, consentement du Client pour les traitements nécessitant un consentement spécifique.
Données traitées : nom, prénom, coordonnées (email, téléphone), informations relatives à l'événement.
Destinataires : le Prestataire et, le cas échéant, ses sous-traitants techniques strictement nécessaires à l'exécution du contrat. Les données ne sont ni cédées ni vendues à des tiers à des fins commerciales.
Durée de conservation : les données sont conservées pendant la durée strictement nécessaire à l'exécution du contrat, puis archivées pendant la durée requise par les obligations légales et fiscales.
Droits de la personne concernée : le Client dispose d'un droit d'accès, de rectification, de portabilité, d'effacement et d'opposition, ainsi que du droit de limiter le traitement de ses données. Pour exercer ces droits, le Client peut contacter le Prestataire à l'adresse {{EMAIL_ENTREPRISE}}.
Le Client dispose également du droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.`,
  },
  {
    id: 'droit_image',
    titre: "Droit à l'image",
    generate: (a) => {
      if (a.droit_image_autorise) {
        return `Le Client autorise le Prestataire à utiliser les photographies et vidéos réalisées lors de l'événement à des fins promotionnelles (site internet, réseaux sociaux, portfolio, supports de communication).

Cette autorisation est donnée pour une durée de {{DUREE_DROIT_IMAGE}} ans et pour le territoire français. Le Client peut retirer cette autorisation à tout moment par notification écrite au Prestataire. Ce retrait n'affecte pas l'exécution du contrat de prestation.

Le Prestataire s'engage à ne pas utiliser ces supports à des fins commerciales de revente à des tiers sans l'accord exprès et écrit du Client. Le Client reconnaît avoir obtenu les autorisations nécessaires des personnes figurant sur les images.`;
      }
      return `Le Client n'autorise pas le Prestataire à utiliser les photographies et vidéos réalisées lors de l'événement à des fins promotionnelles. Ce refus n'affecte en rien l'exécution de la prestation.

Le Prestataire s'interdit toute diffusion, reproduction ou utilisation des images sans l'accord écrit préalable du Client.`;
    },
  },
  {
    id: 'retractation',
    titre: "Droit de rétractation",
    generate: (a) => {
      if (a.type_client === 'professionnel') return null;
      if (a.date_determinee) {
        return `Conformément à l'article L221-28 du Code de la consommation, le Client reconnaît expressément solliciter du Prestataire la prestation de services à une date déterminée. En conséquence, le Client renonce à exercer son droit de rétractation prévu à l'article L221-18 du même code.`;
      }
      return `Conformément aux articles L221-18 et suivants du Code de la consommation, le Client consommateur dispose d'un délai de 14 jours pour exercer son droit de rétractation, à compter de la conclusion du contrat. Le Client peut exercer ce droit en notifiant sa décision au Prestataire. Si le Client exerce son droit de rétractation, les sommes versées lui sont restituées dans un délai de 14 jours, déduction faite des prestations déjà effectivement fournies à sa demande expresse.`;
    },
  },
  {
    id: 'litiges',
    titre: "Réclamations, médiation de la consommation et litiges",
    generate: (a) => {
      if (a.type_client === 'professionnel') {
        return `Le présent contrat est régi par le droit français. En cas de litige, les parties s'engagent à rechercher préalablement une solution amiable.

À défaut d'accord amiable dans un délai de 30 jours, le litige sera soumis au Tribunal Judiciaire compétent du ressort du siège social du Prestataire, nonobstant appel en garantie ou pluralité de défendeurs.`;
      }
      return `Le présent contrat est régi par le droit français.

En cas de réclamation, le Client est invité à contacter le Prestataire à l'adresse {{EMAIL_ENTREPRISE}} afin de rechercher une solution amiable.

À défaut de résolution amiable, le Client consommateur peut recourir gratuitement à un médiateur de la consommation :
{{NOM_MEDIATEUR}}
{{ADRESSE_MEDIATEUR}}
{{SITE_MEDIATEUR}}

En l'absence de résolution par la médiation, le litige sera porté devant la juridiction compétente, conformément aux règles de compétence légales applicables en matière de consommation.`;
    },
  },
  {
    id: 'referents',
    titre: "Personnes référentes",
    corps: `Chaque partie désigne un référent comme point de contact principal pour toute question relative à l'exécution du présent contrat :

Côté Prestataire : {{REFERENT_PRESTATAIRE}} — {{TELEPHONE_REFERENT_PRESTATAIRE}}
Côté Client : {{PRENOM_NOM_CLIENT}}{{PRENOM_NOM_CLIENT_2}} — {{TELEPHONE_REFERENT_CLIENT}}{{TELEPHONE_CLIENT_2}}`,
  },
  {
    id: 'inclusions',
    titre: "Prestations incluses et exclues",
    corps: `Sont incluses dans la prestation :
{{INCLUS}}

Ne sont pas incluses (et peuvent faire l'objet d'un devis complémentaire) :
{{EXCLUS}}`,
  },
  {
    id: 'mentions_legales',
    titre: "Mentions légales",
    corps: `Prestataire :
{{NOM_ENTREPRISE}} — {{FORME_JURIDIQUE}}
SIRET : {{SIRET}}
Adresse du siège social : {{ADRESSE_ENTREPRISE}}
Email : {{EMAIL_ENTREPRISE}}
Téléphone : {{TELEPHONE_ENTREPRISE}}

Client :
{{PRENOM_NOM_CLIENT}}{{PRENOM_NOM_CLIENT_2}}
Adresse : {{ADRESSE_CLIENT}}
Email : {{EMAIL_CLIENT}}{{EMAIL_CLIENT_2}}
Téléphone : {{TELEPHONE_CLIENT}}{{TELEPHONE_CLIENT_2}}`,
  },
];

// ─── Bloc B1 : Lieux et traiteurs ──────────────────────────────────────────────
export const BLOC_B1 = [
  {
    id: 'horaires',
    titre: "Horaires d'occupation",
    corps: `Le lieu est mis à disposition du Client selon les horaires suivants :
- Accès pour installation : à partir de {{HEURE_DEBUT_INSTALLATION}}
- Début de l'événement : {{HEURE_DEBUT_EVENEMENT}}
- Fin de l'événement et libération des lieux : {{HEURE_FIN_EVENEMENT}}

Toute prolongation au-delà de l'horaire convenu fera l'objet d'une facturation supplémentaire de {{TARIF_HEURE_SUPP}} € par heure entamée.`,
  },
  {
    id: 'minimum_convives',
    titre: "Minimum de convives",
    corps: `Le tarif est calculé sur la base d'un minimum de {{MINIMUM_CONVIVES}} personnes. Si le nombre réel de convives est inférieur à ce minimum le jour de l'événement, le Client s'engage à régler la différence.`,
  },
  {
    id: 'menus',
    titre: "Composition des menus et formules",
    corps: `La prestation comprend les éléments suivants :
{{DESCRIPTION_PRESTATION}}

Les menus sont définis en commun accord et validés au plus tard {{DELAI_VALIDATION_MENU}} jours avant l'événement. Toute modification de menu après ce délai peut entraîner un supplément tarifaire.`,
  },
  {
    id: 'deco_amont',
    titre: "Accès pour la décoration en amont",
    corps: `Le Client ou ses prestataires de décoration peuvent accéder au lieu pour la mise en place décorative :
- La veille de l'événement : {{ACCES_VEILLE}}
- Le jour de l'événement : à partir de {{HEURE_DEBUT_INSTALLATION}}

Toute intervention nécessitant un accès en dehors de ces plages doit faire l'objet d'un accord préalable écrit.`,
  },
  {
    id: 'interdictions',
    titre: "Objets et matériels interdits",
    corps: `Pour des raisons de sécurité et de préservation des lieux, sont strictement interdits :
- L'utilisation de bougies non protégées (à flamme nue)
- L'utilisation de paillettes, confettis ou étincelles non autorisés au préalable
- L'affichage ou fixation d'éléments décoratifs sur les murs, plafonds ou sols sans dispositif adapté
- Le jet de riz, pétales artificiels ou autres substances pouvant endommager les sols ou espaces verts

Toute dégradation engage la responsabilité du Client et devra être intégralement indemnisée.`,
  },
  {
    id: 'mobilier',
    titre: "Mobilier et équipements fournis",
    corps: `Le Prestataire met à disposition le mobilier et les équipements suivants :
{{MOBILIER_FOURNI}}

Le Client s'engage à restituer le mobilier et les équipements dans leur état d'origine. Toute dégradation ou perte fera l'objet d'une facturation complémentaire.`,
  },
  {
    id: 'stationnement',
    titre: "Stationnement",
    corps: `{{INFORMATIONS_STATIONNEMENT}}`,
  },
  {
    id: 'prestataires_externes',
    titre: "Prestataires extérieurs",
    corps: `Le Client peut faire appel à des prestataires extérieurs (DJ, photographe, fleuriste, etc.) sous réserve d'en avoir informé le Prestataire préalablement. {{CONDITIONS_PRESTATAIRES_EXTERNES}}

Le Prestataire se réserve le droit de refuser l'accès à un prestataire extérieur dont l'intervention serait incompatible avec la sécurité des lieux ou le bon déroulement de l'événement.`,
  },
  {
    id: 'nuisances_sonores',
    titre: "Nuisances sonores et gestion du bruit",
    corps: `Le Client s'engage à respecter les règles relatives aux nuisances sonores applicables dans la commune et au sein de l'établissement. Les niveaux sonores devront rester conformes aux limites légales et aux éventuelles restrictions contractuelles avec les tiers (voisins, copropriété).

L'usage d'amplificateurs, enceintes ou instruments de musique est autorisé dans la limite des décibels autorisés. Le Prestataire se réserve le droit d'interrompre la diffusion sonore en cas de non-respect des seuils convenus ou en cas de plainte justifiée.`,
  },
  {
    id: 'etat_lieux',
    titre: "État des lieux et dégâts",
    corps: `Un état des lieux contradictoire est effectué avant l'entrée en possession du Client et à sa sortie. {{DETAILS_ETAT_LIEUX}}

Une caution de {{MONTANT_CAUTION}} € peut être demandée au Client. Elle est restituée dans un délai de {{DELAI_RESTITUTION_CAUTION}} jours après l'événement, déduction faite des éventuelles dégradations constatées lors de l'état des lieux de sortie.`,
  },
  {
    id: 'capacite_erp',
    titre: "Capacité maximale et consignes ERP",
    corps: `La capacité maximale d'accueil du lieu est fixée à {{CAPACITE_MAX_ERP}} personnes, conformément aux règles de sécurité applicables aux établissements recevant du public (ERP). Cette capacité varie selon la configuration :
- Configuration assise (dîner) : {{CAPACITE_MAX_ASSIS}} personnes
- Configuration debout (cocktail) : {{CAPACITE_MAX_DEBOUT}} personnes

Le Client s'engage à ne pas dépasser la capacité correspondant à la configuration choisie pour l'événement.

Le non-respect de cette consigne peut entraîner l'interruption immédiate de l'événement par les autorités compétentes, sans recours contre le Prestataire. Le Client s'engage à respecter l'ensemble des consignes de sécurité communiquées par le Prestataire (issues de secours, extincteurs, interdictions spécifiques).`,
  },
  {
    id: 'alcool',
    titre: "Alcool et responsabilité",
    corps: `Le Client est responsable de la consommation d'alcool par les invités durant l'événement. Le Prestataire décline toute responsabilité en cas de comportement dangereux ou de dommages causés sous l'emprise de l'alcool par les invités.

Le Client s'engage à respecter les obligations légales relatives au service d'alcool, notamment l'interdiction de servir des boissons alcoolisées à des mineurs et aux personnes manifestement ivres. Selon la nature de l'événement, une licence de débit de boisson peut être requise.`,
  },
  {
    id: 'allergies',
    titre: "Allergies et régimes alimentaires",
    corps: `Le Client s'engage à communiquer au Prestataire, au plus tard {{DELAI_VALIDATION_MENU}} jours avant l'événement, les allergies et régimes alimentaires des convives (allergènes majeurs, intolérances, régimes religieux ou philosophiques). Le Prestataire mettra en œuvre les moyens raisonnables pour adapter les plats concernés.

Le Prestataire ne peut être tenu responsable des réactions allergiques si les informations n'ont pas été communiquées dans le délai imparti, ou en cas de non-respect des consignes de composition par un convive. Les allergènes présents dans les plats sont identifiés selon la réglementation en vigueur et disponibles sur demande.`,
  },
  // Articles transversaux activés pour B1
  {
    id: 'besoins_techniques',
    titre: "Besoins techniques sur place",
    corps: `Le Client s'engage à fournir au Prestataire les conditions techniques nécessaires à la bonne exécution de la prestation :
- Alimentation électrique : {{BESOIN_ELECTRICITE}}
- Espace de préparation/installation : {{BESOIN_ESPACE}}
- Accès au lieu : {{CONDITIONS_ACCES}}

Toute défaillance technique imputable au lieu ou au Client ne pourra engager la responsabilité du Prestataire.`,
  },
  {
    id: 'materiel_prete',
    titre: "Matériel prêté ou loué",
    corps: `Le matériel suivant est prêté ou loué au Client pour la durée de l'événement :
{{MATERIEL_PRETE_DETAIL}}

Un dépôt de garantie de {{DEPOT_GARANTIE_MATERIEL}} € peut être demandé. Il est restitué après restitution du matériel en bon état. En cas de dégradation, perte ou vol, le coût de remplacement sera déduit du dépôt de garantie et facturé au Client pour le complément éventuel.`,
  },
];

// ─── Bloc B2 : Image / Son / Déco / Location ──────────────────────────────────
export const BLOC_B2 = [
  {
    id: 'droits_auteur',
    titre: "Cession des droits d'auteur",
    corps: `Le Prestataire reste titulaire des droits d'auteur sur l'ensemble des œuvres créées dans le cadre de la prestation (photographies, vidéos, créations musicales, décors, etc.), conformément au Code de la propriété intellectuelle.

{{CESSION_DROITS_DETAIL}}

La cession est consentie pour les usages suivants : {{USAGE_CEDE}}.
Toute utilisation non prévue au présent article nécessite l'autorisation écrite préalable du Prestataire et peut donner lieu à rémunération complémentaire.`,
  },
  {
    id: 'besoins_techniques',
    titre: "Besoins techniques sur place",
    corps: `Le Client s'engage à fournir au Prestataire les conditions techniques nécessaires à la bonne exécution de la prestation :
- Alimentation électrique : {{BESOIN_ELECTRICITE}}
- Espace de préparation/installation : {{BESOIN_ESPACE}}
- Accès au lieu : {{CONDITIONS_ACCES}}

Toute défaillance technique imputable au lieu ou au Client ne pourra engager la responsabilité du Prestataire.`,
  },
  {
    id: 'repas_prestataire',
    titre: "Repas et conditions de travail du prestataire",
    corps: `Pour les prestations d'une durée supérieure à 6 heures, un repas et un espace de repos doivent être mis à disposition du Prestataire et de son équipe par le Client.

{{DETAILS_REPAS_PRESTATAIRE}}`,
  },
  {
    id: 'delai_livraison',
    titre: "Délai de livraison",
    corps: `Les éléments finalisés (photographies, vidéos, montage, décoration installée) seront livrés au Client dans un délai de {{DELAI_LIVRAISON}} à compter de l'événement, sauf cas de force majeure.

Un aperçu peut être communiqué dans un délai plus court, selon les modalités convenues. La livraison s'effectue par voie électronique (galerie en ligne, lien de téléchargement) ou sur support physique selon ce qui est convenu au contrat.`,
  },
  {
    id: 'materiel_prete',
    titre: "Matériel prêté ou loué",
    corps: `Le matériel suivant est prêté ou loué au Client pour la durée de l'événement :
{{MATERIEL_PRETE_DETAIL}}

Un dépôt de garantie de {{DEPOT_GARANTIE_MATERIEL}} € peut être demandé. Il est restitué après restitution du matériel en bon état. En cas de dégradation, perte ou vol, le coût de remplacement sera déduit du dépôt de garantie et facturé au Client pour le complément éventuel.`,
  },
  {
    id: 'conservation_fichiers',
    titre: "Conservation et archivage des fichiers",
    corps: `Les fichiers photographiques et vidéographiques bruts et finalisés sont conservés par le Prestataire pendant une durée de {{DUREE_CONSERVATION_FICHIERS}} mois à compter de l'événement. Passé ce délai, les fichiers pourront être supprimés sans possibilité de récupération.

Le Client est invité à télécharger et sauvegarder ses fichiers dès leur mise à disposition. Le Prestataire ne saurait être tenu responsable de la perte de fichiers non récupérés passé le délai de conservation.`,
  },
  {
    id: 'retouches_images',
    titre: "Modalités de retouches et sélection des images",
    corps: `Le Prestataire procède à une sélection des meilleures images et effectue les retouches de son choix dans le respect de son style artistique.

Le Client peut demander des retouches supplémentaires dans la limite de {{NOMBRE_RETOUCHES_INCLUSES}} retouches incluses. Au-delà, toute retouche sera facturée {{TARIF_RETOUCHE_SUPP}} € par image.

La sélection finale des images à livrer est effectuée par le Prestataire. Le Client ne peut exiger la livraison de l'intégralité des prises de vue réalisées.`,
  },
  {
    id: 'panne_technique',
    titre: "Panne et défaillance technique",
    corps: `En cas de panne ou de défaillance technique du matériel du Prestataire durant l'événement, le Prestataire s'engage à mettre en œuvre tous les moyens raisonnables pour rétablir la prestation dans les meilleurs délais.

Le Prestataire ne saurait être tenu responsable des interruptions de service dues à des défaillances du réseau électrique, de la connectivité ou d'événements extérieurs indépendants de sa volonté. Aucune indemnité ne sera due au-delà du remboursement prorata temporis de la prestation non exécutée.`,
  },
];

// ─── Bloc B3 : Beauté / Sécurité / Transport ──────────────────────────────────
export const BLOC_B3 = [
  {
    id: 'conditions_specifiques',
    titre: "Conditions spécifiques à la prestation",
    corps: `{{CONDITIONS_SPECIFIQUES_METIER}}`,
  },
  {
    id: 'securite',
    titre: "Sécurité et conformité",
    corps: `Le Prestataire s'engage à respecter l'ensemble des réglementations en vigueur relatives à son activité, notamment en matière de sécurité, d'hygiène et de protection des personnes.

{{DETAILS_SECURITE}}`,
  },
  {
    id: 'hygiene',
    titre: "Hygiène et produits utilisés",
    corps: `Le Prestataire s'engage à utiliser des produits conformes aux normes en vigueur. Le Client est invité à signaler toute allergie ou sensibilité particulière préalablement à la prestation.

Un test cutané (patch test) peut être recommandé pour les prestations de maquillage ou de coloration, particulièrement en cas de peau sensible ou d'antécédents allergiques. Le Client reconnaît avoir été informé de cette possibilité. Le Prestataire ne peut être tenu responsable d'une réaction allergique non prévisible si le Client a omis de signaler une allergie connue.`,
  },
  {
    id: 'agrement',
    titre: "Agrément et habilitation",
    corps: `Le Prestataire dispose des agréments et habilitations nécessaires à son activité :
- Numéro CNAPS (sécurité privée) : {{NUMERO_CNAPS}}
- Effectif d'agents : {{EFFECTIF_AGENTS}}
- Habilitation spécifique : {{HABILITATION_SPECIFIQUE}}

Le Prestataire s'engage à maintenir ces agréments à jour et à en fournir les justificatifs sur demande. Les agents intervenant sont titulaires des cartes professionnelles en cours de validité.`,
  },
  {
    id: 'itineraire',
    titre: "Itinéraire et ponctualité",
    corps: `Le Prestataire s'engage à respecter l'itinéraire et les horaires convenus. Le véhicule utilisé est assuré pour le transport de passagers.

La prise en charge s'effectue à l'adresse et à l'heure convenues. Un délai de tolérance de {{TEMPS_ATTENTE_INCLUS}} minutes est accordé au Client sans supplément. Au-delà, un temps d'attente supplémentaire sera facturé {{TARIF_ATTENTE_VTC}} € par heure entamée.

Toute modification d'itinéraire en cours de prestation sera facturée selon le barème suivant : {{BAREME_FRAIS_SUPP}}. Le Client est informé que des événements indépendants de la volonté du Prestataire (embouteillages, accidents, fermetures de route) peuvent affecter les horaires.`,
  },
  {
    id: 'retard_client',
    titre: "Retard du client et no-show",
    corps: `En cas de retard du Client supérieur à {{DELAI_TOLERANCE_RETARD}} minutes à l'heure de rendez-vous convenue, le Prestataire se réserve le droit de facturer un temps d'attente supplémentaire au taux de {{TARIF_ATTENTE}} € par heure entamée.

En cas de non-présentation du Client sans information préalable (no-show), la prestation sera considérée comme due et facturée intégralement. Le Prestataire s'engage à patienter pendant {{DELAI_TOLERANCE_RETARD}} minutes avant de considérer la prestation comme un no-show.`,
  },
  {
    id: 'perimetre_securite',
    titre: "Périmètre exact de mission (sécurité)",
    corps: `Le périmètre de la mission de sécurité est défini comme suit : {{PERIMETRE_MISSION_SECURITE}}.

Les agents interviennent exclusivement dans ce périmètre. Toute extension du périmètre doit faire l'objet d'un avenant. Le nombre d'agents et leurs horaires sont définis au présent contrat et ne peuvent être modifiés sans accord préalable écrit du Prestataire.

Les missions confiées aux agents sont strictement définies par la réglementation en vigueur (prévention, dissuasion, contrôle d'accès). Les agents ne sont pas habilités à effectuer des actes de force relevant des forces de l'ordre.`,
  },
  // Article transversal activé pour B3
  {
    id: 'besoins_techniques',
    titre: "Besoins techniques sur place",
    corps: `Le Client s'engage à fournir au Prestataire les conditions techniques nécessaires à la bonne exécution de la prestation :
- Alimentation électrique : {{BESOIN_ELECTRICITE}}
- Espace de préparation/installation : {{BESOIN_ESPACE}}
- Accès au lieu : {{CONDITIONS_ACCES}}

Toute défaillance technique imputable au lieu ou au Client ne pourra engager la responsabilité du Prestataire.`,
  },
];

// ─── Résolution des clauses selon le métier + les réponses ────────────────────
export function getClaudesPourMetier(metier, answers = {}) {
  const categorie = getCategorieMetier(metier);
  let blocBRaw = [];
  if (categorie === 'lieux_traiteurs') blocBRaw = BLOC_B1;
  else if (categorie === 'image_son_deco') blocBRaw = BLOC_B2;
  else if (categorie === 'beaute_securite') blocBRaw = BLOC_B3;

  // Évaluer les clauses dynamiques (generate) et filtrer les nulls
  const resolve = (clause) => {
    if (clause.generate) {
      const corps = clause.generate(answers);
      if (!corps) return null;
      return { id: clause.id, titre: clause.titre, corps };
    }
    return clause;
  };

  const blocA = BLOC_A.map(resolve).filter(Boolean);
  const blocB = blocBRaw.map(resolve).filter(Boolean);

  return {
    blocA,
    blocB,
    categorie,
    categorieLabel: categorie
      ? { lieux_traiteurs: 'Lieux & Traiteurs', image_son_deco: 'Image / Son / Déco / Location', beaute_securite: 'Beauté / Sécurité / Transport' }[categorie]
      : null,
  };
}