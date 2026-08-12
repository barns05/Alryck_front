# BUSINESS_LOGIC.md — Logique métier Alryck

> **Document de référence pour la migration vers Vercel/Supabase.**
> Ce fichier documente, module par module, les règles métier implicites dispersées
> dans les composants frontend, les fonctions backend, et les schémas d'entités.
> L'objectif n'est pas de recopier le code, mais d'expliquer **pourquoi** le code fait
> ce qu'il fait — les règles qu'un développeur reprenant le projet sur une autre stack
> doit connaître pour ne pas les perdre en cours de réécriture.

---

## Table des matières

1. [Architecture & conventions transverses](#1-architecture--conventions-transverses)
2. [Module Événements](#2-module-événements)
3. [Module Clients](#3-module-clients)
4. [Module Prospects](#4-module-prospects)
5. [Module Contrats & Signature électronique](#5-module-contrats--signature-électronique)
6. [Module Facturation (Devis/Factures/Échéances)](#6-module-facturation-devisfactureséchéances)
7. [Module Plan de Table & Espaces](#7-module-plan-de-table--espaces)
8. [Module RSVP & Invités](#8-module-rsvp--invités)
9. [Module Checklist & Rappels](#9-module-checklist--rappels)
10. [Module Bibliothèque (Catalogue/Formulaires/Programmes/Fiches)](#10-module-bibliothèque-catalogueformulairesprogrammesfiches)
11. [Module Vitrine & Abonnements](#11-module-vitrine--abonnements)
12. [Module Équipe & Extras](#12-module-équipe--extras)
13. [Module Prestataires & Lieux](#13-module-prestataires--lieux)
14. [Module RendezVous](#14-module-rendezvous)
15. [Fonctions backend — Référence complète](#15-fonctions-backend--référence-complète)
16. [Intégrations externes](#16-intégrations-externes)
17. [Automations planifiées](#17-automations-planifiées)
18. [Règles transverses & pièges de migration](#18-règles-transverses--pièges-de-migration)

---

## 1. Architecture & conventions transverses

### 1.1 Stack actuelle

- **Frontend** : React + Tailwind CSS + Vite. Toute la logique métier vit dans les composants/pages (pas de couche service dédiée).
- **Backend** : Base44 BaaS — entités (JSON schemas), fonctions (`base44/functions/`), automations (cron/entity triggers).
- **SDK** : `base44` client pré-initialisé dans `@/api/base44Client`. Opérations CRUD via `base44.entities.<Name>.<op>()`.
- **Data fetching** : React Query (`@tanstack/react-query`) pour le cache, `useQuery`/`useMutation`.
- **Runtime backend** : Deno (fonctions `entry.ts`), CommonJS côté sandbox Node.js (`exec_tool`).

### 1.2 Conventions de données

- **Champs built-in** : `id`, `created_date`, `updated_date`, `created_by_id` — présents sur toutes les entités, jamais déclarés.
- **Soft delete** : la plupart des entités utilisent un champ `archived: boolean` plutôt qu'une suppression physique.
- **Dénormalisation** : de nombreux champs sont dénormalisés pour l'affichage (`client_nom`, `evenement_nom`, `prestataire_nom`) — ils doivent être synchronisés manuellement lors des changements.
- **Multi-tenant anticipé** : `prestataire_id` est posé sur la plupart des entités pour un futur rattachement multi-tenant. Actuellement mono-tenant — `CompanySettings.is_owner === true` identifie l'entreprise propriétaire de l'app.
- **RLS** : par défaut, les entités sont accessibles à tous les utilisateurs authentifiés. Le RLS n'est configuré que sur demande explicite.

### 1.3 Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `admin` | Accès complet à l'app (Dashboard, tous les modules) |
| `user` | Accès standard (généralement non utilisé directement) |
| `prestataire` | Portail prestataire (`/MonEspacePrestataire`) |
| `lieu` | Portail lieu (`/lieu-portal`) |
| `extra` | Planning personnel (`/MonPlanning`) |

La redirection après login (`src/App.jsx`) :
- `extra` → `/MonPlanning`
- `prestataire` → `/MonEspacePrestataire`
- `lieu` → `/lieu-portal`
- sinon → `/Dashboard`

### 1.4 Portails publics (sans auth)

Routes accessibles sans token d'auth :
- `/client-portal` — Espace client (token via `lien_client_token`)
- `/prospect-portal` — Espace prospect (token via `lien_token`)
- `/invite-portal` — Portail invité (token via `lien_token`)
- `/programme-public` — Programme public (token via URL)
- `/register` — Inscription

---

## 2. Module Événements

### 2.1 Entité principale : `Evenement`

**Champs porteurs de logique métier :**

| Champ | Logique |
|---|---|
| `statut` | Cycle de vie : `En attente` → `À configurer` → `Confirmé` → `En préparation` → `Prêt` → `En cours` → `Terminé` / `Annulé` |
| `date_type` | `exacte` / `mois` / `periode` — détermine comment la date est saisie et affichée |
| `date` | **Toujours renseignée** (champ required). Date technique de travail (tri, planning, J-X). En mode `mois` = 1er du mois. En mode `periode` = date conservée mais **jamais affichée telle quelle**. |
| `date_mois` | Format `YYYY-MM`. Renseigné seulement si `date_type='mois'`. |
| `date_periode` | Texte libre (ex: "Été 2027"). Renseigné seulement si `date_type='periode'`. |
| `cree_par_client` | `true` si auto-créé par le client depuis son portail — déverrouille l'annuaire prestataires immédiatement |
| `recommandation_statut` | `a_faire` / `reporte` / `refuse` — rappel de recommandation de prestataires |
| `recommandation_date_rappel` | Date de rappel quand `recommandation_statut='reporte'` |
| `mode_configuration` | `assis` / `debout` / `chaises` / `personnalise` — mode de salle choisi par le client |
| `espace_lieu_id` | ID de l'EspaceLieu choisi pour le placement visuel des tables |
| `proposition_config_id` | ID de la PropositionConfig validée (mode assis) |
| `nb_tables_prevu` | Nombre de tables prévu par le client (sert à filtrer les propositions) |
| `taches_requises` | Objet booléen : `formulaire`, `programme`, `plan_table`, `fiche_service`, `equipe_extras`, `menu`, `logistique` |
| `checklist` | Array d'objets `{id, label, checked}` — fiche de préparation intégrée |

### 2.2 Gestion des dates — Règle critique

**Fichier** : `src/lib/evenementDate.js`

La date d'un événement a trois modes de saisie. La **confirmation** est déterminée par `date_type === 'exacte'` (pas de champ `date_confirmee`).

**Règles de normalisation** (`normalizeEvenementDate`) :
- `exacte` : on garde `date`, on efface `date_mois` et `date_periode`
- `mois` : on garde `date_mois`, on calcule `date = ${date_mois}-01`, on efface `date_periode`
- `periode` : on garde `date_periode`, on efface `date_mois`. La date technique est conservée (jamais passée à null — champ required)

**Affichage** (`formatEvenementDate`) :
- En mode `mois`/`periode`, **ne jamais afficher la date technique brute** — utiliser le label lisible
- `isConfirmed` = `date_type === 'exacte'`

**Impact sur les automations** : `updateEventStatusAuto` et `autoSendFichesJ1` **skip** les événements en mode `mois`/`periode` car `date` est une date technique, pas une vraie date d'événement.

### 2.3 Cycle de vie des statuts

**Automatisation** (`base44/functions/updateEventStatusAuto/entry.ts`) :
- Le jour J à `heure_debut` → `En cours` (si pas déjà `Terminé`/`Annulé`)
- Le jour J à `heure_fin` → `Terminé`
- Jours passés sans `heure_fin` → `Terminé`
- **Auto-archive** : événements `Terminé` depuis > 30 jours → `archived: true`
- **Skip mode mois/période** : les transitions auto ne s'appliquent qu'en mode `exacte`

**Notifications** (`base44/functions/handleEvenementChange/entry.ts`) — déclenché par entity automation sur create/update :
- Création → notification "🎉 Nouvel événement"
- Changement de statut vers `Confirmé` → "✅ Événement confirmé"
- Changement de statut vers `Annulé` → "❌ Événement annulé"

### 2.4 Workflow de changement de date

**Fichier** : `src/lib/propositionDate.js` (`gererChangementDate`)

Quand un événement a au moins un `EvenementPrestataire` confirmé ET que la date proposée diffère de l'actuelle, **la date n'est pas appliquée directement**. À la place :
1. Création d'une `PropositionDateEvenement` (statut `en_attente`) via la fonction backend `creerPropositionDate`
2. Notification de tous les prestataires confirmés
3. La date actuelle est conservée sur l'Evenement jusqu'à la finalisation
4. L'admin finalise via `finalizePropositionDate` (applique la nouvelle date) ou refuse via `refuserPropositionDate`

**Garde anti-doublon** : s'il existe déjà une proposition `en_attente` pour cet événement, la création est refusée (409).

### 2.5 Synchronisation Client ↔ Événement

**Fonction** : `syncClientEvenement` (entity automation sur `Client`)

Quand un `Client` est créé ou modifié avec une `date_evenement` :
- Si un `Evenement` existe déjà pour ce client (`client_id` match) → update des champs dénormalisés
- Sinon → création d'un nouvel `Evenement` (statut `En préparation`, token généré)

### 2.6 Recommandation de prestataires

**Automation** : `checkRecommandationPrestataires` (quotidienne)

Pour les événements avec `recommandation_statut === 'a_faire'` créés ≥ 2 jours :
- Si au moins un `EvenementPrestataire` avec statut `Recommandé` → auto-fermeture (`refuse`)
- Sinon → création d'une Notification (dédupliquée par message)

Pour `recommandation_statut === 'reporte'` avec `date_rappel <= today` → repassage à `a_faire` + Notification.

---

## 3. Module Clients

### 3.1 Entité : `Client`

**Champs clés :**

| Champ | Logique |
|---|---|
| `lien_client_token` | Token unique pour l'accès au portail client (tous événements confondus) |
| `portal_email` / `portal_password` | Identifiants de connexion portail (password haché) |
| `onboarding_vu` | Flag one-shot : l'onboarding guidé du portail ne s'affiche qu'une fois |
| `couleur_theme` | Couleur hex de l'espace client |
| `photo_profil_url` | Photo de profil affichée dans le portail |
| `categorie_client` | `Particulier` / `Professionnel` — déduit du type d'événement, modifiable |
| `source_connaissance` | Comment le client a connu l'entreprise |
| `archived` | Soft delete |

**Double contact** : `nom2`, `prenom2`, `telephone2`, `email2` — pour les couples (mariages, etc.)

### 3.2 Portail client

- Accès via `/client-portal?token=<lien_client_token>`
- Le token identifie le client de façon stable (pas d'auth plateforme requise)
- Le portail agrège tous les événements du client
- Le client peut : créer des événements (`cree_par_client=true`), proposer des lieux, proposer des dates, consulter devis/contrats, gérer son plan de table

### 3.3 Inscription / Onboarding

- L'inscription se fait via `/register` (page publique)
- 3 profils au choix : Client, Prestataire, Staff (extra)
- Les utilisateurs sont créés via `base44.users.inviteUser(email, role)` — on ne peut pas créer de User directement (405)
- L'onboarding admin s'affiche une seule fois (`onboarding_completed` flag sur le User)

---

## 4. Module Prospects

### 4.1 Entité : `Prospect`

**Champs clés :**

| Champ | Logique |
|---|---|
| `statut` | `Nouveau` → `Devis envoyé` → `À relancer` → `Signé` / `Annulé` / `En attente` |
| `converti` | `true` après conversion en Client + Evenement |
| `client_id` | ID du Client créé après conversion |
| `evenement_id` | ID de l'Evenement créé après conversion |
| `lien_token` | Token pour le portail prospect (`/prospect-portal?token=...`) |
| `couleur_theme` | Couleur de l'espace prospect |
| `relance_delai_jours` | Délai de relance personnalisé (override le global) |
| `relance_snooze_jusqu_au` | Relance suspendue jusqu'à cette date |
| `date_type` | Même logique que Evenement (`exacte`/`mois`/`periode`) |
| `prestataire_id` | ID du prestataire ayant initié la relation |

### 4.2 Cycle de vie Prospect → Client

**Conversion** (`src/components/prospects/ConvertirProspectModal.jsx`) :

1. Le statut passe à `Signé` → déclenche la conversion
2. Récupération des dates demandées (`ProspectDateDemande`) + dates souhaitées
3. Création d'un `Client` (avec token, couleur thème reportés)
4. Création d'un `Evenement` (avec date, type, lieu, nb invités reportés)
5. Mise à jour des `Devis` existants (rattachement au nouveau `client_id`)
6. Mise à jour des `ClientDocument` (rattachement prospect → client)
7. Mise à jour des `Contrat` (rattachement prospect → client)
8. Marquage `converti=true`, `client_id`, `evenement_id` sur le Prospect
9. Envoi d'un email de bienvenue au client

### 4.3 Système de relance automatique

**Fonction** : `checkProspectRelances` (scheduled automation)

Pour les prospects au statut `Devis envoyé` :
1. Délai effectif = `relance_delai_jours` (prospect) ou `AutomationRegle.config.prospect_statut_j` (global, défaut 7 jours) ou `CompanySettings.relance_prospect_jours` (défaut 3)
2. Date de référence = date du dernier devis envoyé (`Devis.updated_date`) ou `Prospect.updated_date`
3. Si `joursEcoules >= delai` → statut passe à `À relancer` + notification admin + email prospect
4. **Déduplication** via `AutomationLog` (type_action `prospect_relance`) — un prospect n'est relancé qu'une fois
5. **Snooze** : si `relance_snooze_jusqu_au >= today` → skip

### 4.4 Espace prospect (portail public)

Le prospect a un espace public (`/prospect-portal`) où il peut :
- Consulter les formules/menus
- Demander un devis (crée un `ProspectMessage` avec préfixe `DEMANDE_DEVIS:`)
- Demander une réservation (crée une `DemandeReservation`)
- Proposer/contourner des dates (`ProspectDateDemande`)
- Messagerie avec l'admin

**Bloc "Toujours intéressé ?"** : affiché après `relance_prospect_jours` (CompanySettings) jours d'inactivité post-devis.

### 4.5 Archivage automatique

**Fonction** : `archiveProspectsAnnules` (quotidienne)
- Prospects au statut `Annulé` depuis > 30 jours → `archived: true`

### 4.6 Demandes de réservation

**Entité** : `DemandeReservation`

Workflow :
1. Prospect envoie une demande depuis son espace → statut `en_attente`
2. Admin accepte → `acceptee` (crée une pré-réservation)
3. Admin refuse → `refusee`
4. Admin contre-propose une date → `contre_proposee`
5. Prospect accepte la contre-proposition → `confirmee_par_prospect`
6. Prospect refuse → reste `en_attente` ou refuse explicitement

### 4.7 Demandes de date

**Entité** : `ProspectDateDemande`

Workflow :
- Prospect propose des dates → statut `En attente`
- Admin répond → statut `Répondu`
- Date confirmée → statut `Confirmée`

---

## 5. Module Contrats & Signature électronique

### 5.1 Entité : `Contrat`

**Discriminateur** : champ `type`
- `client` = vrai contrat rattaché à un client ou prospect
- `modele` = gabarit réutilisable non rattaché

**Champs clés :**

| Champ | Logique |
|---|---|
| `type` | `client` / `modele` — discriminateur |
| `client_id` | Obligatoire pour `type='client'` (sauf si `prospect_id` renseigné) |
| `prospect_id` | Renseigné pour les contrats créés avant conversion en client |
| `prospect_email` | Email du prospect signataire (pour Youtrust) |
| `modele_url` | URL du PDF à faire signer (document non signé) |
| `contenu_dynamique` | Texte avec placeholders `{{CHAMP}}` pour les modèles dynamiques |
| `modele_source_id` | Traçabilité : ID du modèle dont est issu ce contrat client |
| `contrat_signe_url` | URL du PDF signé (rempli par Youtrust webhook) |
| `statut` | `En attente de signature` / `Signé` / `Archivé` — source de vérité métier |
| `yousign_signature_request_id` | ID Youtrust pour faire le lien avec les webhooks |
| `yousign_signature_url` | Lien de signature envoyé au client |
| `yousign_statut` | `draft` / `activated` / `done` / `expired` / `cancelled` — statut détaillé Youtrust |
| `date_envoi_signature` | Date d'activation de la demande Youtrust |
| `date_signature` | Date à laquelle le contrat a été signé |

### 5.2 Modèles de contrats — Modes de tarification

**Mode A (`mode_paiement: 'pourcentage'`)** :
- `taux_tva_modele` : TVA fixe du modèle (politique du prestataire)
- `pourcentage_acompte_modele` : % d'acompte/arrhes fixe
- `base_calcul_acompte_modele` : `HT` ou `TTC` (défaut `TTC`) — base de calcul de l'acompte
- `paliers_annulation` : paliers flexibles `[{delai_jours, pourcentage_retenu}]` triés du plus éloigné au plus proche

**Mode B (`mode_paiement: 'echeancier'`)** :
- `echeancier_modele` : liste d'échéances à montants fixes `[{libelle, montant, delai}]`
- Entièrement connus à la création — pas de placeholders nécessaires

### 5.3 Calculs financiers des contrats dynamiques

**Fichier** : `src/lib/contractModalHelpers.js` + `src/components/juridique/ContractModal.jsx`

Pour un modèle dynamique (`contenu_dynamique` avec placeholders) :

1. **Extraction** des placeholders : `extractPlaceholders(text)` → `['MONTANT_HT', 'TAUX_TVA', ...]`
2. **Auto-fill** : `autoFillValue(placeholder, context)` remplit automatiquement les champs depuis Client, Evenement, CompanySettings, Devis accepté, et les champs fixés par le modèle (`TAUX_TVA`, `POURCENTAGE_ACOMPTE`)
3. **Calculs dérivés** (Mode A uniquement, effectué dans un `useEffect` de ContractModal) :
   - `MONTANT_TVA = MONTANT_HT × TAUX_TVA / 100`
   - `MONTANT_TTC = MONTANT_HT + MONTANT_TVA`
   - Base d'acompte = `base_calcul_acompte_modele === 'HT' ? MONTANT_HT : MONTANT_TTC`
   - `MONTANT_ACOMPTE = base × POURCENTAGE_ACOMPTE / 100`
   - `MONTANT_SOLDE = MONTANT_TTC - MONTANT_ACOMPTE`
4. **Substitution** : `substituteVariables(text, values)` remplace `{{CHAMP}}` par les valeurs
5. **Génération PDF** : `generateContratPDF({bodyText, company, titreModele})` → upload via `UploadFile`

**Règle de non-écrasement** : un champ modifié manuellement par l'utilisateur (non auto-fill) n'est jamais écrasé par l'auto-fill. Les champs calculés (`MONTANT_TVA`, `MONTANT_TTC`, `MONTANT_ACOMPTE`, `MONTANT_SOLDE`) sont toujours auto-remplis et marqués comme tels.

### 5.4 Workflow de signature électronique Youtrust

**Client partagé** : `base44/shared/yousignClient.ts`

**URL de base** : configurable via secrets
- `YOUSIGN_API_BASE_URL` (prioritaire — URL complète)
- `YOUSIGN_ENV === 'production'` → `https://api.yousign.com/v3`
- Fallback → sandbox `https://api-sandbox.yousign.com/v3`

**Création** (`base44/functions/createSignatureRequest/entry.ts`) :

Accepte `{ contrat_id }` (flux client) ou `{ pre_reservation_id }` (flux prospect) :

1. Vérifier auth + clé API (`YOUSIGN_API_KEY`)
2. Récupérer l'entité (Contrat ou PreReservation)
3. Télécharger le PDF (`modele_url` pour Contrat, `contrat_url` pour PreReservation)
4. Workflow Youtrust : `createSignatureRequest` → `uploadDocument` → `addSigner` → `activateSignatureRequest`
5. Stocker sur l'entité : `yousign_signature_request_id`, `yousign_signature_url`, `yousign_statut='activated'`, `statut='En attente de signature'`, `date_envoi_signature`

**Résolution du signataire** :
- Si `prospect_id` → email du prospect
- Si `client_id` → email du client (`email` ou `email2`)
- Pour PreReservation → `prospect_email` dénormalisé

**Webhook** (`base44/functions/handleYousignWebhook/entry.ts`) :

Sécurité : vérification HMAC SHA-256 du payload avec `YOUSIGN_WEBHOOK_SECRET`.

Événements gérés :
- `signature_request.done` → `statut='Signé'`, `date_signature=today`, `yousign_statut='done'`, téléchargement du PDF signé → `contrat_signe_url`
- `signature_request.activated` → `yousign_statut='activated'`
- `signature_request.expired` → `yousign_statut='expired'` (Contrat) / `statut='Expiré'` (PreReservation)
- `signature_request.cancelled` → `yousign_statut='cancelled'` (Contrat) / `statut='Annulé'` (PreReservation)

**URL du webhook** : `{APP_BASE_URL}/api/functions/handleYousignWebhook`

### 5.5 Génération PDF

**Fichier** : `src/components/juridique/generateContratPDF.js`

Utilise `jspdf`. Le PDF est généré à partir du texte substitué + en-tête entreprise (logo, nom, adresse) + pied de page (mentions légales).

---

## 6. Module Facturation (Devis/Factures/Échéances)

### 6.1 Entité : `Devis`

**Champs clés :**

| Champ | Logique |
|---|---|
| `type_document` | `Devis` / `Contrat` / `Facture d'acompte` / `Facture intermédiaire` / `Facture` / `Avoir` / `Solde` |
| `est_pro_forma` | `true` uniquement pour les factures en cours de préparation (non verrouillées) |
| `numero_provisoire` | Préfixe `PF-` — affiché tant que `est_pro_forma=true` |
| `numero` | Numéro DÉFINITIF attribué à la finalisation (passage `est_pro_forma=false`) |
| `statut` | `Brouillon` → `Envoyé` → `Accepté` / `Refusé` / `Annulée` |
| `lignes` | Array d'articles `{description, unite, quantite, prix_unitaire_ht, tva_taux, remise, remise_type, total_ht}` |
| `remise_globale` / `remise_globale_type` | Remise globale sur le total HT (`pct` ou `fixe`) |
| `total_ht` / `total_tva` / `total_ttc` | Totaux calculés |
| `pdf_url` | URL du PDF généré lors de l'envoi |
| `facture_origine_id` | Pour les avoirs — traçabilité du document d'origine |
| `prospect_id` | Rattachement prospect (si créé depuis prospect) |
| `contrat_id` | ID du Contrat signé associé |
| `prestataire_id` | Rattachement prestataire |

### 6.2 Workflow pro forma → définitif

1. **Création** : `est_pro_forma=true` pour les factures, `numero_provisoire` attribué (préfixe `PF-`). Le document est entièrement modifiable.
2. **Finalisation** : `est_pro_forma=false` → attribution du `numero` définitif dans la séquence légale par type + verrouillage (non modifiable).
3. **Envoi** : génération du PDF + envoi email au client (template par type de document)

### 6.3 Calculs financiers

**Fichier** : `src/components/facturation/DevisModal.jsx` + `src/lib/prixUtils.js`

Pour chaque ligne :
- `total_ht_ligne = quantite × prix_unitaire_ht × (1 - remise/100)` (si `remise_type='pct'`)
- `total_ht_ligne = quantite × prix_unitaire_ht - remise` (si `remise_type='fixe'`)

Totaux :
- `total_ht = somme(total_ht_lignes) × (1 - remise_globale/100)` (si `remise_globale_type='pct'`)
- `total_tva = somme(total_ht_ligne × tva_taux/100)`
- `total_ttc = total_ht + total_tva`

**Prix par année** (`getPrixPourAnnee`) : si un `CatalogueItem` a `prix_par_annee`, le prix est résolu par année d'événement. Sinon fallback sur `item.prix`.

### 6.4 TVA

**CompanySettings** :
- `assujetti_tva` : si `false` → franchise en base (auto-entrepreneur art. 293 B CGI). Masque tous les champs TVA + affiche la mention légale obligatoire.
- `tva_mode` : `HT` ou `TTC` — mode de saisie des prix
- `tva_taux_defaut` : 0, 5.5, 10 (défaut restauration), 20

### 6.5 Statut global agrégé

**Fichier** : `src/lib/statutGlobalDevis.js` (`calcStatutGlobal`)

Agrège TOUS les documents Devis d'un événement + leurs échéances :
- `total_recu >= total_ttc` → `Soldé ✅`
- Au moins une échéance reçue → `Acompte reçu` / `Paiement partiel`
- Au moins un devis `Envoyé`/`Accepté` → `Devis envoyé`
- Sinon → statut brut du document le plus récent

### 6.6 Échéances

**Entité** : `Echeance`

Liée à un `Devis`. Statuts : `En attente` / `Reçu` / `Annulé`.
- `montant_calcule` : montant effectivement reçu
- Le statut global agrégé utilise les échéances `Reçu` pour calculer le total reçu

### 6.7 Acceptation automatique

**CompanySettings** : `accepter_devis_auto_validation_prospect`
- Si `true` : le statut du devis passe automatiquement à `Accepté` quand le prospect valide son projet depuis son espace
- Si `false` (défaut) : l'acceptation reste manuelle côté admin

### 6.8 Email templates

**CompanySettings** : `email_templates` — objet par type de document (`Devis`, `Facture`, `Avoir`, `Solde`, etc.)
- Variables : `{numero}`, `{client_nom}`, `{lien_portail}`
- Le bouton "Accéder à mon espace" pointe vers le portail client

---

## 7. Module Plan de Table & Espaces

### 7.1 Entités

| Entité | Rôle |
|---|---|
| `EspaceLieu` | Modèle d'espace dessiné par le prestataire (lieu). Contient les zones, formats de tables, capacités. |
| `PropositionConfig` | Proposition de configuration générée (mode assis). Positions précalculées. |
| `TableEvenement` | Table individuelle d'un événement (créée par le client). Position + forme + capacité. |
| `LieuEvenement` | Lieu associé à un événement (avec validation admin). |

### 7.2 Contrôle d'accès

**Fichier** : `src/lib/planSalleAccess.js` (`peutVoirPlanSalle`)

Le Plan de salle n'est visible que pour les métiers dont le groupe est :
- `Lieux et réception`
- `Restauration et traiteur`

Résolu via `getMetierConfig(metier)` → `cfg.groupe`. Fallback sur `Prestataire.domaine` si pas de `CompanySettings.metier`.

### 7.3 EspaceLieu — Structure

**Zones** : array d'objets `{id, type, points, nom, couleur, categorie}`
- `categorie: 'table'` = périmètre où les tables peuvent être placées
- `categorie: 'exclusion'` = zone sans table (Bar, WC, Piste de danse) — masque pour le placement automatique
- Coordonnées en % (0-100)

**Formats de tables** : `[{forme, capacite_max, capacite_min, dimension}]`
- Au moins un format requis pour activer la génération de propositions

**Table d'honneur** (optionnelle) : `{active, forme, capacite, dimension}`

**Capacités** :
- `capacite_max_debout` : jauge cocktail
- `capacite_max_chaises` : jauge réunion

**Bornes de génération** : `nb_tables_min` (défaut 1), `nb_tables_max` (null = max géométrique)

### 7.4 Algorithme de placement automatique

**Fichier** : `base44/shared/autoPlacement.ts`

Deux algorithmes :

**`computeAutoPlacement`** (grille régulière filtrée) :
- Scanne la zone table par grille régulière (step = tableRadius × 2 + margin)
- Valide chaque position : disque entier dans la zone table + hors exclusion + marge + pas trop proche des tables existantes
- Échantillonnage uniforme (`sampleEvenly`) pour répartir spatialement

**`generateGridLayout`** (grille alignée — algorithme principal) :
- Calcule cols/rows pour une grille aussi "carrée" que possible selon le ratio W/H
- Espacement centré : colonne i → `minX + (i+1)×W/(cols+1)`
- Remplissage row-major ; dernière rangée incomplète centrée horizontalement
- Chaque position est validée ; si invalide (exclusion), recherche locale en spirale
- Appariement symétrique des colonnes bloquées (miroir par rapport au centre)
- Fallback : `computeAutoPlacement` comme filet de sécurité

**`resolveHonneurPosition`** : positionne la table d'honneur au barycentre de la zone table, validée par spirale.

### 7.5 Génération des propositions

**Fonction** : `genererPropositionsEspace` (`base44/functions/genererPropositionsEspace/entry.ts`)

Pour un EspaceLieu donné :
1. Pour chaque format de table (ronde et/ou rectangulaire)
2. Pour chaque nombre de tables de `nb_tables_min` à `nb_tables_max` (borné par le max géométrique)
3. Avec et sans table d'honneur (si active)
4. Calcul de `capacite_totale = nb_tables × capacite_max (+ capacité table d'honneur si incluse)`
5. Génération des positions via `generateGridLayout`
6. Création de `PropositionConfig` (statut `proposee`)
7. Réconciliation : les `validee` dont la signature `mode|forme|nb_tables|avec_table_honneur` est identique conservent leur statut ; les obsolètes sont supprimées

**Cycle de vie PropositionConfig** :
- `proposee` → générée, en attente de curation prestataire
- `validee` → visible côté client
- `rejetee` → masquée (conservée)

### 7.6 Répartition circulaire des invités

**Fichier** : `src/lib/tableSeating.js`

Ordre des invités = chronologique d'assignation (`Invite.date_assignation_table` croissant). Repli stable pour les invités sans date (ordre naturel).

Placement autour du cercle :
- Départ en haut (−90°), sens horaire
- `seats = max(capacite, invCount, 1)`
- Angles : `(-90 + (360/seats) × i) × π/180`

Utilisé à l'écran (PlanSpatialView) ET à l'export PDF (exportPlanDeTablePDF) — ordre identique garanti.

### 7.7 Modes de configuration

L'Evenement a un `mode_configuration` :
- `assis` : placement de tables (via PropositionConfig validée ou mode personnalisé)
- `debout` : cocktail (capacité seule)
- `chaises` : réunion (capacité seule)
- `personnalise` : saisie libre

Le client saisit `nb_tables_prevu` qui filtre/grise les propositions assis dont `nb_tables` est insuffisant.

### 7.8 Extraction de contour par IA

**Fonction** : `extraireContourEspace` (`base44/functions/extraireContourEspace/entry.ts`)

Reçoit l'URL d'un fichier (image/PDF) et utilise `InvokeLLM` pour :
1. Détecter s'il s'agit d'un plan technique coté (`source_type: 'plan'`) ou d'une photo réelle (`source_type: 'photo'`)
2. Extraire le contour du périmètre exploitable en polygone (coordonnées % 0-100)
3. Renvoyer un niveau de confiance

Le résultat n'est jamais enregistré — il est renvoyé au client qui l'injecte comme brouillon éditable.

---

## 8. Module RSVP & Invités

### 8.1 Entité : `Invite`

**Champs clés :**

| Champ | Logique |
|---|---|
| `evenement_id` | Rattachement à l'événement (required) |
| `compte_id` | ID du compte utilisateur lié (rempli auto quand l'invité crée son compte via l'email correspondant) |
| `moments_ids` | IDs des moments auxquels l'invité est associé (multi-moments) |
| `mode_invitation` | `Confirmé` / `Nominatif` / `Libre` / `Groupe` |
| `groupe_lien_token` | Token commun pour le mode Groupe |
| `lien_token` | Token unique pour l'accès individuel au portail invité |
| `groupe_token` | Token interne liant les personnes ayant répondu via le même lien RSVP |
| `invite_referent_id` | ID de la personne qui a initié le RSVP du groupe |
| `statut_rsvp` | `En attente` / `Confirmé` / `Absent` / `Peut-être` |
| `table_attribuee` | ID de la TableEvenement à laquelle l'invité est assigné |
| `date_assignation_table` | Date/heure de la dernière assignation — **clé de tri** pour la répartition circulaire. N'est JAMAIS mise à jour par les autres éditions (RSVP, nom, etc.) |
| `allergenes` | Array d'allergènes |
| `regime_alimentaire` | Texte libre |
| `besoin_hebergement` | Booléen (si `Evenement.hebergement_disponible`) |
| `reponses_custom` | Objet clé/valeur pour les questions personnalisées |
| `categorie` | `Adulte` / `Mineur` |

### 8.2 Modes d'invitation

- **Confirmé** : l'invité est déjà confirmé (pas de RSVP nécessaire)
- **Nominatif** : invitation nominative, l'invité répond individuellement via son `lien_token`
- **Libre** : l'invité répond via un lien partagé
- **Groupe** : un référent répond pour tout le groupe via `groupe_lien_token`. Les personnes répondant via le même lien sont liées par `groupe_token`.

### 8.3 Multi-moments

Un événement peut avoir plusieurs moments (`MomentEvenement`). Un invité peut être associé à plusieurs moments (`moments_ids`). Le RSVP demande la disponibilité pour chaque moment.

### 8.4 Portail invité

- Accès via `/invite-portal?token=<lien_token>` ou `/espace-invite?token=...`
- L'invité voit : les détails de l'événement, le programme, le compte à rebours
- Il répond : statut RSVP, moments, allergènes, régime, hébergement, questions custom
- En mode groupe : le référent peut ajouter des personnes

### 8.5 Assignation des tables

- L'admin assigne les invités aux tables via le Plan de Table spatial
- `table_attribuee` = ID de la TableEvenement (matching par ID uniquement — pas par nom, pour éviter les ruptures au renommage)
- `date_assignation_table` est mise à jour uniquement quand `table_attribuee` change (pas sur les autres éditions)
- La répartition circulaire autour de la table suit l'ordre chronologique d'assignation

### 8.6 Programme public

- Route `/programme-public?token=...`
- Affiche le programme de la journée (`Evenement.programme_journee`) avec un thème visuel personnalisable
- Thèmes disponibles : Aurore, Boreal, Boheme, DolceVita, Elegance, Emeraude, Givre, Luna, Mineral, Nature, Nocturne, Perle, Riviera, Rosee, Sienna
- Chaque thème a un wrapper visuel + un monogramme

---

## 9. Module Checklist & Rappels

### 9.1 Checklist événement (intégrée)

**Champ** : `Evenement.checklist` — array d'objets `{id, label, checked}`

Checklist personnalisable directement sur l'événement. Différente du module TacheChecklist (voir ci-dessous).

### 9.2 Tâches de checklist (entité dédiée)

**Entité** : `TacheChecklist`

- `titre`, `description`, `complete` (boolean), `date_limite` (date)
- `evenement_id` (rattachement optionnel)
- Rattachement polymorphe : peut être liée à un événement, un client, un prospect

**Automation** : `checkChecklistDeadlines` (quotidienne)
- Tâches non complètes avec `date_limite` :
  - `diffDays < 0` → "Échéance dépassée"
  - `0 <= diffDays <= 3` → "Échéance proche"
- Déduplication par clé `checklist_late_<id>` ou `checklist_urgent_<id>_<days>`

### 9.3 Rappels

**Entité** : `Rappel`

**Champs clés :**
- `titre`, `description`, `date_rappel` (date), `heure_rappel` (HH:MM)
- `statut` : `En attente` / `Terminé` / `Annulé`
- `type_lie` : `evenement` / `client` / `prospect` / `aucun`
- `evenement_id`, `client_id`, `prospect_id` (selon `type_lie`)
- `notification_envoyee` : flag anti-doublon

**Automation** : `checkRappels` (toutes les 30 min)
- Filtre : `statut='En attente'` + `notification_envoyee !== true` + `date_rappel === today` + `heure_rappel <= currentHHMM`
- Notifie l'admin (notification in-app + email)
- Marque `notification_envoyee = true`
- Heure de référence : Europe/Paris (conversion timezone explicite)

### 9.4 Distinction Rappel vs Relance

- **Rappel** (`Rappel` entity) : tâche personnelle de l'admin ("appeler le client X"). Déclenchée par date/heure.
- **Relance** (logique prospect) : outreach vers un prospect inactif. Déclenchée par délai écoulé depuis le dernier devis. Intégrée au cycle de vie prospect, pas une entité séparée.

---

## 10. Module Bibliothèque (Catalogue/Formulaires/Programmes/Fiches)

### 10.1 Catalogue

**Entité** : `CatalogueItem`

**Sections** : `alimentaire`, `boissons`, `tarifs`, `inclusions`

**Champs clés :**
- `categorie` : Apéritif, Hors d'œuvre, Entrée, Plat, Fromage, Dessert, etc.
- `allergenes` : array d'allergènes
- `prix` (HT) / `prix_ttc` : prix par défaut
- `prix_par_annee` : `[{annee, prix}]` — prioritaire sur `prix`
- `formules_associees` / `toutes_formules` : association aux formules
- `a_choisir` : si `true`, le client peut choisir cet article dans le formulaire
- `type_calcul` : `fixe`, `deduction_montant`, `deduction_pourcentage`, `supplement_montant`, `supplement_pourcentage`
- `s_applique_a` : types d'événements concernés (vide = tous)

**Synchronisation** : les `BibliothequeQuestion` peuvent être générées depuis le catalogue (`source_catalogue`, `option_source_id`) et synchronisées automatiquement.

### 10.2 Formulaires de préparation

**Entité** : `ModeleFormulaire` (gabarit) + `FormulairePreparation` (instance par événement)

**Champs de questionnaire** : `{id, type, label, description, obligatoire, options, pre_rempli, conditions}`
- Types : `texte`, `nombre`, `cases_a_cocher`, `choix_unique`, `liste`, `date`, `upload`
- Conditions de visibilité : `{champ_declencheur_id, operateur, valeur, action}` — `afficher` ou `masquer`

**Type de formulaire** : `universel` (adaptatif) ou `par_formule` (distincte)

**Sélection du meilleur modèle** (`getBestModele`) :
1. Modèle avec ce type exact d'événement
2. Modèle "Tous types"
3. Premier disponible

**Automation** : `checkFormulairesSendAuto` (quotidienne)
1. Envoie automatiquement les formulaires quand la date d'envoi est atteinte (J-X)
2. Envoie un rappel J-2 avant la clôture si non soumis

### 10.3 Programmes

**Entités** : `ModeleProgramme` (gabarit) + `EtapeBibliotheque` (bibliothèque d'étapes réutilisables) + `EtapeProgramme` (étape d'un programme spécifique)

**Structure d'étape** : `{heure, nom, intitule, duree_heures, duree_minutes, categorie}`
- Catégories : Accueil, Cocktail, Repas, Animation, Logistique, Départ

**Evenement.programme_journee** : array d'étapes stockées directement sur l'événement (pas une entité séparée).

**Génération automatique** : `generateModeleProgramme` — génère un programme depuis les articles du catalogue d'une formule (regarde les catégories alimentaires présentes et crée les étapes correspondantes dans l'ordre : Apéritif → Cocktail → Entrée → Plat → Fromages → Trou normand → Dessert → Café).

### 10.4 Fiches de service

**Entités** : `ModeleFicheService` (gabarit) + `FicheService` (instance) + `FicheServiceExtra` (fiche par extra)

**Sections configurables** : `infos_evenement`, `programme`, `nb_couverts`, `menu`, `allergies`, `tenue`, `heure_prise_poste`, `plan_salle`, `coordonnees_urgence`, `responsable_soir`, `infos_logistiques`

**Génération** : `generateFichesService` — agrège les données événement + formulaire + prestataires + extras + catalogue (allergènes) pour produire la fiche.

**Automation** : `autoSendFichesJ1` (toutes les heures)
- Filtre : `FicheService.statut='Prete'` + `Evenement.date_type='exacte'` (skip mois/période)
- Calcul de la date d'envoi : `evenement_date - envoi_jours_avant` (défaut J-1)
- Envoi si `dateEnvoi === today` ET `currentTime >= envoi_heure` (défaut 09:00)
- Passe le statut à `Envoyee` + notification

### 10.5 Brochures

**Entité** : `BrochureCatalogue`

Brochures partageables depuis la bibliothèque vers les prospects.

### 10.6 Options/Prestations

**Entité** : `OptionPrestation`

Options supplémentaires proposées par le prestataire (non incluses dans la formule de base).

**Entité** : `OptionEffectif`

Options liées à l'effectif (ex: supplément par personne au-delà d'un seuil).

---

## 11. Module Vitrine & Abonnements

### 11.1 Ma Vitrine

**Page** : `/ma-vitrine`

Interface de configuration du profil public du prestataire (le "Passport"). Composée de sous-pages :
- **Identité visuel** : logo, cover, nom, métier
- **Offre & Prestation** : formules, tarifs, points forts, équipements
- **Contact & Avis** : contact, réseaux sociaux, plateformes d'avis, FAQ

### 11.2 CompanySettings — Profil public

**Champs affichés publiquement** (fiche de découverte / espace prospect) :
- `company_name`, `company_logo_url`, `company_cover_url`, `metier`
- `accroche`, `a_propos` (dépliable "Lire la suite")
- `tarif_a_partir_de`, `style_tags`, `points_forts_personnalises`
- `langues_parlees`, `zone_deplacement_*`, `delai_reponse`
- `capacite_min`, `capacite_max`, `equipements`
- `note_moyenne_externe`, `nb_avis_externe`, `source_avis`, `lien_avis_externe`
- `avis_mis_en_avant` (max 5)
- `faq` (accordéon)
- `verifie_alryck` (validation manuelle par l'équipe Alryck)
- `infos_pratiques_*` (adresse intervention, GPS, horaires, contact, notes)

### 11.3 Galerie vitrine

**Entité** : `GalerieVitrine`

Médias (photos/vidéos) affichés dans l'espace prospect. Peuvent être des fichiers uploadés ou des liens YouTube/Vimeo (`est_lien_externe`).

### 11.4 Abonnements

**CompanySettings.subscription_level** : `Gratuit` / `Essentiel` / `Pro` / `Business`

L'onboarding admin vérifie le niveau d'abonnement et redirige vers `/abonnements` si toujours sur `Gratuit`.

**Pricing des thèmes** : `src/config/themePricing.js` — thèmes de programme payants (achat via `AchatTheme` entity).

### 11.5 Modules actifs

**CompanySettings.modules_actifs** : objet booléen contrôlant la visibilité des modules :
- `formulaire`, `programme`, `plan_table`, `fiche_service`, `extras`
- `menu`, `prospects`, `facturation`, `equipe`, `promotions`
- `medias`, `prestataires`, `analyse`, `developpement`
- `securite`, `logistique`

---

## 12. Module Équipe & Extras

### 12.1 Collaborateurs

**Entité** : `Collaborateur`

Membres de l'équipe interne (CDI, CDD, etc.). Liés à un `RHSettings` pour la gestion RH.

### 12.2 Extras

**Entité** : `Extra`

Personnel externalisé (freelances, intérimaires). Ont un portail dédié (`/extra-portal`).

**Champs clés** : `email`, `telephone`, `poste_habituel`, `token` (portail), `is_demo`

### 12.3 Planning extras

**Entités** :
- `Service` : un service/jour donné (date, poste, evenement_id)
- `ServiceAssignment` : assignation d'un extra à un service. Statuts : `En attente` / `Confirmé` / `Indispo` / `Annulé`
- `ExtraDayStatus` : statut de disponibilité d'un extra pour un jour donné
- `Shift` : créneau horaire d'un extra sur un service

**Automation** : `handleDispoChange` (entity trigger sur ServiceAssignment)
- Changement de statut vers `Annulé`/`Indispo` → notification "❌ Prestataire annulé"
- Changement vers `Confirmé` → "✅ Prestataire confirmé"

**Notification extra** : `notifyExtraResponse` — appelée quand un extra répond depuis son portail. Cas urgence : si l'extra était `Confirmé` et se déclare `Indispo` → notification d'urgence.

**Planning emails** : `sendPlanningEmails` — envoie le planning du jour aux extras assignés.

**Cleanup** : `cleanupExtraAssignments` (entity trigger sur Extra delete) — supprime toutes les assignations, day statuses, conversations et messages liés à l'extra supprimé.

### 12.4 Disponibilités groupées

**Entité** : `DispoExtraGroupée`

Permet de demander la disponibilité d'un groupe d'extras pour une période donnée.

### 12.5 Conversations extras

**Entités** : `ConversationExtra` + `MessageExtra`

Messagerie entre admin et extras. Temps réel via subscriptions.

---

## 13. Module Prestataires & Lieux

### 13.1 Prestataire

**Entité** : `Prestataire`

Prestataires tiers (photographes, fleuristes, DJ, etc.) recommandés par l'entreprise propriétaire.

**Champs clés** : `nom`, `email`, `portal_email`, `domaine`, `metier`, `token` (portail prestataire `/prestataire-portal`)

### 13.2 EvenementPrestataire

**Entité** : `EvenementPrestataire`

Liaison entre un événement et un prestataire. **Champs clés :**
- `statut` : `Recommandé` / `En attente` / `Confirmé` / `Annulé`
- `initiateur` : `true` si ce prestataire est à l'origine de l'événement (pour la résolution multi-tenant de l'email admin)
- `proposition_date_id` : ID de la PropositionDateEvenement en cours (null si aucune)
- `reponse_date_proposee` : `dispo` / `indispo` / null (réponse à une proposition de date)

### 13.3 Workflow de recommandation

1. L'admin recommande un prestataire → `EvenementPrestataire` créé avec statut `Recommandé`
2. Le prestataire reçoit une notification + email avec lien portail
3. Le prestataire répond depuis son portail → `En attente` ou `Confirmé`
4. L'admin peut finaliser → `Confirmé` ou `Annulé`

### 13.4 Annulation d'événement par prestataire

**Fonction** : `demanderAnnulationEvenement`

Un prestataire Confirmé peut demander l'annulation :
1. Création d'une `DemandeAnnulationEvenement` (statut `en_attente`)
2. Garde anti-doublon : une seule demande `en_attente` par événement
3. Notification à l'admin (résolution email via `resolveAdminEmail`)
4. L'admin accepte (`annulerEvenement` avec `demande_id`) ou refuse (`refuserDemandeAnnulation`)

### 13.5 Annulation directe

**Fonction** : `annulerEvenement`

Autorisation : admin OU client rattaché via `client_token`.
- Passe `Evenement.statut='Annulé'` (pas de suppression)
- Passe TOUS les `EvenementPrestataire` `Confirmé` → `Annulé`
- Notifie tous les prestataires qui étaient Confirmés
- Si `demande_id` fourni → passe la `DemandeAnnulationEvenement` à `acceptee`

### 13.6 Lieux

**Entité** : `Lieu`

Lieux enregistrés par l'admin (salles, domaines, etc.).

**Entité** : `LieuEvenement` — lieu associé à un événement
- `statut_validation` : `valide` / `propose_client` / `refuse`
- `propose_par_client_id` : ID du client à l'origine de la proposition
- `motif_refus` : texte libre si refusé

**Workflow proposition de lieu par client** :
1. Le client propose un lieu depuis son portail → `proposerLieuClient` → `LieuEvenement` créée avec `statut_validation='propose_client'`
2. Notification admin
3. L'admin valide (`traiterPropositionLieu` action `valider`) ou refuse (action `refuser` avec `motif_refus`)

### 13.7 Conversations prestataires/lieux

**Entités** : `ConversationPrestataire` + `MessagePrestataire`, `ConversationLieu` + `MessageLieu`

Messagerie entre admin et prestataires/lieux.

### 13.8 Disponibilités prestataires

**Entité** : `DispoPrestataire`

Disponibilités déclarées par les prestataires (dates libres/occupées).

---

## 14. Module RendezVous

### 14.1 Entité : `RendezVous`

**Champs clés :**
- `statut` : `En attente` / `Confirmé` / `Annulé`
- `origine` : `Prestataire` / `Personnel` / `Client`
- `initie_par` : `Admin` / `Client`
- `date_souhaitee` / `heure_souhaitee` : demande initiale
- `date_confirmee` / `heure_confirmee` : date confirmée par l'admin
- `motif` / `titre` : description
- `rappel_1j` / `rappel_1h` : flags de rappel
- `rappel_1j_envoye` / `rappel_1h_envoye` : flags anti-doublon
- `client_id` : rattachement client

### 14.2 Workflow

1. Un RDV est demandé (par un client depuis son portail, ou par l'admin)
2. Statut `En attente`
3. L'admin confirme → `Confirmé` + `date_confirmee` / `heure_confirmee`
4. L'admin peut annuler → `Annulé`

### 14.3 Notifications

**Entity automation** : `handleRdvChange` (sur create/update)
- Création : pas de notification pour les RDV personnels ou créés par l'admin (auto-notification inutile)
- Update vers `Confirmé` → "✅ RDV confirmé"
- Update vers `Annulé` : pas de notification si le client annule sa propre demande (non actionnable)

### 14.4 Rappels automatiques

**Automation** : `checkRdvRappels` (toutes les 5 min)
- Rappel 1 jour avant : fenêtre 22h-26h avant le RDV (pour rattraper le polling 5 min)
- Rappel 1 heure avant : fenêtre 0.5h-1.5h avant
- Déduplication via `rappel_1j_envoye` / `rappel_1h_envoye`

### 14.5 Feed iCal

**Fonction** : `icsFeed` — endpoint public d'abonnement calendrier
- URL : `/functions/icsFeed?token=<lien_client_token>`
- Pas d'auth (les calendriers Google/Apple ne savent pas envoyer de headers)
- Le token identifie le client de façon stable
- Génère le flux .ics à la volée à chaque appel
- RDV confirmés/en attente → événement normal (`TENTATIVE` ou `CONFIRMED`)
- RDV annulés → `STATUS:CANCELLED` avec même UID → suppression propre côté calendrier
- Schéma UID : `rdv-<id>@monagenda`

---

## 15. Fonctions backend — Référence complète

### 15.1 Signature électronique

| Fonction | Fichier | Rôle |
|---|---|---|
| `createSignatureRequest` | `base44/functions/createSignatureRequest/entry.ts` | Crée et active une demande de signature Youtrust pour un Contrat ou une PreReservation. Workflow complet : create → upload → addSigner → activate. Stocke les infos Youtrust sur l'entité. |
| `handleYousignWebhook` | `base44/functions/handleYousignWebhook/entry.ts` | Endpoint webhook pour les événements Youtrust. Vérification HMAC. Gère `done` (téléchargement PDF signé), `activated`, `expired`, `cancelled`. |

### 15.2 Workflow de dates & annulation

| Fonction | Rôle |
|---|---|
| `creerPropositionDate` | Crée une PropositionDateEvenement `en_attente` quand une nouvelle date est proposée. Notifie les prestataires confirmés. Garde anti-doublon (409). L'initiateur prestataire est auto-dispo. |
| `finalizePropositionDate` | Applique la nouvelle date sur l'Evenement. Marque la proposition `finalisee`. Annule les prestataires `indispo`. Nettoie les champs de proposition sur les EvenementPrestataire. |
| `refuserPropositionDate` | Annule une proposition sans modifier la date. Marque `annulee`. Notifie les prestataires concernés. |
| `demanderAnnulationEvenement` | Un prestataire Confirmé demande l'annulation. Crée une DemandeAnnulationEvenement `en_attente`. Garde anti-doublon. |
| `annulerEvenement` | Annulation directe par admin ou client (via token). Passe Evenement.statut='Annulé'. Annule tous les EvenementPrestataire Confirmé. Notifie les prestataires. |
| `refuserDemandeAnnulation` | Refuse une demande d'annulation. Marque `refusee`. Notifie le prestataire demandeur. |

### 15.3 Automations planifiées (cron)

| Fonction | Fréquence | Rôle |
|---|---|---|
| `updateEventStatusAuto` | 5-10 min | Transitions auto de statut événement (En cours, Terminé). Auto-archive après 30 jours. Skip mode mois/période. |
| `checkProspectRelances` | Quotidienne | Passe les prospects `Devis envoyé` inactifs à `À relancer`. Email + notification. Déduplication via AutomationLog. |
| `checkRappels` | 30 min | Notifie l'admin des rappels arrivés à échéance (date + heure). Timezone Europe/Paris. |
| `checkRdvRappels` | 5 min | Rappels J-1 et H-1 pour les RDV confirmés. Déduplication via flags. |
| `checkChecklistDeadlines` | Quotidienne | Notifications pour tâches en retard ou urgentes (≤3 jours). |
| `checkFormulairesSendAuto` | Quotidienne | Envoi auto des formulaires à J-X. Rappel J-2 si non soumis. |
| `autoSendFichesJ1` | Toutes les heures | Envoi auto des fiches de service à J-X (défaut J-1 à 09:00). Skip mode mois/période. |
| `autoSendAvisJ1` | Quotidienne | Envoi auto de demande d'avis J+1 après l'événement. Uniquement si `CompanySettings.auto_review_enabled`. |
| `checkRecommandationPrestataires` | Quotidienne | Rappel de recommandation de prestataires. Auto-fermeture si au moins un Recommandé. |
| `archiveProspectsAnnules` | Quotidienne | Archive les prospects `Annulé` depuis > 30 jours. |

### 15.4 Entity triggers

| Fonction | Déclencheur | Rôle |
|---|---|---|
| `handleEvenementChange` | Evenement create/update | Notifications création/changement de statut événement. |
| `handleRdvChange` | RendezVous create/update | Notifications création/confirmation/annulation RDV. |
| `handleDispoChange` | ServiceAssignment update | Notifications confirmation/annulation prestataire. |
| `syncClientEvenement` | Client create/update | Synchronise/crée un Evenement quand un Client a une date_evenement. |
| `cleanupExtraAssignments` | Extra delete | Supprime assignations, day statuses, conversations liés à l'extra. |

### 15.5 Utilitaires

| Fonction | Rôle |
|---|---|
| `createNotification` | Crée une notification in-app. `user_email` vide = tous les admins. |
| `inviteUser` | Invite un utilisateur par email (admin only). Rôle `user` ou `admin`. |
| `sendProspectWelcomeEmail` | Envoie l'email de bienvenue à un prospect avec le lien de son espace. |
| `sendBulkMessageEmail` | Envoie un email groupé (admin only). |
| `sendPlanningEmails` | Envoie le planning du jour aux extras assignés. |
| `notifyExtraResponse` | Traite la réponse d'un extra depuis son portail. Cas urgence si Indispo après Confirmé. |
| `generateFichesService` | Génère les fiches de service pour un événement (agrège données). |
| `generateModeleProgramme` | Génère un programme depuis les articles du catalogue d'une formule. |
| `genererPropositionsEspace` | Génère les propositions de configuration pour un EspaceLieu. |
| `extraireContourEspace` | Extrait le contour d'un espace depuis un fichier (IA). |
| `proposerLieuClient` | Crée une proposition de lieu par un client (statut `propose_client`). |
| `traiterPropositionLieu` | Valide ou refuse une proposition de lieu (admin). |
| `icsFeed` | Endpoint public d'abonnement calendrier iCal. |
| `renameCategoryItems` | Renomme la catégorie d'items du catalogue (bulk). |
| `clearDemoData` | Supprime les données de démo (`is_demo=true`). |

---

## 16. Intégrations externes

### 16.1 Youtrust (ex-Yousign) — Signature électronique

**Client** : `base44/shared/yousignClient.ts`

**Secrets requis** :
- `YOUSIGN_API_KEY` — clé API
- `YOUSIGN_WEBHOOK_SECRET` — secret pour vérification HMAC du webhook
- `YOUSIGN_API_BASE_URL` (optionnel) — URL complète override
- `YOUSIGN_ENV` (optionnel) — `'production'` → `https://api.yousign.com/v3`

**API** : v3. Workflow : create → upload → addSigner → activate. Signature level : `electronic_signature`, mode `no_otp`.

**Webhook URL** : `{APP_BASE_URL}/api/functions/handleYousignWebhook`

**Entités liées** : `Contrat` (flux client), `PreReservation` (flux prospect)

### 16.2 Core integrations (built-in)

| Integration | Usage |
|---|---|
| `InvokeLLM` | Génération de texte (extraction contour espace, suggestions IA). Modèles disponibles : `automatic`, `gpt_5_mini`, `gemini_3_flash`, `claude_sonnet_4_6`, etc. `add_context_from_internet` uniquement avec `gemini_3_flash`/`gemini_3_1_pro`. |
| `UploadFile` | Upload de fichiers (PDF, images) vers le stockage. Retourne `{file_url}`. |
| `UploadPrivateFile` | Upload vers le stockage privé. Retourne `{file_uri}`. |
| `CreateFileSignedUrl` | Crée une URL signée temporaire pour un fichier privé. |
| `SendEmail` | Envoi email aux utilisateurs enregistrés uniquement. Les adresses externes sont rejetées. |
| `GenerateImage` | Génération d'images par IA. |
| `GenerateSpeech` | TTS (synthèse vocale). |
| `GenerateVideo` | Génération de vidéos par IA (Veo 3.x). |
| `TranscribeAudio` | Transcription audio (Whisper). |
| `ExtractDataFromUploadedFile` | Extraction de données structurées depuis un fichier (CSV, Excel, JSON, PDF). |

### 16.3 Stripe — Paiements

Packages installés : `@stripe/react-stripe-js`, `@stripe/stripe-js`. Utilisé pour les achats de thèmes de programme (`AchatTheme`).

---

## 17. Automations planifiées

### 17.1 Scheduler global

Les automations planifiées sont configurées via le système d'automations Base44 (`create_automation` avec `automation_type="scheduled"`). Elles appellent les fonctions backend listées en section 15.3.

### 17.2 Entity automations

Déclenchées sur create/update/delete d'entités. Configuration via `create_automation` avec `automation_type="entity"`.

### 17.3 Règles d'automatisation

**Entité** : `AutomationRegle`

Règles configurables par l'admin, organisées par bloc :
- `prospect` : délai de relance global (`prospect_statut_j`, défaut 7)
- `formulaire` : délai d'envoi, fenêtre de réponse
- `programme` : délais d'envoi
- `fiche_service` : délais d'envoi
- `avis` : activation/délai demande d'avis
- `facturation` : règles de facturation auto

**Entité** : `AutomationLog` — journal d'exécution des automations (type_action, statut, destinataire, details).

---

## 18. Règles transverses & pièges de migration

### 18.1 Dates — Pièges critiques

1. **`Evenement.date` est TOUJOURS renseignée** (champ required). En mode `mois` = 1er du mois. En mode `periode` = date technique conservée. **Ne jamais afficher la date brute en mode mois/période** — utiliser `formatEvenementDate()`.

2. **Les automations temporelles** (`updateEventStatusAuto`, `autoSendFichesJ1`) **doivent skip les événements en mode mois/période** car `date` n'est pas une vraie date d'événement.

3. **Timezone** : `checkRappels` utilise Europe/Paris avec conversion explicite. Les autres fonctions utilisent UTC (`new Date().toISOString()`).

4. **Confirmation** : la confirmation d'une date = `date_type === 'exacte'`. Pas de champ `date_confirmée` séparé.

### 18.2 Tokens & accès portails

- **Client** : `lien_client_token` sur `Client` (tous événements confondus) et sur `Evenement` (par événement)
- **Prospect** : `lien_token` sur `Prospect`
- **Invité** : `lien_token` (individuel) et `groupe_lien_token` (groupe) sur `Invite`
- **Extra** : token sur `Extra` (portail extra)
- **Prestataire** : token sur `Prestataire` (portail prestataire)

**Les tokens sont permanents** — ne jamais régénérer automatiquement (causerait des ruptures de liens partagés).

### 18.3 Dénormalisation

De nombreux champs sont dénormalisés et doivent être synchronisés manuellement :
- `Evenement.client_nom`, `client_email`, `client_telephone` → depuis `Client`
- `Evenement.lieu_nom` → depuis `Lieu` ou `LieuEvenement`
- `Evenement.formule_nom` → depuis `CatalogueItem` ou formule
- `Devis.client_nom`, `client_email` → depuis `Client` ou `Prospect`
- `Contrat.client_nom` → depuis `Client` ou `Prospect`
- `Invite.evenement_nom`, `moments_noms` → depuis `Evenement` et `MomentEvenement`
- `EvenementPrestataire.prestataire_nom` → depuis `Prestataire`

### 18.4 Multi-tenant anticipé

`prestataire_id` est posé sur la plupart des entités pour un futur rattachement multi-tenant. Actuellement mono-tenant — `CompanySettings.is_owner === true` identifie l'entreprise propriétaire.

La résolution de l'email admin (`resolveAdminEmail` dans `propositionWorkflow.ts`) anticipe le multi-tenant :
1. Identifier le prestataire initiateur (`EvenementPrestataire.initiateur === true`)
2. Remonter à sa `CompanySettings` (`prestataire_id` correspondant)
3. Fallback : `CompanySettings.is_owner === true` pour les événements legacy

### 18.5 Soft delete

La plupart des entités utilisent `archived: boolean` plutôt qu'une suppression physique. Les listes filtrent `archived !== true` par défaut.

### 18.6 Sécurité des webhooks

Le webhook Youtrust vérifie la signature HMAC SHA-256 du payload avec `YOUSIGN_WEBHOOK_SECRET`. **Ne pas désactiver cette vérification** lors de la migration.

### 18.7 Email — Limitation critique

`SendEmail` ne peut envoyer qu'aux **utilisateurs enregistrés sur l'app**. Les adresses externes sont rejetées. Pour les prospects/clients non enregistrés, les emails sont envoyés via des fonctions backend qui contournent cette limitation en utilisant `asServiceRole` (qui a des privilèges étendus). **Vérifier ce comportement lors de la migration** — Supabase n'a pas cette restriction par défaut.

### 18.8 Realtime

Les entités supportent les subscriptions temps réel via `base44.entities.<Name>.subscribe(callback)`. L'événement reçu : `{id, type: 'create'|'update'|'delete', data}`. Utilisé pour la messagerie, les notifications, et la mise à jour des listes.

### 18.9 RLS (Row-Level Security)

Par défaut, les entités sont accessibles à tous les utilisateurs authentifiés. Le RLS n'est configuré que sur demande explicite de l'utilisateur. **Lors de la migration vers Supabase, il faudra implémenter le RLS manuellement** (policies Supabase) pour reproduire le comportement attendu.

### 18.10 Champs `prestataire_id` non exploités

Sur de nombreuses entités, `prestataire_id` est "posé à l'avance pour éviter une migration de schéma ultérieure" mais aucune logique ne l'exploite actuellement. **Ne pas supprimer ces champs** lors de la migration — ils seront nécessaires pour le multi-tenant.

### 18.11 Ordre des opérations critiques

- **Conversion prospect** : la séquence (création Client → Evenement → update Devis/Documents/Contrats → marquage converti) doit être respectée pour ne pas laisser de données orphelines.
- **Finalisation de proposition de date** : appliquer la nouvelle date sur l'Evenement AVANT de marquer la proposition `finalisee` (sinon inconsistency temporaire).
- **Signature Youtrust** : vérifier `modele_url` (ou `contrat_url`) existe ET `contrat_signe_url` n'existe pas avant d'initier une demande.
- **Assignation de table** : `date_assignation_table` ne doit être mise à jour QUE quand `table_attribuee` change — jamais sur les autres éditions de l'invité.

### 18.12 Entités à ne pas supprimer physiquement

Les entités suivantes sont soft-deleted (`archived: true`) et conservées pour l'historique :
- `Evenement` (archived)
- `Client` (archived)
- `Prospect` (archived)
- `Devis` (archived)
- `Invite` (archived)

Les `EvenementPrestataire` ne sont jamais supprimés — ils passent à `Annulé`.

### 18.13 Génération PDF

Les PDFs sont générés côté frontend avec `jspdf` (contrats, plans de table, exports invités) et côté backend via `InvokeLLM` (extraction). Les PDFs générés sont uploadés via `UploadFile` et stockés comme URLs publiques.

### 18.14 Filtres React Query

Les listes utilisent React Query avec des query keys structurées :
- `['prospects']`, `['evenements']`, `['clients']`, etc.
- Les badges/counters utilisent des queries séparées avec filtres (`{statut: 'En attente'}`)
- **Lors de la migration**, reproduire ce pattern de cache (React Query ou équivalent) pour éviter les refetchs excessifs.

---

*Document généré le 2026-08-11. Dernière mise à jour de l'app : refactoring ContractModal, extraction ProspectCard, yousignClient configurable.*