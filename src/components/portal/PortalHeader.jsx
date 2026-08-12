import { ALRYCK_CRISTAL_URL } from '@/lib/brandAssets';

export default function PortalHeader({ subtitle, userLabel, userSub, portalType, couleurTheme, logoSize = 28, subtitlePosition = 'under' }) {
  const subtitleOnRight = subtitlePosition === 'right';
  return (
    <div className="bg-sidebar text-white px-5 py-3" style={couleurTheme ? { backgroundColor: couleurTheme } : undefined}>
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        {/* Gauche : Alryck logo (+ sous-titre si subtitlePosition='under') */}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <img src={ALRYCK_CRISTAL_URL} alt="Alryck" style={{ width: logoSize, height: logoSize, objectFit: 'contain' }} />
          </div>
          {!subtitleOnRight && subtitle && <p className="text-white/50 text-[11px] mt-0.5">{subtitle}</p>}
        </div>

        {/* Séparateur central discret */}
        <div className="flex-1" />

        {/* Droite : sous-titre (si subtitlePosition='right') OU prénom client + type événement */}
        {subtitleOnRight ? (
          <div className="text-right shrink-0 max-w-[180px]">
            {subtitle && <p className="text-white/70 text-sm font-medium">{subtitle}</p>}
            {userLabel && <p className="text-sm font-semibold truncate">{userLabel}</p>}
            {userSub && <p className="text-white/50 text-[11px]">{userSub}</p>}
          </div>
        ) : (
          <div className="text-right shrink-0 max-w-[140px]">
            {userLabel && <p className="text-sm font-semibold truncate">{userLabel}</p>}
            {userSub && <p className="text-white/50 text-[11px]">{userSub}</p>}
          </div>
        )}
      </div>
    </div>
  );
}