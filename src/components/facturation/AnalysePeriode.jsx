import { useState, useMemo } from 'react';
import { CalendarRange, ArrowUp, ArrowDown, FileText, Receipt, CheckCircle, Target } from 'lucide-react';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { calculerTotaux } from './DevisTotaux';
import { parseISO, isWithinInterval, format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subYears, subDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPES_FACTURE = ['Facture', "Facture d'acompte", 'Facture intermédiaire', 'Solde'];
const MOIS = [
  { val: '01', label: 'Janvier' }, { val: '02', label: 'Février' },
  { val: '03', label: 'Mars' },    { val: '04', label: 'Avril' },
  { val: '05', label: 'Mai' },     { val: '06', label: 'Juin' },
  { val: '07', label: 'Juillet' }, { val: '08', label: 'Août' },
  { val: '09', label: 'Septembre' },{ val: '10', label: 'Octobre' },
  { val: '11', label: 'Novembre' },{ val: '12', label: 'Décembre' },
];

function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

const fmt = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
const fmtDec = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

// ─── Sélecteur de date à 3 selects natifs (iOS Safari safe) ────────────────
function DateSelect({ value, onChange }) {
  const jour = value ? value.slice(8, 10) : '';
  const mois = value ? value.slice(5, 7) : '';
  const annee = value ? value.slice(0, 4) : '';
  const anneeCourante = new Date().getFullYear();
  const annees = Array.from({ length: 5 }, (_, i) => String(anneeCourante - 2 + i));
  const nbJours = daysInMonth(mois, annee);
  const jours = Array.from({ length: nbJours }, (_, i) => String(i + 1).padStart(2, '0'));

  const emit = (j, m, a) => {
    if (j && m && a) onChange(`${a}-${m}-${j}`);
    else onChange('');
  };

  const selectCls = "h-8 rounded-md border border-input bg-background px-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="flex items-center gap-1">
      <select value={jour} onChange={e => emit(e.target.value, mois, annee)} className={selectCls} style={{ fontSize: 16 }}>
        <option value="">J</option>
        {jours.map(j => <option key={j} value={j}>{j}</option>)}
      </select>
      <select
        value={mois}
        onChange={e => {
          const nm = e.target.value;
          const maxJ = daysInMonth(nm, annee);
          const nj = jour && parseInt(jour) > maxJ ? String(maxJ).padStart(2, '0') : jour;
          emit(nj, nm, annee);
        }}
        className={`${selectCls} flex-1`}
        style={{ fontSize: 16 }}
      >
        <option value="">Mois</option>
        {MOIS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
      </select>
      <select
        value={annee}
        onChange={e => {
          const na = e.target.value;
          const maxJ = daysInMonth(mois, na);
          const nj = jour && parseInt(jour) > maxJ ? String(maxJ).padStart(2, '0') : jour;
          emit(nj, mois, na);
        }}
        className={selectCls}
        style={{ fontSize: 16 }}
      >
        <option value="">Année</option>
        {annees.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}

// ─── Calcul des indicateurs sur une période donnée ─────────────────────────
function calculerPeriode(devisList, echeances, du, au) {
  if (!du || !au) return null;
  const start = parseISO(du);
  const end = parseISO(au);
  const inRange = (dateStr) => dateStr && isWithinInterval(parseISO(dateStr), { start, end });

  const docsPeriode = devisList.filter(d => !d.archived && inRange(d.date_devis));
  const facturesPeriode = docsPeriode.filter(d => TYPES_FACTURE.includes(d.type_document));
  const devisPeriode = docsPeriode.filter(d => d.type_document === 'Devis');

  const caFacture = facturesPeriode.reduce((s, d) => s + (d.total_ttc || 0), 0);
  const caFactureHT = facturesPeriode.reduce((s, d) => s + (d.total_ht || 0), 0);

  // Ventilation TVA par taux (recalcul via calculerTotaux de chaque facture)
  const tvaMapPeriode = {};
  facturesPeriode.forEach(d => {
    const { tvaMap } = calculerTotaux(d.lignes || [], d.remise_globale || 0, d.remise_globale_type || 'pct');
    Object.entries(tvaMap).forEach(([taux, montant]) => {
      tvaMapPeriode[taux] = (tvaMapPeriode[taux] || 0) + montant;
    });
  });
  const nbTauxDist = Object.keys(tvaMapPeriode).length;

  const encaissePeriode = echeances.filter(e => e.statut === 'Reçu' && inRange(e.date_reception));
  const caEncaisse = encaissePeriode.reduce((s, e) => s + (e.montant_calcule || 0), 0);

  const nbDocuments = docsPeriode.length;
  const detailType = {};
  docsPeriode.forEach(d => {
    const t = d.type_document || 'Devis';
    detailType[t] = (detailType[t] || 0) + 1;
  });

  const devisAcceptes = devisPeriode.filter(d => d.statut === 'Accepté');
  const tauxConversion = devisPeriode.length > 0 ? (devisAcceptes.length / devisPeriode.length) * 100 : 0;

  const ticketMoyen = facturesPeriode.length > 0 ? caFacture / facturesPeriode.length : 0;

  return {
    caFacture, caFactureHT, caEncaisse, nbDocuments, detailType, tauxConversion, ticketMoyen,
    nbFactures: facturesPeriode.length, nbDevis: devisPeriode.length, nbEncaissements: encaissePeriode.length,
    tvaMapPeriode, nbTauxDist,
  };
}

function deltaPct(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ current, previous }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = deltaPct(current, previous);
  if (pct === 0) return <span className="text-xs text-muted-foreground">±0 %</span>;
  const isUp = pct > 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(pct).toFixed(0)} %
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────
export default function AnalysePeriode({ devisList, echeances }) {
  const now = new Date();
  const { settings } = useOwnerCompanySettings();
  const assujetti = settings?.assujetti_tva !== false;
  const [du, setDu] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [au, setAu] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [presetActif, setPresetActif] = useState('Ce mois');

  const PRESETS = useMemo(() => [
    { label: 'Ce mois', get: () => ({ du: format(startOfMonth(now), 'yyyy-MM-dd'), au: format(endOfMonth(now), 'yyyy-MM-dd') }) },
    { label: 'Mois dernier', get: () => ({ du: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'), au: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') }) },
    { label: 'Ce trimestre', get: () => ({ du: format(startOfQuarter(now), 'yyyy-MM-dd'), au: format(endOfQuarter(now), 'yyyy-MM-dd') }) },
    { label: 'Cette année', get: () => ({ du: format(startOfYear(now), 'yyyy-MM-dd'), au: format(endOfYear(now), 'yyyy-MM-dd') }) },
    { label: 'Année dernière', get: () => ({ du: format(startOfYear(subYears(now, 1)), 'yyyy-MM-dd'), au: format(endOfYear(subYears(now, 1)), 'yyyy-MM-dd') }) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const applyPreset = (preset) => {
    const range = preset.get();
    setDu(range.du);
    setAu(range.au);
    setPresetActif(preset.label);
  };

  // Période précédente équivalente (même durée, immédiatement avant)
  const periode = useMemo(() => {
    if (!du || !au) return null;
    const start = parseISO(du);
    const end = parseISO(au);
    const dureeJours = differenceInDays(end, start);
    const prevStart = subDays(start, dureeJours + 1);
    const prevEnd = subDays(start, 1);
    return {
      previous: {
        du: format(prevStart, 'yyyy-MM-dd'),
        au: format(prevEnd, 'yyyy-MM-dd'),
      },
    };
  }, [du, au]);

  const metrics = useMemo(() => {
    if (!du || !au || !periode) return null;
    return {
      current: calculerPeriode(devisList, echeances, du, au),
      previous: calculerPeriode(devisList, echeances, periode.previous.du, periode.previous.au),
    };
  }, [du, au, periode, devisList, echeances]);

  if (!metrics || !metrics.current || !metrics.previous) return null;

  const m = metrics.current;
  const mp = metrics.previous;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
      {/* Titre */}
      <div className="flex items-center gap-2">
        <CalendarRange size={16} className="text-primary" />
        <h3 className="font-semibold">Analyse par période</h3>
      </div>

      {/* Préréglages — scroll horizontal sur mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${presetActif === p.label ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {p.label}
          </button>
        ))}
        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${presetActif === 'Personnalisé' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Personnalisé
        </span>
      </div>

      {/* Sélecteurs de date manuels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Du</label>
          <DateSelect value={du} onChange={(v) => { setDu(v); setPresetActif('Personnalisé'); }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Au</label>
          <DateSelect value={au} onChange={(v) => { setAu(v); setPresetActif('Personnalisé'); }} />
        </div>
      </div>

      {/* Comparaison période précédente */}
      <p className="text-xs text-muted-foreground">
        Comparaison : {format(parseISO(periode.previous.du), 'd MMM yyyy', { locale: fr })} → {format(parseISO(periode.previous.au), 'd MMM yyyy', { locale: fr })}
      </p>

      {/* KPIs de période */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* CA facturé */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">CA facturé{assujetti ? ' TTC' : ''}</p>
            <Receipt size={14} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-primary">{fmt(m.caFacture)}</p>
          {assujetti && (
            <p className="text-xs text-muted-foreground">HT : {fmt(m.caFactureHT)}</p>
          )}
          {assujetti && m.nbTauxDist >= 2 && (
            <div className="pt-1 space-y-0.5">
              {Object.entries(m.tvaMapPeriode).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).map(([taux, montant]) => (
                <p key={taux} className="text-xs text-muted-foreground">TVA {taux}% : {fmt(montant)}</p>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <DeltaBadge current={m.caFacture} previous={mp.caFacture} />
            <span className="text-xs text-muted-foreground">{m.nbFactures} facture(s)</span>
          </div>
        </div>

        {/* CA encaissé */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">CA encaissé</p>
            <CheckCircle size={14} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(m.caEncaisse)}</p>
          <div className="flex items-center gap-2">
            <DeltaBadge current={m.caEncaisse} previous={mp.caEncaisse} />
            <span className="text-xs text-muted-foreground">{m.nbEncaissements} paiement(s)</span>
          </div>
        </div>

        {/* Ticket moyen */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Ticket moyen</p>
            <Target size={14} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-violet-600">{m.ticketMoyen > 0 ? fmtDec(m.ticketMoyen) : '—'}</p>
          <p className="text-xs text-muted-foreground">par facture émise</p>
        </div>

        {/* Nombre de documents émis */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Documents émis</p>
            <FileText size={14} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold">{m.nbDocuments}</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(m.detailType).map(([type, count]) => (
              <span key={type} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {type} : {count}
              </span>
            ))}
          </div>
        </div>

        {/* Taux de conversion devis → facture */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Conversion devis</p>
            <Target size={14} className="text-muted-foreground" />
          </div>
          <p className="text-xl font-bold text-primary">{m.tauxConversion.toFixed(0)} %</p>
          <p className="text-xs text-muted-foreground">{m.nbDevis} devis · acceptés</p>
        </div>

        {/* CA facturé HT — carte dédiée (assujetti uniquement) */}
        {assujetti && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">CA facturé HT</p>
              <Target size={14} className="text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-violet-600">{fmt(m.caFactureHT)}</p>
            {m.nbTauxDist >= 2 ? (
              <div className="space-y-0.5">
                {Object.entries(m.tvaMapPeriode).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).map(([taux, montant]) => (
                  <p key={taux} className="text-xs text-muted-foreground">TVA {taux}% : {fmt(montant)}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{m.nbFactures} facture(s)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}