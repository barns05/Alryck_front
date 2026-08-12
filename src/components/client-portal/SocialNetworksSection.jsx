import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Couleurs de marque officielles
const BRAND_CONFIG = {
  instagram: { color: '#E1306C', slug: 'instagram' },
  facebook:  { color: '#1877F2', slug: 'facebook' },
  tiktok:    { color: '#000000', slug: 'tiktok' },
  youtube:   { color: '#FF0000', slug: 'youtube' },
  linkedin:  { color: '#0A66C2', slug: 'linkedin' },
  twitter:   { color: '#000000', slug: 'x' },
  pinterest: { color: '#E60023', slug: 'pinterest' },
  snapchat:  { color: '#FFFC00', slug: 'snapchat' },
};

function SocialIcon({ icon }) {
  const config = BRAND_CONFIG[icon?.toLowerCase()];
  if (!config) return <span className="text-base">🌐</span>;

  const src = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${config.slug}.svg`;

  return (
    <span
      className="w-5 h-5 flex items-center justify-center shrink-0"
      style={{ filter: `invert(0)` }}
    >
      <img
        src={src}
        alt={icon}
        className="w-5 h-5"
        style={{ filter: `brightness(0) saturate(100%)`, color: config.color }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </span>
  );
}

export default function SocialNetworksSection({ networks: propNetworks }) {
  // Si propNetworks est explicitement passé (même vide []), on l'utilise sans requêter.
  // Seulement quand propNetworks === undefined (pas de prop) on retombe sur la query is_owner.
  const hasProp = propNetworks !== undefined;
  const { data: companyList = [] } = useQuery({
    queryKey: ['company-settings-social'],
    queryFn: () => base44.entities.CompanySettings.list().then(r => r.filter(cs => cs.is_owner === true)),
    enabled: !hasProp,
  });

  const networks = (hasProp ? propNetworks : companyList[0]?.social_networks || []).filter(n => n.url && n.name);

  if (networks.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      <h3 className="font-semibold text-base text-center">Suivez-nous ✨</h3>
      <div className="flex flex-wrap justify-center gap-3">
        {networks.map((network, i) => {
          const config = BRAND_CONFIG[network.icon?.toLowerCase()];
          const brandColor = config?.color || '#64748b';
          return (
            <a
              key={i}
              href={network.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium hover:scale-105 text-white"
              style={{ backgroundColor: brandColor }}
            >
              {config && (
                <img
                  src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${config.slug}.svg`}
                  alt={network.name}
                  className="w-4 h-4 shrink-0"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              {network.name}
            </a>
          );
        })}
      </div>
    </div>
  );
}