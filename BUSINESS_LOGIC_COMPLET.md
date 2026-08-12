# BUSINESS_LOGIC_COMPLET.md — Inventaire exhaustif du modèle de données Alryck

> **Document de référence complet : 100% des entités, 100% des attributs.**
> Chaque champ est listé avec son type, sa description et son rôle métier.
> Les champs built-in (`id`, `created_date`, `updated_date`, `created_by_id`) sont présents sur toutes les entités et ne sont pas répétés.
>
> Dernière mise à jour : 2026-08-12

---

## Sommaire des entités (81 entités au total)

| # | Entité | Module | Required |
|---|---|---|---|
| 1 | `Evenement` | Événements | `nom`, `date` |
| 2 | `EvenementPrestataire` | Événements / Prestataires | `evenement_id`, `prestataire_id` |
| 3 | `PropositionDateEvenement` | Événements | `evenement_id`, `nouvelle_date` |
| 4 | `DemandeAnnulationEvenement` | Événements | `evenement_id` |
| 5 | `DemandeReservation` | Prospects | `prospect_id` |
| 6 | `ProspectDateDemande` | Prospects | `prospect_id` |
| 7 | `LieuEvenement` | Événements / Lieux | `evenement_id`, `lieu_nom` |
| 8 | `Client` | Clients | `nom` |
| 9 | `ClientDocument` | Clients | `client_id`, `nom`, `file_url` |
| 10 | `Prospect` | Prospects | `prenom`, `nom` |
| 11 | `ProspectMessage` | Prospects | `prospect_id`, `auteur`, `message` |
| 12 | `PreReservation` | Contrats / Prospects | `prospect_id`, `expire_le` |
| 13 | `Contrat` | Contrats | `titre` |
| 14 | `Devis` | Facturation | `client_nom`, `date_devis` |
| 15 | `Echeance` | Facturation | `devis_id`, `type`, `statut` |
| 16 | `Promotion` | Promotions | `titre`, `type_promo` |
| 17 | `PromotionReponse` | Promotions | `promotion_id`, `evenement_id` |
| 18 | `Invite` | RSVP / Invités | `evenement_id` |
| 19 | `MomentEvenement` | RSVP / Invités | `evenement_id`, `nom` |
| 20 | `MomentPersonnel` | RSVP / Invités | `evenement_id`, `intitule` |
| 21 | `TableEvenement` | Plan de Table | `evenement_id`, `nom` |
| 22 | `EspaceLieu` | Plan de Table / Espaces | `prestataire_id`, `nom` |
| 23 | `PropositionConfig` | Plan de Table / Espaces | `espace_lieu_id`, `mode`, `label` |
| 24 | `PlanSalle` | Plan de Table | `nom` |
| 25 | `Lieu` | Lieux | `nom` |
| 26 | `Prestataire` | Prestataires | `nom` |
| 27 | `DispoPrestataire` | Prestataires | `prestataire_id`, `date` |
| 28 | `ConversationPrestataire` | Messagerie | `prestataire_id` |
| 29 | `MessagePrestataire` | Messagerie | `conversation_id`, `auteur`, `contenu` |
| 30 | `ConversationLieu` | Messagerie | `lieu_id` |
| 31 | `MessageLieu` | Messagerie | `conversation_id`, `auteur`, `contenu` |
| 32 | `Conversation` | Messagerie | `client_id`, `evenement_id` |
| 33 | `Message` | Messagerie | `conversation_id`, `auteur`, `contenu` |
| 34 | `ConversationExtra` | Messagerie / Extras | `extra_id` |
| 35 | `MessageExtra` | Messagerie / Extras | `conversation_id`, `auteur`, `contenu` |
| 36 | `ProspectMessage` | Messagerie / Prospects | `prospect_id`, `auteur`, `message` |
| 37 | `RendezVous` | RendezVous | `client_id`, `evenement_id` |
| 38 | `EtapeProgramme` | Programme | `evenement_id`, `nom` |
| 39 | `EtapeBibliotheque` | Bibliothèque | `nom` |
| 40 | `ModeleProgramme` | Bibliothèque | `nom` |
| 41 | `ProgrammeJourJ` | Programme public | `evenement_id` |
| 42 | `ModeleFormulaire` | Bibliothèque | `nom` |
| 43 | `FormulairePreparation` | Bibliothèque | `evenement_id` |
| 44 | `BibliothequeQuestion` | Bibliothèque | `label`, `categorie` |
| 45 | `CatalogueItem` | Bibliothèque | `section`, `nom` |
| 46 | `OptionPrestation` | Bibliothèque | `nom`, `categorie` |
| 47 | `OptionEffectif` | Bibliothèque | `nom` |
| 48 | `ModeleFicheService` | Bibliothèque | `nom` |
| 49 | `FicheService` | Fiches de service | `evenement_id`, `type` |
| 50 | `FicheServiceExtra` | Fiches de service | `evenement_id`, `extra_id` |
| 51 | `BrochureCatalogue` | Bibliothèque | `nom` |
| 52 | `TypeEvenement` | Configuration | `nom`, `categorie` |
| 53 | `EffectifSettings` | Configuration | `type_evenement` |
| 54 | `CompanySettings` | Vitrine / Paramètres | `company_name` |
| 55 | `GalerieVitrine` | Vitrine | `type`, `url` |
| 56 | `AchatTheme` | Vitrine / Abonnements | `client_id`, `evenement_id`, `theme_id` |
| 57 | `Collaborateur` | Équipe | `nom` |
| 58 | `CollaborateurEntree` | Équipe / RH | `collaborateur_id`, `type`, `date` |
| 59 | `Extra` | Équipe / Extras | `nom` |
| 60 | `Service` | Planning extras | `date` |
| 61 | `ServiceAssignment` | Planning extras | `service_id`, `extra_id` |
| 62 | `Shift` | Planning extras | `extra_id`, `date`, `heure_debut`, `heure_fin` |
| 63 | `ExtraDayStatus` | Planning extras | `extra_id`, `date`, `statut` |
| 64 | `DispoExtraGroupée` | Planning extras | `extras_ids` |
| 65 | `DispoExtraReponse` | Planning extras | `dispo_groupee_id`, `extra_id`, `date` |
| 66 | `RHSettings` | Équipe / RH | (aucun) |
| 67 | `TacheChecklist` | Checklist | `evenement_id`, `titre` |
| 68 | `Rappel` | Checklist / Rappels | `titre`, `date_rappel` |
| 69 | `Notification` | Notifications | `titre`, `message` |
| 70 | `AutomationRegle` | Automatisations | `bloc` |
| 71 | `AutomationLog` | Automatisations | `type_action`, `statut` |
| 72 | `ModuleSecurite` | Sécurité | (aucun) |
| 73 | `ControleSecurite` | Sécurité | `nom`, `categorie`, `frequence_jours` |
| 74 | `Fournisseur` | Commandes / Logistique | `nom` |
| 75 | `RegleCommande` | Commandes / Logistique | `option_prestation_nom`, `fournisseur_nom` |
| 76 | `RegleMateriel` | Commandes / Logistique | `article_id` |
| 77 | `LogistiqueArticle` | Logistique | `nom` |
| 78 | `LogistiqueVehicule` | Logistique | `nom` |
| 79 | `LogistiqueEvenement` | Logistique | `evenement_id` |
| 80 | `PhotoClient` | Médias | `file_url` |
| 81 | `User` | Auth (built-in) | — (non créable) |

---

## 1. `Evenement`

**Module** : Événements · **Required** : `nom`, `date`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom de l'événement (ex: Mariage Dupont) |
| `type_evenement` | string (enum) | Mariage, Pacs, Anniversaire de mariage, Baptême, Communion, Anniversaire, Gender reveal, Baby shower, Fête de fin d'année, Soirée d'entreprise, Séminaire, Cocktail, Gala, Location, Autre |
| `statut` | string (enum) | En attente, À configurer, Confirmé, En préparation, Prêt, En cours, Terminé, Annulé (défaut: En attente) |
| `date` | date | Date technique de travail (tri, planning, J-X). Toujours renseignée. En mode `mois` = 1er du mois. |
| `date_type` | string (enum) | `exacte` / `mois` / `periode` (défaut: exacte) |
| `date_mois` | string | Format YYYY-MM (si date_type='mois') |
| `date_periode` | string | Texte libre (ex: "Été 2027") si date_type='periode' |
| `heure_debut` | string | Heure de début |
| `heure_fin` | string | Heure de fin |
| `lieu_id` | string | ID du lieu |
| `lieu_nom` | string | Nom du lieu (dénormalisé) |
| `espace_lieu_id` | string | ID de l'EspaceLieu choisi pour le placement visuel |
| `client_id` | string | ID du client |
| `client_nom` | string | Nom du client (dénormalisé) |
| `client_email` | string | Email du client |
| `client_telephone` | string | Téléphone du client |
| `nb_invites` | number | Nombre total d'invités (défaut: 0) |
| `nb_adultes` | number | Nombre d'adultes (défaut: 0) |
| `nb_adolescents` | number | Nombre d'adolescents (défaut: 0) |
| `nb_enfants` | number | Nombre d'enfants (défaut: 0) |
| `nb_prestataires` | number | Nombre de prestataires (défaut: 0) |
| `formule_id` | string | ID de la formule/menu choisie |
| `formule_nom` | string | Nom de la formule (dénormalisé) |
| `options_validees` | string | Options/prestations déjà validées |
| `notes_contrat` | string | Notes du contrat (champ libre) |
| `notes_internes` | string | Notes visibles uniquement par l'admin |
| `budget` | number | Budget total estimé (optionnel) |
| `lien_client_token` | string | Token unique pour le lien de l'espace client |
| `couleur_theme` | string | Couleur ou thème de fond pour l'espace client |
| `photo_bandeau_url` | string | URL de la photo de fond du header client |
| `mode_bandeau` | string (enum) | `ambiance` / `photo` (défaut: ambiance) |
| `personnalisation_card_reduced` | boolean | Carte Personnalisation en mode compact (défaut: false) |
| `countdown_style` | string (enum) | `classique` / `evenement` (défaut: classique) |
| `hebergement_disponible` | boolean | Hébergement sur place (active la question RSVP) (défaut: false) |
| `programme_journee` | array | Liste chronologique d'étapes `[{heure, nom, intitule, duree_heures, duree_minutes, categorie}]` |
| `menu` | object | Menu `{entree, plat, dessert, boissons, options_speciales}` |
| `plan_table_actif` | boolean | Plan de table applicable ? (défaut: true) |
| `plan_table_url` | string | URL du plan de table |
| `plan_table_nom` | string | Nom du fichier plan de table |
| `plan_table_envoye` | boolean | Plan envoyé aux équipes ? (défaut: false) |
| `checklist` | array | Fiche de préparation `[{id, label, checked}]` |
| `taches_requises` | object | Tâches requises `{formulaire, programme, plan_table, fiche_service, equipe_extras, menu, logistique}` (booléens) |
| `modeles_config` | object | Modèles sélectionnés `{formulaire_id, formulaire_nom, programme_id, programme_nom, menu_id, menu_nom, plan_table_id, plan_table_nom, fiche_service_id, fiche_service_nom}` |
| `archived` | boolean | Événement archivé (défaut: false) |
| `recommandation_statut` | string (enum) | `a_faire` / `reporte` / `refuse` (défaut: a_faire) |
| `recommandation_date_rappel` | date | Date de rappel quand `reporte` |
| `cree_par_client` | boolean | True si auto-créé par le client (défaut: false) |
| `mode_configuration` | string (enum) | `assis` / `debout` / `chaises` / `personnalise` |
| `proposition_config_id` | string | ID de la PropositionConfig validée |
| `capacite_debout_demandee` | number | Nb personnes souhaitées en mode debout |
| `capacite_chaises_demandee` | number | Nb personnes souhaitées en mode chaises |
| `nb_tables_prevu` | number | Nombre de tables prévu par le client |
| `prestataire_id` | string | ID du prestataire propriétaire (multi-tenant futur, null pour l'instant) |

---

## 2. `EvenementPrestataire`

**Module** : Événements / Prestataires · **Required** : `evenement_id`, `prestataire_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `prestataire_id` | string | ID du prestataire |
| `prestataire_nom` | string | Nom du prestataire (dénormalisé) |
| `prestataire_domaine` | string | Domaine du prestataire |
| `statut` | string (enum) | Recommandé, Contacté, Confirmé, Annulé, Favori (défaut: Recommandé) |
| `recommande_par` | string | Nom du prestataire/entreprise qui a fait la recommandation |
| `montant` | number | Montant négocié pour cet événement (€) |
| `notes` | string | Notes spécifiques à cet événement |
| `vu_par_client` | boolean | True quand le client a vu cette proposition (défaut: false) |
| `initiateur` | boolean | Prestataire initiateur de la relation (défaut: false) |
| `proposition_date_id` | string | ID de la PropositionDateEvenement active |
| `reponse_date_proposee` | string (enum) | `dispo` / `indispo` — réponse à la proposition de date |

---

## 3. `PropositionDateEvenement`

**Module** : Événements · **Required** : `evenement_id`, `nouvelle_date`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement concerné |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `nouvelle_date` | date | Nouvelle date technique proposée |
| `nouvelle_date_type` | string (enum) | `exacte` / `mois` / `periode` (défaut: exacte) |
| `nouvelle_date_mois` | string | Mois proposé YYYY-MM |
| `nouvelle_date_periode` | string | Période proposée (texte libre) |
| `initiee_par` | string (enum) | `admin` / `client` / `prestataire` (défaut: admin) |
| `initiee_par_prestataire_id` | string | ID du prestataire à l'origine (si initiee_par='prestataire') |
| `statut` | string (enum) | `en_attente` / `finalisee` / `annulee` (défaut: en_attente) |

---

## 4. `DemandeAnnulationEvenement`

**Module** : Événements · **Required** : `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement concerné |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `demandee_par_prestataire_id` | string | ID du Prestataire demandeur |
| `demandee_par_prestataire_nom` | string | Nom du prestataire demandeur (dénormalisé) |
| `motif` | string | Motif libre de la demande |
| `statut` | string (enum) | `en_attente` / `acceptee` / `refusee` (défaut: en_attente) |

---

## 5. `DemandeReservation`

**Module** : Prospects · **Required** : `prospect_id`

| Champ | Type | Description |
|---|---|---|
| `prospect_id` | string | ID du prospect |
| `prospect_nom` | string | Nom du prospect (dénormalisé) |
| `date_type` | string (enum) | `exacte` / `mois` / `periode` (défaut: exacte) |
| `date_evenement_souhaitee` | date | Date exacte demandée |
| `date_mois` | string | Mois demandé YYYY-MM |
| `date_periode` | string | Période demandée (texte libre) |
| `date_label` | string | Libellé lisible dénormalisé de la date |
| `date_source` | string (enum) | `prospect` / `demande_confirmee` / `demande_en_attente` / `saisie_manuelle` (défaut: saisie_manuelle) |
| `statut` | string (enum) | `en_attente` / `acceptee` / `refusee` / `contre_proposee` / `confirmee_par_prospect` (défaut: en_attente) |
| `reponse_admin` | string | Motif du refus ou message de contre-proposition |
| `date_alternative_type` | string (enum) | `exacte` / `mois` / `periode` |
| `date_alternative_exacte` | date | Date exacte alternative |
| `date_alternative_mois` | string | Mois alternatif YYYY-MM |
| `date_alternative_periode` | string | Période alternative (texte libre) |
| `date_alternative_label` | string | Libellé lisible de la date alternative |

---

## 6. `ProspectDateDemande`

**Module** : Prospects · **Required** : `prospect_id`

| Champ | Type | Description |
|---|---|---|
| `prospect_id` | string | ID du prospect |
| `dates_proposees` | array<string> | Dates ISO souhaitées par le prospect |
| `dates_disponibles` | array<string> | Dates confirmées comme disponibles par l'admin |
| `dates_alternatives` | array<string> | Dates alternatives proposées par l'admin |
| `periode_debut` | date | Début de période souhaitée |
| `periode_fin` | date | Fin de période souhaitée |
| `flexibilite` | string (enum) | `Date fixe` / `Flexible sur la semaine` / `Flexible sur le mois` (défaut: Date fixe) |
| `message` | string | Message du prospect |
| `statut` | string (enum) | `En attente` / `Répondu` / `Confirmée` / `Refusée` (défaut: En attente) |
| `reponse_admin` | string | Réponse de l'admin |
| `date_confirmee` | date | Date retenue par le prospect |

---

## 7. `LieuEvenement`

**Module** : Événements / Lieux · **Required** : `evenement_id`, `lieu_nom`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `lieu_id` | string | ID du lieu (optionnel) |
| `lieu_nom` | string | Nom du lieu |
| `lieu_ville` | string | Ville du lieu |
| `lieu_lien_google_maps` | string | Lien Google Maps |
| `type` | string (enum) | Cérémonie, Réception, Cocktail, Repas, Autre (défaut: Réception) |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `statut_validation` | string (enum) | `valide` / `propose_client` / `refuse` (défaut: valide) |
| `propose_par_client_id` | string | ID du Client à l'origine de la proposition |
| `motif_refus` | string | Motif libre du refus |

---

## 8. `Client`

**Module** : Clients · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom |
| `prenom` | string | Prénom |
| `nom2` | string | Deuxième nom (optionnel, couples) |
| `prenom2` | string | Deuxième prénom (optionnel) |
| `telephone` | string | Téléphone |
| `telephone2` | string | Deuxième téléphone (optionnel) |
| `email` | string | Email |
| `email2` | string | Deuxième email (optionnel) |
| `adresse` | string | Adresse postale (n° et rue) |
| `code_postal` | string | Code postal |
| `ville` | string | Ville |
| `pays` | string | Pays |
| `date_evenement` | date | Date de l'événement |
| `categorie_client` | string (enum) | `Particulier` / `Professionnel` |
| `type_evenement` | string | Type d'événement |
| `lieu_id` | string | ID du lieu enregistré (optionnel) |
| `lieu_evenement` | string | Nom/adresse du lieu (texte libre) |
| `nombre_personnes` | number | Nombre de personnes |
| `source_connaissance` | string (enum) | Bouche à oreille, Google, Instagram, Facebook, Salon du mariage, Recommandation prestataire, Site web, Autre |
| `notes` | string | Notes |
| `couleur_theme` | string | Couleur de l'espace client (hex) |
| `photo_profil_url` | string | URL photo de profil |
| `notifications_email` | boolean | Recevoir les rappels par email (défaut: true) |
| `notifications_sms` | boolean | Recevoir les rappels par SMS (défaut: false) |
| `lien_client_token` | string | Token unique portail client (tous événements) |
| `portal_password` | string | Mot de passe haché pour connexion portail |
| `portal_email` | string | Email utilisé pour connexion portail |
| `onboarding_vu` | boolean | Onboarding guidé déjà vu/fermé (défaut: false) |
| `archived` | boolean | Client archivé (défaut: false) |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 9. `ClientDocument`

**Module** : Clients · **Required** : `client_id`, `nom`, `file_url`

| Champ | Type | Description |
|---|---|---|
| `client_id` | string | ID du client |
| `prospect_id` | string | ID du prospect (rattachement transitoire avant conversion) |
| `evenement_id` | string | ID de l'événement (optionnel) |
| `nom` | string | Nom du document |
| `type_document` | string (enum) | Contrat, Offre commerciale, Menu, Programme, Facture, Autre |
| `file_url` | string | URL du fichier |
| `notes` | string | Notes sur le document |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 10. `Prospect`

**Module** : Prospects · **Required** : `prenom`, `nom`

| Champ | Type | Description |
|---|---|---|
| `prenom` | string | Prénom |
| `nom` | string | Nom |
| `prenom2` | string | Prénom 2ème personne (optionnel) |
| `nom2` | string | Nom 2ème personne (optionnel) |
| `telephone` | string | Téléphone |
| `telephone2` | string | Téléphone 2ème personne (optionnel) |
| `email` | string | Email |
| `type_evenement` | string (enum) | Mariage, Anniversaire, Gala, Baptême, Pacs, Soirée d'entreprise, Séminaire, Cocktail, Location, Autre |
| `date_type` | string (enum) | `exacte` / `mois` / `periode` (défaut: exacte) |
| `date_evenement_souhaitee` | date | Date exacte souhaitée |
| `date_mois` | string | Mois souhaité YYYY-MM |
| `date_periode` | string | Période souhaitée (texte libre) |
| `nb_invites_estime` | number | Nombre d'invités estimé |
| `formule_id` | string | ID de la formule souhaitée |
| `formule_nom` | string | Nom de la formule (dénormalisé) |
| `lieu_id` | string | ID du lieu souhaité (optionnel) |
| `lieu_nom` | string | Nom du lieu souhaité (dénormalisé, optionnel) |
| `notes_visite` | string | Notes de visite |
| `source` | string (enum) | Bouche à oreille, Google, Instagram, Facebook, Salon du mariage, Recommandation prestataire, Site web, Autre |
| `statut` | string (enum) | Nouveau, Devis envoyé, En attente, À relancer, Signé, Annulé (défaut: Nouveau) |
| `couleur_theme` | string | Couleur de l'espace client (hex) |
| `lien_token` | string | Token portail prospect |
| `converti` | boolean | True après conversion en Client + Evenement (défaut: false) |
| `client_id` | string | ID du Client créé après conversion |
| `evenement_id` | string | ID de l'Evenement créé après conversion |
| `relance_delai_jours` | number | Délai de relance personnalisé (override global) |
| `relance_snooze_jusqu_au` | date | Relance suspendue jusqu'à cette date |
| `archived` | boolean | Prospect archivé (défaut: false) |
| `prestataire_id` | string | ID du prestataire ayant initié la relation |

---

## 11. `ProspectMessage`

**Module** : Prospects / Messagerie · **Required** : `prospect_id`, `auteur`, `message`

| Champ | Type | Description |
|---|---|---|
| `prospect_id` | string | ID du prospect |
| `auteur` | string (enum) | `prospect` / `admin` |
| `message` | string | Contenu du message |

---

## 12. `PreReservation`

**Module** : Contrats / Prospects · **Required** : `prospect_id`, `expire_le`

| Champ | Type | Description |
|---|---|---|
| `prospect_id` | string | ID du prospect |
| `prospect_nom` | string | Nom du prospect (dénormalisé) |
| `prospect_email` | string | Email du prospect |
| `client_id` | string | ID du client (après conversion) |
| `evenement_id` | string | ID de l'événement (après conversion) |
| `date_evenement` | date | Date de l'événement souhaité |
| `type_evenement` | string | Type d'événement |
| `nb_invites` | number | Nombre d'invités estimé |
| `formule_nom` | string | Nom de la formule choisie |
| `type_versement` | string (enum) | `Arrhes` / `Acompte` / `Autre` |
| `montant_versement` | number | Montant du versement en € |
| `conditions_annulation` | string | Conditions d'annulation |
| `conditions_texte` | string | Conditions commerciales libres affichées au prospect |
| `contrat_url` | string | URL du PDF contrat envoyé pour signature |
| `contrat_nom` | string | Nom du fichier contrat |
| `contrat_signe_url` | string | URL du PDF signé (retourné par YouSign) |
| `expire_le` | date | Date limite de signature |
| `delai_jours` | number | Délai accordé pour signer (en jours, défaut: 14) |
| `date_signature` | string | Date/heure de signature effective (ISO 8601) |
| `statut` | string (enum) | `En attente` / `Signé` / `Expiré` / `Annulé` (défaut: En attente) |
| `yousign_request_id` | string | ID de la demande de signature YouSign |
| `yousign_signer_id` | string | ID du signataire YouSign |
| `yousign_sign_url` | string | URL de signature YouSign à envoyer au prospect |
| `rappel_j3_envoye` | boolean | Rappel J-3 avant expiration déjà envoyé (défaut: false) |
| `payment_sent` | boolean | Le prospect a déclaré avoir effectué son virement (défaut: false) |
| `payment_sent_date` | string | Date/heure de la déclaration de virement (ISO 8601) |
| `admin_confirmed_payment` | boolean | L'admin a confirmé la réception du paiement (défaut: false) |
| `admin_confirmed_date` | string | Date/heure de confirmation par l'admin (ISO 8601) |
| `rib_envoye` | boolean | Le RIB a été envoyé au prospect (défaut: false) |
| `notes_admin` | string | Notes internes (visibles uniquement par l'admin) |

---

## 13. `Contrat`

**Module** : Contrats & Signature électronique · **Required** : `titre`

| Champ | Type | Description |
|---|---|---|
| `type` | string (enum) | `client` / `modele` — discriminateur (défaut: client) |
| `titre` | string | Titre du contrat / modèle |
| `client_id` | string | ID du client associé (obligatoire pour type='client' sauf si prospect_id) |
| `client_nom` | string | Nom du client ou prospect (dénormalisé) |
| `prospect_id` | string | ID du prospect associé (alternative à client_id) |
| `prospect_email` | string | Email du prospect signataire (dénormalisé, pour Youtrust) |
| `evenement_id` | string | ID de l'événement associé (optionnel, type='client uniquement') |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `type_evenement` | array<string> | Catégorisation du modèle par type(s) d'événement |
| `prestataire_id` | string | ID du prestataire propriétaire |
| `modele_url` | string | URL du modèle PDF (gabarit téléversé ou généré via trame) |
| `modele_nom` | string | Nom du fichier modèle |
| `contenu_dynamique` | string | Texte du contrat avec placeholders `{{CHAMP}}` |
| `modele_source_id` | string | ID du modèle dont est issu ce contrat client (traçabilité) |
| `mode_paiement` | string (enum) | `pourcentage` / `echeancier` (défaut: pourcentage) — uniquement type='modele' |
| `taux_tva_modele` | number | TVA fixe du modèle (Mode A uniquement) |
| `pourcentage_acompte_modele` | number | % d'acompte/arrhes fixe (Mode A uniquement) |
| `base_calcul_acompte_modele` | string (enum) | `HT` / `TTC` (défaut: TTC) — Mode A uniquement |
| `paliers_annulation` | array | Paliers flexibles `[{delai_jours, pourcentage_retenu}]` triés du plus éloigné au plus proche |
| `echeancier_modele` | array | Échéances à montants fixes `[{libelle, montant, delai}]` — Mode B uniquement |
| `contrat_signe_url` | string | URL du contrat signé |
| `contrat_signe_nom` | string | Nom du fichier contrat signé |
| `statut` | string (enum) | `En attente de signature` / `Signé` / `Archivé` (défaut: Signé) |
| `date_signature` | date | Date de signature |
| `yousign_signature_request_id` | string | ID de la demande de signature côté Youtrust |
| `yousign_signature_url` | string | Lien de signature envoyé au client |
| `yousign_statut` | string (enum) | `draft` / `activated` / `done` / `expired` / `cancelled` |
| `date_envoi_signature` | date | Date d'activation de la demande Youtrust |
| `notes` | string | Notes additionnelles |

---

## 14. `Devis`

**Module** : Facturation · **Required** : `client_nom`, `date_devis`

| Champ | Type | Description |
|---|---|---|
| `numero` | string | Numéro DÉFINITIF (ex: DEV-2024-001, FAC-2024-001). Attribué à la finalisation. |
| `numero_provisoire` | string | Numéro non-officiel (préfixe PF-). Affiché tant que est_pro_forma=true. |
| `est_pro_forma` | boolean | True pour les factures en préparation avant finalisation (défaut: false) |
| `type_document` | string (enum) | Devis, Contrat, Facture d'acompte, Facture intermédiaire, Facture, Avoir, Solde (défaut: Devis) |
| `objet` | string | Objet / titre libre du document |
| `date_prestation` | date | Date d'exécution de la prestation (obligatoire facturation électronique 2026) |
| `prospect_id` | string | ID du prospect si créé depuis prospect |
| `evenement_id` | string | ID de l'événement si lié |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `contrat_id` | string | ID du Contrat signé associé |
| `prestataire_id` | string | ID du prestataire propriétaire |
| `client_nom` | string | Nom du client |
| `client_email` | string | Email du client |
| `client_telephone` | string | Téléphone du client |
| `client_adresse` | string | Adresse du client |
| `date_devis` | date | Date du devis |
| `date_validite` | date | Date de validité |
| `lignes` | array | Articles `[{id, description, unite, quantite, prix_unitaire_ht, tva_taux, remise, remise_type, total_ht}]` |
| `remise_globale` | number | Remise globale sur le total HT (défaut: 0) |
| `remise_globale_type` | string (enum) | `pct` / `fixe` (défaut: pct) |
| `conditions_paiement` | string | Conditions de paiement (texte libre) |
| `notes` | string | Notes internes |
| `statut` | string (enum) | Brouillon, Envoyé, Accepté, Refusé, Annulé (défaut: Brouillon) |
| `total_ht` | number | Total HT calculé |
| `total_tva` | number | Total TVA calculé |
| `total_ttc` | number | Total TTC calculé |
| `pdf_url` | string | URL du PDF généré lors de l'envoi |
| `facture_origine_id` | string | ID du document d'origine (pour les avoirs) |
| `facture_origine_numero` | string | Numéro du document d'origine (dénormalisé) |
| `superpdp_transmission_id` | string | Identifiant de transmission renvoyé par SuperPDP |
| `superpdp_statut` | string (enum) | `en_attente` / `transmise` / `livree` / `echec` |
| `superpdp_date_transmission` | date | Date de transmission électronique |
| `superpdp_erreur` | string | Message d'erreur détaillé en cas d'échec |
| `archived` | boolean | Document archivé (défaut: false) |

---

## 15. `Echeance`

**Module** : Facturation · **Required** : `devis_id`, `type`, `statut`

| Champ | Type | Description |
|---|---|---|
| `devis_id` | string | ID du devis associé |
| `evenement_id` | string | ID de l'événement associé |
| `type` | string | Type d'échéance (ex: Acompte 1, Acompte 2, Solde) (défaut: Acompte) |
| `mode_calcul` | string (enum) | `fixe` / `pourcentage` (défaut: pourcentage) |
| `montant_fixe` | number | Montant fixe en euros |
| `pourcentage` | number | Pourcentage du total TTC |
| `montant_calcule` | number | Montant calculé en euros (pour affichage) |
| `date_prevue` | date | Date prévue |
| `date_reception` | date | Date de réception |
| `statut` | string (enum) | `En attente` / `Reçu` / `En retard` (défaut: En attente) |
| `notes` | string | Notes |

---

## 16. `Promotion`

**Module** : Promotions · **Required** : `titre`, `type_promo`

| Champ | Type | Description |
|---|---|---|
| `titre` | string | Titre de la promotion |
| `description` | string | Description courte de l'offre |
| `date_validite` | date | Date limite de validité |
| `visuel_url` | string | URL du visuel optionnel |
| `type_promo` | string (enum) | `prix_barre` / `pourcentage` / `offre_groupee` / `gratuit` / `personnalise` (défaut: prix_barre) |
| `prix_original` | number | Prix original (pour prix barré) |
| `prix` | number | Prix final / valeur de l'offre |
| `pourcentage` | number | Pourcentage de réduction (pour type pourcentage) |
| `offre_groupee_detail` | string | Détail de l'offre groupée (ex: 2 achetés = 1 offert) |
| `offre_libre` | string | Description libre de l'offre (gratuit / personnalisé) |
| `statut` | string (enum) | `Brouillon` / `Envoyée` / `Archivée` (défaut: Brouillon) |
| `ciblage_statuts` | array<string> | Ciblage par statut d'événement |
| `ciblage_types` | array<string> | Ciblage par type d'événement |
| `ciblage_periode_mois` | number | Ciblage par mois (1-12) |
| `clients_cibles_ids` | array<string> | IDs des clients ciblés |
| `nb_envois` | number | Nombre d'envois (défaut: 0) |
| `nb_vues` | number | Nombre de vues (défaut: 0) |
| `nb_acceptations` | number | Nombre d'acceptations (défaut: 0) |
| `nb_refus` | number | Nombre de refus (défaut: 0) |

---

## 17. `PromotionReponse`

**Module** : Promotions · **Required** : `promotion_id`, `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `promotion_id` | string | ID de la promotion |
| `promotion_titre` | string | Titre de la promotion (dénormalisé) |
| `promotion_prix` | number | Prix de la promotion (dénormalisé) |
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `client_id` | string | ID du client |
| `client_nom` | string | Nom du client (dénormalisé) |
| `client_email` | string | Email du client (dénormalisé) |
| `reponse` | string (enum) | `Envoyé` / `Vu` / `Accepté` / `Refusé` (défaut: Envoyé) |
| `date_reponse` | string | Date de la réponse |
| `appliquee` | boolean | Ligne promotionnelle intégrée à un document financier (défaut: false) |
| `appliquee_devis_id` | string | ID du Devis auquel la ligne a été ajoutée |

---

## 18. `Invite`

**Module** : RSVP / Invités · **Required** : `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `compte_id` | string | ID du compte utilisateur lié (rempli auto) |
| `moment_id` | string | ID du moment principal (legacy — préférer moments_ids) |
| `moment_nom` | string | Nom du moment principal (dénormalisé, legacy) |
| `moments_ids` | array<string> | IDs des moments (multi-moments) |
| `moments_noms` | array<string> | Noms des moments (dénormalisés) |
| `mode_invitation` | string (enum) | `Confirmé` / `Nominatif` / `Libre` / `Groupe` (défaut: Libre) |
| `date_limite_reponse` | date | Date limite pour répondre (optionnel) |
| `groupe_lien_token` | string | Token commun pour le mode Groupe |
| `prenom` | string | Prénom |
| `nom` | string | Nom |
| `email` | string | Email |
| `telephone` | string | Téléphone |
| `lien_token` | string | Token unique pour l'accès individuel au portail invité |
| `groupe_token` | string | Token interne liant les personnes du même lien RSVP |
| `invite_referent_id` | string | ID de la personne qui a initié le RSVP du groupe |
| `categorie` | string (enum) | `Adulte` / `Mineur` (défaut: Adulte) |
| `age` | number | Âge |
| `statut_rsvp` | string (enum) | `En attente` / `Confirmé` / `Absent` / `Peut-être` (défaut: En attente) |
| `date_reponse` | date | Date de réponse |
| `allergenes` | array<string> | Allergènes |
| `regime_alimentaire` | string | Régime alimentaire (texte libre) |
| `besoin_hebergement` | boolean | Besoin d'hébergement (défaut: false) |
| `message_organisateur` | string | Message à l'organisateur |
| `reponses_custom` | object | Réponses aux questions personnalisées (clé = index de question) |
| `table_attribuee` | string | ID de la TableEvenement à laquelle l'invité est assigné |
| `date_assignation_table` | date-time | Date/heure de la dernière assignation (clé de tri circulaire) |
| `groupe` | string | Groupe |
| `invite_par` | string | Invité par |
| `archived` | boolean | Invité archivé (défaut: false) |

---

## 19. `MomentEvenement`

**Module** : RSVP / Invités · **Required** : `evenement_id`, `nom`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement parent |
| `nom` | string | Nom du moment (ex: La cérémonie, Le cocktail) |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `date` | date | Date spécifique du moment (optionnel) |
| `heure` | string | Heure du moment (optionnel, ex: 15:00) |
| `lieu` | string | Lieu spécifique du moment (optionnel) |
| `is_principale` | boolean | Étape principale — créée automatiquement, non supprimable (défaut: false) |
| `config` | object | Configuration de collecte `{collect_accompagnants, collect_allergenes, collect_hebergement, collect_message, questions_custom[]}` |

---

## 20. `MomentPersonnel`

**Module** : RSVP / Invités · **Required** : `evenement_id`, `intitule`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `client_nom` | string | Nom du client qui a ajouté ce moment |
| `intitule` | string | Ex: Discours de mamie, Surprise pour les mariés |
| `heure_souhaitee` | string | Heure souhaitée (HH:MM) |
| `duree_heures` | number | Durée en heures (défaut: 0) |
| `duree_minutes` | number | Durée en minutes (défaut: 0) |
| `note_organisateur` | string | Note optionnelle pour l'organisateur |
| `statut` | string (enum) | `En attente` / `Validé` / `Refusé` (défaut: En attente) |
| `heure_validee` | string | Heure définitive fixée par l'admin après validation |
| `message_refus` | string | Message explicatif en cas de refus |

---

## 21. `TableEvenement`

**Module** : Plan de Table · **Required** : `evenement_id`, `nom`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `nom` | string | Nom de référence numéroté (ex: « Table 1 ») |
| `nom_perso` | string | Nom personnalisé libre (ex: « Tulipe ») |
| `capacite` | number | Nombre de places maximum (optionnel) |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `forme` | string (enum) | `ronde` / `rectangulaire` (défaut: ronde) |
| `pos_x` | number | Position horizontale en % (0-100) |
| `pos_y` | number | Position verticale en % (0-100) |
| `dimension` | number | Taille relative sur le canvas (optionnel) |

---

## 22. `EspaceLieu`

**Module** : Plan de Table / Espaces · **Required** : `prestataire_id`, `nom`

| Champ | Type | Description |
|---|---|---|
| `prestataire_id` | string | ID du prestataire (lieu) propriétaire |
| `lieu_id` | string | ID du Lieu associé (optionnel) |
| `nom` | string | Nom de l'espace (ex: Salle principale, Verger) |
| `largeur` | number | Largeur du canvas en unités de ratio (défaut: 100) |
| `hauteur` | number | Hauteur du canvas en unités de ratio (défaut: 70) |
| `zones` | array | Contours/zones `[{id, type, points[{x,y}], nom, couleur, categorie}]` — categorie: `table` / `exclusion` |
| `formats_tables` | array | Formats de table `[{forme, capacite_max, capacite_min, dimension}]` |
| `table_honneur` | object | Table d'honneur optionnelle `{active, forme, capacite, dimension}` |
| `capacite_max_debout` | number | Capacité maximale cocktail (pers.) |
| `capacite_max_chaises` | number | Capacité maximale réunion (pers.) |
| `nb_tables_min` | number | Nombre minimum de tables (défaut: 1) |
| `nb_tables_max` | number | Nombre maximum de tables (null = max géométrique) |
| `actif` | boolean | Espace actif (défaut: true) |

---

## 23. `PropositionConfig`

**Module** : Plan de Table / Espaces · **Required** : `espace_lieu_id`, `mode`, `label`

| Champ | Type | Description |
|---|---|---|
| `espace_lieu_id` | string | ID de l'EspaceLieu parent |
| `prestataire_id` | string | ID du prestataire propriétaire (dénormalisé) |
| `mode` | string (enum) | `assis` / `debout` / `chaises` |
| `label` | string | Libellé lisible auto-généré |
| `forme_principale` | string (enum) | `ronde` / `rectangulaire` / `mixte` / `debout` / `chaises` |
| `nb_tables` | number | Nombre de tables hors table d'honneur (défaut: 0) |
| `avec_table_honneur` | boolean | True si la proposition inclut la table d'honneur (défaut: false) |
| `capacite_totale` | number | Capacité totale de la configuration (pers.) |
| `positions` | array | Positions précalculées en % `[{x, y, forme, honneur}]` |
| `statut` | string (enum) | `proposee` / `validee` / `rejetee` (défaut: proposee) |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `actif` | boolean | Proposition active (défaut: true) |

---

## 24. `PlanSalle`

**Module** : Plan de Table · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du plan (ex: 5 tables rondes, 6 tables + table d'honneur) |
| `capacite_max` | number | Capacité maximale en nombre de personnes |
| `file_url` | string | URL du fichier uploadé (image ou PDF) |
| `file_nom` | string | Nom original du fichier |
| `actif` | boolean | Plan actif (défaut: true) |

---

## 25. `Lieu`

**Module** : Lieux · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du lieu |
| `adresse` | string | Adresse |
| `ville` | string | Ville |
| `code_postal` | string | Code postal |
| `telephone` | string | Téléphone |
| `email` | string | Email |
| `capacite` | number | Capacité |
| `type_lieu` | string (enum) | Salle de réception, Château, Restaurant, Hôtel, Plein air, Autre |
| `lien_google_maps` | string | Lien Google Maps (fiche établissement) |
| `notes` | string | Notes |
| `types_evenement_defaut` | array<string> | Types d'événements pour lesquels ce lieu est associé par défaut |
| `lien_token` | string | Token unique pour le lien de l'espace lieu |
| `portal_password` | string | Mot de passe haché pour connexion portail |
| `portal_email` | string | Email utilisé pour connexion portail |
| `archived` | boolean | Lieu archivé (défaut: false) |

---

## 26. `Prestataire`

**Module** : Prestataires · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du prestataire ou société |
| `contact` | string | Nom du contact principal |
| `telephone` | string | Téléphone |
| `email` | string | Email |
| `domaine` | string (enum) | Traiteur, DJ / Musique, Photographe, Vidéaste, Fleuriste, Décoration, Animation, Transport, Sécurité, Sono / Lumières, Lieu de réception, Organisation, Beauté & Bien-être, Logistique, Autre |
| `ville` | string | Ville |
| `logo_url` | string | URL du logo |
| `cover_url` | string | URL de la photo de couverture |
| `description` | string | Présentation / bio (visible espace client) |
| `site_web` | string | Site web |
| `formulaire_actif` | boolean | Module questionnaire actif (défaut: false) |
| `messagerie_active` | boolean | Module messagerie actif (défaut: false) |
| `tarif` | number | Tarif indicatif (€) |
| `lieu_id` | string | ID du lieu habituel (optionnel) |
| `lieu_nom` | string | Nom du lieu habituel (dénormalisé) |
| `notes` | string | Notes diverses |
| `actif` | boolean | Prestataire actif (défaut: true) |
| `types_evenement_defaut` | array<string> | Types d'événements par défaut |
| `lien_token` | string | Token unique pour le lien planning prestataire |
| `portal_password` | string | Mot de passe haché pour connexion portail |
| `portal_email` | string | Email pour connexion portail |

---

## 27. `DispoPrestataire`

**Module** : Prestataires · **Required** : `prestataire_id`, `date`

| Champ | Type | Description |
|---|---|---|
| `prestataire_id` | string | ID du prestataire |
| `prestataire_nom` | string | Nom du prestataire (dénormalisé) |
| `prestataire_email` | string | Email du prestataire |
| `prestataire_domaine` | string | Domaine du prestataire |
| `date` | date | Date de la prestation |
| `heure_debut` | string | Heure de début |
| `heure_fin` | string | Heure de fin |
| `lieu` | string | Lieu de la prestation |
| `notes` | string | Notes complémentaires |
| `statut` | string (enum) | `En attente` / `Confirmé` / `Indispo` / `Annulé` / `Terminé` (défaut: En attente) |
| `evenement_id` | string | ID de l'événement associé (optionnel) |
| `evenement_nom` | string | Nom de l'événement associé (optionnel) |

---

## 28. `ConversationPrestataire`

**Module** : Messagerie · **Required** : `prestataire_id`

| Champ | Type | Description |
|---|---|---|
| `prestataire_id` | string | ID du prestataire |
| `prestataire_nom` | string | Nom du prestataire (dénormalisé) |
| `prestataire_email` | string | Email du prestataire |
| `dernier_message` | string | Aperçu du dernier message |
| `date_dernier_message` | string | Date du dernier message |
| `non_lus_admin` | number | Messages non lus par l'admin (défaut: 0) |

---

## 29. `MessagePrestataire`

**Module** : Messagerie · **Required** : `conversation_id`, `auteur`, `contenu`

| Champ | Type | Description |
|---|---|---|
| `conversation_id` | string | ID de la conversation |
| `auteur` | string (enum) | `prestataire` / `admin` |
| `auteur_nom` | string | Nom de l'auteur |
| `contenu` | string | Contenu du message |
| `lu` | boolean | Message lu (défaut: false) |

---

## 30. `ConversationLieu`

**Module** : Messagerie · **Required** : `lieu_id`

| Champ | Type | Description |
|---|---|---|
| `lieu_id` | string | ID du lieu |
| `lieu_nom` | string | Nom du lieu (dénormalisé) |
| `lieu_email` | string | Email du lieu |
| `dernier_message` | string | Aperçu du dernier message |
| `date_dernier_message` | string | Date du dernier message |
| `non_lus_admin` | number | Messages non lus par l'admin (défaut: 0) |

---

## 31. `MessageLieu`

**Module** : Messagerie · **Required** : `conversation_id`, `auteur`, `contenu`

| Champ | Type | Description |
|---|---|---|
| `conversation_id` | string | ID de la conversation |
| `auteur` | string (enum) | `lieu` / `admin` |
| `auteur_nom` | string | Nom de l'auteur |
| `contenu` | string | Contenu du message |
| `lu` | boolean | Message lu (défaut: false) |

---

## 32. `Conversation`

**Module** : Messagerie (client ↔ admin) · **Required** : `client_id`, `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `client_id` | string | ID du client |
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `client_nom` | string | Nom du client (dénormalisé) |
| `prestataire_id` | string | ID du prestataire lié (optionnel) |
| `prestataire_nom` | string | Nom du prestataire lié (dénormalisé, optionnel) |
| `dernier_message` | string | Aperçu du dernier message |
| `date_dernier_message` | string | Date du dernier message |
| `non_lus_admin` | number | Messages non lus par l'admin (défaut: 0) |
| `non_lus_client` | number | Messages non lus par le client (défaut: 0) |

---

## 33. `Message`

**Module** : Messagerie (client ↔ admin) · **Required** : `conversation_id`, `auteur`, `contenu`

| Champ | Type | Description |
|---|---|---|
| `conversation_id` | string | ID de la conversation |
| `auteur` | string (enum) | `client` / `admin` |
| `auteur_nom` | string | Nom de l'auteur |
| `contenu` | string | Contenu du message |
| `lu` | boolean | Message lu (défaut: false) |

---

## 34. `ConversationExtra`

**Module** : Messagerie / Extras · **Required** : `extra_id`

| Champ | Type | Description |
|---|---|---|
| `extra_id` | string | ID de l'extra |
| `extra_nom` | string | Nom de l'extra (dénormalisé) |
| `extra_email` | string | Email de l'extra |
| `dernier_message` | string | Aperçu du dernier message |
| `date_dernier_message` | string | Date du dernier message |
| `non_lus_admin` | number | Messages non lus par l'admin (défaut: 0) |

---

## 35. `MessageExtra`

**Module** : Messagerie / Extras · **Required** : `conversation_id`, `auteur`, `contenu`

| Champ | Type | Description |
|---|---|---|
| `conversation_id` | string | ID de la conversation |
| `auteur` | string (enum) | `extra` / `admin` |
| `auteur_nom` | string | Nom de l'auteur |
| `contenu` | string | Contenu du message |
| `lu` | boolean | Message lu (défaut: false) |

---

## 36. `RendezVous`

**Module** : RendezVous · **Required** : `client_id`, `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `client_id` | string | ID du client |
| `evenement_id` | string | ID de l'événement |
| `client_nom` | string | Nom du client (dénormalisé) |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `initie_par` | string (enum) | `Client` / `Admin` (défaut: Client) |
| `origine` | string (enum) | `Prestataire` / `Personnel` (défaut: Prestataire) — Voie 1 (prestataire) ou Voie 2 (note personnelle) |
| `prestataire_id` | string | ID du prestataire lié (optionnel) |
| `prestataire_nom` | string | Nom du prestataire (dénormalisé) |
| `titre` | string | Titre libre (Voie 2 — note personnelle) |
| `type_rdv` | string (enum) | `Physique` / `Visio` / `Téléphonique` (défaut: Physique) |
| `date_souhaitee` | date | Date souhaitée (Voie 2) |
| `heure_souhaitee` | string | Heure souhaitée (Voie 2) |
| `motif` | string | Motif / objet de la demande |
| `preferences_dispo` | string | Préférences de disponibilité (indicatif) |
| `motif_modification` | string | Motif de demande de modification d'un RDV confirmé |
| `motif_refus_creneaux` | string | Motif du refus des jours proposés par le client |
| `jours_proposes` | array | Jours proposés par l'admin `[{date, creneaux[]}]` |
| `lieu` | string | Lieu du rendez-vous (texte libre) |
| `statut` | string (enum) | `En attente` / `Confirmé` / `Annulé` / `Terminé` (défaut: En attente) |
| `notes_admin` | string | Notes de l'administrateur |
| `date_confirmee` | date | Date confirmée |
| `heure_confirmee` | string | Heure confirmée |
| `rappel_1j` | boolean | Rappel 1 jour avant (défaut: false) |
| `rappel_1h` | boolean | Rappel 1 heure avant (défaut: false) |
| `rappel_1j_envoye` | boolean | Rappel 1 jour déjà envoyé (défaut: false) |
| `rappel_1h_envoye` | boolean | Rappel 1 heure déjà envoyé (défaut: false) |

---

## 37. `EtapeProgramme`

**Module** : Programme · **Required** : `evenement_id`, `nom`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `nom` | string | Nom de l'étape |
| `heure` | string | Heure précise (ex: 15:00) ou texte libre |
| `lieu` | string | Lieu de l'étape (texte libre) |
| `gps_lien` | string | URL Google Maps du lieu |
| `description` | string | Description / détails de l'étape |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `moments_ids` | array<string> | IDs des moments concernés (vide = tous les invités) |

---

## 38. `EtapeBibliotheque`

**Module** : Bibliothèque · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom de l'étape réutilisable |
| `duree_heures` | number | Durée en heures (défaut: 0) |
| `duree_minutes` | number | Durée en minutes (défaut: 30) |
| `categorie` | string (enum) | Accueil, Cocktail, Repas, Animation, Logistique, Départ (défaut: Accueil) |
| `etat` | string (enum) | `incluse` / `disponible` / `archivee` (défaut: disponible) |
| `ordre` | number | Ordre d'affichage dans la catégorie |
| `description` | string | Description optionnelle |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 39. `ModeleProgramme`

**Module** : Bibliothèque · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du modèle (ex: Mariage cérémonie laïque + dîner assis) |
| `type_evenement` | string (enum) | Mariage, Pacs, Anniversaire de mariage, Baptême, Anniversaire, Soirée d'entreprise, Séminaire, Cocktail, Gala, Location, Autre |
| `etapes` | array | Étapes ordonnées `[{id, nom, duree_heures, duree_minutes, categorie}]` |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 40. `ProgrammeJourJ`

**Module** : Programme public · **Required** : `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `theme_id` | string (enum) | navy_cristal, clair_cristal, elegance, nature, sienna, boheme, riviera, nocturne, rosee, emeraude, perle, dolce_vita, aurore, luna, mineral, givre, boreal |
| `themes_debloques` | array<string> | Thèmes premium débloqués (mode test) |
| `blocs_actifs` | object | Blocs d'affichage `{afficher_infos_evenement, afficher_moments, afficher_plan_de_table, afficher_programme_detaille, afficher_prestataires, afficher_lieu_gps, afficher_message_perso}` |
| `message_bienvenue` | string | Message de bienvenue personnalisé |
| `lien_universel_token` | string | Token unique pour le lien universel du programme public |
| `signature_override` | string | Contenu personnalisé du Bloc Signature (surcharge l'auto-détection) |
| `prestataires_affiches` | array | Prestataires sélectionnés `[{prestataire_id, role_personnalise}]` |

---

## 41. `ModeleFormulaire`

**Module** : Bibliothèque · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du modèle (ex: Mariage standard) |
| `type_evenement` | string (enum) | Mariage, Pacs, Anniversaire de mariage, Baptême, Communion, Anniversaire, Gender reveal, Baby shower, Fête de fin d'année, Soirée d'entreprise, Séminaire, Cocktail, Gala, Location, Autre |
| `note_intro` | string | Note d'introduction affichée en haut du formulaire |
| `champs` | array | Champs `[{id, type, label, description, obligatoire, options[], pre_rempli, conditions[]}]` — types: texte, nombre, cases_a_cocher, choix_unique, liste, date, upload |
| `jours_avant_envoi_defaut` | number | Délai d'envoi par défaut pour ce type |
| `fenetre_reponse_defaut` | number | Fenêtre de réponse par défaut (défaut: 5) |
| `is_exemple` | boolean | Modèle non supprimable, seulement duplicable (défaut: false) |
| `est_demo` | boolean | Identifie le formulaire démo (défaut: false) |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 42. `FormulairePreparation`

**Module** : Bibliothèque · **Required** : `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `client_id` | string | ID du client |
| `client_nom` | string | Nom du client |
| `client_email` | string | Email du client |
| `prestataire_id` | string | ID du prestataire propriétaire |
| `champs` | array | Définition des champs (même structure que ModeleFormulaire.champs) |
| `reponses` | object | Réponses du client (clé = id du champ) |
| `statut` | string (enum) | Brouillon, Envoyé, En cours, Complété, Clôturé (défaut: Brouillon) |
| `date_envoi` | date | Date d'envoi au client |
| `date_limite` | date | Date limite de réponse |
| `date_soumission` | string | Date de soumission par le client |
| `jours_avant_envoi` | number | Envoyer auto J-X avant l'événement |
| `fenetre_reponse_jours` | number | Nombre de jours pour répondre (défaut: 5) |
| `rappel_j2_envoye` | boolean | Rappel J-2 déjà envoyé (défaut: false) |
| `fiche_service_generee` | boolean | Fiche de service générée depuis ce formulaire (défaut: false) |
| `modele_id` | string | ID du modèle utilisé |

---

## 43. `BibliothequeQuestion`

**Module** : Bibliothèque · **Required** : `label`, `categorie`

| Champ | Type | Description |
|---|---|---|
| `label` | string | Libellé de la question |
| `description` | string | Description ou indication |
| `type` | string (enum) | texte, nombre, heure, cases_a_cocher, choix_unique, liste, date, upload, oui_non (défaut: texte) |
| `categorie` | string (enum) | Identification client, Générales, Formule, Menu, OPTIONS, Spécifiques Mariage, Logistique, Logistique Livraison, Matériel, Médias & Souvenir, Sécurité & Contacts, Finalisation, Décoration, Matériel & Équipement, Lieu — mobile, Sécurité |
| `types_evenements` | array<string> | Types d'événements applicables (vide = tous) |
| `options` | array<string> | Options pour listes/choix |
| `obligatoire` | boolean | Question obligatoire (défaut: false) |
| `etat` | string (enum) | `incluse` / `disponible` / `archivee` (défaut: disponible) |
| `est_personnalisee` | boolean | Question créée par l'utilisateur (défaut: false) |
| `source_catalogue` | string (enum) | entrees, plats, desserts, options, animations |
| `option_source_id` | string | ID de l'OptionPrestation source (pour sync auto) |
| `conditions` | array | Conditions de visibilité `[{id, champ_declencheur_id, champ_declencheur_label, operateur, valeur, action}]` |
| `ordre` | number | Ordre d'affichage dans la catégorie |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 44. `CatalogueItem`

**Module** : Bibliothèque · **Required** : `section`, `nom`

| Champ | Type | Description |
|---|---|---|
| `section` | string (enum) | `alimentaire` / `boissons` / `tarifs` / `inclusions` |
| `nom` | string | Nom de l'article |
| `categorie` | string (enum) | Apéritif, Hors d'œuvre, Mise en bouche, Entrée, Plat, Fromage, Trou normand, Pré-dessert, Dessert, Mignardises, Pain, Atelier, Vin, Champagne, Boisson, Autre |
| `quantite_par_personne` | number | Quantité par personne |
| `unite` | string | Unité de mesure (pièce, cl, g…) |
| `par_table` | boolean | Quantité par table (boissons) (défaut: false) |
| `allergenes` | array<string> | Allergènes présents |
| `fournisseur_id` | string | ID du fournisseur associé |
| `fournisseur_nom` | string | Nom du fournisseur (dénormalisé) |
| `type_tarif` | string (enum) | formule, supplement, enfant, ado, prestataire, heure_supp, autre |
| `prix` | number | Prix HT par défaut en euros |
| `prix_ttc` | number | Prix TTC par défaut en euros |
| `prix_par_annee` | array | Prix spécifiques par année `[{annee, prix}]` |
| `description` | string | Description ou détails |
| `photo_url` | string | URL de la photo |
| `formules_associees` | array<string> | Noms des formules associées (vide = toutes) |
| `toutes_formules` | boolean | Associé à toutes les formules (défaut: true) |
| `a_choisir` | boolean | Le client peut choisir cet article (défaut: false) |
| `actif` | boolean | Article actif (défaut: true) |
| `ordre` | number | Ordre d'affichage |
| `type_calcul` | string (enum) | fixe, deduction_montant, deduction_pourcentage, supplement_montant, supplement_pourcentage (défaut: fixe) |
| `valeur_calcul` | number | Valeur utilisée pour le calcul (montant en € ou pourcentage) |
| `formule_parente` | string | Nom de la formule de référence pour le calcul dérivé |
| `s_applique_a` | array<string> | Types d'événements concernés (vide = tous) |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 45. `OptionPrestation`

**Module** : Bibliothèque · **Required** : `nom`, `categorie`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom de l'option/prestation |
| `categorie` | string (enum) | Animations, Son & Lumières, Décoration, Location Matériel, Prestataires externes, Animations culinaires, Autre |
| `unite` | string (enum) | Par personne, Par heure, Par unité, Forfait (défaut: Forfait) |
| `prix` | number | Prix HT par défaut (€) |
| `prix_ttc` | number | Prix TTC par défaut (€) |
| `prix_par_annee` | array | Prix spécifiques par année `[{annee, prix}]` |
| `description` | string | Description courte |
| `photo_url` | string | URL de la photo |
| `allergenes` | array<string> | Allergènes présents (14 allergènes réglementaires) |
| `actif` | boolean | Actif / proposé aux clients (défaut: true) |
| `s_applique_a` | array<string> | Types d'événements concernés (vide = tous) |
| `formules_liees` | array<string> | Formules auxquelles cette option est associée |
| `choix_menu_lies` | array<string> | Choix du menu associés à cette option |

---

## 46. `OptionEffectif`

**Module** : Bibliothèque · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom de l'option (ex: Plancha, Nounou, Bar à cocktails) |
| `description` | string | Description courte |
| `besoins` | object | Besoins en personnel `{Serveur, Barman, Cuisinier, Plongeur, Chef de rang, Hôte/Hôtesse, Autre}` (nombres, défaut: 0) |
| `actif` | boolean | Option active (défaut: true) |

---

## 47. `ModeleFicheService`

**Module** : Bibliothèque · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du modèle (ex: Fiche Salle) |
| `sections` | object | Sections incluses `{infos_evenement, programme, nb_couverts, menu, allergies, tenue, heure_prise_poste, plan_salle, coordonnees_urgence, responsable_soir, infos_logistiques}` (booléens) |
| `destinataires` | array<string> | Qui voit cette fiche |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 48. `FicheService`

**Module** : Fiches de service · **Required** : `evenement_id`, `type`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement |
| `evenement_date` | date | Date de l'événement |
| `evenement_lieu` | string | Lieu de l'événement |
| `modele_id` | string | ID du modèle de fiche utilisé |
| `modele_nom` | string | Nom du modèle utilisé |
| `type` | string (enum) | `salle` / `cuisine` / `prestataires` / `generale` / `custom` (défaut: custom) |
| `contenu` | object | Contenu de la fiche (JSON avec toutes les infos) |
| `consigne` | string | Mot ou consigne global à afficher |
| `statut` | string (enum) | Non generee, Generee, Prete, Envoyee, Vue (défaut: Generee) |
| `envoi_jours_avant` | number | Délai d'envoi J-X (défaut: 1) |
| `envoi_heure` | string | Heure d'envoi programmée (défaut: 09:00) |
| `destinataires` | array | Liste des destinataires `[{type, actif, envoye, vue}]` |
| `pdf_url` | string | URL du PDF généré |
| `date_generation` | string | Date de génération |
| `date_envoi` | string | Date du dernier envoi |
| `date_vue` | string | Date de première consultation |

---

## 49. `FicheServiceExtra`

**Module** : Fiches de service · **Required** : `evenement_id`, `extra_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `evenement_nom` | string | Nom de l'événement |
| `evenement_date` | string | Date de l'événement |
| `evenement_lieu` | string | Lieu de l'événement |
| `extra_id` | string | ID de l'extra |
| `extra_nom` | string | Nom de l'extra |
| `extra_email` | string | Email de l'extra |
| `extra_poste` | string | Poste de l'extra |
| `nb_invites` | number | Nombre d'invités confirmé |
| `menu` | object | Menu `{entree, plat, dessert, boissons, options_speciales}` |
| `programme` | array | Programme `[{heure, nom, intitule, categorie}]` |
| `tenue` | string | Tenue vestimentaire requise |
| `responsable_nom` | string | Nom du responsable du soir |
| `coordonnees_urgence` | string | Coordonnées d'urgence |
| `heure_prise_poste` | string | Heure de prise de poste |
| `statut` | string (enum) | `Non envoyée` / `Envoyée` / `Vue` (défaut: Non envoyée) |
| `date_envoi` | string | Date d'envoi |
| `date_vue` | string | Date de première consultation |

---

## 50. `BrochureCatalogue`

**Module** : Bibliothèque · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom de la brochure |
| `types_evenement` | array<string> | Types d'événements associés (vide = tous) |
| `fichier_url` | string | URL du fichier uploadé (PDF ou image) |
| `fichier_nom` | string | Nom du fichier original |
| `fichier_type` | string (enum) | `pdf` / `image` |
| `actif` | boolean | Disponible dans les espaces prospect et client (défaut: true) |

---

## 51. `TypeEvenement`

**Module** : Configuration · **Required** : `nom`, `categorie`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du type d'événement |
| `categorie` | string (enum) | `Particulier` / `Professionnel` |
| `actif` | boolean | Si false, ce type n'apparaît plus dans les menus (défaut: true) |
| `is_default` | boolean | Type par défaut (ne peut pas être supprimé) (défaut: false) |
| `ordre` | number | Ordre d'affichage (défaut: 0) |

---

## 52. `EffectifSettings`

**Module** : Configuration · **Required** : `type_evenement`

| Champ | Type | Description |
|---|---|---|
| `type_evenement` | string | Type d'événement (standard ou personnalisé) |
| `tranches` | object | Tranches de personnel par poste `{Serveur[], Barman[], Cuisinier[], Plongeur[], Chef de rang[], Hôte/Hôtesse[], Autre[]}` — chaque poste = array de `{min, max, personnel}` |
| `postes_actifs` | object | Postes activés/désactivés `{Serveur, Barman, Cuisinier, Plongeur, Chef de rang, Hôte/Hôtesse, Autre}` (booléens, défaut: true) |
| `personnalise` | boolean | True si c'est un type créé par l'utilisateur (défaut: false) |

---

## 53. `CompanySettings`

**Module** : Vitrine / Paramètres · **Required** : `company_name`

> Cette entité est très large (profil public, paramètres TVA, modules, abonnement, etc.). Seuls les champs sont listés ici — pour la logique métier détaillée, voir BUSINESS_LOGIC.md §11.

| Champ | Type | Description |
|---|---|---|
| `company_name` | string | Nom de l'entreprise |
| `appellation_commerciale` | string | Appellation commerciale des offres |
| `metier` | string (enum) | Métier principal (45 valeurs possibles) |
| `restauration_integree` | boolean | Restauration intégrée (active allergènes même hors Food) (défaut: false) |
| `subscription_level` | string (enum) | Gratuit, Essentiel, Pro, Business (défaut: Gratuit) |
| `icone_commerciale` | string | Icône ou emoji représentant l'activité |
| `company_logo_url` | string | URL du logo |
| `company_cover_url` | string | URL de la photo de couverture |
| `adresse` | string | Adresse complète |
| `telephone` | string | Téléphone de contact |
| `email_contact` | string | Email de contact |
| `site_web` | string | Site web |
| `siret` | string | Numéro SIRET (optionnel) |
| `tva_intracommunautaire` | string | Numéro de TVA intracommunautaire |
| `assujetti_tva` | boolean | Si false = franchise TVA (défaut: true) |
| `tva_mode` | string (enum) | `HT` / `TTC` (défaut: HT) |
| `tva_taux_defaut` | number (enum) | 0, 5.5, 10, 20 (défaut: 10) |
| `accepter_devis_auto_validation_prospect` | boolean | Auto-validation devis par prospect (défaut: false) |
| `iban` | string | IBAN pour virements |
| `bic` | string | Code BIC |
| `nom_banque` | string | Nom de la banque |
| `rib_url` | string | URL du fichier RIB |
| `conditions_paiement_defaut` | string | Conditions de paiement par défaut |
| `mentions_legales` | string | Mentions légales personnalisées |
| `email_signature` | string | Signature email personnalisée |
| `email_templates` | object | Modèles de messages par type de document |
| `terminologie_offres` | object | Terminologie des offres (mode unique/multiple) |
| `type_formulaire` | string (enum) | `universel` / `par_formule` (défaut: universel) |
| `social_networks` | array | Réseaux sociaux `[{name, url, icon}]` |
| `review_platforms` | array | Plateformes d'avis `[{name, url}]` |
| `auto_review_enabled` | boolean | Envoi auto de demande d'avis J+1 (défaut: false) |
| `auto_review_message` | string | Message personnalisé pour la demande d'avis |
| `objectif_annuel` | number | Objectif annuel d'événements |
| `fiche_envoi_jours_avant` | number | Délai d'envoi des fiches (défaut: 1) |
| `fiche_envoi_heure` | string | Heure d'envoi des fiches (défaut: 09:00) |
| `avis_mis_en_avant` | array<string> | IDs des avis mis en avant (max 5) |
| `modules_actifs` | object | Modules activés/désactivés |
| `notification_preferences` | object | Préférences de notifications |
| `annee_creation` | number | Année de création |
| `nb_evenements_declares` | number | Nombre d'événements déclarés manuellement |
| `accroche` | string | Phrase d'accroche |
| `a_propos` | string | Présentation détaillée (3-5 phrases) |
| `lien_avis_externe` | string | Lien externe vers avis clients |
| `note_moyenne_externe` | number | Note moyenne externe |
| `nb_avis_externe` | number | Nombre d'avis externes |
| `source_avis` | string | Source des avis externes |
| `relance_prospect_jours` | number | Délai de relance prospect (défaut: 3) |
| `prestataire_id` | string | ID de la fiche Prestataire |
| `is_owner` | boolean | Entreprise propriétaire de l'app (défaut: false) |
| `verifie_alryck` | boolean | Profil vérifié par Alryck (défaut: false) |
| `infos_pratiques_adresse` | string | Adresse / lieu d'intervention |
| `infos_pratiques_gps` | string | Lien Google Maps ou GPS |
| `infos_pratiques_horaires` | string | Horaires d'installation / intervention |
| `infos_pratiques_contact` | string | Contact opérationnel sur place |
| `infos_pratiques_notes` | string | Notes libres (accès, parking, etc.) |
| `tarif_a_partir_de` | number | Tarif indicatif (€) |
| `style_tags` | array<string> | Tags de style (Champêtre, Élégant, Moderne…) |
| `points_forts_personnalises` | array<string> | Points forts saisis librement |
| `langues_parlees` | array<string> | Langues parlées |
| `zone_intervention` | string | Zone géographique (historique) |
| `adresse_ville` | string | Ville du siège |
| `adresse_code_postal` | string | Code postal du siège |
| `latitude` | number | Latitude GPS du siège |
| `longitude` | number | Longitude GPS du siège |
| `zone_deplacement_type` | string (enum) | `rayon` / `departements` / `region` |
| `zone_deplacement_rayon_km` | number | Rayon de déplacement en km |
| `zone_deplacement_departements` | array<string> | Liste de départements couverts |
| `zone_deplacement_region` | string | Région couverte |
| `delai_reponse` | string | Délai de réponse habituel |
| `capacite_min` | number | Nombre minimum d'invités |
| `capacite_max` | number | Nombre maximum d'invités |
| `hebergement` | boolean | Hébergement disponible (historique) |
| `type_lieu` | string | Type de lieu (ex: Domaine, Salle) |
| `nb_photos_livrees` | number | Nombre de photos livrées |
| `delai_livraison` | string | Délai de livraison |
| `video_incluse` | boolean | Vidéo incluse |
| `type_musique` | string | Type de musique proposée |
| `materiel_inclus` | array<string> | Matériel inclus (Sono, Lumières…) |
| `style_floral` | string | Style floral principal |
| `prestations_florales` | array<string> | Prestations proposées |
| `equipements` | array<string> | Équipements disponibles |
| `faq` | array | FAQ `[{question, reponse, source}]` |
| `accueil_sur_place` | boolean | Accueil sur place (défaut: false) |
| `accueil_deplacement` | boolean | Prestataire se déplace (défaut: false) |

---

## 54. `GalerieVitrine`

**Module** : Vitrine · **Required** : `type`, `url`

| Champ | Type | Description |
|---|---|---|
| `type` | string (enum) | `photo` / `video` |
| `titre` | string | Titre optionnel |
| `url` | string | URL du fichier uploadé ou lien YouTube/Vimeo |
| `est_lien_externe` | boolean | True si lien YouTube/Vimeo (défaut: false) |
| `visible_prospect` | boolean | Visible dans l'espace prospect (défaut: true) |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `prestataire_id` | string | Multi-tenant futur (null pour l'instant) |

---

## 55. `AchatTheme`

**Module** : Vitrine / Abonnements · **Required** : `client_id`, `evenement_id`, `theme_id`

| Champ | Type | Description |
|---|---|---|
| `client_id` | string | ID du client ayant acheté le thème |
| `evenement_id` | string | ID de l'événement concerné |
| `theme_id` | string | Identifiant du thème acheté (ex: elegance, riviera) |
| `montant` | number | Prix payé en euros (défaut: 4.99) |
| `statut` | string (enum) | `en_attente` / `confirmé` / `remboursé` (défaut: en_attente) |
| `date_achat` | date-time | Date et heure de l'achat |
| `stripe_payment_intent_id` | string | ID du Payment Intent Stripe |

---

## 56. `Collaborateur`

**Module** : Équipe · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Prénom et nom |
| `telephone` | string | Téléphone |
| `email` | string | Email |
| `poste_fonction` | string | Poste ou fonction (ex: Responsable de salle) |
| `competences` | array<string> | Compétences |
| `type_contrat` | string (enum) | `CDI` / `CDD` / `Auto-entrepreneur` |
| `placement_auto` | boolean | Placement automatique sur les événements (défaut: false) |
| `types_evenements_auto` | array<string> | Types d'événements d'affectation automatique |
| `visible_planning_equipe` | boolean | Afficher sur le Planning Équipe global (défaut: true) |
| `notes` | string | Notes |
| `actif` | boolean | Collaborateur actif (défaut: true) |
| `lien_extra_token` | string | Token unique pour le lien de l'espace connecté |
| `portal_password` | string | Mot de passe haché |
| `portal_email` | string | Email pour connexion portail |

---

## 57. `CollaborateurEntree`

**Module** : Équipe / RH · **Required** : `collaborateur_id`, `type`, `date`

| Champ | Type | Description |
|---|---|---|
| `collaborateur_id` | string | ID du collaborateur |
| `collaborateur_nom` | string | Nom du collaborateur (dénormalisé) |
| `type` | string (enum) | Congé, Repos, Indisponibilité, Formation, Tâche interne, Autre |
| `titre` | string | Titre libre (ex: Congés été, Formation hygiène…) |
| `date` | date | Date |
| `date_fin` | date | Date de fin pour les entrées multi-jours (optionnel) |
| `heure_debut` | string | Heure de début (optionnel) |
| `heure_fin` | string | Heure de fin (optionnel) |
| `statut` | string (enum) | Planifié, En cours, Terminé, Annulé (défaut: Planifié) |
| `notes` | string | Notes |

---

## 58. `Extra`

**Module** : Équipe / Extras · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Prénom et nom |
| `telephone` | string | Téléphone |
| `email` | string | Email |
| `poste` | string (enum) | Serveur, Barman, Cuisinier, Plongeur, Chef de rang, Hôte/Hôtesse, Autre (rétrocompatibilité) |
| `competences` | array<string> | Compétences multiples |
| `competence_autre` | string | Précision pour la compétence Autre |
| `notes` | string | Notes diverses |
| `actif` | boolean | Extra actif (défaut: true) |
| `lien_extra_token` | string | Token unique pour le lien de l'espace extra |
| `portal_password` | string | Mot de passe haché |
| `portal_email` | string | Email pour connexion portail |

---

## 59. `Service`

**Module** : Planning extras · **Required** : `date`

| Champ | Type | Description |
|---|---|---|
| `date` | date | Date du service |
| `heure_debut` | string | Heure de début |
| `heure_fin` | string | Heure de fin |
| `poste` | string (enum) | Serveur, Barman, Cuisinier, Plongeur, Chef de rang, Hôte/Hôtesse, Autre |
| `lieu_id` | string | ID du lieu enregistré (optionnel) |
| `lieu` | string | Nom/adresse du lieu (texte libre) |
| `evenement_id` | string | ID de l'événement associé (optionnel) |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `notes` | string | Notes |
| `taux_horaire` | number | Taux horaire |
| `statut` | string (enum) | Ouvert, Complet, Annulé, Terminé (défaut: Ouvert) |

---

## 60. `ServiceAssignment`

**Module** : Planning extras · **Required** : `service_id`, `extra_id`

| Champ | Type | Description |
|---|---|---|
| `service_id` | string | ID du service |
| `extra_id` | string | ID de l'extra |
| `extra_nom` | string | Nom de l'extra |
| `extra_email` | string | Email de l'extra |
| `statut` | string (enum) | En attente, Dispo, Indispo, Confirmé, Annulé (défaut: En attente) |

---

## 61. `Shift`

**Module** : Planning extras · **Required** : `extra_id`, `date`, `heure_debut`, `heure_fin`

| Champ | Type | Description |
|---|---|---|
| `extra_id` | string | ID (email) de l'extra |
| `extra_nom` | string | Nom de l'extra |
| `extra_email` | string | Email de l'extra |
| `date` | date | Date |
| `heure_debut` | string | Heure de début |
| `heure_fin` | string | Heure de fin |
| `poste` | string (enum) | Serveur, Barman, Cuisinier, Plongeur, Chef de rang, Hôte/Hôtesse, Autre |
| `lieu` | string | Lieu |
| `statut` | string (enum) | En attente, Dispo, Indispo, Confirmé, Annulé, Terminé (défaut: En attente) |
| `notes` | string | Notes |
| `taux_horaire` | number | Taux horaire |

---

## 62. `ExtraDayStatus`

**Module** : Planning extras · **Required** : `extra_id`, `date`, `statut`

| Champ | Type | Description |
|---|---|---|
| `extra_id` | string | ID de l'extra |
| `extra_nom` | string | Nom de l'extra (dénormalisé) |
| `date` | date | Date concernée |
| `statut` | string (enum) | Repos, Vacances, Maladie, Indispo |
| `notes` | string | Notes complémentaires |

---

## 63. `DispoExtraGroupée`

**Module** : Planning extras · **Required** : `extras_ids`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Titre/nom de la demande groupée |
| `extras_ids` | array<string> | IDs des extras concernés |
| `dates_demandees` | array<string> | Liste des dates ISO demandées (YYYY-MM-DD) |
| `dates_par_extra` | object | Dates personnalisées par extra (clé: extra_id, valeur: array de dates) |
| `message` | string | Message personnalisé optionnel |
| `statut` | string (enum) | En cours, Complétée, Archivée (défaut: En cours) |

---

## 64. `DispoExtraReponse`

**Module** : Planning extras · **Required** : `dispo_groupee_id`, `extra_id`, `date`

| Champ | Type | Description |
|---|---|---|
| `dispo_groupee_id` | string | ID de la demande groupée |
| `extra_id` | string | ID de l'extra |
| `extra_nom` | string | Nom de l'extra (dénormalisé) |
| `date` | date | Date pour laquelle la réponse est donnée |
| `statut` | string (enum) | En attente, Disponible, Indisponible (défaut: En attente) |
| `notes` | string | Notes optionnelles de l'extra |

---

## 65. `RHSettings`

**Module** : Équipe / RH · **Required** : (aucun)

| Champ | Type | Description |
|---|---|---|
| `module_rh_actif` | boolean | Module RH global activé (défaut: false) |
| `tableau_de_bord_actif` | boolean | Tableau de bord équipe (heures, coûts, budget) (défaut: false) |
| `alertes_reglementaires_actif` | boolean | Alertes réglementaires (durée max, pause, prévenance) (défaut: false) |
| `suivi_timings_actif` | boolean | Suivi des timings (arrivée/départ, heures réelles vs prévues) (défaut: false) |

---

## 66. `TacheChecklist`

**Module** : Checklist · **Required** : `evenement_id`, `titre`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `titre` | string | Titre de la tâche |
| `complete` | boolean | Tâche complétée (défaut: false) |
| `date_limite` | date | Date limite optionnelle |
| `ordre` | number | Ordre d'affichage (défaut: 0) |
| `source` | string (enum) | Template, Personnalisée, Bibliothèque (défaut: Personnalisée) |

---

## 67. `Rappel`

**Module** : Checklist / Rappels · **Required** : `titre`, `date_rappel`

| Champ | Type | Description |
|---|---|---|
| `titre` | string | Titre du rappel |
| `date_rappel` | date | Date du rappel |
| `heure_rappel` | string | Heure du rappel (HH:MM) |
| `type` | string (enum) | `Manuel` / `Automatique` (défaut: Manuel) |
| `type_lie` | string (enum) | `evenement` / `client` / `prospect` / `aucun` (défaut: aucun) |
| `evenement_id` | string | ID de l'événement lié |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `client_id` | string | ID du client lié |
| `client_nom` | string | Nom du client (dénormalisé) |
| `prospect_id` | string | ID du prospect lié |
| `prospect_nom` | string | Nom du prospect (dénormalisé) |
| `notes` | string | Notes |
| `statut` | string (enum) | En attente, Fait, Manqué, Reporté (défaut: En attente) |
| `notification_envoyee` | boolean | Flag anti-doublon (défaut: false) |

---

## 68. `Notification`

**Module** : Notifications · **Required** : `titre`, `message`

| Champ | Type | Description |
|---|---|---|
| `user_email` | string | Email du destinataire (vide = tous les admins) |
| `titre` | string | Titre court |
| `message` | string | Message détaillé |
| `type` | string (enum) | prestataire, rendezvous, evenement, service, info, devis_demande, facturation (défaut: info) |
| `lu` | boolean | Notification lue (défaut: false) |
| `lien` | string | Lien vers la page concernée (optionnel) |

---

## 69. `AutomationRegle`

**Module** : Automatisations · **Required** : `bloc`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | Si défini, règle spécifique à un événement. Si null, règle globale. |
| `formulaire_id` | string | ID du modèle de formulaire (pour règles formulaire) |
| `formulaire_nom` | string | Nom du modèle (dénormalisé) |
| `bloc` | string (enum) | formulaire, programme, fiche_service, facturation, avis, prospect |
| `config` | object | Configuration JSON des délais `{envoi_j, fenetre_reponse_j, rappel_j, relance_j, envoi_provisoire_j, envoi_definitif_j, rappel_validation_j, envoi_prestataires_j, envoi_extras_j, rappel_fiche_j, acompte_delai_j, acompte_alerte_j, solde_limite_j, solde_alerte_j, avis_envoi_j, avis_relance_j, prospect_alerte_j, prospect_statut_j}` |
| `actif` | boolean | Règle active (défaut: true) |

---

## 70. `AutomationLog`

**Module** : Automatisations · **Required** : `type_action`, `statut`

| Champ | Type | Description |
|---|---|---|
| `type_action` | string (enum) | formulaire_envoi, formulaire_rappel, formulaire_relance, programme_provisoire, programme_definitif, programme_rappel, fiche_prestataires, fiche_extras, fiche_rappel, acompte_alerte, solde_alerte, avis_envoi, avis_relance, prospect_relance |
| `evenement_id` | string | ID de l'événement concerné |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `evenement_date` | date | Date de l'événement |
| `destinataire` | string | Email ou nom du destinataire |
| `statut` | string (enum) | Envoyé, Programmé, Échoué, En attente (défaut: Programmé) |
| `date_programmee` | string | Date/heure programmée ISO |
| `date_execution` | string | Date/heure d'exécution réelle |
| `details` | string | Détails complémentaires ou message d'erreur |
| `prospect_id` | string | ID du prospect si applicable |

---

## 71. `ModuleSecurite`

**Module** : Sécurité · **Required** : (aucun)

| Champ | Type | Description |
|---|---|---|
| `actif` | boolean | Module activé (défaut: false) |
| `type_etablissement` | string (enum) | Salle de réception, Restaurant, Hôtel, Salle de spectacle, Autre |
| `controles_configures` | boolean | Les contrôles ont-ils été configurés au moins une fois (défaut: false) |

---

## 72. `ControleSecurite`

**Module** : Sécurité · **Required** : `nom`, `categorie`, `frequence_jours`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du contrôle (ex: Vérification extincteurs) |
| `categorie` | string (enum) | Sécurité incendie, Electricité, Hygiène, Structure, Administratif, Autre |
| `frequence_jours` | number | Fréquence en jours (365 annuel, 730 biannuel) |
| `derniere_date_controle` | date | Date du dernier contrôle |
| `prochaine_date_prevue` | date | Date du prochain contrôle (calculée auto) |
| `organisme_intervenant` | string | Nom de l'organisme/entreprise |
| `contact_organisme` | string | Email/téléphone de contact |
| `document_url` | string | URL du document PDF du dernier contrôle |
| `document_nom` | string | Nom du fichier document |
| `notes` | string | Notes additionnelles |
| `statut` | string (enum) | À jour, Bientôt expiré, Expiré (défaut: À jour) |
| `rappel_actif` | boolean | Rappel automatique activé (défaut: false) |
| `rappel_delai_jours` | number | Jours avant expiration pour déclencher le rappel (défaut: 30) |
| `actif` | boolean | Contrôle actif (défaut: true) |

---

## 73. `Fournisseur`

**Module** : Commandes / Logistique · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom du fournisseur |
| `telephone` | string | Téléphone |
| `email` | string | Email |
| `categories` | array<string> | Catégories d'approvisionnement |
| `mode_commande` | string (enum) | email, téléphone, bon_de_commande, autre (défaut: email) |
| `bon_commande_usage` | string (enum) | `interne` / `envoi_fournisseur` (défaut: interne) |
| `notes` | string | Notes optionnelles |
| `actif` | boolean | Fournisseur actif (défaut: true) |

---

## 74. `RegleCommande`

**Module** : Commandes / Logistique · **Required** : `option_prestation_nom`, `fournisseur_nom`

| Champ | Type | Description |
|---|---|---|
| `option_prestation_id` | string | ID de l'option/prestation associée |
| `option_prestation_nom` | string | Nom de l'option/prestation (dénormalisé) |
| `fournisseur_id` | string | ID du fournisseur |
| `fournisseur_nom` | string | Nom du fournisseur (dénormalisé) |
| `produits` | array | Liste des produits `[{id, nom, unite, qte_adulte, qte_adolescent, qte_enfant, qte_fixe, mode_qte, arrondi, notes}]` |
| `unite` | string | Unité de mesure (legacy — un seul produit) |
| `qte_adulte` | number | Quantité par adulte (legacy) |
| `qte_adolescent` | number | Quantité par adolescent (legacy) |
| `qte_enfant` | number | Quantité par enfant (legacy) |
| `arrondi` | string (enum) | supérieur, inférieur (défaut: supérieur, legacy) |
| `notes` | string | Notes complémentaires |

---

## 75. `RegleMateriel`

**Module** : Commandes / Logistique · **Required** : `article_id`

| Champ | Type | Description |
|---|---|---|
| `prestation_types` | array<string> | Types de prestation (sur_place, livraison, prestation_complete). Vide = toutes. |
| `prestation_type` | string | Rétrocompatibilité — utiliser prestation_types |
| `source_type` | string (enum) | `toutes` / `formule_specifique` (défaut: toutes) |
| `formule_ids` | array<string> | IDs des formules spécifiques (vide = toutes) |
| `formule_id` | string | Rétrocompatibilité |
| `formule_nom` | string | Nom de la formule (dénormalisé) |
| `article_id` | string | ID de l'article |
| `article_nom` | string | Nom de l'article (dénormalisé) |
| `mode_qte` | string (enum) | `par_personne` / `fixe` (défaut: par_personne) |
| `unite` | string | Unité de mesure |
| `qte_adulte` | number | Quantité par adulte (défaut: 0) |
| `qte_adolescent` | number | Quantité par adolescent (défaut: 0) |
| `qte_enfant` | number | Quantité par enfant (défaut: 0) |
| `qte_fixe` | number | Quantité fixe (défaut: 0) |
| `arrondi` | string (enum) | supérieur, inférieur (défaut: supérieur) |
| `notes` | string | Notes |

---

## 76. `LogistiqueArticle`

**Module** : Logistique · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom de l'article |
| `quantite_par_personne` | number | Quantité par personne |
| `unite` | string | Unité de mesure |
| `categorie` | string (enum) | Vaisselle, Couverts, Mobilier, Linge de table, Ustensiles & Cuisine, Batterie de cuisine, Appareils de cuisson, Electroménager & Petit matériel, Froid & Conservation, Son & Lumières, Matériel de transport, Autre |
| `notes` | string | Notes |
| `actif` | boolean | Article actif (défaut: true) |
| `formules_associees` | array<string> | IDs des formules associées (vide = toutes) |

---

## 77. `LogistiqueVehicule`

**Module** : Logistique · **Required** : `nom`

| Champ | Type | Description |
|---|---|---|
| `nom` | string | Nom ou immatriculation |
| `type_vehicule` | string (enum) | Camionnette, Camion, Voiture, Remorque, Autre |
| `capacite` | string | Capacité (ex: 20 m³, 1500 kg) |
| `chauffeur_id` | string | ID de l'extra ou collaborateur assigné |
| `chauffeur_nom` | string | Nom du chauffeur (dénormalisé) |
| `chauffeur_type` | string (enum) | `extra` / `collaborateur` |
| `notes` | string | Notes |
| `actif` | boolean | Véhicule actif (défaut: true) |

---

## 78. `LogistiqueEvenement`

**Module** : Logistique · **Required** : `evenement_id`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement |
| `type_prestation` | string (enum) | `sur_place` / `livraison` / `prestation_complete` (défaut: sur_place) |
| `vehicule_id` | string | ID du véhicule |
| `vehicule_nom` | string | Nom du véhicule (dénormalisé) |
| `chauffeur_id` | string | ID du chauffeur |
| `chauffeur_nom` | string | Nom du chauffeur (dénormalisé) |
| `creneau_date` | string | Date du créneau |
| `creneau_heure` | string | Heure du créneau |
| `adresse_livraison` | string | Adresse de livraison |
| `statut_livraison` | string (enum) | en_preparation, en_route, livre, signe (défaut: en_preparation) |
| `checklist_materiel` | array | Articles avec quantités et états `[{article_id, nom, quantite, charge, retour}]` |

---

## 79. `PhotoClient`

**Module** : Médias · **Required** : `file_url`

| Champ | Type | Description |
|---|---|---|
| `evenement_id` | string | ID de l'événement (optionnel pour extras/prestataires/lieux) |
| `evenement_nom` | string | Nom de l'événement (dénormalisé) |
| `source_type` | string (enum) | `client` / `extra` / `prestataire` / `lieu` (défaut: client) |
| `source_id` | string | ID de la source |
| `client_nom` | string | Nom de la source (dénormalisé) |
| `file_url` | string | URL de la photo uploadée |
| `autorisation_reseaux` | boolean | Autorisation d'utilisation sur les réseaux sociaux (défaut: false) |
| `commentaire` | string | Commentaire accompagnant les photos |
| `statut` | string (enum) | En attente, Approuvée, Publiée (défaut: En attente) |
| `nom_fichier` | string | Nom original du fichier |

---

## 80. `User` (built-in)

**Module** : Auth (entité gérée par la plateforme) · **Non créable directement**

| Champ | Type | Description |
|---|---|---|
| `id` | string | ID unique (built-in) |
| `created_date` | date-time | Date de création (built-in) |
| `full_name` | string | Nom complet (lecture seule) |
| `email` | string | Email (lecture seule) |
| `role` | string | `admin` / `user` / `prestataire` / `lieu` / `extra` |
| `onboarding_completed` | boolean | Flag onboarding admin terminé (éditable via `base44.auth.updateMe`) |

> Les utilisateurs sont créés via `base44.users.inviteUser(email, role)`. On ne peut pas créer de User directement (405).

---

## Récapitulatif par module

| Module | Entités | Nombre |
|---|---|---|
| Événements | Evenement, EvenementPrestataire, PropositionDateEvenement, DemandeAnnulationEvenement, LieuEvenement | 5 |
| Clients | Client, ClientDocument | 2 |
| Prospects | Prospect, ProspectMessage, DemandeReservation, ProspectDateDemande, PreReservation | 5 |
| Contrats | Contrat, PreReservation | 2 |
| Facturation | Devis, Echeance | 2 |
| Promotions | Promotion, PromotionReponse | 2 |
| RSVP / Invités | Invite, MomentEvenement, MomentPersonnel | 3 |
| Plan de Table | TableEvenement, EspaceLieu, PropositionConfig, PlanSalle | 4 |
| Lieux | Lieu, LieuEvenement | 2 |
| Prestataires | Prestataire, EvenementPrestataire, DispoPrestataire | 3 |
| Messagerie | Conversation, Message, ConversationPrestataire, MessagePrestataire, ConversationLieu, MessageLieu, ConversationExtra, MessageExtra, ProspectMessage | 9 |
| RendezVous | RendezVous | 1 |
| Programme | EtapeProgramme, EtapeBibliotheque, ModeleProgramme, ProgrammeJourJ | 4 |
| Bibliothèque | ModeleFormulaire, FormulairePreparation, BibliothequeQuestion, CatalogueItem, OptionPrestation, OptionEffectif, ModeleFicheService, BrochureCatalogue, EtapeBibliotheque, ModeleProgramme | 10 |
| Fiches de service | FicheService, FicheServiceExtra, ModeleFicheService | 3 |
| Configuration | TypeEvenement, EffectifSettings | 2 |
| Vitrine / Paramètres | CompanySettings, GalerieVitrine, AchatTheme | 3 |
| Équipe / RH | Collaborateur, CollaborateurEntree, RHSettings | 3 |
| Extras / Planning | Extra, Service, ServiceAssignment, Shift, ExtraDayStatus, DispoExtraGroupée, DispoExtraReponse | 7 |
| Checklist / Rappels | TacheChecklist, Rappel | 2 |
| Notifications | Notification | 1 |
| Automatisations | AutomationRegle, AutomationLog | 2 |
| Sécurité | ModuleSecurite, ControleSecurite | 2 |
| Commandes / Logistique | Fournisseur, RegleCommande, RegleMateriel, LogistiqueArticle, LogistiqueVehicule, LogistiqueEvenement | 6 |
| Médias | PhotoClient | 1 |
| Auth | User (built-in) | 1 |
| **TOTAL** | | **81** |

---

*Document généré le 2026-08-12. Inventaire exhaustif : 81 entités, tous attributs confondus.*