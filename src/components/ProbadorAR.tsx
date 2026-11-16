"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Sparkles,
  Download,
  SwitchCamera,
  Sliders,
  Loader2,
} from "lucide-react";
import {
  FaceLandmarker,
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

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
  { nombre: "Rosa Pétalo", color: "#C94A6A", opacidad: 0.55 },
  { nombre: "Terracota Jadara", color: "#A83C2E", opacidad: 0.6 },
  { nombre: "Vino Pasión", color: "#6E142C", opacidad: 0.65 },
  { nombre: "Nude Caramelo", color: "#A6634E", opacidad: 0.55 },
];

const TONOS_RUBOR: TonoCosmetico[] = [
  { nombre: "Sin Rubor", color: "transparent", opacidad: 0 },
  { nombre: "Durazno Sol", color: "#E07A5F", opacidad: 0.35 },
  { nombre: "Rosa Fresco", color: "#D96B8A", opacidad: 0.35 },
  { nombre: "Bronce Dorado", color: "#B87A44", opacidad: 0.32 },
];

const LABIO_EXTERIOR: number[] = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37,
  39, 40, 185,
];

const LABIO_INTERIOR: number[] = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82,
  81, 80, 191,
];
export default function ProbadorAR({
  abierto,
  alCerrar,
  nombreProducto,
  categoria,
  imagenProducto,
}: ProbadorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagenPrendaRef = useRef<HTMLImageElement | null>(null);

  const [camaraFrontal, setCamaraFrontal] = useState<boolean>(true);
  const [cargandoIA, setCargandoIA] = useState<boolean>(true);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);

  const [labialActivo, setLabialActivo] = useState<TonoCosmetico>(
    TONOS_LABIAL.at(1) ?? { nombre: "Rosa Pétalo", color: "#C94A6A", opacidad: 0.55 }
  );
  const [ruborActivo, setRuborActivo] = useState<TonoCosmetico>(
    TONOS_RUBOR.at(1) ?? { nombre: "Durazno Sol", color: "#E07A5F", opacidad: 0.35 }
  );
  const [ajusteAltura, setAjusteAltura] = useState<number>(0);
  const [ajusteAncho, setAjusteAncho] = useState<number>(1.35);

  const esBelleza = categoria.toLowerCase().includes("belleza");
  const esCartera = categoria.toLowerCase().includes("cartera");
  const esTenis = categoria.toLowerCase().includes("tenis");

  useEffect(() => {
    if (!imagenProducto) {
      imagenPrendaRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imagenProducto;
    img.onload = () => {
      imagenPrendaRef.current = img;
    };
  }, [imagenProducto]);
  useEffect(() => {
    if (!abierto || fotoCapturada) return;

    let streamActivo: MediaStream | null = null;
    let animationFrameId: number;
    let faceLandmarker: FaceLandmarker | null = null;
    let poseLandmarker: PoseLandmarker | null = null;
    let cancelado = false;

    const inicializarAR = async () => {
      setCargandoIA(true);
      setErrorCamara(null);

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://jsdelivr.net"
        );

        if (esBelleza) {
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://googleapis.com",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } else {
          poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://googleapis.com",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }

        streamActivo = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: camaraFrontal ? "user" : "environment",
            width: { ideal: 720 },
            height: { ideal: 960 },
          },
          audio: false,
        });

        if (cancelado) return;

        if (videoRef.current) {
          videoRef.current.srcObject = streamActivo;
          await videoRef.current.play();
        }

        setCargandoIA(false);
        procesarFotograma();
      } catch {
        if (!cancelado) {
          setCargandoIA(false);
          setErrorCamara(
            "No pudimos acceder a la cámara. Verifica los permisos en tu navegador."
          );
        }
      }
    };
    const procesarFotograma = () => {
      if (cancelado) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          ctx.save();
          if (camaraFrontal) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const ahora = performance.now();

          if (esBelleza && faceLandmarker) {
            const resultados = faceLandmarker.detectForVideo(video, ahora);
            const rostro = resultados.faceLandmarks.at(0);

            if (rostro) {
              if (ruborActivo.opacidad > 0) {
                const mejillaIzq = rostro.at(205);
                const mejillaDer = rostro.at(425);
                if (mejillaIzq && mejillaDer) {
                  ctx.save();
                  ctx.globalCompositeOperation = "multiply";
                  ctx.globalAlpha = ruborActivo.opacidad;
                  ctx.filter = "blur(18px)";
                  ctx.fillStyle = ruborActivo.color;

                  const radioMejilla = canvas.width * 0.065;
                  ctx.beginPath();
                  ctx.arc(mejillaIzq.x * canvas.width, mejillaIzq.y * canvas.height, radioMejilla, 0, Math.PI * 2);
                  ctx.arc(mejillaDer.x * canvas.width, mejillaDer.y * canvas.height, radioMejilla, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();
                }
              }

              if (labialActivo.opacidad > 0) {
                ctx.save();
                ctx.globalCompositeOperation = "multiply";
                ctx.globalAlpha = labialActivo.opacidad;
                ctx.filter = "blur(2px)";
                ctx.fillStyle = labialActivo.color;

                ctx.beginPath();
                LABIO_EXTERIOR.forEach((idx: number, i: number) => {
                  const pt = rostro.at(idx);
                  if (!pt) return;
                  if (i === 0) ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
                  else ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
                });
                ctx.closePath();

                LABIO_INTERIOR.forEach((idx: number, i: number) => {
                  const pt = rostro.at(idx);
                  if (!pt) return;
                  if (i === 0) ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
                  else ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
                });
                ctx.closePath();

                ctx.fill("evenodd");
                ctx.restore();
              }
            }
          }
          if (!esBelleza && poseLandmarker && imagenPrendaRef.current) {
            const poses = poseLandmarker.detectForVideo(video, ahora);
            const cuerpo = poses.landmarks.at(0);

            if (cuerpo) {
              const hombroIzq = cuerpo.at(11);
              const hombroDer = cuerpo.at(12);
              const caderaIzq = cuerpo.at(23);
              const munecaDer = cuerpo.at(16);
              const tobilloDer = cuerpo.at(28);

              ctx.save();
              ctx.globalCompositeOperation = "multiply";

              if (esCartera && munecaDer) {
                const anchoCartera = canvas.width * 0.28 * ajusteAncho;
                const altoCartera = anchoCartera * (imagenPrendaRef.current.height / imagenPrendaRef.current.width);
                ctx.drawImage(
                  imagenPrendaRef.current,
                  munecaDer.x * canvas.width - anchoCartera / 2,
                  munecaDer.y * canvas.height + ajusteAltura,
                  anchoCartera,
                  altoCartera
                );
              } else if (esTenis && tobilloDer) {
                const anchoTenis = canvas.width * 0.22 * ajusteAncho;
                const altoTenis = anchoTenis * (imagenPrendaRef.current.height / imagenPrendaRef.current.width);
                ctx.drawImage(
                  imagenPrendaRef.current,
                  tobilloDer.x * canvas.width - anchoTenis / 2,
                  tobilloDer.y * canvas.height - altoTenis * 0.3 + ajusteAltura,
                  anchoTenis,
                  altoTenis
                );
              } else if (hombroIzq && hombroDer && caderaIzq) {
                const centroX = ((hombroIzq.x + hombroDer.x) / 2) * canvas.width;
                const topY = Math.min(hombroIzq.y, hombroDer.y) * canvas.height - 25 + ajusteAltura;
                const anchoHombros = Math.abs(hombroIzq.x - hombroDer.x) * canvas.width;
                const anchoPrenda = Math.max(anchoHombros * ajusteAncho, canvas.width * 0.35);
                const altoPrenda = anchoPrenda * (imagenPrendaRef.current.height / imagenPrendaRef.current.width);

                ctx.drawImage(
                  imagenPrendaRef.current,
                  centroX - anchoPrenda / 2,
                  topY,
                  anchoPrenda,
                  altoPrenda
                );
              }
              ctx.restore();
            }
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(procesarFotograma);
    };

    inicializarAR();

    return () => {
      cancelado = true;
      cancelAnimationFrame(animationFrameId);
      if (streamActivo) {
        streamActivo.getTracks().forEach((track) => track.stop());
      }
      faceLandmarker?.close();
      poseLandmarker?.close();
    };
  }, [abierto, camaraFrontal, esBelleza, esCartera, esTenis, labialActivo, ruborActivo, ajusteAltura, ajusteAncho, fotoCapturada]);

  if (!abierto) return null;

  const tomarFoto = () => {
    if (!canvasRef.current) return;
    setFotoCapturada(canvasRef.current.toDataURL("image/png"));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#5E3A36]/30 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-lg w-full p-5 sm:p-6 gold-ring-border shadow-2xl relative my-4">
        <button
          onClick={() => {
            setFotoCapturada(null);
            alCerrar();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#C89B54] mb-0.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Espejo Inteligente Jadara AI · {categoria}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-serif text-[#5E3A36] mb-3 pr-8">
          {nombreProducto}
        </h3>

        <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#F7E6E1] gold-ring-border flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="hidden" />

          {cargandoIA && !errorCamara && (
            <div className="absolute inset-0 z-10 bg-[#FDF8F6]/90 flex flex-col items-center justify-center gap-2 text-xs text-[#5E3A36]">
              <Loader2 className="w-7 h-7 text-[#C6736A] animate-spin" />
              <span>Calibrando espejo inteligente AR...</span>
            </div>
          )}

          {errorCamara ? (
            <div className="p-6 text-center space-y-2">
              <Camera className="w-8 h-8 text-[#C6736A] mx-auto" />
              <p className="text-xs text-[#5E3A36]">{errorCamara}</p>
            </div>
          ) : fotoCapturada ? (
            <img
              src={fotoCapturada}
              alt="Captura AR"
              className="w-full h-full object-cover"
            />
          ) : (
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
          )}

          {!errorCamara && !fotoCapturada && (
            <button
              type="button"
              onClick={() => setCamaraFrontal((prev) => !prev)}
              title="Voltear cámara"
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90 gold-ring-border text-[#5E3A36] text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-[#C6736A]" />
              <span>{camaraFrontal ? "Cámara Frontal" : "Cámara Trasera"}</span>
            </button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {esBelleza ? (
            <>
              <div>
                <span className="block text-[11px] font-semibold text-[#5E3A36] mb-1.5">
                  Labial en vivo: <span className="text-[#C6736A]">{labialActivo.nombre}</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
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
                  Rubor en vivo: <span className="text-[#C89B54]">{ruborActivo.nombre}</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
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
            <div className="bg-white p-3 rounded-2xl gold-ring-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5E3A36]">
                <Sliders className="w-3.5 h-3.5 text-[#C89B54]" />
                <span>Ajuste fino sobre tu silueta:</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#9E7B74]">
                <label className="flex flex-col gap-1">
                  <span>Ancho de prenda</span>
                  <input
                    type="range"
                    min="0.9"
                    max="2.0"
                    step="0.05"
                    value={ajusteAncho}
                    onChange={(e) => setAjusteAncho(Number(e.target.value))}
                    className="accent-[#C6736A]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>Altura (Subir / Bajar)</span>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    step="5"
                    value={ajusteAltura}
                    onChange={(e) => setAjusteAltura(Number(e.target.value))}
                    className="accent-[#C89B54]"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {fotoCapturada ? (
              <>
                <button
                  type="button"
                  onClick={() => setFotoCapturada(null)}
                  className="py-2.5 px-3 rounded-full bg-white gold-ring-border text-xs font-semibold text-[#5E3A36] cursor-pointer"
                >
                  Volver al Espejo
                </button>
                <a
                  href={fotoCapturada}
                  download={`Jadara-AR-${nombreProducto}.png`}
                  className="py-2.5 px-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Guardar Foto</span>
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={tomarFoto}
                className="col-span-2 py-3 px-4 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capturar Foto del Look</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
