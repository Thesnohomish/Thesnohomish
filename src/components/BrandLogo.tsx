const OFFICIAL_LOGO_SRC = '/the-snohomish-logo.svg';

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <div className="flex shrink-0 items-center text-left">
      <img
        src={OFFICIAL_LOGO_SRC}
        alt="The Snohomish"
        className={footer ? 'h-36 w-36 rounded-2xl object-contain' : 'h-16 w-16 rounded-xl object-contain'}
      />
    </div>
  );
}
