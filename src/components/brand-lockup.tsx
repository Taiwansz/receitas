import Image from "next/image";
import clsx from "clsx";

export function BrandLockup({
  compact = false,
  inverse = false,
  showMascot = true,
  className,
}: {
  compact?: boolean;
  inverse?: boolean;
  showMascot?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center",
        compact ? "gap-2.5" : "gap-3.5",
        className,
      )}
      aria-label="André da Empada"
    >
      {showMascot ? (
        <span
          className={clsx(
            "grid shrink-0 place-items-center overflow-hidden rounded-full border-2",
            compact ? "h-10 w-10" : "h-14 w-14",
            inverse
              ? "border-[#ffcb32] bg-[#ffb900]"
              : "border-[#8f1018] bg-[#ffbd16]",
          )}
        >
          <Image
            src="/brand/andre-mascot.png"
            alt=""
            width={96}
            height={96}
            className={clsx(
              "h-auto max-w-none",
              compact ? "w-[58px] translate-y-1" : "w-[78px] translate-y-1.5",
            )}
          />
        </span>
      ) : null}
      <span className="leading-none">
        <span
          className={clsx(
            "brand-display block font-black uppercase tracking-[-.045em]",
            compact ? "text-[1.32rem]" : "text-[1.7rem]",
            inverse ? "text-[#fff4dc]" : "text-[#8f1018]",
          )}
        >
          André
        </span>
        <span
          className={clsx(
            "brand-display block font-extrabold tracking-[-.025em]",
            compact ? "mt-0.5 text-[.72rem]" : "mt-0.5 text-[.9rem]",
            inverse ? "text-[#ffcb32]" : "text-[#5f0a10]",
          )}
        >
          da Empada
        </span>
      </span>
    </div>
  );
}
