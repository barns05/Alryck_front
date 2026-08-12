import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, getYear, parseISO, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import StatistiquesEquipeRH from './StatistiquesEquipeRH';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

export default function StatistiquesEquipe() {
  const currentYear = getYear(new Date());

  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => base44.entities.Extra.list('-created_date'),
  });
  const { data: collaborateurs = [] } = useQuery({
    queryKey: ['collaborateurs'],
    queryFn: () => base44.entities.Collaborateur.list(),
  });
  const { data: evenements = [] } = useQuery({
    queryKey: ['evenements-stats'],
    queryFn: () => base44.entities.Evenement.list('-date', 500),
  });
  const { data: fichesList = [] } = useQuery({
    queryKey: ['fiches-service-stats'],
    queryFn: () => base44.entities.FicheService.list('-created_date', 1000),
  });
  const { data: rhSettingsList = [] } = useQuery({
    queryKey: ['rh-settings'],
    queryFn: () => base44.entities.RHSettings.list(),
  });
  const rhSettings = rhSettingsList[0] || {};

  // Extras actifs / inactifs
  const extrasActifs = extras.filter(e => e.actif !== false).length;
  const extrasInactifs = extras.length - extrasActifs;

  // Événements de l'année en cours
  const eventsThisYear = evenements.filter(e => e.date && getYear(parseISO(e.date)) === currentYear);

  // Jours travaillés par extra (basé sur les fiches de service)
  const joursParExtra = {};
  fichesList.forEach(f => {
    if (!f.extra_id || !f.evenement_id) return;
    const ev = evenements.find(e => e.id === f.evenement_id);
    if (!ev || !ev.date) return;
    if (getYear(parseISO(ev.date)) !== currentYear) return;
    joursParExtra[f.extra_id] = (joursParExtra[f.extra_id] || 0) + 1;
  });

  // Top extras par jours travaillés
  const topExtras = Object.entries(joursParExtra)
    .map(([extraId, jours]) => {
      const extra = extras.find(e => e.id === extraId);
      return { nom: extra ? `${extra.prenom || ''} ${extra.nom || ''}`.trim() : 'Inconnu', jours };
    })
    .sort((a, b) => b.jours - a.jours)
    .slice(0, 10);

  // Répartition par service/poste (si disponible dans les fiches)
  const posteCount = {};
  fichesList.forEach(f => {
    const ev = evenements.find(e => e.id === f.evenement_id);
    if (!ev || !ev.date || getYear(parseISO(ev.date)) !== currentYear) return;
    const poste = f.poste || f.service_nom || 'Non défini';
    posteCount[poste] = (posteCount[poste] || 0) + 1;
  });

  const posteData = Object.entries(posteCount)
    .map(([poste, count]) => ({ poste, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalJours = Object.values(joursParExtra).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Extras actifs" value={extrasActifs} color="text-blue-600" />
        <StatCard label="Collaborateurs" value={collaborateurs.length} color="text-purple-600" />
        <StatCard label={`Événements ${currentYear}`} value={eventsThisYear.length} color="text-emerald-600" />
        <StatCard label={`Jours travaillés ${currentYear}`} value={totalJours} color="text-amber-600" />
      </div>

      {/* Top extras */}
      {topExtras.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-base mb-4">Top extras — jours travaillés en {currentYear}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topExtras} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} jour${v > 1 ? 's' : ''}`, 'Jours travaillés']} />
              <Bar dataKey="jours" radius={[0, 6, 6, 0]}>
                {topExtras.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Répartition par poste */}
      {posteData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-base mb-4">Répartition par poste en {currentYear}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={posteData} margin={{ left: 8, right: 16 }}>
              <XAxis dataKey="poste" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} affectation${v > 1 ? 's' : ''}`, 'Postes']} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {posteData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {topExtras.length === 0 && posteData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">Pas encore de données pour {currentYear}</p>
          <p className="text-sm mt-1">Les statistiques s'alimentent au fil des fiches de service.</p>
        </div>
      )}

      {/* Module RH enrichi */}
      {rhSettings?.module_rh_actif && (
        <StatistiquesEquipeRH rhSettings={rhSettings} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}