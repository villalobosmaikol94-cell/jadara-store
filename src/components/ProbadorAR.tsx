"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Sparkles,
  Download,
  ZoomIn,
  ZoomOut,
  Upload,
  Move,
} from "lucide-react";

interface ProbadorProps {
  abierto: boolean;
  alCerrar: () => void;
  nombreProducto: string;
  categoria: string;
  imagenProducto?: string | null;
}

interface TonoCosmetico {
  nombre: string;
  color: string;
  opacidad: number;
}

const TONOS_LABIAL: TonoCosmetico[] = [
  { nombre: "Natural", color: "transparent", opacidad: 0 },
  { nombre: "Rosa Pétalo", color: "#D46A7E", opacidad: 0.45 },
  { nombre: "Terracota Jadara", color: "#B85042", opacidad: 0.5 },
  { nombre: "Vino Pasión", color: "#7A1C33", opacidad: 0.55 },
  { nombre: "Nude Caramelo", color: "#B57863", opacidad: 0.45 },
];

const TONOS_RUBOR: TonoCosmetico[] = [
  { nombre: "Sin Rubor", color: "transparent", opacidad: 0 },
  { nombre: "Durazno Sol", color: "#E88D72", opacidad: 0.28 },
  { nombre: "Rosa Fresco", color: "#E07A96", opacidad: 0.28 },
  { nombre: "Bronce Dorado", color: "#C88A55", opacidad: 0.26 },
];
export default function ProbadorAR({
  abierto,
  alCerrar,
  nombreProducto,
  categoria,
  imagenProducto,
}: ProbadorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasCapturaRef = useRef<HTMLCanvasElement | null>(null);
  const inputFotoPropiaRef = useRef<HTMLInputElement | null>(null);

  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [fotoPropia, setFotoPropia] = useState<string | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);

  // Controles de Belleza (Labial y Rubor)
  const [labialActivo, setLabialActivo] = useState<TonoCosmetico>(TONOS_LABIAL[1]);
  const [ruborActivo, setRuborActivo] = useState<TonoCosmetico>(TONOS_RUBOR[1]);

  // Controles de Prenda / Cartera / Tenis (Escala y Posición)
  const [escalaPrenda, setEscalaPrenda] = useState<number>(1);
  const [posPrenda, setPosPrenda] = useState<{ x: number; y: number }>({ x: 0, y: 35 });
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const inicioArrastre = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const esBelleza = categoria.toLowerCase().includes("belleza");

  useEffect(() => {
    let streamActivo: MediaStream | null = null;

    const iniciarCamara = async () => {
      if (!abierto || fotoPropia) return;
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
          "No pudimos encender la cámara. Puedes subir una foto tuya para probarte el producto."
        );
      }
    };

    iniciarCamara();

    return () => {
      if (streamActivo) {
        streamActivo.getTracks().forEach((track) => track.stop());
      }
    };
  }, [abierto, fotoPropia]);

  if (!abierto) return null;

  const manejarSubidaFotoPropia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0);
    if (file) {
      setFotoPropia(URL.createObjectURL(file));
      setErrorCamara(null);
    }
  };
  const iniciarMovimiento = (clientX: number, clientY: number) => {
    setArrastrando(true);
    inicioArrastre.current = { x: clientX - posPrenda.x, y: clientY - posPrenda.y };
  };

  const moverPrenda = (clientX: number, clientY: number) => {
    if (!arrastrando) return;
    setPosPrenda({
      x: clientX - inicioArrastre.current.x,
      y: clientY - inicioArrastre.current.y,
    });
  };

  const detenerMovimiento = () => {
    setArrastrando(false);
  };

  const capturarLook = () => {
    const canvas = canvasCapturaRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 720;
    canvas.height = 960;

    if (videoRef.current && !fotoPropia) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else if (fotoPropia) {
      const imgFondo = new Image();
      imgFondo.src = fotoPropia;
      ctx.drawImage(imgFondo, 0, 0, canvas.width, canvas.height);
    }

    if (esBelleza) {
      // Aplicar rubor en mejillas en la captura
      if (ruborActivo.opacidad > 0) {
        ctx.fillStyle = ruborActivo.color;
        ctx.globalAlpha = ruborActivo.opacidad;
        ctx.filter = "blur(28px)";
        ctx.beginPath();
        ctx.arc(canvas.width * 0.34, canvas.height * 0.53, 55, 0, Math.PI * 2);
        ctx.arc(canvas.width * 0.66, canvas.height * 0.53, 55, 0, Math.PI * 2);
        ctx.fill();
      }
      // Aplicar labial en la captura
      if (labialActivo.opacidad > 0) {
        ctx.fillStyle = labialActivo.color;
        ctx.globalAlpha = labialActivo.opacidad;
        ctx.filter = "blur(8px)";
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.5, canvas.height * 0.67, 52, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }

    setFotoCapturada(canvas.toDataURL("image/png"));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#5E3A36]/30 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-lg w-full p-5 sm:p-6 gold-ring-border shadow-2xl relative my-4">
        <button
          onClick={() => {
            setFotoPropia(null);
            setFotoCapturada(null);
            alCerrar();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#C89B54] mb-0.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Probador Virtual AR · {categoria}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-serif text-[#5E3A36] mb-3 pr-8">
          {nombreProducto}
        </h3>

        <input
          ref={inputFotoPropiaRef}
          type="file"
          accept="image/*"
          onChange={manejarSubidaFotoPropia}
          className="hidden"
        />
        <canvas ref={canvasCapturaRef} className="hidden" />

        {/* Visor Interactivo en Vivo */}
        <div
          onMouseMove={(e) => moverPrenda(e.clientX, e.clientY)}
          onMouseUp={detenerMovimiento}
          onMouseLeave={detenerMovimiento}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) moverPrenda(touch.clientX, touch.clientY);
          }}
          onTouchEnd={detenerMovimiento}
          className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#F7E6E1] gold-ring-border flex items-center justify-center select-none"
        >
          {fotoCapturada ? (
            <img
              src={fotoCapturada}
              alt="Look capturado"
              className="w-full h-full object-cover"
            />
          ) : fotoPropia ? (
            <img
              src={fotoPropia}
              alt="Tu foto"
              className="w-full h-full object-cover"
            />
          ) : errorCamara ? (
            <div className="p-6 text-center space-y-3">
              <Camera className="w-8 h-8 text-[#C6736A] mx-auto" />
              <p className="text-xs text-[#5E3A36]">{errorCamara}</p>
              <button
                type="button"
                onClick={() => inputFotoPropiaRef.current?.click()}
                className="px-4 py-2 rounded-full bg-[#C6736A] text-white text-xs font-medium cursor-pointer"
              >
                Subir mi foto para probar
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}

          {/* Capa AR para Belleza (Guía facial + Rubor + Labial en vivo) */}
          {esBelleza && !errorCamara && !fotoCapturada && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-64 rounded-full border border-dashed border-white/60 relative">
                {/* Mejillas (Rubor) */}
                <div
                  style={{
                    backgroundColor: ruborActivo.color,
                    opacity: ruborActivo.opacidad,
                  }}
                  className="absolute top-[52%] left-[12%] w-12 h-9 rounded-full blur-md transition-all duration-300"
                />
                <div
                  style={{
                    backgroundColor: ruborActivo.color,
                    opacity: ruborActivo.opacidad,
                  }}
                  className="absolute top-[52%] right-[12%] w-12 h-9 rounded-full blur-md transition-all duration-300"
                />
                {/* Labios (Labial) */}
                <div
                  style={{
                    backgroundColor: labialActivo.color,
                    opacity: labialActivo.opacidad,
                  }}
                  className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-14 h-6 rounded-full blur-[3px] transition-all duration-300"
                />
              </div>
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/85 text-[10px] font-medium text-[#5E3A36]">
                Ubica tu rostro en el óvalo
              </span>
            </div>
          )}

          {/* Capa AR para Ropa, Carteras y Tenis (Foto real arrastrable y escalable) */}
          {!esBelleza && !errorCamara && !fotoCapturada && (
            <div
              onMouseDown={(e) => iniciarMovimiento(e.clientX, e.clientY)}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                if (touch) iniciarMovimiento(touch.clientX, touch.clientY);
              }}
              style={{
                transform: `translate(${posPrenda.x}px, ${posPrenda.y}px) scale(${escalaPrenda})`,
              }}
              className="absolute cursor-grab active:cursor-grabbing flex flex-col items-center"
            >
              {imagenProducto ? (
                <img
                  src={imagenProducto}
                  alt={nombreProducto}
                  draggable={false}
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-xl rounded-2xl mix-blend-multiply"
                />
              ) : (
                <div className="px-4 py-3 rounded-2xl bg-white/90 gold-ring-border text-xs font-serif text-[#5E3A36] shadow-md">
                  {nombreProducto}
                </div>
              )}
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] flex items-center gap-1">
                <Move className="w-2.5 h-2.5" /> Arrastra sobre ti
              </span>
            </div>
          )}
        </div>
        {/* Panel de Controles Según Categoría */}
        <div className="mt-4 space-y-3">
          {esBelleza ? (
            <>
              <div>
                <span className="block text-[11px] font-semibold text-[#5E3A36] mb-1.5">
                  Tono de Labial: <span className="text-[#C6736A]">{labialActivo.nombre}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {TONOS_LABIAL.map((tono) => (
                    <button
                      key={tono.nombre}
                      type="button"
                      onClick={() => setLabialActivo(tono)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 cursor-pointer ${
                        labialActivo.nombre === tono.nombre
                          ? "bg-[#C6736A] text-white"
                          : "bg-white text-[#5E3A36] gold-ring-border"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{
                          backgroundColor:
                            tono.color === "transparent" ? "#FDF8F6" : tono.color,
                        }}
                      />
                      <span>{tono.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-[#5E3A36] mb-1.5">
                  Tono de Rubor: <span className="text-[#C89B54]">{ruborActivo.nombre}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {TONOS_RUBOR.map((rubor) => (
                    <button
                      key={rubor.nombre}
                      type="button"
                      onClick={() => setRuborActivo(rubor)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 cursor-pointer ${
                        ruborActivo.nombre === rubor.nombre
                          ? "bg-[#C89B54] text-white"
                          : "bg-white text-[#5E3A36] gold-ring-border"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{
                          backgroundColor:
                            rubor.color === "transparent" ? "#FDF8F6" : rubor.color,
                        }}
                      />
                      <span>{rubor.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl gold-ring-border">
              <span className="text-xs font-medium text-[#5E3A36]">
                Ajustar tamaño de prenda:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEscalaPrenda((s) => Math.max(0.5, s - 0.15))}
                  className="p-1.5 rounded-full bg-[#FDF8F6] gold-ring-border text-[#5E3A36] cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold w-10 text-center">
                  {Math.round(escalaPrenda * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setEscalaPrenda((s) => Math.min(2, s + 0.15))}
                  className="p-1.5 rounded-full bg-[#FDF8F6] gold-ring-border text-[#5E3A36] cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Barra de Acciones: Subir foto de cuerpo completo / Tomar Selfie / Descargar */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setFotoCapturada(null);
                inputFotoPropiaRef.current?.click();
              }}
              className="py-2.5 px-3 rounded-full bg-white gold-ring-border text-xs font-semibold text-[#5E3A36] flex items-center justify-center gap-1.5 hover:bg-[#FDF8F6] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#C89B54]" />
              <span>{fotoPropia ? "Cambiar mi foto" : "Probar en mi foto"}</span>
            </button>

            {fotoCapturada ? (
              <a
                href={fotoCapturada}
                download={`Jadara-Look-${nombreProducto}.png`}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Guardar Foto</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={capturarLook}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Tomar Foto</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
