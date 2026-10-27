const SIZES = {
  hero: {
    numeral: 'text-[72px] text-stroke-logo-lg',
    word: 'text-[27px] tracking-[1px]',
    sub: 'text-[20.5px] tracking-[0.5px] text-stroke-lime-lg',
    gap: 'gap-1',
  },
  header: {
    numeral: 'text-[44px] text-stroke-logo',
    word: 'text-[16px]',
    sub: 'text-[12px] text-stroke-lime',
    gap: 'gap-[3px]',
  },
} as const;

/** The "3 SANJORN SONSAMPHAN" lockup, drawn as type rather than an image. */
export function Logo({ size = 'header' }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <div
      role="img"
      aria-label="3 Sanjorn Sonsamphan"
      className={`relative flex items-center font-logo font-bold ${s.gap}`}
    >
      <span className={`leading-[0.8] text-card ${s.numeral}`}>3</span>
      <div className="flex flex-col">
        <span className={`leading-none text-logo-orange ${s.word}`}>SANJORN</span>
        <span className={`leading-[1.1] text-logo-lime ${s.sub}`}>SONSAMPHAN</span>
      </div>
    </div>
  );
}
