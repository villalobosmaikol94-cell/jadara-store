"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  Camera,
  Eye,
  ArrowRight,
  Wand2,
  X,
  Plus,
  Minus,
  RotateCw,
  Check,
  Upload,
  Lock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ProbadorAR from "../components/ProbadorAR";
import CheckoutWhatsApp from "../components/CheckoutWhatsApp";
import PanelAdminModal from "../components/PanelAdminModal";

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  costo: number;
  stock: number;
  imagenUrl: string | null;
  badge: string;
  tonoFondo: string;
  descripcion: string;
  opciones: string[];
  esRealDB: boolean;
}

interface ItemCarrito {
  producto: Producto;
  opcionSeleccionada: string;
  cantidad: number;
}

const CATEGORIAS: string[] = ["Todo", "Belleza", "Carteras", "Tenis", "Ropa Dama"];
const CATALOGO_DEMO: Producto[] = [
  {
    id: 101,
    nombre: "Sérum Pétalo Luminoso Vitamina C",
    categoria: "Belleza",
    precio: 125000,
    costo: 65000,
    stock: 10,
    imagenUrl: null,
    badge: "Probador Facial AR",
    tonoFondo: "bg-[#F9EAE6]",
    descripcion:
      "Fórmula botánica iluminadora con extracto de rosa y vitamina C pura para un brillo natural.",
    opciones: ["30 ml · Iluminador", "50 ml · Efecto Seda"],
    esRealDB: false,
  },
  {
    id: 102,
    nombre: "Cartera Estructurada Aura Rose",
    categoria: "Carteras",
    precio: 280000,
    costo: 150000,
    stock: 6,
    imagenUrl: null,
    badge: "Vista 3D 360°",
    tonoFondo: "bg-[#F6EDE7]",
    descripcion:
      "Acabado vegano premium con herrajes dorado champán y correa ajustable de lujo.",
    opciones: ["Rosa Pétalo", "Crema Alabastro", "Terracota Suave"],
    esRealDB: false,
  },
  {
    id: 103,
    nombre: "Tenis CloudWalk Champagne & Cream",
    categoria: "Tenis",
    precio: 340000,
    costo: 190000,
    stock: 8,
    imagenUrl: null,
    badge: "Escáner Talla IA",
    tonoFondo: "bg-[#FAF2EE]",
    descripcion:
      "Suela ergonómica ultraligera diseñada para caminar con elegancia durante todo el día.",
    opciones: ["Talla 36", "Talla 37", "Talla 38", "Talla 39"],
    esRealDB: false,
  },
  {
    id: 104,
    nombre: "Vestido Seda Fluida Terracota Suave",
    categoria: "Ropa Dama",
    precio: 215000,
    costo: 110000,
    stock: 5,
    imagenUrl: null,
    badge: "Estilista Virtual",
    tonoFondo: "bg-[#F5E6E3]",
    descripcion:
      "Caída fluida que estiliza la silueta con tela transpirable de tacto suave.",
    opciones: ["Talla S", "Talla M", "Talla L"],
    esRealDB: false,
  },
];
export default function JadaraStore() {
  const [catalogo, setCatalogo] = useState<Producto[]>(CATALOGO_DEMO);
  const [categoriaActiva, setCategoriaActiva] = useState<string>("Todo");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState<boolean>(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState<boolean>(false);
  const [adminAbierto, setAdminAbierto] = useState<boolean>(false);

  const [consultaIA, setConsultaIA] = useState<string>("");
  const [lookSugerido, setLookSugerido] = useState<Producto[] | null>(null);

  const [productoVistaRapida, setProductoVistaRapida] = useState<Producto | null>(null);
  const [opcionActiva, setOpcionActiva] = useState<string>("");
  const [rotacion3D, setRotacion3D] = useState<number>(0);

  const [productoProbadorAR, setProductoProbadorAR] = useState<Producto | null>(null);
  const [busquedaVisualAbierta, setBusquedaVisualAbierta] = useState<boolean>(false);
  const [imagenSubida, setImagenSubida] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const cargarProductosReales = async () => {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (data && data.length > 0) {
      const formateados: Producto[] = data.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        precio: Number(p.precio_venta),
        costo: Number(p.costo_compra),
        stock: Number(p.stock),
        imagenUrl: p.imagen_url,
        badge: p.stock > 0 ? `${p.stock} disponibles` : "Agotado",
        tonoFondo: "bg-[#F9EAE6]",
        descripcion:
          p.descripcion || "Pieza exclusiva Jadara diseñada con propósito y estilo.",
        opciones: p.opciones && p.opciones.length > 0 ? p.opciones : ["Única"],
        esRealDB: true,
      }));
      setCatalogo(formateados);
    } else {
      setCatalogo(CATALOGO_DEMO);
    }
  };

  useEffect(() => {
    cargarProductosReales();
  }, []);

  const productosFiltrados =
    categoriaActiva === "Todo"
      ? catalogo
      : catalogo.filter((p) => p.categoria === categoriaActiva);

  const abrirVistaRapida = (producto: Producto) => {
    setProductoVistaRapida(producto);
    setOpcionActiva(producto.opciones.at(0) ?? "Única");
    setRotacion3D(0);
  };

  const agregarAlCarrito = (producto: Producto, opcion?: string) => {
    if (producto.stock <= 0) return;
    const elegida = opcion || (producto.opciones.at(0) ?? "Única");
    setCarrito((prev) => {
      const existe = prev.find(
        (item) => item.producto.id === producto.id && item.opcionSeleccionada === elegida
      );
      if (existe) {
        return prev.map((item) =>
          item.producto.id === producto.id && item.opcionSeleccionada === elegida
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, opcionSeleccionada: elegida, cantidad: 1 }];
    });
    setProductoVistaRapida(null);
    setCarritoAbierto(true);
  };

  const cambiarCantidad = (id: number, opcion: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.producto.id === id && item.opcionSeleccionada === opcion
            ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPrecio = carrito.reduce(
    (acc, item) => acc + item.producto.precio * item.cantidad,
    0
  );

  const ejecutarEstilistaIA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultaIA.trim()) return;
    setLookSugerido(catalogo.slice(0, 3));
  };

  const manejarFotoSubida = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.item(0);
    if (archivo) {
      setImagenSubida(URL.createObjectURL(archivo));
    }
  };
  return (
    <div className="min-h-screen bg-[#FDF8F6] text-[#5E3A36]">
      <header className="sticky top-0 z-40 glass-jadara px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/jadara.png"
              alt="Logo Jadara"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover gold-ring-border shadow-xs"
            />
            <div>
              <span className="block text-lg sm:text-xl font-serif tracking-[0.22em] text-[#C6736A] font-semibold">
                JADARA
              </span>
              <span className="block text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-[#9E7B74]">
                Belleza con propósito
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9E7B74]">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`transition-all cursor-pointer pb-1 ${
                  categoriaActiva === cat
                    ? "text-[#C6736A] border-b-2 border-[#C89B54] font-semibold"
                    : "hover:text-[#5E3A36]"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setAdminAbierto(true)}
              title="Jadara Studio (Admin)"
              className="px-3 py-2 rounded-full bg-white gold-ring-border hover:bg-[#F7E6E1] transition flex items-center gap-1.5 text-xs font-medium text-[#9E7B74] hover:text-[#C6736A] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#C89B54]" />
              <span className="hidden sm:inline">Studio</span>
            </button>

            <button
              onClick={() => setBusquedaVisualAbierta(true)}
              title="Buscar por foto con IA"
              className="p-2.5 rounded-full bg-white gold-ring-border hover:bg-[#F7E6E1] transition cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#C6736A]" />
            </button>

            <button
              onClick={() => setCarritoAbierto(true)}
              className="relative p-2.5 rounded-full bg-white gold-ring-border hover:bg-[#F7E6E1] transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#C6736A]" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-24">
        <section className="rounded-3xl bg-gradient-to-br from-white via-[#FDF5F2] to-[#F7E6E1] p-7 md:p-14 gold-ring-border shadow-xs mb-12 sm:mb-16">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 text-xs font-medium text-[#C89B54] gold-ring-border mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tecnología de Moda & Belleza 2026</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5E3A36] leading-tight mb-4">
                Tu estilo florece con{" "}
                <span className="text-[#C6736A] italic">inteligencia y luz.</span>
              </h1>
              <p className="text-[#9E7B74] text-sm sm:text-base md:text-lg mb-8 max-w-xl">
                Explora cosmética, carteras, tenis y moda femenina con probador virtual en cámara y asesoría inteligente.
              </p>

              <form
                onSubmit={ejecutarEstilistaIA}
                className="flex items-center bg-white rounded-full p-2 gold-ring-border shadow-xs max-w-xl"
              >
                <Wand2 className="w-5 h-5 text-[#C89B54] ml-3 shrink-0" />
                <input
                  type="text"
                  value={consultaIA}
                  onChange={(e) => setConsultaIA(e.target.value)}
                  placeholder="Pídele a la IA: Arma un outfit casual..."
                  className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none text-[#5E3A36]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs sm:text-sm font-medium hover:opacity-95 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Crear Look</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {lookSugerido && (
                <div className="mt-4 p-4 rounded-2xl bg-white/95 gold-ring-border text-sm text-[#5E3A36] max-w-xl">
                  <p className="font-semibold text-[#C6736A] mb-2">
                    Estilista Jadara IA armó este conjunto:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lookSugerido.map((item) => (
                      <span
                        key={item.id}
                        className="px-2.5 py-1 rounded-full bg-[#FDF8F6] gold-ring-border text-xs"
                      >
                        {item.nombre}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => lookSugerido.forEach((p) => agregarAlCarrito(p))}
                    className="px-4 py-1.5 rounded-full bg-[#C6736A] text-white text-xs font-medium hover:opacity-90 cursor-pointer"
                  >
                    + Añadir Look Completo al Bolso
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-5 flex justify-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full p-2 gold-ring-border bg-white/60 shadow-sm flex items-center justify-center">
                <img
                  src="/images/jadara.png"
                  alt="Emblema Jadara"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <h2 className="text-2xl font-serif text-[#5E3A36]">
              Colección Exclusiva {categoriaActiva !== "Todo" && `· ${categoriaActiva}`}
            </h2>
            <div className="flex flex-wrap gap-2 md:hidden">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    categoriaActiva === cat
                      ? "bg-[#C6736A] text-white"
                      : "bg-white text-[#9E7B74] gold-ring-border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {productosFiltrados.map((producto) => (
              <div
                key={producto.id}
                className="group bg-white rounded-3xl p-4 gold-ring-border hover:shadow-md transition-all duration-300"
              >
                <div
                  onClick={() => abrirVistaRapida(producto)}
                  className={`h-60 rounded-2xl ${producto.tonoFondo} mb-4 relative flex items-center justify-center overflow-hidden cursor-pointer`}
                >
                  {producto.imagenUrl ? (
                    <img
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <span className="text-xs text-[#9E7B74] tracking-widest uppercase">
                      Foto {producto.categoria}
                    </span>
                  )}

                  <span
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-[11px] font-medium gold-ring-border ${
                      producto.stock <= 0 ? "text-red-500" : "text-[#C89B54]"
                    }`}
                  >
                    {producto.badge}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirVistaRapida(producto);
                    }}
                    title="Vista 3D Interactiva"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-3 right-3 p-2.5 rounded-full bg-white text-[#C6736A] gold-ring-border shadow-xs cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-[#C89B54] uppercase tracking-widest font-medium mb-1">
                  {producto.categoria}
                </p>
                <h3 className="font-medium text-base text-[#5E3A36] mb-3">
                  {producto.nombre}
                </h3>

                <div className="flex items-center justify-between pt-3 border-t border-[#FDF8F6]">
                  <span className="font-semibold text-[#5E3A36]">
                    ${producto.precio.toLocaleString("es-CO")}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setProductoProbadorAR(producto)}
                      className="px-2.5 py-1.5 rounded-full bg-white text-[#C89B54] gold-ring-border text-xs font-medium hover:bg-[#FDF8F6] cursor-pointer"
                    >
                      Probar AR
                    </button>
                    <button
                      disabled={producto.stock <= 0}
                      onClick={() => abrirVistaRapida(producto)}
                      className="px-3 py-1.5 rounded-full bg-[#F7E6E1] text-[#C6736A] text-xs font-semibold hover:bg-[#C6736A] hover:text-white transition cursor-pointer disabled:opacity-40"
                    >
                      {producto.stock <= 0 ? "Agotado" : "Elegir"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      {productoVistaRapida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/20 backdrop-blur-xs">
          <div className="bg-[#FDF8F6] rounded-3xl max-w-2xl w-full p-6 md:p-8 gold-ring-border shadow-xl relative">
            <button
              onClick={() => setProductoVistaRapida(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div
                className={`h-72 rounded-2xl ${productoVistaRapida.tonoFondo} flex flex-col items-center justify-center relative gold-ring-border overflow-hidden`}
              >
                {productoVistaRapida.imagenUrl ? (
                  <img
                    src={productoVistaRapida.imagenUrl}
                    alt={productoVistaRapida.nombre}
                    style={{ transform: `rotateY(${rotacion3D}deg)` }}
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                ) : (
                  <div
                    style={{ transform: `rotateY(${rotacion3D}deg)` }}
                    className="transition-transform duration-500 text-center px-4"
                  >
                    <span className="block text-xs uppercase tracking-widest text-[#C89B54] mb-1">
                      Vista 360° ({rotacion3D}°)
                    </span>
                    <span className="text-sm font-serif text-[#5E3A36]">
                      {productoVistaRapida.nombre}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setRotacion3D((prev) => (prev + 90) % 360)}
                  className="absolute bottom-3 px-4 py-1.5 rounded-full bg-white text-xs font-medium text-[#C6736A] gold-ring-border flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotar 3D</span>
                </button>
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-[#C89B54] font-semibold">
                  {productoVistaRapida.categoria}
                </span>
                <h3 className="text-2xl font-serif text-[#5E3A36] mt-1 mb-2">
                  {productoVistaRapida.nombre}
                </h3>
                <p className="text-xl font-semibold text-[#C6736A] mb-3">
                  ${productoVistaRapida.precio.toLocaleString("es-CO")}
                </p>
                <p className="text-xs text-[#9E7B74] leading-relaxed mb-5">
                  {productoVistaRapida.descripcion}
                </p>

                <p className="text-xs font-semibold text-[#5E3A36] mb-2">
                  Selecciona variante:
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {productoVistaRapida.opciones.map((op) => (
                    <button
                      key={op}
                      onClick={() => setOpcionActiva(op)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                        opcionActiva === op
                          ? "bg-[#C6736A] text-white"
                          : "bg-white text-[#5E3A36] gold-ring-border"
                      }`}
                    >
                      {opcionActiva === op && <Check className="w-3 h-3" />}
                      <span>{op}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => agregarAlCarrito(productoVistaRapida, opcionActiva)}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium shadow-xs hover:opacity-95 transition cursor-pointer"
                >
                  Añadir al Bolso Jadara
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {busquedaVisualAbierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/20 backdrop-blur-xs">
          <div className="bg-[#FDF8F6] rounded-3xl max-w-md w-full p-6 gold-ring-border shadow-xl relative text-center">
            <button
              onClick={() => {
                setBusquedaVisualAbierta(false);
                setImagenSubida(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-serif text-[#5E3A36] mb-2">
              Buscador Visual Jadara IA
            </h3>
            <p className="text-xs text-[#9E7B74] mb-5">
              Sube una foto de inspiración y encontraremos piezas similares en nuestro catálogo.
            </p>

            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              onChange={manejarFotoSubida}
              className="hidden"
            />

            {!imagenSubida ? (
              <div
                onClick={() => inputFotoRef.current?.click()}
                className="border-2 border-dashed border-[#C89B54]/50 rounded-2xl p-8 bg-white/70 hover:bg-white transition cursor-pointer"
              >
                <Upload className="w-8 h-8 text-[#C6736A] mx-auto mb-2" />
                <span className="text-xs font-medium text-[#5E3A36]">
                  Haz clic para subir una foto de inspiración
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={imagenSubida}
                  alt="Referencia subida"
                  className="h-44 mx-auto rounded-2xl object-cover gold-ring-border"
                />
                <div className="p-3 rounded-2xl bg-white gold-ring-border text-xs text-[#5E3A36]">
                  <span className="font-semibold text-[#C6736A]">Coincidencia 96%: </span>
                  Encuentra estilos similares en nuestra colección exclusiva.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {carritoAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#5E3A36]/15 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FDF8F6] h-full p-6 flex flex-col justify-between shadow-xl border-l border-[#C89B54]/30">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#F7E6E1]">
                <h3 className="font-serif text-xl text-[#5E3A36]">Tu Bolso Jadara</h3>
                <button
                  onClick={() => setCarritoAbierto(false)}
                  className="p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {carrito.length === 0 ? (
                <p className="text-sm text-[#9E7B74] text-center mt-16">
                  Tu bolso está vacío. Explora nuestras piezas diseñadas con propósito.
                </p>
              ) : (
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {carrito.map(({ producto, opcionSeleccionada, cantidad }) => (
                    <div
                      key={`${producto.id}-${opcionSeleccionada}`}
                      className="flex items-center justify-between bg-white p-3.5 rounded-2xl gold-ring-border"
                    >
                      <div>
                        <h4 className="text-sm font-medium text-[#5E3A36]">
                          {producto.nombre}
                        </h4>
                        <span className="block text-[11px] text-[#9E7B74]">
                          {opcionSeleccionada}
                        </span>
                        <span className="text-xs text-[#C6736A] font-semibold">
                          ${(producto.precio * cantidad).toLocaleString("es-CO")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cambiarCantidad(producto.id, opcionSeleccionada, -1)}
                          className="p-1 rounded-full bg-[#FDF8F6] gold-ring-border text-[#5E3A36] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold w-4 text-center">
                          {cantidad}
                        </span>
                        <button
                          onClick={() => cambiarCantidad(producto.id, opcionSeleccionada, 1)}
                          className="p-1 rounded-full bg-[#FDF8F6] gold-ring-border text-[#5E3A36] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {carrito.length > 0 && (
              <div className="pt-4 border-t border-[#F7E6E1]">
                <div className="flex justify-between text-base font-semibold mb-4">
                  <span>Total estimado</span>
                  <span className="text-[#C6736A]">
                    ${totalPrecio.toLocaleString("es-CO")}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCarritoAbierto(false);
                    setCheckoutAbierto(true);
                  }}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white font-medium text-sm shadow-sm hover:opacity-95 transition cursor-pointer"
                >
                  Finalizar Compra Segura
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ProbadorAR
        abierto={Boolean(productoProbadorAR)}
        alCerrar={() => setProductoProbadorAR(null)}
        nombreProducto={productoProbadorAR?.nombre ?? ""}
        categoria={productoProbadorAR?.categoria ?? ""}
      />

      <CheckoutWhatsApp
        abierto={checkoutAbierto}
        alCerrar={() => setCheckoutAbierto(false)}
        items={carrito.map((item) => ({
          id: item.producto.id,
          nombre: item.producto.nombre,
          opcionSeleccionada: item.opcionSeleccionada,
          cantidad: item.cantidad,
          precio: item.producto.precio,
          costo: item.producto.costo,
          stockActual: item.producto.stock,
          esRealDB: item.producto.esRealDB,
        }))}
        total={totalPrecio}
        alCompletarVenta={() => {
          setCarrito([]);
          setCheckoutAbierto(false);
          cargarProductosReales();
        }}
      />

      <PanelAdminModal
        abierto={adminAbierto}
        alCerrar={() => setAdminAbierto(false)}
        alActualizarCatalogo={cargarProductosReales}
      />
    </div>
  );
}
