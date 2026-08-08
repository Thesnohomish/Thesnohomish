const DEFAULT_LOGO_SRC = '/snohomish-logo.svg';

export function BrandLogo({ footer = false, src = DEFAULT_LOGO_SRC }: { footer?: boolean; src?: string }) {
  return (
    <div className="flex shrink-0 items-center text-left">
      <img
        src={src || DEFAULT_LOGO_SRC}
        alt="The Snohomish"
        className={footer ? 'h-20 w-64 object-contain object-left' : 'h-12 w-40 object-contain object-left sm:w-48'}
      />
    </div>
  );
}
