import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getPrixPourAnnee } from '@/lib/prixUtils';
import DevisModal from '@/components/facturation/DevisModal';

/**
 * Normalise une chaîne pour matching insensible à la casse, espaces et accents
 */
function normalize(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Enrichit les lignes avec les prix réels depuis CatalogueItem et OptionPrestation
 * Charge toutes les données UNE SEULE FOIS et utilise matching flexible
 */
export async function enrichirLignesAvecPrix(lignes, annee = null) {
  if (!lignes?.length) return lignes;
  
  const anneeActuelle = annee || new Date().getFullYear();
  
  try {
    // 1. Charger TOUTES les formules et options UNE SEULE FOIS
    const [allFormules, allOptions] = await Promise.all([
      base44.entities.CatalogueItem.filter({ 
        section: 'tarifs',
      }),
      base44.entities.OptionPrestation.filter({ 
        actif: true 
      })
    ]);

    console.log('🔍 enrichirLignesAvecPrix: Données chargées');
    console.log(`  - ${allFormules.length} formules trouvées`);
    console.log(`    Noms: ${allFormules.map(f => f.nom).join(', ')}`);
    console.log(`  - ${allOptions.length} options trouvées`);
    console.log(`    Noms: ${allOptions.map(o => o.nom).join(', ')}`);

    // 2. Enrichir chaque ligne avec matching flexible
    const enrichies = lignes.map(ligne => {
      const descNormalized = normalize(ligne.description);
      console.log(`  📋 Ligne: "${ligne.description}" → normalisée: "${descNormalized}"`);
      
      // Chercher dans formules puis dans options (priorité)
      const matchFormule = allFormules.find(f => normalize(f.nom) === descNormalized);
      const matchOption = allOptions.find(o => normalize(o.nom) === descNormalized);
      const item = matchFormule || matchOption;

      if (!item) {
        console.log(`     ❌ Aucun match trouvé → prix_unitaire_ht = 0`);
        return { ...ligne, prix_unitaire_ht: 0 };
      }

      console.log(`     ✅ Match trouvé: "${item.nom}" (${matchFormule ? 'formule' : 'option'})`);
      
      // Extraire le prix et convertir en HT si nécessaire
      const prixAnnee = getPrixPourAnnee(item, anneeActuelle);
      let prixHT = 0;
      
      if (prixAnnee) {
        // Prix trouvé pour l'année
        if (item.prix_ttc) {
          // Convertir TTC → HT
          const taux = ligne.tva_taux ?? 10;
          prixHT = Math.round(prixAnnee / (1 + taux / 100) * 100) / 100;
          console.log(`     💰 Prix ${anneeActuelle}: ${prixAnnee}€ TTC → ${prixHT}€ HT (tva ${taux}%)`);
        } else {
          // Déjà en HT
          prixHT = prixAnnee;
          console.log(`     💰 Prix ${anneeActuelle}: ${prixHT}€ HT`);
        }
      } else if (item.prix_ttc) {
        // Utiliser prix_ttc par défaut
        const taux = ligne.tva_taux ?? 10;
        prixHT = Math.round(item.prix_ttc / (1 + taux / 100) * 100) / 100;
        console.log(`     💰 Prix défaut: ${item.prix_ttc}€ TTC → ${prixHT}€ HT (tva ${taux}%)`);
      } else if (item.prix) {
        // Utiliser prix (supposé HT)
        prixHT = item.prix;
        console.log(`     💰 Prix défaut: ${prixHT}€ HT`);
      }
      
      return { ...ligne, prix_unitaire_ht: prixHT };
    });

    console.log('✨ enrichirLignesAvecPrix terminé:', enrichies);
    return enrichies;
  } catch (error) {
    // En cas d'erreur, retourner les lignes inchangées
    console.error('❌ Erreur dans enrichirLignesAvecPrix:', error);
    return lignes;
  }
}

/**
 * Parse les données d'une demande de devis depuis une notification.
 * Supporte deux formats :
 *  1. notif.message commence par "DEMANDE_DEVIS:{json}" (nouveau format)
 *  2. notif.lien contient ?meta=... (ancien format)
 */
export function parseDevisMeta(notification) {
  const msg = notification.message || '';
  const titre = notification.titre || '';

  // Format JSON : "DEMANDE_DEVIS:{...}"
  if (msg.startsWith('DEMANDE_DEVIS:')) {
    try {
      const json = JSON.parse(msg.slice('DEMANDE_DEVIS:'.length));
      const { prospect_id, client_nom, client_email, nb_adultes, nb_adolescents, nb_enfants, nb_prestataires, formule_nom } = json;
      const options = json.options || (json.options_noms ? json.options_noms.split(',').map(o => o.trim()) : []);
      const nb_personnes = nb_adultes || null;
      const lignes = [];
      if (formule_nom) lignes.push({ description: formule_nom, quantite: nb_personnes || 1, prix_unitaire: 0, tva: 10 });
      if (nb_adolescents > 0) lignes.push({ description: 'Adolescents', quantite: nb_adolescents, prix_unitaire: 0, tva: 10 });
      if (nb_enfants > 0) lignes.push({ description: 'Enfants', quantite: nb_enfants, prix_unitaire: 0, tva: 10 });
      if (nb_prestataires > 0) lignes.push({ description: 'Prestataires', quantite: nb_prestataires, prix_unitaire: 0, tva: 10 });
      options.filter(Boolean).forEach(opt => lignes.push({ description: opt, quantite: 1, prix_unitaire: 0, tva: 10 }));
      return { client_nom: client_nom || '', nb_personnes, formule_nom: formule_nom || '', options_noms: options, client_email: client_email || '', client_telephone: '', prospect_id: prospect_id || null, objet: '', lignes_initiales: lignes };
    } catch {
      // fallback vers parsing texte ci-dessous
    }
  }

  // Format texte (ancien format)
  const nomMatch = titre.match(/—\s*(.+)$/);
  const client_nom = nomMatch ? nomMatch[1].trim() : '';

  const prospectIdMatch = msg.match(/prospect_id:([^\n]+)/);
  const prospect_id = prospectIdMatch ? prospectIdMatch[1].trim() : null;

  const emailMatch = msg.match(/prospect_email:([^\n]+)/);
  const client_email = emailMatch ? emailMatch[1].trim() : '';

  const nbMatch = msg.match(/(\d+)\s*adultes?/i);
  const nb_personnes = nbMatch ? parseInt(nbMatch[1]) : null;

  const formuleMatch = msg.match(/Formule\s*:\s*(.+)/i);
  const formule_nom = formuleMatch ? formuleMatch[1].trim() : '';

  const optionsMatch = msg.match(/Options\s*:\s*(.+)/i);
  const options_noms = optionsMatch
    ? optionsMatch[1].split(',').map(o => o.trim())
    : [];

  if (!client_nom && !nb_personnes) return null;

  const lignes = [];
  if (formule_nom) lignes.push({ description: formule_nom, quantite: nb_personnes || 1, prix_unitaire: 0, tva: 10 });
  options_noms.filter(Boolean).forEach(opt => lignes.push({ description: opt, quantite: 1, prix_unitaire: 0, tva: 10 }));

  return { client_nom, nb_personnes, formule_nom, options_noms, client_email, client_telephone: '', prospect_id, objet: '', lignes_initiales: lignes };
}

export default function DevisDemandeButton({ notification, onMarqueLue, compact = false }) {
  const [open, setOpen] = useState(false);
  const meta = parseDevisMeta(notification);

  // Charger le prospect pour construire l'objet
  const { data: prospect } = useQuery({
    queryKey: ['prospect-devis', meta?.prospect_id],
    queryFn: () => base44.entities.Prospect.filter({ id: meta.prospect_id }).then(r => r[0] || null),
    enabled: !!meta?.prospect_id,
  });

  // Vérifier si un devis Envoyé ou Accepté existe déjà pour ce prospect
  const { data: devisExistant } = useQuery({
    queryKey: ['devis-existant', meta?.prospect_id],
    queryFn: () => base44.entities.Devis.filter({ prospect_id: meta.prospect_id }).then(r =>
      r.find(d => d.statut === 'Envoyé' || d.statut === 'Accepté') || null
    ),
    enabled: !!meta?.prospect_id,
  });

  // Construire objet depuis les données du prospect
  const objetDevis = prospect ? [
    prospect.type_evenement || '',
    prospect.prenom + ' ' + prospect.nom +
    (prospect.prenom2 
      ? ' & ' + prospect.prenom2 + 
        ' ' + (prospect.nom2 || prospect.nom) 
      : '')
  ].filter(Boolean).join(' ').trim() : '';

  if (!meta) return null;

  return (
    <>
      <div className={`flex items-center gap-2 ${compact ? 'mt-1' : 'mt-2'} flex-wrap`}>
        {devisExistant ? (
          <>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">
              ✅ Devis envoyé
            </span>
            <button
              onClick={() => { setOpen(true); onMarqueLue?.(); }}
              className={`flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'}`}
              title="Voir le devis"
            >
              <FileText size={compact ? 10 : 12} />
              👁 Voir le devis
            </button>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold border border-amber-200">
              ⏳ Devis en attente
            </span>
            <button
              onClick={() => { setOpen(true); onMarqueLue?.(); }}
              className={`flex items-center gap-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'}`}
              title="Créer le devis"
            >
              <FileText size={compact ? 10 : 12} />
              📋 Créer le devis
            </button>
          </>
        )}
      </div>
      {open && (
        <DevisModal
          devisId={devisExistant?.id || null}
          prospectId={!devisExistant ? meta.prospect_id : undefined}
          clientNom={!devisExistant ? meta.client_nom : undefined}
          clientEmail={!devisExistant ? meta.client_email : undefined}
          clientTelephone={!devisExistant ? meta.client_telephone : undefined}
          lignesInitiales={!devisExistant ? (meta.lignes_initiales || []) : undefined}
          objet={!devisExistant ? objetDevis : undefined}
          onClose={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      )}
    </>
  );
}