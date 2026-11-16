"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Sparkles,
  Download,
  SwitchCamera,
  Loader2,
} from "lucide-react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface ProbadorProps {
  abierto: boolean;
  alCerrar: () => void;
  nombreProducto: string;
}

interface TonoCosmetico {
  nombre: string;
  color: string;
  opacidad: number;
}

const TONOS_LABIAL: TonoCosmetico[] = [
  { nombre: "Natural", color: "transparent", opacidad: 0 },
  { nombre: "Rosa Pétalo", color: "#D65A78", opacidad: 0.58 },
  { nombre: "Terracota Jadara", color: "#B54434", opacidad: 0.62 },
  { nombre: "Vino Pasión", color: "#781730", opacidad: 0.68 },
  { nombre: "Nude Caramelo", color: "#B06E58", opacidad: 0.55 },
  { nombre: "Fucsia Glam", color: "#D92672", opacidad: 0.58 },
];

const TONOS_RUBOR: TonoCosmetico[] = [
  { nombre: "Sin Rubor", color: "transparent", opacidad: 0 },
  { nombre: "Durazno Sol", color: "#E88368", opacidad: 0.36 },
  { nombre: "Rosa Fresco", color: "#E37292", opacidad: 0.36 },
  { nombre: "Bronce Dorado", color: "#C2824A", opacidad: 0.32 },
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
}: ProbadorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [camaraFrontal, setCamaraFrontal] = useState<boolean>(true);
  const [rostroDetectado, setRostroDetectado] = useState<boolean>(false);
  const [cargandoFiltro, setCargandoFiltro] = useState<boolean>(true);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);

  const [labialActivo, setLabialActivo] = useState<TonoCosmetico>(
    TONOS_LABIAL.at(1) ?? { nombre: "Rosa Pétalo", color: "#D65A78", opacidad: 0.58 }
  );
  const [ruborActivo, setRuborActivo] = useState<TonoCosmetico>(
    TONOS_RUBOR.at(1) ?? { nombre: "Durazno Sol", color: "#E88368", opacidad: 0.36 }
  );

  // Guardar referencias vivas de los colores para cambiarlos sin reiniciar la cámara
  const labialRef = useRef<TonoCosmetico>(labialActivo);
  const ruborRef = useRef<TonoCosmetico>(ruborActivo);

  useEffect(() => {
    labialRef.current = labialActivo;
  }, [labialActivo]);

  useEffect(() => {
    ruborRef.current = ruborActivo;
  }, [ruborActivo]);
  useEffect(() => {
    if (!abierto || fotoCapturada) return;

    let streamActivo: MediaStream | null = null;
    let animationFrameId: number;
    let faceLandmarker: FaceLandmarker | null = null;
    let cancelado = false;

    const iniciarEstudioMaquillaje = async () => {
      setErrorCamara(null);
      setCargandoFiltro(true);

      try {
        // 1. Cargar motor local desde /mediapipe (sin bloqueos de red)
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        // 2. Encender cámara
        streamActivo = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: camaraFrontal ? "user" : "environment",
          },
          audio: false,
        });

        if (cancelado) return;

        if (videoRef.current) {
          videoRef.current.srcObject = streamActivo;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
        }

        setCargandoFiltro(false);
        renderizarFiltroFacial();
      } catch {
        if (!cancelado) {
          setCargandoFiltro(false);
          setErrorCamara(
            "No pudimos abrir la cámara. Asegúrate de dar permiso de cámara en Chrome o Safari."
          );
        }
      }
    };

    const renderizarFiltroFacial = () => {
      if (cancelado) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = video.videoWidth;
          const h = video.videoHeight;
          canvas.width = w;
          canvas.height = h;

          ctx.save();
          if (camaraFrontal) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, w, h);

          if (faceLandmarker) {
            const resultados = faceLandmarker.detectForVideo(video, performance.now());
            const rostro = resultados.faceLandmarks.at(0);

            if (rostro) {
              setRostroDetectado(true);
              const rubor = ruborRef.current;
              const labial = labialRef.current;

              // Aplicar Rubor suave tipo aerógrafo en pómulos
              if (rubor.opacidad > 0) {
                const mIzq = rostro.at(205);
                const mDer = rostro.at(425);
                if (mIzq && mDer) {
                  ctx.save();
                  ctx.globalCompositeOperation = "multiply";
                  ctx.globalAlpha = rubor.opacidad;
                  ctx.filter = "blur(18px)";
                  ctx.fillStyle = rubor.color;
                  const radio = w * 0.062;
                  ctx.beginPath();
                  ctx.arc(mIzq.x * w, mIzq.y * h, radio, 0, Math.PI * 2);
                  ctx.arc(mDer.x * w, mDer.y * h, radio, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.restore();
                }
              }

              // Aplicar Labial siguiendo los 40 puntos exactos de los labios
              if (labial.opacidad > 0) {
                ctx.save();
                ctx.globalCompositeOperation = "multiply";
                ctx.globalAlpha = labial.opacidad;
                ctx.filter = "blur(1.8px)";
                ctx.fillStyle = labial.color;

                ctx.beginPath();
                LABIO_EXTERIOR.forEach((idx, i) => {
                  const pt = rostro.at(idx);
                  if (!pt) return;
                  if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
                  else ctx.lineTo(pt.x * w, pt.y * h);
                });
                ctx.closePath();

                LABIO_INTERIOR.forEach((idx, i) => {
                  const pt = rostro.at(idx);
                  if (!pt) return;
                  if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
                  else ctx.lineTo(pt.x * w, pt.y * h);
                });
                ctx.closePath();

                ctx.fill("evenodd");
                ctx.restore();
              }
            } else {
              setRostroDetectado(false);
            }
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(renderizarFiltroFacial);
    };

    iniciarEstudioMaquillaje();

    return () => {
      cancelado = true;
      cancelAnimationFrame(animationFrameId);
      if (streamActivo) {
        streamActivo.getTracks().forEach((t) => t.stop());
      }
      faceLandmarker?.close();
    };
  }, [abierto, camaraFrontal, fotoCapturada]);

  if (!abierto) return null;
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
          <span>Estudio Virtual de Maquillaje AR</span>
        </div>
        <h3 className="text-lg sm:text-xl font-serif text-[#5E3A36] mb-3 pr-8">
          {nombreProducto}
        </h3>

        <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#F7E6E1] gold-ring-border flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="absolute w-1 h-1 opacity-0 pointer-events-none"
          />

          {cargandoFiltro && !errorCamara && (
            <div className="absolute inset-0 z-10 bg-[#FDF8F6]/90 flex flex-col items-center justify-center gap-2 text-xs text-[#5E3A36]">
              <Loader2 className="w-7 h-7 text-[#C6736A] animate-spin" />
              <span>Encendiendo espejo de belleza...</span>
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
              alt="Selfie Maquillaje Jadara"
              className="w-full h-full object-cover"
            />
          ) : (
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
          )}

          {!errorCamara && !fotoCapturada && !cargandoFiltro && (
            <>
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-semibold text-[#5E3A36]">
                {rostroDetectado
                  ? "Rostro detectado · Filtro activo ✓"
                  : "Ubica tu rostro frente a la cámara"}
              </span>

              <button
                type="button"
                onClick={() => setCamaraFrontal((prev) => !prev)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90 gold-ring-border text-[#5E3A36] text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-[#C6736A]" />
                <span>{camaraFrontal ? "Frontal" : "Trasera"}</span>
              </button>
            </>
          )}
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <span className="block text-[11px] font-semibold text-[#5E3A36] mb-1.5">
              Tono de Labial: <span className="text-[#C6736A]">{labialActivo.nombre}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TONOS_LABIAL.map((tono) => (
                <button
                  key={tono.nombre}
                  type="button"
                  onClick={() => setLabialActivo(tono)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition ${
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
            <div className="flex flex-wrap gap-1.5">
              {TONOS_RUBOR.map((rubor) => (
                <button
                  key={rubor.nombre}
                  type="button"
                  onClick={() => setRuborActivo(rubor)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition ${
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

          <div className="pt-1">
            {fotoCapturada ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFotoCapturada(null)}
                  className="py-2.5 px-3 rounded-full bg-white gold-ring-border text-xs font-semibold text-[#5E3A36] cursor-pointer"
                >
                  Volver al Espejo
                </button>
                <a
                  href={fotoCapturada}
                  download={`Jadara-Makeup-${nombreProducto}.png`}
                  className="py-2.5 px-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Guardar Selfie</span>
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (canvasRef.current) {
                    setFotoCapturada(canvasRef.current.toDataURL("image/png"));
                  }
                }}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Tomar Selfie con Filtro</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
