"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Sparkles, RefreshCw } from "lucide-react";

interface ProbadorProps {
  abierto: boolean;
  alCerrar: () => void;
  nombreProducto: string;
  categoria: string;
}

interface FiltroTono {
  nombre: string;
  overlay: string;
}

const TONOS_FILTRO: FiltroTono[] = [
  { nombre: "Luz Natural Jadara", overlay: "bg-transparent" },
  { nombre: "Brillo Pétalo Rosa", overlay: "bg-[#C6736A]/15" },
  { nombre: "Destello Dorado Sol", overlay: "bg-[#C89B54]/15" },
  { nombre: "Porcelana Suave", overlay: "bg-white/20" },
];

export default function ProbadorAR({
  abierto,
  alCerrar,
  nombreProducto,
  categoria,
}: ProbadorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<FiltroTono>(TONOS_FILTRO.at(0) ?? {
    nombre: "Luz Natural Jadara",
    overlay: "bg-transparent",
  });
  const [errorCamara, setErrorCamara] = useState<string | null>(null);

  useEffect(() => {
    let streamActivo: MediaStream | null = null;

    const iniciarCamara = async () => {
      if (!abierto) return;
      setErrorCamara(null);
      try {
        streamActivo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = streamActivo;
        }
      } catch {
        setErrorCamara(
          "No pudimos acceder a la cámara. Asegúrate de dar permiso en tu navegador."
        );
      }
    };

    iniciarCamara();

    return () => {
      if (streamActivo) {
        streamActivo.getTracks().forEach((track) => track.stop());
      }
    };
  }, [abierto]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/25 backdrop-blur-xs">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-lg w-full p-6 gold-ring-border shadow-xl relative">
        <button
          onClick={alCerrar}
          className="absolute top-5 right-5 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#C89B54] mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Espejo Virtual Jadara · {categoria}</span>
        </div>
        <h3 className="text-xl font-serif text-[#5E3A36] mb-4">{nombreProducto}</h3>

        <div className="relative h-80 rounded-2xl overflow-hidden bg-[#F7E6E1] gold-ring-border flex items-center justify-center">
          {errorCamara ? (
            <div className="p-6 text-center">
              <Camera className="w-8 h-8 text-[#C6736A] mx-auto mb-2" />
              <p className="text-xs text-[#5E3A36]">{errorCamara}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div
                className={`absolute inset-0 pointer-events-none transition-colors duration-300 ${filtroActivo.overlay}`}
              />
              <div className="absolute inset-6 rounded-full border border-dashed border-white/70 pointer-events-none" />
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-white/85 text-[11px] font-medium text-[#5E3A36]">
                Luz: {filtroActivo.nombre}
              </span>
            </>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-[#9E7B74] mb-2 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-[#C89B54]" />
            <span>Prueba iluminación y acabado en tiempo real:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TONOS_FILTRO.map((tono) => (
              <button
                key={tono.nombre}
                onClick={() => setFiltroActivo(tono)}
                className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                  filtroActivo.nombre === tono.nombre
                    ? "bg-[#C6736A] text-white"
                    : "bg-white text-[#5E3A36] gold-ring-border hover:bg-[#F7E6E1]"
                }`}
              >
                {tono.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
