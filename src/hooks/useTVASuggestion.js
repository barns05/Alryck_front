import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export const TVA_TAUX = [0, 5.5, 10, 20];

/**
 * Hook : sélection du taux de TVA + suggestion IA + liaison HT↔TTC.
 * @param {number} initialTaux - taux initial (défaut 20)
 * @param {number} initialPrixHT
 * @param {number} initialPrixTTC
 */
export function useTVASuggestion({ initialTaux = 20, initialPrixHT = '', initialPrixTTC = '' } = {}) {
  const [tvaTaux, setTvaTaux] = useState(initialTaux);
  const [prixHT, setPrixHTRaw] = useState(initialPrixHT);
  const [prixTTC, setPrixTTCRaw] = useState(initialPrixTTC);
  const [suggestingTVA, setSuggestingTVA] = useState(false);
  const debounceRef = useRef(null);

  // Quand l'utilisateur change le HT, recalcule le TTC
  const setPrixHT = (val) => {
    setPrixHTRaw(val);
    const ht = parseFloat(val);
    if (!isNaN(ht) && ht > 0) {
      setPrixTTCRaw(Math.round(ht * (1 + tvaTaux / 100) * 100) / 100);
    } else {
      setPrixTTCRaw('');
    }
  };

  // Quand l'utilisateur change le TTC, recalcule le HT
  const setPrixTTC = (val) => {
    setPrixTTCRaw(val);
    const ttc = parseFloat(val);
    if (!isNaN(ttc) && ttc > 0) {
      setPrixHTRaw(Math.round(ttc / (1 + tvaTaux / 100) * 100) / 100);
    } else {
      setPrixHTRaw('');
    }
  };

  // Quand le taux TVA change :
  // - mode 'ttc' : TTC reste stable → recalcule HT depuis TTC
  // - mode 'ht' (défaut) : HT reste stable → recalcule TTC depuis HT
  const changeTaux = (newTaux, modeSaisie = 'ht') => {
    setTvaTaux(newTaux);
    if (modeSaisie === 'ttc') {
      const ttc = parseFloat(prixTTC);
      if (!isNaN(ttc) && ttc > 0) {
        setPrixHTRaw(Math.round(ttc / (1 + newTaux / 100) * 100) / 100);
      }
    } else {
      const ht = parseFloat(prixHT);
      if (!isNaN(ht) && ht > 0) {
        setPrixTTCRaw(Math.round(ht * (1 + newTaux / 100) * 100) / 100);
      }
    }
  };

  // Suggestion IA : déclenché quand nom + description sont renseignés
  const suggestTVA = (nom, description) => {
    if (!nom || nom.trim().length < 3) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestingTVA(true);
      const prompt = `Quel taux de TVA français s'applique à cet article : "${nom.trim()}"${description ? ` — ${description.trim()}` : ''} ? Réponds uniquement avec le taux numérique : 0, 5.5, 10 ou 20`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: { taux: { type: 'number' } },
        },
      }).catch(() => null);
      setSuggestingTVA(false);
      if (!result) return;
      const taux = result.taux ?? result?.taux;
      if (TVA_TAUX.includes(Number(taux))) {
        changeTaux(Number(taux));
      }
    }, 1200);
  };

  return { tvaTaux, changeTaux, prixHT, setPrixHT, prixTTC, setPrixTTC, suggestingTVA, suggestTVA };
}