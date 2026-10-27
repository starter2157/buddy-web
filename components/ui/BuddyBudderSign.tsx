/**
 * The hero lettering from the login screen: two wooden signboards nailed to a
 * post, pointing opposite ways. Drawn rather than imported so it scales and
 * recolours with the tokens.
 */
export function BuddyBudderSign() {
  return (
    <h1 aria-label="Buddy Budder" className="relative m-0 h-[250px] w-[300px]">
      <span
        aria-hidden="true"
        className="absolute left-[141px] top-[6px] box-border h-[244px] w-[18px] rounded-t-md border-[3px] border-wood-dark bg-wood-post"
      />

      <span
        aria-hidden="true"
        className="absolute left-[34px] top-[36px] box-border flex h-[78px] w-[252px] -rotate-[4deg] items-center justify-center pr-[18px]"
      >
        <svg width="252" height="78" viewBox="0 0 252 78" className="absolute left-0 top-0">
          <path
            d="M4 4 H214 L248 39 L214 74 H4 Z"
            className="fill-wood-sign stroke-wood-dark"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M16 26 H120 M30 52 H190"
            className="stroke-wood-post"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="relative font-logo text-[46px] font-bold leading-none tracking-[3px] text-card [text-shadow:0_3px_0_theme(colors.wood-dark)]">
          BUDDY
        </span>
      </span>

      <span
        aria-hidden="true"
        className="absolute left-[14px] top-[134px] box-border flex h-[78px] w-[272px] rotate-[3deg] items-center justify-center pl-[20px]"
      >
        <svg width="272" height="78" viewBox="0 0 272 78" className="absolute left-0 top-0">
          <path
            d="M38 4 H268 V74 H38 L4 39 Z"
            className="fill-primary stroke-primary-stroke"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M70 24 H200 M90 54 H250"
            className="stroke-link"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="relative font-logo text-[46px] font-bold leading-none tracking-[3px] text-card [text-shadow:0_3px_0_theme(colors.primary-stroke)]">
          BUDDER
        </span>
      </span>
    </h1>
  );
}
