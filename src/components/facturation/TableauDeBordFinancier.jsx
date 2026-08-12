import { useMemo, useState } from 'react';
import {
  TrendingUp, AlertTriangle, Clock, CheckCircle,
  Euro, Target, BarChart3, Percent
} from 'lucide-react';
import { parseISO, isPast, isThisMonth, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import AnalysePeriode from './AnalysePeriode';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const TYPES_FACTURE = ['Facture', "Facture d'acompte", 'Facture intermédiaire', 'Solde'];
const fmt = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
const fmtDec = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, alert, small }) {
  return (
    <div className={`bg-card rounded-2xl border p-4 space-y-2 ${alert ? 'border-destructive/20 bg-destructive/5' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`font-bold ${small ? 'text-xl' : 'text-2xl'} ${alert ? 'text-destructive' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {alert && <p className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle size={11} /> {alert}</p>}
    </div>
  );
}

// ─── Tooltip CA mensuel ───────────────────────────────────────────────────────
function TooltipCA({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-primary font-bold">{fmtDec(payload[0]?.value || 0)}</p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TableauDeBordFinancier({ devisList, echeances, evenements, openDevis }) {
  const now = new Date();
  const { settings } = useOwnerCompanySettings();
  const assujetti = settings?.assujetti_tva !== false;
  const [graphMode, setGraphMode] = useState('ttc'); // 'ttc' | 'ht'

  // ── Données de base ───────────────────────────────────────────────────────
  const devisFactures = useMemo(
    () => devisList.filter(d => TYPES_FACTURE.includes(d.type_document) && !d.archived),
    [devisList]
  );

  // 1. CA total HT et TTC (toutes périodes, documents non archivés)
  const caTotalTTC = useMemo(() => devisFactures.reduce((s, d) => s + (d.total_ttc || 0), 0), [devisFactures]);
  const caTotalHT = useMemo(() => devisFactures.reduce((s, d) => s + (d.total_ht || 0), 0), [devisFactures]);
  const totalFactureMois = useMemo(
    () => devisFactures.filter(d => d.date_devis && isThisMonth(parseISO(d.date_devis))).reduce((s, d) => s + (d.total_ttc || 0), 0),
    [devisFactures]
  );
  const totalFactureMoisHT = useMemo(
    () => devisFactures.filter(d => d.date_devis && isThisMonth(parseISO(d.date_devis))).reduce((s, d) => s + (d.total_ht || 0), 0),
    [devisFactures]
  );

  // Encaissé / en attente / en retard
  const totalEncaisse = useMemo(() => echeances.filter(e => e.statut === 'Reçu').reduce((s, e) => s + (e.montant_calcule || 0), 0), [echeances]);
  const totalEncaisseHTEstime = useMemo(() => {
    return echeances
      .filter(e => e.statut === 'Reçu')
      .reduce((s, e) => {
        const devis = devisList.find(d => d.id === e.devis_id);
        if (!devis || !devis.total_ttc || devis.total_ttc === 0) return s;
        const ratio = (devis.total_ht || 0) / devis.total_ttc;
        return s + (e.montant_calcule || 0) * ratio;
      }, 0);
  }, [echeances, devisList]);
  const totalEnAttente = useMemo(() => echeances.filter(e => e.statut === 'En attente' && e.date_prevue && !isPast(parseISO(e.date_prevue))).reduce((s, e) => s + (e.montant_calcule || 0), 0), [echeances]);
  const enRetardList = useMemo(() => echeances.filter(e => e.statut === 'En attente' && e.date_prevue && isPast(parseISO(e.date_prevue))), [echeances]);
  const totalEnRetard = useMemo(() => enRetardList.reduce((s, e) => s + (e.montant_calcule || 0), 0), [enRetardList]);

  // 5. Pipeline : devis au statut "Envoyé" non encore convertis en facture
  const pipeline = useMemo(
    () => devisList.filter(d => d.type_document === 'Devis' && d.statut === 'Envoyé' && !d.archived),
    [devisList]
  );
  const totalPipeline = useMemo(() => pipeline.reduce((s, d) => s + (d.total_ttc || 0), 0), [pipeline]);

  // 6. Taux de recouvrement
  const tauxRecouvrement = caTotalTTC > 0 ? Math.min(100, (totalEncaisse / caTotalTTC) * 100) : 0;

  // 3. Ticket moyen par événement
  const devisAvecInvites = useMemo(() => {
    return devisFactures
      .map(d => {
        const evt = evenements.find(e => e.id === d.evenement_id);
        const nb = evt?.nb_invites || evt?.nb_adultes || 0;
        return { ...d, nb_invites: nb };
      })
      .filter(d => d.nb_invites > 0 && d.total_ttc > 0);
  }, [devisFactures, evenements]);

  const ticketMoyenParInvite = useMemo(() => {
    if (!devisAvecInvites.length) return 0;
    const totalInvites = devisAvecInvites.reduce((s, d) => s + d.nb_invites, 0);
    const totalCA = devisAvecInvites.reduce((s, d) => s + d.total_ttc, 0);
    return totalInvites > 0 ? totalCA / totalInvites : 0;
  }, [devisAvecInvites]);

  // Ticket moyen par événement (total TTC / nb événements distincts)
  const evtsFactures = useMemo(() => {
    const ids = new Set(devisFactures.map(d => d.evenement_id).filter(Boolean));
    return ids.size || devisFactures.length;
  }, [devisFactures]);
  const ticketMoyenParEvenement = evtsFactures > 0 ? caTotalTTC / evtsFactures : 0;

  // 2. Évolution mensuelle CA sur 12 mois
  const caMensuel = useMemo(() => {
    const field = assujetti && graphMode === 'ht' ? 'total_ht' : 'total_ttc';
    return Array.from({ length: 12 }, (_, i) => {
      const mois = subMonths(now, 11 - i);
      const debut = startOfMonth(mois);
      const fin = endOfMonth(mois);
      const total = devisFactures
        .filter(d => d.date_devis && isWithinInterval(parseISO(d.date_devis), { start: debut, end: fin }))
        .reduce((s, d) => s + (d[field] || 0), 0);
      return {
        mois: format(mois, 'MMM yy', { locale: fr }),
        ca: Math.round(total),
      };
    });
  }, [devisFactures, assujetti, graphMode]);

  // 4. CA par type d'événement (via evenement_nom ou evenement_id → type)
  const caParTypeEvt = useMemo(() => {
    const field = assujetti && graphMode === 'ht' ? 'total_ht' : 'total_ttc';
    const map = {};
    devisFactures.forEach(d => {
      const evt = evenements.find(e => e.id === d.evenement_id);
      const type = evt?.type_evenement || 'Non renseigné';
      map[type] = (map[type] || 0) + (d[field] || 0);
    });
    return Object.entries(map)
      .map(([type, ca]) => ({ type, ca: Math.round(ca) }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 8);
  }, [devisFactures, evenements, assujetti, graphMode]);

  const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

  return (
    <div className="space-y-6">

      {/* ── KPIs + Tickets moyens fusionnés dans la même grille ── */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Chiffre d'affaires global</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard
            icon={TrendingUp}
            label={assujetti ? 'CA total TTC' : 'CA total'}
            value={fmt(caTotalTTC)}
            sub={assujetti ? `HT : ${fmt(caTotalHT)}` : undefined}
            color="bg-primary/10 text-primary"
            small
          />
          <KpiCard
            icon={TrendingUp}
            label="Facturé ce mois"
            value={fmt(totalFactureMois)}
            sub={assujetti ? `HT : ${fmt(totalFactureMoisHT)}` : 'Factures du mois'}
            color="bg-violet-100 text-violet-600"
            small
          />
          <KpiCard
            icon={CheckCircle}
            label="Total encaissé"
            value={fmt(totalEncaisse)}
            sub={assujetti ? `dont HT (estimé) : ${fmt(totalEncaisseHTEstime)}` : `${echeances.filter(e => e.statut === 'Reçu').length} paiement(s)`}
            color="bg-emerald-100 text-emerald-600"
            small
          />
          <KpiCard
            icon={Clock}
            label="En attente"
            value={fmt(totalEnAttente)}
            sub={`${echeances.filter(e => e.statut === 'En attente' && e.date_prevue && !isPast(parseISO(e.date_prevue))).length} échéance(s)`}
            color="bg-amber-100 text-amber-600"
            small
          />
          <KpiCard
            icon={AlertTriangle}
            label="En retard"
            value={fmt(totalEnRetard)}
            sub={`${enRetardList.length} dépassée(s)`}
            color="bg-red-100 text-red-600"
            alert={totalEnRetard > 0 ? `${enRetardList.length} paiement(s) en retard` : null}
            small
          />
          <KpiCard
            icon={Target}
            label="Pipeline devis"
            value={fmt(totalPipeline)}
            sub={`${pipeline.length} devis envoyé(s)`}
            color="bg-cyan-100 text-cyan-600"
            small
          />
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket moyen / événement</p>
          <p className="text-2xl font-bold text-primary">{fmt(ticketMoyenParEvenement)}</p>
          <p className="text-xs text-muted-foreground">Sur {evtsFactures} événement(s) facturé(s)</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket moyen / couvert</p>
          <p className="text-2xl font-bold text-violet-600">
            {ticketMoyenParInvite > 0 ? fmtDec(ticketMoyenParInvite) : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {devisAvecInvites.length > 0
              ? `Calculé sur ${devisAvecInvites.length} événement(s) avec couverts`
              : 'Données de couverts non disponibles'}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taux de recouvrement</p>
            <Percent size={14} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{tauxRecouvrement.toFixed(1)} %</p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, tauxRecouvrement)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{fmtDec(totalEncaisse)} encaissé sur {fmtDec(caTotalTTC)}</p>
        </div>
        {assujetti && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CA total HT</p>
            <p className="text-2xl font-bold text-violet-600">{fmt(caTotalHT)}</p>
            <p className="text-xs text-muted-foreground">Hors taxes, factures non archivées</p>
          </div>
        )}
        </div>
      </div>

      {/* ── Analyse par période personnalisée ── */}
      <AnalysePeriode devisList={devisList} echeances={echeances} />

      {/* ── Graphique évolution mensuelle CA ── */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Évolution du CA sur 12 mois
          </h3>
          <div className="flex flex-col items-end gap-1.5">
            {assujetti && (
              <div className="inline-flex rounded-lg border border-input overflow-hidden">
                {['ttc', 'ht'].map(m => (
                  <button
                    key={m}
                    onClick={() => setGraphMode(m)}
                    className={`w-10 text-center text-xs font-semibold px-2 py-1.5 transition-colors ${graphMode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground hover:bg-muted'}`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{assujetti ? `${graphMode.toUpperCase()} · ` : ''}Factures uniquement</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={caMensuel} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip content={<TooltipCA />} />
            <Area type="monotone" dataKey="ca" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradCA)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── CA par type d'événement ── */}
      {caParTypeEvt.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold">CA par type d'événement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Barres */}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={caParTypeEvt} margin={{ top: 0, right: 10, left: 0, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [fmtDec(v), assujetti ? `CA ${graphMode.toUpperCase()}` : 'CA']} />
                <Bar dataKey="ca" radius={[0, 6, 6, 0]}>
                  {caParTypeEvt.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Liste détaillée */}
            <div className="space-y-2">
              {caParTypeEvt.map((item, i) => {
                const pct = caTotalTTC > 0 ? (item.ca / caTotalTTC) * 100 : 0;
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                        {item.type}
                      </span>
                      <span className="font-bold text-primary">{fmt(item.ca)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)} %</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Paiements en retard ── */}
      {enRetardList.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle size={20} /> Paiements en retard
          </h3>
          <div className="space-y-2">
            {enRetardList.map(e => {
              const devis = devisList.find(d => d.id === e.devis_id);
              return (
                <div key={e.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100">
                  <div>
                    <p className="font-medium text-sm">{devis?.client_nom || '—'}</p>
                    <p className="text-xs text-muted-foreground">{e.type} · Prévu le {e.date_prevue ? format(parseISO(e.date_prevue), 'd MMM yyyy', { locale: fr }) : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{(e.montant_calcule || 0).toFixed(2)} €</p>
                    <button onClick={() => openDevis(e.devis_id)} className="text-xs text-primary hover:underline">Voir le document</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}