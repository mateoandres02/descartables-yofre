export function Loader({ fullScreen = false }) {
  const wrapClass = fullScreen
    ? "fixed inset-0 z-[9999]"
    : "absolute inset-0 z-50";

  return (
    <div className={`${wrapClass} backdrop-blur-sm bg-[#eceae7]/60 flex flex-col items-center justify-center gap-5`}>
      {/* Anillos concéntricos animados */}
      <div className="relative w-16 h-16">
        {/* Anillo exterior */}
        <div className="absolute inset-0 rounded-full border-2 border-[#cc679c]/20" />
        {/* Anillo giratorio exterior */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#e3ac4d] animate-spin" />
        {/* Anillo interior */}
        <div className="absolute inset-[6px] rounded-full border-2 border-[#cc679c]/20" />
        {/* Anillo giratorio interior (sentido contrario) */}
        <div
          className="absolute inset-[6px] rounded-full border-2 border-transparent border-t-[#cc679c]"
          style={{ animation: "spin 0.7s linear infinite reverse" }}
        />
        {/* Punto central */}
        <div className="absolute inset-[14px] rounded-full bg-[#cc679c]/40 shadow-inner" />
      </div>

      <p className="text-[#cc679c] text-sm tracking-widest uppercase font-black select-none">
        Cargando
        <span className="inline-flex gap-[3px] ml-1">
          <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
        </span>
      </p>
    </div>
  );
}
