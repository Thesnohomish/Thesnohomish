const OFFICIAL_LOGO_SRC = '/the-snohomish-logo.svg';

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <div className="flex shrink-0 items-center text-left">
      <img
        src={OFFICIAL_LOGO_SRC}
        alt="The Snohomish"
        className={footer
          ? 'h-44 w-44 rounded-full object-cover ring-2 ring-[#fff500]'
          : 'h-16 w-16 rounded-full object-cover ring-2 ring-[#fff500] sm:h-20 sm:w-20'}
      />
    </div>
  );
}
