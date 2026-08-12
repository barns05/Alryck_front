import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Star, Crown, Building2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import PlanCard from '@/components/abonnements/PlanCard';
import Countdown from '@/components/abonnements/Countdown';
import { useOwnerCompanySettings } from '@/hooks/useOwnerCompanySettings';
import { getPlanSections, MACARON, PLAN_INTRO, getPlanIntro, PRIX, PRIX_BARRE, getCategorie } from '@/components/abonnements/planDetailData';

// Prix et getCategorie importés depuis planDetailData (source unique)

// ─── Proposition A — Features contextualisées depuis planDetailData ───────────

const MODULES_GRATUIT = [
  {
    titre: 'Vitrine',
    items: [
      { label: 'Fiche établissement complète — nom, description, localisation, type de prestation visible sur l\'annuaire Alryck dès l\'inscription' },
      { label: 'Galerie 6 photos — présentez votre établissement et vos réalisations' },
    ],
  },
  {
    titre: 'Événements et clients',
    items: [
      { label: 'Événements et clients illimités — aucune limite sur le nombre' },
      { label: 'Calendrier et agenda — toutes vos dates en un coup d\'œil' },
    ],
  },
  {
    titre: 'Espace prospect',
    items: [
      { label: 'Lien unique personnalisé à partager avec vos prospects' },
      { label: 'Demande de date et disponibilité — le prospect soumet une demande, vous répondez directement' },
      { label: 'Réservation simple — sans suivi ni contrat' },
      { label: 'Messagerie centralisée — prospects et clients, tous vos échanges au même endroit' },
    ],
  },
  {
    titre: 'Documents',
    items: [
      { label: 'Partagez votre brochure PDF manuellement avec vos prospects' },
      { label: 'Envoi de fichiers et documents' },
    ],
  },
];

// Extrait les 4 premiers items isNew:true de toutes les sections d'un niveau
function getCardFeatures(level, categorie, metier) {
  const sections = getPlanSections(level, categorie, metier);
  const newItems = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.isNew && newItems.length < 4) {
        newItems.push(item);
      }
    }
    if (newItems.length >= 4) break;
  }
  return newItems;
}

// ─── Constellation ────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 38 }, (_, i) => ({
  x: ((i * 137.5) % 100).toFixed(2),
  y: ((i * 97.3 + 13) % 100).toFixed(2),
  r: i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.7,
  o: (0.03 + (i % 7) * 0.01).toFixed(2),
}));

const NAVY = '#1e1b4b';

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Abonnements() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [devCatOverride, setDevCatOverride] = useState(null);
  const [devLevelOverride, setDevLevelOverride] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { query } = useOwnerCompanySettings();
  const companyList = query.data ?? [];
  const company = companyList[0] || null;
  const currentLevel = devLevelOverride || company?.subscription_level || 'Gratuit';
  const metier = company?.metier || null;
  const categorie = devCatOverride || getCategorie(metier);
  const facturationDejaActive = company?.modules_actifs?.facturation === true;
  const restaurationIntegree = company?.restauration_integree === true;

  const updateMutation = useMutation({
    mutationFn: ({ level, withFacturation }) => base44.entities.CompanySettings.update(company.id, {
      subscription_level: level,
      modules_actifs: {
        ...(company?.modules_actifs || {}),
        facturation: withFacturation === true,
      },
    }),
    onSuccess: () => qc.invalidateQueries(['company-settings']),
  });

  const addFacturationMutation = useMutation({
    mutationFn: () => base44.entities.CompanySettings.update(company.id, {
      modules_actifs: { ...(company?.modules_actifs || {}), facturation: true },
    }),
    onSuccess: () => qc.invalidateQueries(['company-settings']),
  });

  const prenom = user?.full_name?.split(' ')[0] || user?.email || '';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at center, #2d2a6e 0%, ${NAVY} 70%)` }}
    >
      {/* Constellation SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.9 }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
        ))}
      </svg>

      <div className="relative px-4 py-8 md:px-8" style={{ zIndex: 2 }}>
        <div className="max-w-5xl mx-auto">

          {/* ── Hero premium ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex flex-col items-center mb-10 px-6 pt-1 pb-10"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex items-center justify-center"
              style={{ width: 144, height: 144 }}
            >
              <img
                src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/add7d9f16_file_00000000baa0724695dea66812e6a844.png"
                alt="ALRYCK"
                className="relative z-10"
                style={{ width: 144, height: 144, objectFit: 'contain' }}
              />
            </motion.div>

            <img
              src="https://media.base44.com/images/public/69b804640546049d1a7bf53a/54cebbb89_6C85E1F1-B178-4B34-980F-516CAA26E653.png"
              alt="ALRYCK"
              style={{
                height: 168,
                objectFit: 'contain',
                marginTop: -74,
                filter: 'drop-shadow(0px 0px 14px rgba(246,231,193,0.65)) drop-shadow(0px 0px 4px rgba(246,231,193,0.40))',
              }}
            />

            <div style={{
              width: '55%',
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(246,231,193,0.25) 20%, rgba(246,231,193,0.55) 50%, rgba(246,231,193,0.25) 80%, transparent 100%)',
              boxShadow: '0 0 8px rgba(246,231,193,0.15)',
              marginTop: -56,
              marginBottom: 0,
            }} />

            <div className="mt-6 text-center">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 300, color: 'rgba(246,231,193,0.90)', letterSpacing: '0.06em', lineHeight: 1.3 }}>
                {prenom ? `Bienvenue, ${prenom}` : 'Choisissez votre accès'}
              </h2>

              {metier && (
                <div className="mt-3 flex justify-center">
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 14px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    color: '#F6E7C1',
                    background: 'rgba(246,231,193,0.08)',
                    border: '1px solid rgba(246,231,193,0.22)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {metier}
                  </span>
                </div>
              )}

              <div className="mt-5 space-y-1">
                <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                  Choisissez votre accès de lancement
                </p>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.02em' }}>
                  Prix fondateurs garantis jusqu'au 31 décembre 2027
                </p>
              </div>
            </div>

            <Countdown />
          </motion.div>

          {/* ── Séparateur avant les cartes ── */}
          <div className="relative mb-8">
            <div style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(100,120,220,0.25) 20%, rgba(246,231,193,0.30) 50%, rgba(200,100,180,0.20) 80%, transparent 100%)',
              boxShadow: '0 0 8px rgba(246,231,193,0.08)',
            }} />
          </div>

          {/* ── Grille des cartes ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">

            {/* GRATUIT */}
            <PlanCard
              index={0}
              categorie={categorie}
              metier={metier}
              restaurationIntegree={restaurationIntegree}
              currentSubscriptionLevel={currentLevel}
              onConfirmLevel={(lvl, withFacturation) => updateMutation.mutate({ level: lvl, withFacturation })}
              crystalImageUrl="https://media.base44.com/images/public/69b804640546049d1a7bf53a/7be0b55e7_C55CA9E3-739F-4C22-BF06-3264ACEBB5B6.png"
              title="Gratuit"
              icon={<Zap size={17} />}
              accent="#94a3b8"
              glow="rgba(148,163,184,0.18)"
              amandaLabel="Amanda IA · Non inclus"
              amandaActive={false}
              modulesBlocs={MODULES_GRATUIT}
              isCurrent={currentLevel === 'Gratuit'}
              loading={updateMutation.isPending}
              buttonLabel="Offre gratuite"
              buttonStyle={{
                background: 'rgba(255,255,255,0.08)',
                color: currentLevel === 'Gratuit' ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.55)',
                cursor: 'not-allowed',
              }}
            />

            {/* ESSENTIEL */}
            <PlanCard
              index={1}
              categorie={categorie}
              metier={metier}
              restaurationIntegree={restaurationIntegree}
              currentSubscriptionLevel={currentLevel}
              facturationDejaActive={facturationDejaActive}
              onConfirmLevel={(lvl, withFacturation) => updateMutation.mutate({ level: lvl, withFacturation })}
              onAddFacturation={() => addFacturationMutation.mutate()}
              crystalImageUrl="https://media.base44.com/images/public/69b804640546049d1a7bf53a/5df4b8137_40AB57F7-CC66-4C3C-A62C-747B04F3F9D8.png"
              macaronImageUrl={MACARON.Essentiel.imageUrl}
              macaronLabel={MACARON.Essentiel.label}
              title="Essentiel"
              icon={<Star size={17} />}
              accent="#00D4FF"
              glow="rgba(0,212,255,0.22)"
              amandaLabel="Amanda IA · Niveau 1"
              amandaActive={true}
              intro={PLAN_INTRO.Essentiel}
              modules={getCardFeatures('Essentiel', categorie, metier)}
              prixLancement={PRIX.Essentiel[categorie]}
              prixBarre={PRIX_BARRE.Essentiel[categorie]}
              showLaunchBadge
              isCurrent={currentLevel === 'Essentiel'}
              buttonLabel="Passer Essentiel"
              buttonStyle={{
                background: currentLevel === 'Essentiel' ? 'rgba(255,255,255,0.08)' : '#00D4FF',
                color: currentLevel === 'Essentiel' ? 'rgba(255,255,255,0.30)' : NAVY,
                boxShadow: currentLevel === 'Essentiel' ? 'none' : '0 4px 18px rgba(0,212,255,0.30)',
              }}
            />

            {/* PRO */}
            <PlanCard
              index={2}
              categorie={categorie}
              metier={metier}
              restaurationIntegree={restaurationIntegree}
              currentSubscriptionLevel={currentLevel}
              facturationDejaActive={facturationDejaActive}
              onConfirmLevel={(lvl, withFacturation) => updateMutation.mutate({ level: lvl, withFacturation })}
              onAddFacturation={() => addFacturationMutation.mutate()}
              crystalImageUrl="https://media.base44.com/images/public/69b804640546049d1a7bf53a/966b4195c_AFA6BCF1-8E1F-474D-80A9-6CDF89CA79C9.png"
              macaronImageUrl={MACARON.Pro.imageUrl}
              macaronLabel={MACARON.Pro.label}
              title="Pro"
              icon={<Crown size={17} />}
              accent="#7c3aed"
              glow="rgba(124,58,237,0.28)"
              isRecommended
              amandaLabel="Amanda IA · Niveau 2"
              amandaActive={true}
              intro={getPlanIntro('Pro', categorie)}
              modules={getCardFeatures('Pro', categorie, metier)}
              prixLancement={PRIX.Pro[categorie]}
              prixBarre={PRIX_BARRE.Pro[categorie]}
              showLaunchBadge
              isCurrent={currentLevel === 'Pro'}
              buttonLabel="Passer Pro"
              buttonStyle={{
                background: currentLevel === 'Pro' ? 'rgba(255,255,255,0.08)' : '#7c3aed',
                color: currentLevel === 'Pro' ? 'rgba(255,255,255,0.30)' : '#fff',
                boxShadow: currentLevel === 'Pro' ? 'none' : '0 4px 18px rgba(124,58,237,0.35)',
              }}
            />

            {/* BUSINESS */}
            <PlanCard
              index={3}
              categorie={categorie}
              metier={metier}
              restaurationIntegree={restaurationIntegree}
              currentSubscriptionLevel={currentLevel}
              facturationDejaActive={facturationDejaActive}
              onConfirmLevel={(lvl, withFacturation) => updateMutation.mutate({ level: lvl, withFacturation })}
              onAddFacturation={() => addFacturationMutation.mutate()}
              crystalImageUrl="https://media.base44.com/images/public/69b804640546049d1a7bf53a/d57a45d75_68089AEB-F2E7-48BE-9065-EFFA426078B9.png"
              macaronImageUrl={MACARON.Business.imageUrl}
              macaronLabel={MACARON.Business.label}
              title="Business"
              icon={<Building2 size={17} />}
              accent="#EED9B7"
              glow="rgba(246,231,193,0.22)"
              isBusiness
              amandaLabel="Amanda IA · Niveau 3"
              amandaActive={true}
              intro={getPlanIntro('Business', categorie)}
              modules={getCardFeatures('Business', categorie, metier)}
              prixLancement={PRIX.Business[categorie]}
              prixBarre={PRIX_BARRE.Business[categorie]}
              showLaunchBadge
              isCurrent={currentLevel === 'Business'}
              buttonLabel="Démo gratuite"
              buttonStyle={{
                background: currentLevel === 'Business'
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #F6E7C1 0%, #DCC7A1 100%)',
                color: currentLevel === 'Business' ? 'rgba(255,255,255,0.30)' : NAVY,
                boxShadow: currentLevel === 'Business' ? 'none' : '0 4px 20px rgba(246,231,193,0.28)',
              }}
            />
          </div>

          {/* ── DEV MODE — sélecteurs niveau + catégorie ── */}
          <div className="mt-10 flex justify-center">
            <div style={{
              display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
              padding: '8px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(6px)',
            }}>
              {/* Label DEV */}
              <span style={{ fontSize: 9, color: 'rgba(255,100,100,0.60)', letterSpacing: '0.12em', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>
                ⚙ dev
              </span>

              {/* Séparateur vertical */}
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />

              {/* Niveau */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                  niveau
                </span>
                {['Gratuit', 'Essentiel', 'Pro', 'Business'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setDevLevelOverride(devLevelOverride === lvl ? null : lvl)}
                    style={{
                      padding: '2px 9px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                      cursor: 'pointer',
                      border: devLevelOverride === lvl ? '1px solid rgba(246,231,200,0.55)' : '1px solid rgba(255,255,255,0.12)',
                      background: devLevelOverride === lvl ? 'rgba(246,231,200,0.18)' : 'rgba(255,255,255,0.05)',
                      color: devLevelOverride === lvl ? '#F6E7C1' : 'rgba(255,255,255,0.40)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Séparateur vertical */}
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />

              {/* Catégorie */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                  cat.
                </span>
                {['A', 'B', 'C'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setDevCatOverride(devCatOverride === cat ? null : cat)}
                    style={{
                      padding: '2px 9px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      border: devCatOverride === cat ? '1px solid rgba(246,231,200,0.55)' : '1px solid rgba(255,255,255,0.12)',
                      background: devCatOverride === cat ? 'rgba(246,231,200,0.18)' : 'rgba(255,255,255,0.05)',
                      color: devCatOverride === cat ? '#F6E7C1' : 'rgba(255,255,255,0.40)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Reset global */}
              {(devLevelOverride || devCatOverride) && (
                <>
                  <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
                  <button
                    onClick={() => { setDevLevelOverride(null); setDevCatOverride(null); }}
                    style={{ fontSize: 10, color: 'rgba(255,100,100,0.50)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'monospace' }}
                  >
                    reset
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="mt-6 text-center pb-10">
            <button
              onClick={() => navigate('/Dashboard')}
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-medium transition-all"
              style={{
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.30)',
                color: 'rgba(255,255,255,0.80)',
                background: 'rgba(255,255,255,0.15)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              Continuer avec le gratuit
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}