const OFFICIAL_LOGO_SRC = "/the-snohomish-logo.svg";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <div className="flex shrink-0 items-center text-left">
      <img
        src={OFFICIAL_LOGO_SRC}
        alt="The Snohomish"
        className={
          footer
            ? "h-44 w-44 rounded-full bg-white object-contain p-1 ring-2 ring-[#fff500]"
            : "h-[76px] w-[76px] rounded-full bg-white object-contain p-0.5 shadow-[0_0_0_3px_#fff500,0_8px_24px_#0008] sm:h-[88px] sm:w-[88px]"
        }
      />
    </div>
  );
}
