import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { ALRYCK_CRISTAL_URL } from '@/lib/brandAssets';
import {
  LayoutDashboard, Users, CalendarCheck, UserCircle,
  PartyPopper, CalendarRange,
  ArrowLeft, BookOpen, BarChart2,
  Settings, TrendingUp, Menu, X,
  Rocket, LogOut, CreditCard, FlaskConical, BadgeCheck, FileCheck
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import NotificationBell from '@/components/NotificationBell';
import { useQuery } from '@tanstack/react-query';
import { ModulesContext, MODULES_DEFAULTS } from '@/contexts/ModulesContext';
import { isToday, parseISO } from 'date-fns';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import UserWorkspaceMenu from '@/components/UserWorkspaceMenu';
import { useVitrineCompletion } from '@/hooks/useVitrineCompletion';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { ROLES, hasRole, isBackOffice } from '@/lib/roles';

// ─── Définition des sections ──────────────────────────────────────────────────

// moduleKey = null → toujours visible
const PILOTAGE_NAV = [
  { id: 'accueil', label: 'Tableau de bord', mobileLabel: 'Accueil', icon: LayoutDashboard, path: '/Dashboard', moduleKey: null },
  { id: 'evenements', label: 'Événements', mobileLabel: 'Événts', icon: PartyPopper, path: '/Evenements', moduleKey: null },
  { id: 'clients-prospects', label: 'Clients & Prospects', mobileLabel: 'Clients', icon: UserCircle, path: '/Clients', moduleKey: null },
  { id: 'calendrier', label: 'Calendrier', mobileLabel: 'Calendrier', icon: CalendarRange, path: '/Planning', moduleKey: null },
  { id: 'contrats', label: 'Contrats', mobileLabel: 'Contrats', icon: FileCheck, path: '/contrats', moduleKey: null },
  { id: 'facturation', label: 'Facturation', mobileLabel: 'Factures', icon: TrendingUp, path: '/facturation', moduleKey: 'facturation' },
  { id: 'ma-vitrine', label: 'Ma Vitrine', mobileLabel: 'Vitrine', icon: BadgeCheck, path: '/ma-vitrine', moduleKey: null },
];

const EQUIPE_NAV = [
  { id: 'equipe-planning', label: 'Équipe & Extras', mobileLabel: 'Équipe', icon: Users, path: '/equipe-partenaires', moduleKey: 'equipe' },
  { id: 'partenaires-lieux', label: 'Partenaires', mobileLabel: 'Partenaires', icon: Users, path: '/partenaires-lieux', moduleKey: 'prestataires' },
];

const OUTILS_NAV = [
  { id: 'bibliotheque', label: 'Bibliothèque', mobileLabel: 'Biblio', icon: BookOpen, path: '/bibliotheque', moduleKey: null },
  { id: 'medias', label: 'Galerie & Médias', mobileLabel: 'Médias', icon: BarChart2, path: '/medias', moduleKey: 'medias' },
  { id: 'promotions', label: 'Promotions', mobileLabel: 'Promos', icon: Rocket, path: '/promotions', moduleKey: 'promotions' },
];

const ANALYSE_NAV = [
  { id: 'analyse', label: 'Analyse', mobileLabel: 'Analyse', icon: BarChart2, path: '/analyse', moduleKey: 'analyse' },
  { id: 'developpement', label: 'Développement', mobileLabel: 'Dév.', icon: Rocket, path: '/developpement', moduleKey: 'developpement' },
];

const COMPTE_NAV = [
  { id: 'parametres-entreprise', label: 'Paramètres entreprise', mobileLabel: 'Paramètres', icon: Settings, path: '/parametres-entreprise', moduleKey: null },
  { id: 'abonnements', label: 'Mon abonnement', mobileLabel: 'Abonnement', icon: CreditCard, path: '/abonnements', moduleKey: null },
  { id: 'test-animations', label: 'Test & Animations', mobileLabel: 'Test', icon: FlaskConical, path: '/test-animations', moduleKey: null },
];

function useAdminNav(modules) {
  const pilotage = PILOTAGE_NAV.filter(s => s.moduleKey === null || modules[s.moduleKey] !== false);
  const equipe = EQUIPE_NAV.filter(s => s.moduleKey === null || modules[s.moduleKey] !== false);
  const outils = OUTILS_NAV.filter(s => s.moduleKey === null || modules[s.moduleKey] !== false);
  const analyse = ANALYSE_NAV.filter(s => s.moduleKey === null || modules[s.moduleKey] !== false);
  return { pilotage, equipe, outils, analyse };
}

// ─── Trouver la section active selon le path courant ──────────────────────────
const SECONDARY_MAP = {
  '/promotions-historique': 'promotions',
  '/automatisations': 'parametres-entreprise',
  '/galerie-photos': 'medias',
  '/effectif-settings': 'equipe-planning',
  '/PlanningExtras': 'equipe-planning',
  '/Prestataires': 'partenaires-lieux',
  '/Lieux': 'partenaires-lieux',
  '/Equipe': 'equipe-planning',
  '/Extras': 'equipe-planning',
  '/Prospects': 'clients-prospects',
  '/rappels': 'evenements',
  '/business': 'facturation',
  '/parametres-entreprise': 'parametres-entreprise',
  '/parametres-hub': 'ma-vitrine',
  '/ma-vitrine': 'ma-vitrine',
};

function findActiveSection(allSections, pathname) {
  for (const section of allSections) {
    if (section.path === pathname) return section;
  }
  const sectionId = SECONDARY_MAP[pathname];
  if (sectionId) return allSections.find(s => s.id === sectionId);
  return null;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  useEffect(() => { setCanGoBack(window.history.length > 1); }, [location]);

  const { settings: company } = useOwnerCompanySettings();
  const saved = company?.modules_actifs || {};
  const modules = Object.fromEntries(
    Object.keys(MODULES_DEFAULTS).map(k => [k, saved[k] === undefined ? MODULES_DEFAULTS[k] : saved[k]])
  );
  // `user.role` ne renvoyait que le premier rôle du contexte, dans le vocabulaire Base44.
  // Un propriétaire porte `Owner` puis `Admin` : le test sur la chaîne `'admin'` échouait
  // donc pour lui, et le patron de l'entreprise se retrouvait avec le menu réduit d'un
  // extra. Même chose pour `'prestataire'`, devenu `Partner` côté serveur.
  const isAdmin = isBackOffice(user);
  const isPrestataire = hasRole(user, ROLES.Partner);

  const { data: rappelsAujourdhui = [] } = useQuery({
    queryKey: ['rappels-badge'],
    queryFn: () => base44.entities.Rappel.list('-date_rappel', 200),
    enabled: isAdmin,
    select: (data) => data.filter(r => r.statut === 'En attente' && r.date_rappel && isToday(parseISO(r.date_rappel))),
    refetchInterval: 60000,
  });

  const vitrineCompletion = useVitrineCompletion();
  const DOT_COLORS = { red: '#ef4444', orange: '#f97316', green: '#10b981' };
  const vitrineDotColor = isAdmin && !vitrineCompletion.isLoading ? DOT_COLORS[vitrineCompletion.color] : null;

  const { pilotage: pilotageNav, equipe: equipeNav, outils: outilsNav, analyse: analyseNav } = useAdminNav(modules);
  const allAdminSections = [...pilotageNav, ...equipeNav, ...outilsNav, ...analyseNav, ...COMPTE_NAV];

  const extraNav = [{ path: '/MonPlanning', label: 'Mon Planning', icon: CalendarCheck }];
  const prestataireNav = [{ path: '/MonEspacePrestataire', label: 'Mon Planning', icon: CalendarRange }];

  const [mobileOpen, setMobileOpen] = useState(false);

  // Bloquer le scroll du body sur iOS quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const activeSection = isAdmin ? findActiveSection(allAdminSections, location.pathname) : null;
  const activeSectionId = activeSection?.id || 'accueil';

  if (!isAdmin) {
    // Layout simplifié pour extras / prestataires
    const navItems = isPrestataire ? prestataireNav : extraNav;
    return (
      <div className="min-h-screen flex bg-background">
        <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
          <SidebarHeader user={user} isAdmin={false} isPrestataire={isPrestataire} company={company} />
          <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            {navItems.map(({ path, label, icon: Icon }) => (
              <SidebarLink key={path} path={path} label={label} Icon={Icon} active={location.pathname === path} />
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto flex flex-col">
          <ModulesContext.Provider value={modules}>
            <Outlet />
          </ModulesContext.Provider>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar desktop (≥ md) ── */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
        <SidebarHeader user={user} isAdmin company={company} />
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 pb-1">Pilotage quotidien</p>
          {pilotageNav.map(section => (
            <SidebarLink key={section.id} path={section.path} label={section.label} Icon={section.icon} active={activeSectionId === section.id} dotColor={section.id === 'ma-vitrine' ? vitrineDotColor : undefined} />
          ))}
          <div className="pt-4 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3">Équipe & Partenaires</p>
          </div>
          {equipeNav.map(section => (
            <SidebarLink key={section.id} path={section.path} label={section.label} Icon={section.icon} active={activeSectionId === section.id} />
          ))}
          <div className="pt-4 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3">Outils</p>
          </div>
          {outilsNav.map(section => (
            <SidebarLink key={section.id} path={section.path} label={section.label} Icon={section.icon} active={activeSectionId === section.id} />
          ))}
          <div className="pt-4 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3">Analyse & Croissance</p>
          </div>
          {analyseNav.map(section => (
            <SidebarLink key={section.id} path={section.path} label={section.label} Icon={section.icon} active={activeSectionId === section.id} />
          ))}
          <div className="pt-4 border-t border-sidebar-border/20 space-y-0.5">
            {COMPTE_NAV.map(section => (
              <SidebarLink key={section.id} path={section.path} label={section.label} Icon={section.icon} active={location.pathname === section.path} />
            ))}
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={17} />
              <span>Se déconnecter</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 bg-sidebar border-b border-sidebar-border" style={{ height: 56, backgroundColor: '#1e1b4b' }}>
        {/* Gauche : hamburger + logo Alryck + nom */}
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(v => !v)} className="text-white p-2 shrink-0">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <img
            src={ALRYCK_CRISTAL_URL}
            alt="Alryck"
            style={{ width: 52, height: 52, objectFit: 'contain', flexShrink: 0 }}
          />

        </div>

        {/* Droite : badge abonnement + logo entreprise + cloche */}
        <div className="flex items-center gap-2 shrink-0">
          {company?.subscription_level && (
            <SubscriptionBadge level={company.subscription_level} />
          )}
          {company?.company_logo_url
            ? <img src={company.company_logo_url} alt={company?.company_name} className="rounded-lg object-contain bg-white/10" style={{ height: 28, width: 28 }} />
            : company?.company_name
              ? <div className="flex items-center justify-center rounded-lg bg-white/20 text-white text-xs font-bold" style={{ height: 28, width: 28 }}>{company.company_name.slice(0,2).toUpperCase()}</div>
              : null
          }
          <NotificationBell panelSide="bottom" />
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="md:hidden fixed left-0 top-0 z-40 w-72 bg-sidebar text-sidebar-foreground flex flex-col"
            style={{ height: '100dvh' }}
          >
            {/* Espace pour la top bar */}
            <div className="shrink-0 h-[56px]" />

            {/* Zone scrollable avec déco + logout en bas */}
            <nav
              className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingBottom: 80 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 pb-1">Pilotage quotidien</p>
              {pilotageNav.map(section => {
                const Icon = section.icon;
                const isActive = activeSectionId === section.id;
                return (
                  <Link key={section.id} to={section.path} onClick={() => setMobileOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white')}>
                    <Icon size={18} />
                    <span className="flex-1">{section.label}</span>
                    {section.id === 'ma-vitrine' && vitrineDotColor && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: vitrineDotColor }} />
                    )}
                  </Link>
                );
              })}
              <div className="pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3">Équipe & Partenaires</p>
              </div>
              {equipeNav.map(section => {
                const Icon = section.icon;
                const isActive = activeSectionId === section.id;
                return (
                  <Link key={section.id} to={section.path} onClick={() => setMobileOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white')}>
                    <Icon size={18} />
                    <span>{section.label}</span>
                  </Link>
                );
              })}
              <div className="pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3">Outils</p>
              </div>
              {outilsNav.map(section => {
                const Icon = section.icon;
                const isActive = activeSectionId === section.id;
                return (
                  <Link key={section.id} to={section.path} onClick={() => setMobileOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white')}>
                    <Icon size={18} />
                    <span>{section.label}</span>
                  </Link>
                );
              })}
              <div className="pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3">Analyse & Croissance</p>
              </div>
              {analyseNav.map(section => {
                const Icon = section.icon;
                const isActive = activeSectionId === section.id;
                return (
                  <Link key={section.id} to={section.path} onClick={() => setMobileOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white')}>
                    <Icon size={18} />
                    <span>{section.label}</span>
                  </Link>
                );
              })}
              {/* Compte & technique */}
              <div className="pt-3 border-t border-sidebar-border/30 space-y-1">
                {COMPTE_NAV.map(section => {
                  const Icon = section.icon;
                  const isActive = location.pathname === section.path;
                  return (
                    <Link key={section.id} to={section.path} onClick={() => setMobileOpen(false)}
                      className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                        isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white')}>
                      <Icon size={18} />
                      <span>{section.label}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={14} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </nav>
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto flex flex-col" style={{ paddingTop: 0 }}>
        {/* Spacer mobile top bar */}
        <div className="md:hidden h-[56px] shrink-0" />
        <OnboardingProgress />
        <div className="hidden md:flex items-center px-6 pt-4">
          <button
            onClick={() => canGoBack && navigate(-1)}
            disabled={!canGoBack}
            className={`flex items-center gap-1.5 text-sm transition-colors ${canGoBack ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground/40 cursor-not-allowed'}`}
          >
            <ArrowLeft size={16} /> Retour
          </button>
        </div>


        <div className="flex-1 overflow-auto">
          <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
            <ModulesContext.Provider value={modules}>
              <Outlet />
            </ModulesContext.Provider>
          </div>
        </div>

      </main>

    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SidebarHeader({ user, isAdmin, isPrestataire, company }) {
  return (
    <div className="border-b border-sidebar-border shrink-0">
      {/* ── Marque Alryck (plateforme SaaS) ── */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 24 }}>
          <img
            src={ALRYCK_CRISTAL_URL}
            alt="Alryck"
            style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
          />
        </div>
        {isAdmin && <NotificationBell />}
      </div>

      {/* ── Espace de travail (entreprise cliente) ── */}
      <div className="px-2 pb-3">
        <UserWorkspaceMenu user={user} company={company} />
      </div>
    </div>
  );
}

// ─── Badge abonnement coloré ──────────────────────────────────────────────────
const BADGE_SUB = {
  Gratuit:   { bg: '#64748b', color: '#fff' },
  Essentiel: { bg: '#0e7490', color: '#fff' },
  Pro:       { bg: '#7c3aed', color: '#fff' },
  Business:  { bg: '#F6E7C1', color: '#1e1b4b' },
};

function SubscriptionBadge({ level, small }) {
  const s = BADGE_SUB[level] || BADGE_SUB.Gratuit;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: small ? 9 : 10,
        fontWeight: 700,
        padding: small ? '1px 6px' : '2px 8px',
        borderRadius: 999,
        letterSpacing: '0.03em',
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {level}
    </span>
  );
}

function SidebarLink({ path, label, Icon, active, badge, indent, dotColor }) {
  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-3 rounded-lg text-sm font-medium transition-all',
        indent ? 'px-3 py-2 ml-2' : 'px-3 py-2.5',
        active
          ? 'bg-sidebar-accent text-white'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white'
      )}
    >
      <Icon size={indent ? 15 : 17} />
      <span className="flex-1">{label}</span>
      {dotColor && (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
      )}
      {badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">{badge}</span>
      )}
    </Link>
  );
}