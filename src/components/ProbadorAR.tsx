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
  { nombre: "Rosa Pétalo", color: "#C94A6A", opacidad: 0.6 },
  { nombre: "Terracota Jadara", color: "#A83C2E", opacidad: 0.65 },
  { nombre: "Vino Pasión", color: "#6E142C", opacidad: 0.7 },
  { nombre: "Nude Caramelo", color: "#A6634E", opacidad: 0.6 },
];

const TONOS_RUBOR: TonoCosmetico[] = [
  { nombre: "Sin Rubor", color: "transparent", opacidad: 0 },
  { nombre: "Durazno Sol", color: "#E07A5F", opacidad: 0.4 },
  { nombre: "Rosa Fresco", color: "#D96B8A", opacidad: 0.4 },
  { nombre: "Bronce Dorado", color: "#B87A44", opacidad: 0.35 },
];
const LABIO_EXTERIOR: number[] = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37,
  39, 40, 185,
];

const LABIO_INTERIOR: number[] = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82,
  81, 80, 191,
];

// Elimina el fondo blanco/claro desde los bordes de la foto de la prenda (100% gratis en el navegador)
function recortarFondoPrenda(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    // Tomar el color de referencia de las esquinas superiores
    const refR = data[0] ?? 255;
    const refG = data[1] ?? 255;
    const refB = data[2] ?? 255;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const diff = Math.abs(r - refR) + Math.abs(g - refG) + Math.abs(b - refB);
      // Si el píxel coincide con el fondo de la foto o es blanco estudio, se vuelve transparente
      if (diff < 65 || (r > 235 && g > 232 && b > 230)) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Si la imagen no permite edición directa, se conserva intacta
  }
  return canvas;
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
  const prendaListaRef = useRef<HTMLCanvasElement | HTMLImageElement | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const [camaraFrontal, setCamaraFrontal] = useState<boolean>(true);
  const [iaLista, setIaLista] = useState<boolean>(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [fotoSubida, setFotoSubida] = useState<HTMLImageElement | null>(null);
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);

  const [labialActivo, setLabialActivo] = useState<TonoCosmetico>(
    TONOS_LABIAL.at(1) ?? { nombre: "Rosa Pétalo", color: "#C94A6A", opacidad: 0.6 }
  );
  const [ruborActivo, setRuborActivo] = useState<TonoCosmetico>(
    TONOS_RUBOR.at(1) ?? { nombre: "Durazno Sol", color: "#E07A5F", opacidad: 0.4 }
  );
  const [ajusteAltura, setAjusteAltura] = useState<number>(0);
  const [ajusteAncho, setAjusteAncho] = useState<number>(1.35);

  const esBelleza = categoria.toLowerCase().includes("belleza");
  const esCartera = categoria.toLowerCase().includes("cartera");
  const esTenis = categoria.toLowerCase().includes("tenis");

  useEffect(() => {
    if (!imagenProducto) {
      prendaListaRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imagenProducto;
    img.onload = () => {
      prendaListaRef.current = recortarFondoPrenda(img);
    };
  }, [imagenProducto]);
  useEffect(() => {
    if (!abierto || fotoCapturada) return;

    let streamActivo: MediaStream | null = null;
    let animationFrameId: number;
    let faceLandmarker: FaceLandmarker | null = null;
    let poseLandmarker: PoseLandmarker | null = null;
    let cancelado = false;

    const iniciarEspejoGratuito = async () => {
      setErrorCamara(null);
      setIaLista(false);

      if (!fotoSubida) {
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
            setErrorCamara("No se detectó cámara. Sube una foto tuya para probarte el producto.");
            return;
          }
        }
      }

      // Cargar motor gratuito de Google MediaPipe versión 0.10.32
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://jsdelivr.net"
        );

        if (esBelleza) {
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://googleapis.com",
            },
            runningMode: fotoSubida ? "IMAGE" : "VIDEO",
            numFaces: 1,
          });
        } else {
          poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://googleapis.com",
            },
            runningMode: fotoSubida ? "IMAGE" : "VIDEO",
            numPoses: 1,
          });
        }

        if (!cancelado) setIaLista(true);
      } catch {
        // Continúa en modo espejo si el navegador bloquea WASM
      }

      const procesarCuadro = () => {
        if (cancelado) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const listo = fotoSubida || (video && video.readyState >= 2);

        if (canvas && listo) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const w = fotoSubida ? fotoSubida.naturalWidth : video!.videoWidth;
            const h = fotoSubida ? fotoSubida.naturalHeight : video!.videoHeight;
            canvas.width = w;
            canvas.height = h;

            ctx.save();
            if (camaraFrontal && !fotoSubida) {
              ctx.translate(w, 0);
              ctx.scale(-1, 1);
            }

            if (fotoSubida) ctx.drawImage(fotoSubida, 0, 0, w, h);
            else if (video) ctx.drawImage(video, 0, 0, w, h);

            const ahora = performance.now();

            // 1. MAQUILLAJE EN TIEMPO REAL
            if (esBelleza && faceLandmarker) {
              const res = fotoSubida
                ? faceLandmarker.detect(fotoSubida)
                : faceLandmarker.detectForVideo(video!, ahora);
              const rostro = res.faceLandmarks.at(0);

              if (rostro) {
                if (ruborActivo.opacidad > 0) {
                  const mIzq = rostro.at(205);
                  const mDer = rostro.at(425);
                  if (mIzq && mDer) {
                    ctx.save();
                    ctx.globalCompositeOperation = "multiply";
                    ctx.globalAlpha = ruborActivo.opacidad;
                    ctx.filter = "blur(16px)";
                    ctx.fillStyle = ruborActivo.color;
                    const radio = w * 0.06;
                    ctx.beginPath();
                    ctx.arc(mIzq.x * w, mIzq.y * h, radio, 0, Math.PI * 2);
                    ctx.arc(mDer.x * w, mDer.y * h, radio, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                  }
                }

                if (labialActivo.opacidad > 0) {
                  ctx.save();
                  ctx.globalCompositeOperation = "multiply";
                  ctx.globalAlpha = labialActivo.opacidad;
                  ctx.filter = "blur(1.5px)";
                  ctx.fillStyle = labialActivo.color;
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
              }
            }
            // 2. ROPA / CARTERAS / TENIS CON INCLINACIÓN CORPORAL EN TIEMPO REAL
            if (!esBelleza && prendaListaRef.current) {
              const prenda = prendaListaRef.current;
              let cuerpo = null;

              if (poseLandmarker) {
                const poses = fotoSubida
                  ? poseLandmarker.detect(fotoSubida)
                  : poseLandmarker.detectForVideo(video!, ahora);
                cuerpo = poses.landmarks.at(0) ?? null;
              }

              if (cuerpo) {
                const hIzq = cuerpo.at(11);
                const hDer = cuerpo.at(12);
                const munecaDer = cuerpo.at(16);
                const tobilloDer = cuerpo.at(28);

                if (esCartera && munecaDer) {
                  const anchoP = w * 0.28 * ajusteAncho;
                  const altoP = anchoP * (prenda.height / prenda.width);
                  ctx.drawImage(
                    prenda,
                    munecaDer.x * w - anchoP / 2,
                    munecaDer.y * h + ajusteAltura,
                    anchoP,
                    altoP
                  );
                } else if (esTenis && tobilloDer) {
                  const anchoP = w * 0.22 * ajusteAncho;
                  const altoP = anchoP * (prenda.height / prenda.width);
                  ctx.drawImage(
                    prenda,
                    tobilloDer.x * w - anchoP / 2,
                    tobilloDer.y * h - altoP * 0.3 + ajusteAltura,
                    anchoP,
                    altoP
                  );
                } else if (hIzq && hDer) {
                  // Calcular centro, ancho e inclinación real de los hombros de la clienta
                  const x1 = hIzq.x * w;
                  const y1 = hIzq.y * h;
                  const x2 = hDer.x * w;
                  const y2 = hDer.y * h;

                  const centroX = (x1 + x2) / 2;
                  const topY = Math.min(y1, y2) - 18 + ajusteAltura;
                  const distanciaHombros = Math.hypot(x2 - x1, y2 - y1);
                  const angulo = Math.atan2(y1 - y2, x1 - x2);

                  const anchoP = Math.max(distanciaHombros * ajusteAncho, w * 0.36);
                  const altoP = anchoP * (prenda.height / prenda.width);

                  ctx.save();
                  ctx.translate(centroX, topY + altoP * 0.2);
                  ctx.rotate(angulo);
                  ctx.drawImage(prenda, -anchoP / 2, -altoP * 0.2, anchoP, altoP);
                  ctx.restore();
                }
              } else {
                const anchoP = w * 0.48 * (ajusteAncho / 1.35);
                const altoP = anchoP * (prenda.height / prenda.width);
                ctx.drawImage(prenda, w / 2 - anchoP / 2, h * 0.3 + ajusteAltura, anchoP, altoP);
              }
            }

            ctx.restore();
          }
        }

        if (!fotoSubida) {
          animationFrameId = requestAnimationFrame(procesarCuadro);
        }
      };

      procesarCuadro();
    };

    iniciarEspejoGratuito();

    return () => {
      cancelado = true;
      cancelAnimationFrame(animationFrameId);
      if (streamActivo) {
        streamActivo.getTracks().forEach((t) => t.stop());
      }
      faceLandmarker?.close();
      poseLandmarker?.close();
    };
  }, [abierto, camaraFrontal, esBelleza, esCartera, esTenis, labialActivo, ruborActivo, ajusteAltura, ajusteAncho, fotoSubida, fotoCapturada]);

  if (!abierto) return null;
  const manejarFotoSubida = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.item(0);
    if (archivo) {
      const img = new Image();
      img.src = URL.createObjectURL(archivo);
      img.onload = () => {
        setFotoSubida(img);
        setErrorCamara(null);
      };
    }
  };

  const capturarFoto = () => {
    if (!canvasRef.current) return;
    setFotoCapturada(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#5E3A36]/30 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-lg w-full p-5 sm:p-6 gold-ring-border shadow-2xl relative my-4">
        <button
          onClick={() => {
            setFotoCapturada(null);
            setFotoSubida(null);
            alCerrar();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#C89B54] mb-0.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Espejo Virtual AR · {categoria}</span>
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

          {errorCamara && !fotoSubida ? (
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
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-semibold text-[#5E3A36]">
                {iaLista ? "IA Rastreo Activo ✓" : "Iniciando rastreo..."}
              </span>

              {!fotoSubida && (
                <button
                  type="button"
                  onClick={() => setCamaraFrontal((prev) => !prev)}
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
              <span>{fotoSubida ? "Cambiar foto" : "Probar en foto"}</span>
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
                onClick={capturarFoto}
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
