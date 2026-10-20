import React from 'react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
}

export function BrandLogo({ className = "h-9", showText = false }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Official U&M logo strictly following brand manual - no recolor, no distortion, no drop-shadow */}
      <img
        src="/logo-UeM.png"
        alt="U&M Mineração"
        className="h-full w-auto object-contain select-none"
        style={{ aspectRatio: '344 / 138' }}
      />
      {showText && (
        <div className="flex flex-col justify-center">
          <span className="text-[14px] font-light uppercase tracking-wider text-[var(--um-verde-principal)] leading-tight">
            U&M MINERAÇÃO
          </span>
          <span className="text-[10px] font-regular text-[var(--um-cinza-texto)] uppercase tracking-widest">
            Relatório de Manutenção
          </span>
        </div>
      )}
    </div>
  );
}
