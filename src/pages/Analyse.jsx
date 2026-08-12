import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { format, parseISO, isThisMonth, getYear, getMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target, Tag, BarChart3, TrendingUp, Users as UsersIcon, PieChart as PieChartIcon } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Link } from 'react-router-dom';
import AnalyseProspects from '@/components/analyse/AnalyseProspects';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const TYPES = ['Mariage', 'Pacs', 'Anniversaire de mariage', 'Baptême', 'Anniversaire', "Soirée d'entreprise", 'Séminaire', 'Cocktail', 'Gala', 'Location', 'Autre'];
const COLORS = ['#7c3aed','#db2777','#0ea5e9','#059669','#f59e0b','#dc2626','#0891b2','#65a30d','#d97706','#6366f1','#94a3b8'];

const FILTER_OPTIONS = [
  { label: 'Ce mois', value: 'month' },
  { label: 'Cette année', value: 'year' },
  { label: 'Année suivante', value: 'nextyear' },
  { label: 'Tout', value: 'all' },
];

function filterEvenements(evenements, filter) {
  const now = new Date();
  const thisYear = now.getFullYear();
  if (filter === 'month') return evenements.filter(e => e.date && isThisMonth(parseISO(e.date)));
  if (filter === 'year') return evenements.filter(e => e.date && getYear(parseISO(e.date)) === thisYear);
  if (filter === 'nextyear') return evenements.filter(e => e.date && getYear(parseISO(e.date)) === thisYear + 1);
  return evenements;
}

export default function Analyse() {
  const [filter, setFilter] = useState('year');
  const [onglet, setOnglet] = useState('evenements'); // 'evenements' | 'prospects'

  const { data: evenements = [] } = useQuery({ queryKey: ['evenements'], queryFn: () => base44.entities.Evenement.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { settings: company } = useOwnerCompanySettings();
  const { data: promotions = [] } = useQuery({ queryKey: ['promotions'], queryFn: () => base44.entities.Promotion.list() });
  const { data: promoReponses = [] } = useQuery({ queryKey: ['promo-reponses'], queryFn: () => base44.entities.PromotionReponse.list() });


  const objectifAnnuel = company?.objectif_annuel || 0;
  const now = new Date();
  const nextYear = now.getFullYear() + 1;

  const filtered = useMemo(() => filterEvenements(evenements, filter), [evenements, filter]);

  // 1. Sources clients
  const sourcesData = useMemo(() => {
    const sources = {};
    clients.forEach(c => {
      const src = c.source_connaissance || 'Non renseigné';
      sources[src] = (sources[src] || 0) + 1;
    });
    const total = clients.length || 1;
    return Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
        fill: COLORS[i % COLORS.length],
      }));
  }, [clients]);

  // 2. Événements par type
  const typeData = useMemo(() => {
    const counts = {};
    TYPES.forEach(t => { counts[t] = 0; });
    filtered.forEach(e => {
      if (e.type_evenement) counts[e.type_evenement] = (counts[e.type_evenement] || 0) + 1;
    });
    return TYPES.map((t, i) => ({ name: t, count: counts[t] || 0, fill: COLORS[i % COLORS.length] }))
      .filter(d => d.count > 0);
  }, [filtered]);

  // 3. Événements par mois (12 mois de l'année sélectionnée)
  const moisData = useMemo(() => {
    const year = filter === 'nextyear' ? nextYear : now.getFullYear();
    const base = MOIS.map((m, i) => ({ mois: m, count: 0, monthIndex: i }));
    const src = filter === 'all' || filter === 'month' ? evenements : filtered;
    src.forEach(e => {
      if (!e.date) return;
      const d = parseISO(e.date);
      if (filter !== 'all' && filter !== 'month' && getYear(d) !== year) return;
      base[getMonth(d)].count += 1;
    });
    return base;
  }, [evenements, filtered, filter, now, nextYear]);

  // 4. Moyenne invités
  const avgInvites = useMemo(() => {
    const withInvites = filtered.filter(e => e.nb_invites > 0);
    if (!withInvites.length) return { global: 0, byType: [] };
    const global = Math.round(withInvites.reduce((s, e) => s + e.nb_invites, 0) / withInvites.length);
    const byType = TYPES.map(t => {
      const evs = withInvites.filter(e => e.type_evenement === t);
      if (!evs.length) return null;
      return { type: t, avg: Math.round(evs.reduce((s, e) => s + e.nb_invites, 0) / evs.length) };
    }).filter(Boolean).sort((a, b) => b.avg - a.avg);
    return { global, byType };
  }, [filtered]);

  // 5. Vision N+1
  const nextYearEvenements = useMemo(() =>
    evenements.filter(e => e.date && getYear(parseISO(e.date)) === nextYear),
  [evenements, nextYear]);

  const nextYearMonthData = useMemo(() => {
    return MOIS.map((m, i) => {
      const count = nextYearEvenements.filter(e => getMonth(parseISO(e.date)) === i).length;
      return { mois: m, count };
    });
  }, [nextYearEvenements]);

  const maxMonth = Math.max(...nextYearMonthData.map(d => d.count), 1);
  const totalNextYear = nextYearEvenements.length;
  const pctObjectif = objectifAnnuel > 0 ? Math.min(Math.round((totalNextYear / objectifAnnuel) * 100), 100) : null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 pb-[calc(2rem+env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analyse</h2>
          <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre activité</p>
        </div>
        {onglet === 'evenements' && (
          <div className="flex bg-secondary rounded-xl p-1 gap-1">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === opt.value ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'evenements', label: 'Événements', icon: BarChart3 },
          { id: 'prospects', label: 'Prospects', icon: UsersIcon },
        ].map(o => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${onglet === o.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <o.icon size={14} /> {o.label}
          </button>
        ))}
      </div>

      {onglet === 'prospects' && <AnalyseProspects />}

      {onglet === 'evenements' && <>
      {/* 1. Sources de clients */}
      <Section title="Sources de clients" subtitle={`${clients.length} clients au total`} icon={PieChartIcon}>
        {sourcesData.length === 0 ? (
          <Empty text='Aucune donnée — renseignez le champ "Comment nous avez-vous connu" sur les fiches clients.' />
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-64 h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sourcesData} dataKey="count" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                    {sourcesData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [`${v} (${p.payload.pct}%)`, 'Clients']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {sourcesData.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                  <span className="text-sm flex-1 truncate">{s.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* 2. Événements par type */}
      <Section title="Événements par type" subtitle={`${filtered.length} événements sur la période`} icon={BarChart3}>
        {typeData.length === 0 ? (
          <Empty text="Aucun événement sur cette période." />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={typeData} margin={{ top: 0, right: 0, bottom: 30, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Événements" radius={[6, 6, 0, 0]}>
                  {typeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* 3. Événements par mois */}
      <Section title="Activité mensuelle" subtitle="Évolution sur 12 mois" icon={TrendingUp}>
        <div className="h-52 w-full">
          <ResponsiveContainer>
            <LineChart data={moisData} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Événements" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* 4. Moyenne d'invités */}
      <Section title="Nombre moyen d'invités" icon={UsersIcon}>
        {avgInvites.byType.length === 0 ? (
          <Empty text="Aucune donnée d'invités sur cette période." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-primary/10 rounded-2xl px-5 py-4">
              <span className="text-4xl font-bold text-primary">{avgInvites.global}</span>
              <div>
                <p className="font-semibold">invités en moyenne</p>
                <p className="text-xs text-muted-foreground">Tous types confondus sur la période</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {avgInvites.byType.map((item, i) => (
                <div key={i} className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-sm truncate text-muted-foreground">{item.type}</span>
                  <span className="font-bold text-foreground tabular-nums">{item.avg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Promotions */}
      {promotions.length > 0 && (
        <Section
          title="Performance des promotions"
          subtitle={`${promotions.filter(p => p.statut === 'Envoyée').length} promotion(s) envoyée(s)`}
          action={<Link to="/promotions" className="text-xs text-primary hover:underline flex items-center gap-1"><Tag size={12} /> Gérer</Link>}
        >
          <div className="space-y-3">
            {promotions.filter(p => p.nb_envois > 0).length === 0 && (
              <Empty text="Aucune promotion envoyée pour l'instant." />
            )}
            {promotions.filter(p => p.nb_envois > 0).map(promo => {
              const reps = promoReponses.filter(r => r.promotion_id === promo.id);
              const acceptations = reps.filter(r => r.reponse === 'Accepté').length;
              const refus = reps.filter(r => r.reponse === 'Refusé').length;
              const envois = promo.nb_envois || 0;
              const convPct = envois > 0 ? Math.round((acceptations / envois) * 100) : 0;
              const ca = acceptations * (promo.prix || 0);
              return (
                <div key={promo.id} className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-xl">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm">{promo.titre}</span>
                    <span className="text-xs font-bold text-amber-600">{ca.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div><p className="font-bold">{envois}</p><p className="text-muted-foreground">Envois</p></div>
                    <div><p className="font-bold text-emerald-600">{acceptations}</p><p className="text-muted-foreground">Acceptés</p></div>
                    <div><p className="font-bold text-red-500">{refus}</p><p className="text-muted-foreground">Refus</p></div>
                    <div><p className="font-bold text-primary">{convPct}%</p><p className="text-muted-foreground">Conversion</p></div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${convPct}%` }} />
                  </div>
                </div>
              );
            })}
            {/* Total CA promotions */}
            {promoReponses.filter(r => r.reponse === 'Accepté').length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-sm font-semibold">CA total généré par les promotions</span>
                <span className="text-xl font-bold text-amber-600">
                  {promoReponses.filter(r => r.reponse === 'Accepté').reduce((s, r) => s + (r.promotion_prix || 0), 0).toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 5. Vision N+1 */}
      <Section
        title={`Vision ${nextYear}`}
        subtitle={
          pctObjectif !== null
            ? `${totalNextYear} événements réservés — objectif : ${objectifAnnuel} (${pctObjectif}%)`
            : `${totalNextYear} événements réservés pour ${nextYear}`
        }
        action={
          <Link to="/parametres-entreprise" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Target size={12} /> Définir l'objectif
          </Link>
        }
      >
        {/* Barre de progression objectif */}
        {pctObjectif !== null && (
          <div className="space-y-1 mb-5">
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${pctObjectif}%`,
                  backgroundColor: pctObjectif >= 80 ? '#059669' : pctObjectif >= 50 ? '#f59e0b' : '#dc2626'
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pctObjectif}% de l'objectif atteint</p>
          </div>
        )}

        {/* Grille 12 mois */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {nextYearMonthData.map((m, i) => {
            const pct = maxMonth > 0 ? m.count / maxMonth : 0;
            const color =
              m.count === 0 ? 'bg-red-50 border-red-200 text-red-500' :
              pct >= 0.7 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              pct >= 0.3 ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-orange-50 border-orange-200 text-orange-600';
            return (
              <div key={i} className={`rounded-xl border px-3 py-3 text-center ${color}`}>
                <p className="text-xs font-medium uppercase tracking-wide">{m.mois}</p>
                <p className="text-2xl font-bold leading-none mt-1">{m.count}</p>
                <p className="text-[10px] mt-0.5 opacity-70">{m.count === 0 ? 'vide' : m.count === 1 ? 'évén.' : 'évén.'}</p>
              </div>
            );
          })}
        </div>
      </Section>
      </>}
    </div>
  );
}

function Section({ title, subtitle, children, action, icon: Icon }) {
   return (
     <div className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
       <div className="flex items-start justify-between gap-2">
         <div className="flex items-start gap-3">
           {Icon && <Icon size={20} className="text-primary mt-0.5 shrink-0" />}
           <div>
             <h3 className="font-semibold text-base">{title}</h3>
             {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
           </div>
         </div>
         {action && <div>{action}</div>}
       </div>
       {children}
     </div>
   );
 }

function Empty({ text }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{text}</p>;
}