import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { parseISO, differenceInDays, getMonth, getYear, startOfMonth, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Clock, CalendarX } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#7c3aed','#db2777','#0ea5e9','#059669','#f59e0b','#dc2626','#0891b2','#65a30d','#d97706','#6366f1','#94a3b8'];

const STATUT_COLORS = {
  'Nouveau': '#6366f1',
  'Devis envoyé': '#0ea5e9',
  'À relancer': '#dc2626',
  'Signé': '#059669',
  'Annulé': '#94a3b8',
};

function StatCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-secondary/40 rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function AlertRow({ icon: Icon, color, label, items, emptyText }) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${color}`}>
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Icon size={15} />
        {label} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="text-xs opacity-70">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((p, i) => (
            <li key={i} className="text-xs flex items-center gap-2">
              <span className="font-medium">{p.prenom} {p.nom}</span>
              {p.detail && <span className="opacity-60">— {p.detail}</span>}
            </li>
          ))}
          {items.length > 5 && <li className="text-xs opacity-60">…et {items.length - 5} autres</li>}
        </ul>
      )}
    </div>
  );
}

export default function AnalyseProspects() {
  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => base44.entities.Prospect.list(),
  });
  const { data: dateDemandes = [] } = useQuery({
    queryKey: ['prospect-date-demandes'],
    queryFn: () => base44.entities.ProspectDateDemande.list(),
  });

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const thisQuarter = Math.floor(thisMonth / 3);

  // ─── Stats globales ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const actifs = prospects.filter(p => !p.converti && p.statut !== 'Annulé');
    const total = prospects.length;

    const ceMois = prospects.filter(p => {
      if (!p.created_date) return false;
      const d = parseISO(p.created_date);
      return getMonth(d) === thisMonth && getYear(d) === thisYear;
    }).length;

    const ceTrimestre = prospects.filter(p => {
      if (!p.created_date) return false;
      const d = parseISO(p.created_date);
      return Math.floor(getMonth(d) / 3) === thisQuarter && getYear(d) === thisYear;
    }).length;

    const cetteAnnee = prospects.filter(p => {
      if (!p.created_date) return false;
      return getYear(parseISO(p.created_date)) === thisYear;
    }).length;

    const signes = prospects.filter(p => p.statut === 'Signé' || p.converti).length;
    const tauxConversion = total > 0 ? Math.round((signes / total) * 100) : 0;

    // Délai moyen visite → signature (created_date → updated_date pour les signés)
    const signesAvecDate = prospects.filter(p => (p.statut === 'Signé' || p.converti) && p.created_date && p.updated_date);
    const delaiMoyen = signesAvecDate.length > 0
      ? Math.round(signesAvecDate.reduce((s, p) => s + differenceInDays(parseISO(p.updated_date), parseISO(p.created_date)), 0) / signesAvecDate.length)
      : null;

    const aRelancer = actifs.filter(p => p.statut === 'À relancer').length;

    return { ceMois, ceTrimestre, cetteAnnee, total, signes, tauxConversion, delaiMoyen, aRelancer };
  }, [prospects, thisMonth, thisQuarter, thisYear]);

  // ─── Évolution 12 mois ───────────────────────────────────────────
  const evolutionData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      const m = getMonth(date);
      const y = getYear(date);
      const count = prospects.filter(p => {
        if (!p.created_date) return false;
        const d = parseISO(p.created_date);
        return getMonth(d) === m && getYear(d) === y;
      }).length;
      const signes = prospects.filter(p => {
        if (!p.updated_date || (!p.converti && p.statut !== 'Signé')) return false;
        const d = parseISO(p.updated_date);
        return getMonth(d) === m && getYear(d) === y;
      }).length;
      return { mois: format(date, 'MMM', { locale: fr }), count, signes };
    });
  }, [prospects]);

  // ─── Répartition par statut ───────────────────────────────────────
  const statutData = useMemo(() => {
    const counts = {};
    prospects.forEach(p => {
      const s = p.converti ? 'Signé' : (p.statut || 'Inconnu');
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, fill: STATUT_COLORS[name] || '#94a3b8'
    }));
  }, [prospects]);

  // ─── Formules les plus demandées ─────────────────────────────────
  const formulesData = useMemo(() => {
    const counts = {};
    prospects.forEach(p => {
      if (p.formule_nom) counts[p.formule_nom] = (counts[p.formule_nom] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count], i) => ({ name, count, fill: COLORS[i % COLORS.length] }));
  }, [prospects]);

  // ─── Sources les plus efficaces ───────────────────────────────────
  const sourcesConversionData = useMemo(() => {
    const bySource = {};
    prospects.forEach(p => {
      const src = p.source || 'Non renseigné';
      if (!bySource[src]) bySource[src] = { total: 0, signes: 0 };
      bySource[src].total += 1;
      if (p.statut === 'Signé' || p.converti) bySource[src].signes += 1;
    });
    return Object.entries(bySource)
      .map(([name, { total, signes }], i) => ({
        name,
        total,
        signes,
        taux: total > 0 ? Math.round((signes / total) * 100) : 0,
        fill: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.taux - a.taux);
  }, [prospects]);

  // ─── Conversion par type d'événement ─────────────────────────────
  const typeEvenementConversionData = useMemo(() => {
    const byType = {};
    prospects.forEach(p => {
      const type = p.type_evenement;
      if (!type) return;
      if (!byType[type]) byType[type] = { total: 0, signes: 0 };
      byType[type].total += 1;
      if (p.statut === 'Signé' || p.converti) byType[type].signes += 1;
    });
    return Object.entries(byType)
      .map(([name, { total, signes }], i) => ({
        name,
        total,
        signes,
        taux: total > 0 ? Math.round((signes / total) * 100) : 0,
        fill: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.taux - a.taux);
  }, [prospects]);

  // ─── Alertes ──────────────────────────────────────────────────────
  const alertes = useMemo(() => {
    // 1. Sans réponse depuis 7 jours (actifs, pas signés/annulés)
    const sansReponse = prospects
      .filter(p => !p.converti && p.statut !== 'Annulé' && p.statut !== 'Signé' && p.updated_date)
      .filter(p => differenceInDays(now, parseISO(p.updated_date)) >= 7)
      .map(p => ({
        ...p,
        detail: `${differenceInDays(now, parseISO(p.updated_date))}j sans activité`,
      }));

    // 2. À relancer
    const aRelancer = prospects
      .filter(p => p.statut === 'À relancer')
      .map(p => ({
        ...p,
        detail: p.updated_date ? `dernière activité il y a ${differenceInDays(now, parseISO(p.updated_date))}j` : '',
      }));

    // 3. Demandes de dates non traitées (En attente)
    const datesNonTraitees = dateDemandes
      .filter(d => d.statut === 'En attente')
      .map(d => {
        const p = prospects.find(pr => pr.id === d.prospect_id);
        return p ? { ...p, detail: 'demande de date en attente' } : null;
      })
      .filter(Boolean);

    return { sansReponse, aRelancer, datesNonTraitees };
  }, [prospects, dateDemandes]);

  return (
    <div className="space-y-6">
      {/* Stats globales */}
      <Section title="📊 Statistiques prospects" subtitle={`${stats.total} prospects au total`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Ce mois" value={stats.ceMois} />
          <StatCard label="Ce trimestre" value={stats.ceTrimestre} />
          <StatCard label="Cette année" value={stats.cetteAnnee} />
          <StatCard label="Taux de conversion" value={`${stats.tauxConversion}%`} sub={`${stats.signes} signés / ${stats.total}`} color="text-emerald-600" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
          <StatCard
            label="Délai moyen visite → signature"
            value={stats.delaiMoyen !== null ? `${stats.delaiMoyen}j` : '—'}
            sub="Sur les prospects signés"
            color="text-blue-600"
          />
          <StatCard label="À relancer" value={stats.aRelancer} color="text-red-600" />
        </div>
      </Section>

      {/* Évolution 12 mois */}
      <Section title="📈 Évolution sur 12 mois" subtitle="Nouveaux prospects et signatures">
        <div className="h-52 w-full">
          <ResponsiveContainer>
            <LineChart data={evolutionData} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Prospects" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="signes" name="Signés" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Répartition + Formules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <Section title="🥧 Répartition par statut">
          {statutData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun prospect</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statutData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={35}>
                      {statutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-1.5">
                {statutData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="flex-1">{s.name}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Formules les plus demandées */}
        <Section title="🍽️ Formules les plus demandées">
          {formulesData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune formule renseignée sur les prospects</p>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer>
                <BarChart data={formulesData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" name="Prospects" radius={[0, 6, 6, 0]}>
                    {formulesData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      </div>

      {/* Sources les plus efficaces */}
      <Section title="🎯 Sources les plus efficaces" subtitle="Taux de conversion par source">
        {sourcesConversionData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune source renseignée</p>
        ) : (
          <div className="space-y-2.5">
            {sourcesConversionData.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{s.signes}/{s.total}</span>
                <div className="w-28 bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full" style={{ width: `${s.taux}%`, backgroundColor: s.fill }} />
                </div>
                <span className="text-sm font-bold tabular-nums w-10 text-right">{s.taux}%</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Conversion par type d'événement */}
      <Section title="🎪 Conversion par type d'événement" subtitle="Taux de conversion par type d'événement">
        {typeEvenementConversionData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun type d'événement renseigné</p>
        ) : (
          <div className="space-y-2.5">
            {typeEvenementConversionData.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{s.signes}/{s.total}</span>
                <div className="w-28 bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full" style={{ width: `${s.taux}%`, backgroundColor: s.fill }} />
                </div>
                <span className="text-sm font-bold tabular-nums w-10 text-right">{s.taux}%</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Alertes intelligentes */}
      <Section title="🚨 Alertes intelligentes">
        <div className="space-y-3">
          <AlertRow
            icon={Clock}
            color="bg-amber-50 border border-amber-200 text-amber-800"
            label="Sans activité depuis +7 jours"
            items={alertes.sansReponse}
            emptyText="Aucun prospect inactif ✓"
          />
          <AlertRow
            icon={AlertTriangle}
            color="bg-red-50 border border-red-200 text-red-800"
            label="À relancer"
            items={alertes.aRelancer}
            emptyText="Aucun prospect à relancer ✓"
          />
          <AlertRow
            icon={CalendarX}
            color="bg-blue-50 border border-blue-200 text-blue-800"
            label="Demandes de dates non traitées"
            items={alertes.datesNonTraitees}
            emptyText="Toutes les demandes sont traitées ✓"
          />
        </div>
        {(alertes.sansReponse.length > 0 || alertes.aRelancer.length > 0 || alertes.datesNonTraitees.length > 0) && (
          <Link to="/Prospects" className="text-xs text-primary hover:underline">
            → Gérer les prospects
          </Link>
        )}
      </Section>
    </div>
  );
}