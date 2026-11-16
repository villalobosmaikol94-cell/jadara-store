"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Camera,
  Sparkles,
  Download,
  SwitchCamera,
  Sliders,
  Upload,
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

// Función para recortar automáticamente el fondo blanco/claro de la foto de la prenda
function crearPrendaSinFondo(img: HTMLImageElement): HTMLCanvasElement {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = img.naturalWidth || img.width;
  tempCanvas.height = img.naturalHeight || img.height;
  const tCtx = tempCanvas.getContext("2d");
  if (!tCtx) return tempCanvas;

  tCtx.drawImage(img, 0, 0);
  try {
    const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      // Si el píxel es casi blanco o crema muy claro de estudio, lo vuelve transparente
      if (r > 232 && g > 228 && b > 225) {
        data[i + 3] = 0;
      }
    }
    tCtx.putImageData(imgData, 0, 0);
  } catch {
    // Si la imagen externa no permite lectura de píxeles, la deja intacta
  }
  return tempCanvas;
}
export default function ProbadorAR({
  abierto,
  alCerrar,
  nombreProducto,
  categoria,
  imagenProducto,
}: ProbadorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prendaRecortadaRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const [camaraFrontal, setCamaraFrontal] = useState<boolean>(true);
  const [estadoIA, setEstadoIA] = useState<"calibrando" | "activa" | "asistido">("calibrando");
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [fotoPropia, setFotoPropia] = useState<HTMLImageElement | null>(null);
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

  // Preparar la imagen del producto recortando su fondo
  useEffect(() => {
    if (!imagenProducto) {
      prendaRecortadaRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imagenProducto;
    img.onload = () => {
      prendaRecortadaRef.current = crearPrendaSinFondo(img);
    };
  }, [imagenProducto]);
  useEffect(() => {
    if (!abierto || fotoCapturada) return;

    let streamActivo: MediaStream | null = null;
    let animationFrameId: number;
    let faceLandmarker: FaceLandmarker | null = null;
    let poseLandmarker: PoseLandmarker | null = null;
    let cancelado = false;

    const iniciarEspejoInstantaneo = async () => {
      setErrorCamara(null);
      setEstadoIA("calibrando");

      // 1. Encender la cámara DE INMEDIATO sin esperar a que descargue la IA
      if (!fotoPropia) {
        try {
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
        } catch {
          if (!cancelado) {
            setErrorCamara("No se detectó cámara. Sube una foto tuya para probarte el look.");
            return;
          }
        }
      }

      // Arrancar el renderizado del espejo de inmediato
      renderizarBucle();

      // 2. Cargar la Inteligencia Artificial en segundo plano (con respaldo automático)
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://unpkg.com"
        );

        if (esBelleza) {
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://googleapis.com",
            },
            runningMode: fotoPropia ? "IMAGE" : "VIDEO",
            numFaces: 1,
          });
        } else {
          poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://googleapis.com",
            },
            runningMode: fotoPropia ? "IMAGE" : "VIDEO",
            numPoses: 1,
          });
        }

        if (!cancelado) {
          setEstadoIA("activa");
        }
      } catch {
        // Si la red bloquea el modelo externo, activa modo asistido para nunca quedarse cargando
        if (!cancelado) {
          setEstadoIA("asistido");
        }
      }
    };
    const renderizarBucle = () => {
      if (cancelado) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const fuenteLista = fotoPropia || (video && video.readyState >= 2);

      if (canvas && fuenteLista) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const ancho = fotoPropia ? fotoPropia.naturalWidth : video!.videoWidth;
          const alto = fotoPropia ? fotoPropia.naturalHeight : video!.videoHeight;
          canvas.width = ancho;
          canvas.height = alto;

          ctx.save();
          if (camaraFrontal && !fotoPropia) {
            ctx.translate(ancho, 0);
            ctx.scale(-1, 1);
          }

          if (fotoPropia) {
            ctx.drawImage(fotoPropia, 0, 0, ancho, alto);
          } else if (video) {
            ctx.drawImage(video, 0, 0, ancho, alto);
          }

          const ahora = performance.now();

          // RASTREO FACIAL (MAQUILLAJE)
          if (esBelleza) {
            let rostro = null;
            if (faceLandmarker) {
              const res = fotoPropia
                ? faceLandmarker.detect(fotoPropia)
                : faceLandmarker.detectForVideo(video!, ahora);
              rostro = res.faceLandmarks.at(0) ?? null;
            }

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
                  const radio = ancho * 0.065;
                  ctx.beginPath();
                  ctx.arc(mejillaIzq.x * ancho, mejillaIzq.y * alto, radio, 0, Math.PI * 2);
                  ctx.arc(mejillaDer.x * ancho, mejillaDer.y * alto, radio, 0, Math.PI * 2);
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
                  const pt = rostro?.at(idx);
                  if (!pt) return;
                  if (i === 0) ctx.moveTo(pt.x * ancho, pt.y * alto);
                  else ctx.lineTo(pt.x * ancho, pt.y * alto);
                });
                ctx.closePath();
                LABIO_INTERIOR.forEach((idx: number, i: number) => {
                  const pt = rostro?.at(idx);
                  if (!pt) return;
                  if (i === 0) ctx.moveTo(pt.x * ancho, pt.y * alto);
                  else ctx.lineTo(pt.x * ancho, pt.y * alto);
                });
                ctx.closePath();
                ctx.fill("evenodd");
                ctx.restore();
              }
            }
          }
          // RASTREO CORPORAL (ROPA, CARTERAS, TENIS)
          if (!esBelleza && prendaRecortadaRef.current) {
            const prenda = prendaRecortadaRef.current;
            let cuerpo = null;

            if (poseLandmarker) {
              const poses = fotoPropia
                ? poseLandmarker.detect(fotoPropia)
                : poseLandmarker.detectForVideo(video!, ahora);
              cuerpo = poses.landmarks.at(0) ?? null;
            }

            if (cuerpo) {
              const hombroIzq = cuerpo.at(11);
              const hombroDer = cuerpo.at(12);
              const munecaDer = cuerpo.at(16);
              const tobilloDer = cuerpo.at(28);

              if (esCartera && munecaDer) {
                const w = ancho * 0.28 * ajusteAncho;
                const h = w * (prenda.height / prenda.width);
                ctx.drawImage(prenda, munecaDer.x * ancho - w / 2, munecaDer.y * alto + ajusteAltura, w, h);
              } else if (esTenis && tobilloDer) {
                const w = ancho * 0.22 * ajusteAncho;
                const h = w * (prenda.height / prenda.width);
                ctx.drawImage(prenda, tobilloDer.x * ancho - w / 2, tobilloDer.y * alto - h * 0.3 + ajusteAltura, w, h);
              } else if (hombroIzq && hombroDer) {
                const centroX = ((hombroIzq.x + hombroDer.x) / 2) * ancho;
                const topY = Math.min(hombroIzq.y, hombroDer.y) * alto - 20 + ajusteAltura;
                const anchoHombros = Math.abs(hombroIzq.x - hombroDer.x) * ancho;
                const w = Math.max(anchoHombros * ajusteAncho, ancho * 0.38);
                const h = w * (prenda.height / prenda.width);
                ctx.drawImage(prenda, centroX - w / 2, topY, w, h);
              }
            } else {
              // Si aún no detecta cuerpo completo, ubica la prenda centrada en el torso
              const w = ancho * 0.48 * (ajusteAncho / 1.35);
              const h = w * (prenda.height / prenda.width);
              ctx.drawImage(prenda, ancho / 2 - w / 2, alto * 0.32 + ajusteAltura, w, h);
            }
          }

          ctx.restore();
        }
      }

      if (!fotoPropia) {
        animationFrameId = requestAnimationFrame(renderizarBucle);
      }
    };

    iniciarEspejoInstantaneo();

    return () => {
      cancelado = true;
      cancelAnimationFrame(animationFrameId);
      if (streamActivo) {
        streamActivo.getTracks().forEach((track) => track.stop());
      }
      faceLandmarker?.close();
      poseLandmarker?.close();
    };
  }, [abierto, camaraFrontal, esBelleza, esCartera, esTenis, labialActivo, ruborActivo, ajusteAltura, ajusteAncho, fotoPropia, fotoCapturada]);

  if (!abierto) return null;

  const manejarFotoSubida = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.item(0);
    if (archivo) {
      const img = new Image();
      img.src = URL.createObjectURL(archivo);
      img.onload = () => {
        setFotoPropia(img);
        setErrorCamara(null);
      };
    }
  };

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
            setFotoPropia(null);
            alCerrar();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#C89B54] mb-0.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Espejo Virtual Jadara · {categoria}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-serif text-[#5E3A36] mb-3 pr-8">
          {nombreProducto}
        </h3>

        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          onChange={manejarFotoSubida}
          className="hidden"
        />

        <div className="relative h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#F7E6E1] gold-ring-border flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="hidden" />

          {errorCamara && !fotoPropia ? (
            <div className="p-6 text-center space-y-3">
              <Camera className="w-8 h-8 text-[#C6736A] mx-auto" />
              <p className="text-xs text-[#5E3A36]">{errorCamara}</p>
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                className="px-4 py-2 rounded-full bg-[#C6736A] text-white text-xs font-semibold cursor-pointer"
              >
                Subir mi foto para probar
              </button>
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
            <>
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/85 text-[10px] font-semibold text-[#5E3A36]">
                {estadoIA === "activa"
                  ? "IA Facial/Corporal Activa ✓"
                  : estadoIA === "calibrando"
                  ? "Espejo en vivo · Ajustando IA..."
                  : "Modo Espejo Directo"}
              </span>

              {!fotoPropia && (
                <button
                  type="button"
                  onClick={() => setCamaraFrontal((prev) => !prev)}
                  title="Voltear cámara"
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90 gold-ring-border text-[#5E3A36] text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-[#C6736A]" />
                  <span>{camaraFrontal ? "Frontal" : "Trasera"}</span>
                </button>
              )}
            </>
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
                    min="0.8"
                    max="2.2"
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
                    min="-120"
                    max="120"
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
            <button
              type="button"
              onClick={() => {
                setFotoCapturada(null);
                inputFotoRef.current?.click();
              }}
              className="py-2.5 px-3 rounded-full bg-white gold-ring-border text-xs font-semibold text-[#5E3A36] flex items-center justify-center gap-1.5 hover:bg-[#FDF8F6] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#C89B54]" />
              <span>{fotoPropia ? "Cambiar foto" : "Probar en foto"}</span>
            </button>

            {fotoCapturada ? (
              <a
                href={fotoCapturada}
                download={`Jadara-AR-${nombreProducto}.png`}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Guardar Foto</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={tomarFoto}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
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
