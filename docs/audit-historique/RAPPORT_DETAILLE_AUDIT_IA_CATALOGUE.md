# 📋 RAPPORT DÉTAILLÉ AUDIT IA CATALOGUE — Code Exact

**Date:** 2026-04-08  
**Scope:** Analyse complète du flux d'import Amanda → Création d'articles  
**Résolution:** Code exact pour chacun des 6 points

---

## 🔴 POINT 1 — Nom exact du composant qui gère l'import Amanda

### Fichier
```
components/bibliotheque/ImportAmandaModal.jsx
```

### Déclaration (Ligne 12)
```javascript
export default function ImportAmandaModal({ onClose, onCreated }) {
  const fileRef = useRef();
  const { toast } = useToast();
  
  const [step, setStep] = useState('upload'); // 'upload' | 'analyzing' | 'validation'
  const [files, setFiles] = useState([]); // tableau de fichiers
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
```

### Appel depuis le parent (BlocCatalogue.jsx, ligne 635)
```javascript
{amandaModal && (
  <ImportAmandaModal
    onClose={() => setAmandaModal(false)}
    onCreated={() => qc.invalidateQueries(['catalogue-items'])}
  />
)}
```

---

## 🔴 POINT 2 — Ligne exacte de l'input file avec attribut "multiple"

### Fichier et ligne exacte
```
components/bibliotheque/ImportAmandaModal.jsx — LIGNE 162
```

### Code exact (Ligne 161-162)
```jsx
<label className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl py-10 px-4 cursor-pointer transition-colors ${files.length > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
```

### ✅ PRÉSENCE DE L'ATTRIBUT "multiple"
- **Ligne 162:** `multiple` est présent et ACTIF
- **Accept:** `.pdf,.jpg,.jpeg,.png,.webp`
- **Handler:** `onChange={e => handleFiles(e.target.files)}`

### Fonction handleFiles (Lignes 22-27)
```javascript
const handleFiles = (fileList) => {
  if (!fileList || fileList.length === 0) return;
  const newFiles = Array.from(fileList);
  setFiles(prev => [...prev, ...newFiles]);  // ✅ Accumule tous les fichiers
  setError(null);
};
```

---

## 🔴 POINT 3 — Prompt exact envoyé à l'IA

### Fichier et lignes
```
components/bibliotheque/ImportAmandaModal.jsx — LIGNES 62-95
```

### Code exact du prompt

```javascript
const prompt = `Analyser cette brochure de traiteur ou lieu de réception (pouvant s'étendre sur plusieurs pages/images). 
Extraire toutes les formules/menus avec leurs articles en analysant l'intégralité des pages fournies.

Pour chaque article, identifier dans quelle(s) formule(s) il apparaît.

Retourner UNIQUEMENT un JSON valide (pas de texte avant/après) avec cette structure exacte :
{
  "formules": [
    {
      "nom": "Nom de la formule",
      "prix": 65,
      "minimum_personnes": null
    }
  ],
  "articles": [
    {
      "nom": "Nom de l'article",
      "categorie": "Apéritif|Entrée|Plat|Dessert|Boissons|Inclusions|Autre",
      "formules_associees": ["Formule1"] ou [] si dans toutes,
      "quantite_par_personne": 2.5 ou null,
      "unite": "pièces|cl|g|etc" ou null,
      "allergenes": ["gluten", "lait"] ou [],
      "a_choisir": false
    }
  ]
}

Règles importantes :
- formules_associees vide [] = article dans TOUTES les formules
- Détecter automatiquement les articles partagés entre plusieurs formules
- Pour les formules : extraire "Prestige 65€/pers" → {nom: "Prestige", prix: 65}
- Catégories alimentaires : Apéritif, Entrée, Plat, Dessert, Autre
- Si aucune catégorie détectable → "Autre"
- Analyser TOUTES les pages fournies comme un seul document`;
```

### Points clés du prompt
1. **Ligne 62-65:** Instructions sur multi-pages et extraction de formules
2. **Ligne 65:** Instruction de détection des formules par article
3. **Ligne 67-87:** Schéma JSON exact attendu en retour
4. **Ligne 89-95:** Règles d'interprétation (partagé, allergènes, catégories)

---

## 🔴 POINT 4 — Structure exacte du JSON attendu en retour

### Fichier et lignes
```
components/bibliotheque/ImportAmandaModal.jsx — LIGNES 100-131
```

### Schéma JSON passé à l'IA
```javascript
const result = await base44.integrations.Core.InvokeLLM({
  prompt,
  file_urls: fileUrls, // Passe toutes les images/PDFs
  response_json_schema: {
    type: 'object',
    properties: {
      formules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nom: { type: 'string' },
            prix: { type: 'number' },
            minimum_personnes: { type: 'number' },
          },
        },
      },
      articles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nom: { type: 'string' },
            categorie: { type: 'string' },
            formules_associees: { type: 'array', items: { type: 'string' } },
            quantite_par_personne: { type: 'number' },
            unite: { type: 'string' },
            allergenes: { type: 'array', items: { type: 'string' } },
            a_choisir: { type: 'boolean' },
          },
        },
      },
    },
  },
});
```

### Propriétés détaillées

#### Objet racine
```json
{
  "formules": [ ... ],
  "articles": [ ... ]
}
```

#### Array `formules`
Chaque formule contient:
```json
{
  "nom": string,
  "prix": number,
  "minimum_personnes": number (nullable)
}
```

#### Array `articles`
Chaque article contient:
```json
{
  "nom": string,
  "categorie": string,
  "formules_associees": [ string, ... ],  // Array of strings
  "quantite_par_personne": number (nullable),
  "unite": string (nullable),
  "allergenes": [ string, ... ],          // Array of strings
  "a_choisir": boolean
}
```

### Résultat retourné par l'IA
```javascript
// Ligne 133
setAnalysisResult(result);
// result = { formules: [...], articles: [...] }
```

---

## 🔴 POINT 5 — Fonction qui crée les articles en base + champs

### Fichier et fonction
```
components/bibliotheque/ValidationAmandaModal.jsx — Fonction createItems (Lignes 89-156)
```

### Code exact — CRÉATION DES FORMULES (Lignes 98-110)

```javascript
try {
  // Créer les formules d'abord (section tarifs, type_tarif: formule)
  const formulesCreated = {};
  for (const f of formules) {
    const createdFormule = await base44.entities.CatalogueItem.create({
      section: 'tarifs',
      type_tarif: 'formule',
      nom: f.nom,
      prix: f.prix || null,
      description: f.minimum_personnes ? `Minimum ${f.minimum_personnes} personnes` : null,
      actif: true,
    });
    formulesCreated[f.nom] = createdFormule.id;
  }
```

### Champs créés pour FORMULES

| Champ | Valeur | Ligne |
|-------|--------|-------|
| `section` | `'tarifs'` | 102 |
| `type_tarif` | `'formule'` | 103 |
| `nom` | `f.nom` | 104 |
| `prix` | `f.prix \|\| null` | 105 |
| `description` | `f.minimum_personnes ? ... : null` | 106 |
| `actif` | `true` | 107 |

---

### Code exact — CRÉATION DES ARTICLES (Lignes 112-137)

```javascript
      // Créer les articles
      const createdCount = { alimentaire: 0, boissons: 0, inclusions: 0 };
      for (const art of articles) {
        // Déterminer la section
        let section = 'alimentaire';
        if (art.categorie === 'Boissons') section = 'boissons';
        else if (art.categorie === 'Inclusions') section = 'inclusions';

        // Normaliser allergènes
        const normalizedAllergenes = (art.allergenes || []).map(normalizeAllergen).filter(Boolean);

        // Créer l'article
        await base44.entities.CatalogueItem.create({
          section,
          nom: art.nom,
          categorie: CATEGORIES_MAPPING[art.categorie] || art.categorie || 'Autre',
          quantite_par_personne: art.quantite_par_personne || null,
          unite: art.unite || null,
          allergenes: normalizedAllergenes,
          formules_associees: art.formules_associees || [],
          a_choisir: art.a_choisir || false,
          actif: true,
        });

        if (createdCount[section] !== undefined) createdCount[section]++;
      }
```

### Champs créés pour ARTICLES

| Champ | Source | Valeur | Ligne |
|-------|--------|--------|-------|
| `section` | Inféré | `'alimentaire'\|'boissons'\|'inclusions'` | 116-118 |
| `nom` | IA | `art.nom` | 126 |
| `categorie` | IA + Mapping | `CATEGORIES_MAPPING[art.categorie] \|\| art.categorie \|\| 'Autre'` | 127 |
| `quantite_par_personne` | IA | `art.quantite_par_personne \|\| null` | 128 |
| `unite` | IA | `art.unite \|\| null` | 129 |
| `allergenes` | IA + Normalisé | `normalizedAllergenes` | 130 |
| `formules_associees` | IA | `art.formules_associees \|\| []` | 131 |
| `a_choisir` | IA | `art.a_choisir \|\| false` | 132 |
| `actif` | Hardcoded | `true` | 133 |

### Normalisation des allergènes (Lignes 47-50)

```javascript
function normalizeAllergen(name) {
  const lower = (name || '').toLowerCase().trim();
  return ALLERGEN_MAPPING[lower] || lower;
}
```

### ALLERGEN_MAPPING complet (Lignes 23-45)

```javascript
const ALLERGEN_MAPPING = {
  'gluten': 'gluten',
  'crustacés': 'crustaces',
  'crustaces': 'crustaces',
  'œufs': 'oeufs',
  'oeufs': 'oeufs',
  'poissons': 'poissons',
  'arachides': 'arachides',
  'soja': 'soja',
  'lait': 'lait',
  'fruits à coque': 'fruits_a_coque',
  'fruits a coque': 'fruits_a_coque',
  'céleri': 'celeri',
  'celeri': 'celeri',
  'moutarde': 'moutarde',
  'graines de sésame': 'sesame',
  'sesame': 'sesame',
  'sésame': 'sesame',
  'anhydride sulfureux': 'sulfites',
  'sulfites': 'sulfites',
  'lupin': 'lupin',
  'mollusques': 'mollusques',
};
```

### CATEGORIES_MAPPING (Lignes 12-20)

```javascript
const CATEGORIES_MAPPING = {
  'Apéritif': 'Apéritif',
  'Entrée': 'Entrée',
  'Plat': 'Plat',
  'Dessert': 'Dessert',
  'Boissons': 'Boissons',
  'Inclusions': 'Inclusions',
  'Autre': 'Autre',
};
```

### Post-création
```javascript
      qc.invalidateQueries(['catalogue-items']);
      toast({
        title: '✅ Import réussi',
        description: `${formules.length} formule(s) et ${stats.total} article(s) créé(s)`,
      });

      onCreated?.();
      onClose();
```

---

## 🔴 POINT 6 — Détection articles partagés : Prompt OU Code ?

### ✅ RÉPOND 1: DANS LE PROMPT

#### Instruction explicite au LLM (Ligne 91)
```javascript
- Détecter automatiquement les articles partagés entre plusieurs formules
```

#### Indication du format JSON attendu (Ligne 80)
```javascript
"formules_associees": ["Formule1"] ou [] si dans toutes,
```

#### Règle d'interprétation (Ligne 90)
```javascript
- formules_associees vide [] = article dans TOUTES les formules
```

### ✅ RÉPOND 2: CONFIRMÉ DANS LE CODE

#### Stats et détection (ValidationAmandaModal.jsx, Lignes 62-83)
```javascript
const stats = useMemo(() => {
  const byCategory = {};
  const articlesByFormula = {};
  const sharedArticles = [];

  articles.forEach(art => {
    const cat = art.categorie || 'Autre';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    if (!art.formules_associees || art.formules_associees.length === 0) {
      sharedArticles.push(art.nom);  // ✅ Détecte articles partagés
    }

    (art.formules_associees || []).forEach(f => {
      if (!articlesByFormula[f]) articlesByFormula[f] = [];
      articlesByFormula[f].push(art.nom);
    });
  });

  return { byCategory, articlesByFormula, sharedArticles, total: articles.length };
}, [articles]);
```

#### Affichage dans l'UI (Lignes 195-207)
```jsx
{stats.sharedArticles.length > 0 && (
  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
    <p className="text-xs font-semibold text-emerald-700">
      📋 Articles partagés ({stats.sharedArticles.length}) — Présents dans TOUTES les formules :
    </p>
    <div className="text-xs text-emerald-600 space-y-0.5">
      {stats.sharedArticles.slice(0, 5).map((name, i) => (
        <p key={i}>• {name}</p>
      ))}
      {stats.sharedArticles.length > 5 && <p className="text-muted-foreground italic">+ {stats.sharedArticles.length - 5} autre(s)</p>}
    </div>
  </div>
)}
```

#### Création en base (Ligne 131)
```javascript
formules_associees: art.formules_associees || [],
```

### 📌 RÉSUMÉ — Détection articles partagés

| Aspect | Emplacement | Code |
|--------|------------|------|
| **Instruction IA** | Prompt | Ligne 91: `Détecter automatiquement les articles partagés` |
| **Format attendu** | Prompt + Schema JSON | Lignes 80, 90: `[] = TOUTES les formules` |
| **Traitement** | ValidationAmandaModal | Lignes 72-73: Boucle detecting `formules_associees.length === 0` |
| **Affichage UI** | ValidationAmandaModal | Lignes 195-207: Section "Articles partagés" |
| **Sauvegarde DB** | ValidationAmandaModal | Ligne 131: `formules_associees: art.formules_associees \|\| []` |

---

## 🎯 CONCLUSION

| Point | Fichier | Ligne(s) | Résultat |
|-------|---------|----------|----------|
| **1. Composant** | `ImportAmandaModal.jsx` | 12 | ✅ Gère import + analyse |
| **2. Input multiple** | `ImportAmandaModal.jsx` | 162 | ✅ Attribut `multiple` PRÉSENT |
| **3. Prompt IA** | `ImportAmandaModal.jsx` | 62-95 | ✅ Complet et détaillé |
| **4. JSON Schema** | `ImportAmandaModal.jsx` | 100-131 | ✅ Strict et typé |
| **5. Création base** | `ValidationAmandaModal.jsx` | 89-156 | ✅ Tous champs mappés |
| **6. Articles partagés** | Prompt + Code | 91 + 72-73 | ✅ Double implémentation |