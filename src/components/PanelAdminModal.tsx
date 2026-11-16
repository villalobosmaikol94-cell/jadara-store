"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  PlusCircle,
  Package,
  DollarSign,
  TrendingUp,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Palette,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export interface VarianteColor {
  nombre: string;
  hex: string;
  imagenUrl: string | null;
}

interface VarianteColorForm {
  nombre: string;
  hex: string;
  archivo: File | null;
}

interface ProductoDB {
  id: number;
  nombre: string;
  categoria: string;
  precio_venta: number;
  costo_compra: number;
  stock: number;
  imagen_url: string | null;
  opciones: string[];
  colores_fotos?: VarianteColor[];
}

interface VentaDB {
  id: number;
  cliente: string;
  ciudad: string | null;
  detalle: string;
  total_venta: number;
  ganancia_neta: number;
}

interface PanelProps {
  abierto: boolean;
  alCerrar: () => void;
  alActualizarCatalogo: () => void;
}

const PIN_ACCESO = "2702";
const TALLAS_DISPONIBLES = [
  "Única",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
];

const PALETA_RAPIDA = [
  { nombre: "Negro", hex: "#1A1A1A" },
  { nombre: "Blanco", hex: "#FFFFFF" },
  { nombre: "Rosa Pétalo", hex: "#E8B4B8" },
  { nombre: "Terracota", hex: "#C6736A" },
  { nombre: "Crema", hex: "#F5EFE6" },
  { nombre: "Beige", hex: "#D8C3A5" },
  { nombre: "Café", hex: "#6F4E37" },
  { nombre: "Dorado", hex: "#C89B54" },
  { nombre: "Rojo", hex: "#C81D25" },
  { nombre: "Vinotinto", hex: "#6B1D2F" },
  { nombre: "Fucsia", hex: "#E0218A" },
  { nombre: "Lila", hex: "#C8A2C8" },
  { nombre: "Azul Rey", hex: "#1E40AF" },
  { nombre: "Azul Cielo", hex: "#93C5FD" },
  { nombre: "Verde Esmeralda", hex: "#047857" },
  { nombre: "Verde Salvia", hex: "#9CAF88" },
  { nombre: "Gris", hex: "#9CA3AF" },
];
export default function PanelAdminModal({
  abierto,
  alCerrar,
  alActualizarCatalogo,
}: PanelProps) {
  const [autenticado, setAutenticado] = useState(false);
  const [pinIngresado, setPinIngresado] = useState("");
  const [pestana, setPestana] = useState<"subir" | "inventario" | "contabilidad">("subir");

  const [productos, setProductos] = useState<ProductoDB[]>([]);
  const [ventas, setVentas] = useState<VentaDB[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Ropa Dama");
  const [precioVenta, setPrecioVenta] = useState("");
  const [costoCompra, setCostoCompra] = useState("");
  const [stock, setStock] = useState("5");
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<string[]>(["S", "M", "L"]);
  const [descripcion, setDescripcion] = useState("");
  const [archivoPrincipal, setArchivoPrincipal] = useState<File | null>(null);

  const [coloresForm, setColoresForm] = useState<VarianteColorForm[]>([]);
  const [nuevoColorNombre, setNuevoColorNombre] = useState("");
  const [nuevoColorHex, setNuevoColorHex] = useState("#C6736A");

  const cargarDatos = async () => {
    const { data: prods } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });
    if (prods) setProductos(prods);

    const { data: vts } = await supabase
      .from("ventas")
      .select("*")
      .order("id", { ascending: false });
    if (vts) setVentas(vts);
  };

  useEffect(() => {
    if (abierto && autenticado) {
      cargarDatos();
    }
  }, [abierto, autenticado]);

  if (!abierto) return null;

  const verificarPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinIngresado === PIN_ACCESO) {
      setAutenticado(true);
    } else {
      alert("PIN incorrecto");
    }
  };

  const alternarTalla = (talla: string) => {
    setTallasSeleccionadas((prev) =>
      prev.includes(talla) ? prev.filter((t) => t !== talla) : [...prev, talla]
    );
  };

  const agregarColorLista = () => {
    if (!nuevoColorNombre.trim()) return;
    setColoresForm((prev) => [
      ...prev,
      { nombre: nuevoColorNombre.trim(), hex: nuevoColorHex, archivo: null },
    ]);
    setNuevoColorNombre("");
  };

  const asignarFotoAColor = (index: number, file: File | null) => {
    setColoresForm((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, archivo: file } : c))
    );
  };

  const quitarColorLista = (index: number) => {
    setColoresForm((prev) => prev.filter((_, idx) => idx !== index));
  };
  const subirImagenStorage = async (archivo: File): Promise<string | null> => {
    const nombreArchivo = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${archivo.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage
      .from("fotos-jadara")
      .upload(nombreArchivo, archivo);

    if (!error) {
      const { data } = supabase.storage
        .from("fotos-jadara")
        .getPublicUrl(nombreArchivo);
      return data.publicUrl;
    }
    return null;
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precioVenta || !costoCompra) return;
    setCargando(true);
    setMensaje(null);

    let urlPrincipal: string | null = null;
    if (archivoPrincipal) {
      urlPrincipal = await subirImagenStorage(archivoPrincipal);
    }

    const coloresSubidos: VarianteColor[] = [];
    for (const c of coloresForm) {
      let urlColor: string | null = null;
      if (c.archivo) {
        urlColor = await subirImagenStorage(c.archivo);
      }
      coloresSubidos.push({
        nombre: c.nombre,
        hex: c.hex,
        imagenUrl: urlColor || urlPrincipal,
      });
    }

    if (!urlPrincipal && coloresSubidos.length > 0) {
      urlPrincipal = coloresSubidos.at(0)?.imagenUrl ?? null;
    }

    const { error } = await supabase.from("productos").insert([
      {
        nombre,
        categoria,
        precio_venta: Number(precioVenta),
        costo_compra: Number(costoCompra),
        stock: Number(stock),
        imagen_url: urlPrincipal,
        opciones: tallasSeleccionadas.length > 0 ? tallasSeleccionadas : ["Única"],
        colores_fotos: coloresSubidos,
        descripcion,
      },
    ]);

    setCargando(false);
    if (!error) {
      setMensaje("Producto publicado con sus tallas y colores en Jadara.");
      setNombre("");
      setPrecioVenta("");
      setCostoCompra("");
      setStock("5");
      setDescripcion("");
      setArchivoPrincipal(null);
      setColoresForm([]);
      cargarDatos();
      alActualizarCatalogo();
    } else {
      setMensaje("Error: " + error.message);
    }
  };

  const actualizarStock = async (id: number, nuevoStock: number) => {
    if (nuevoStock < 0) return;
    await supabase.from("productos").update({ stock: nuevoStock }).eq("id", id);
    cargarDatos();
    alActualizarCatalogo();
  };

  const eliminarProducto = async (id: number) => {
    if (!confirm("¿Eliminar este producto de la tienda?")) return;
    await supabase.from("productos").delete().eq("id", id);
    cargarDatos();
    alActualizarCatalogo();
  };

  const eliminarVenta = async (id: number) => {
    if (!confirm("¿Eliminar este registro de venta?")) return;
    await supabase.from("ventas").delete().eq("id", id);
    cargarDatos();
  };

  const resetearFinanzas = async () => {
    if (!confirm("¿Seguro que deseas resetear TODAS las finanzas a $0?")) return;
    await supabase.from("ventas").delete().neq("id", 0);
    cargarDatos();
  };
  const inversionBodega = productos.reduce(
    (acc, p) => acc + Number(p.costo_compra) * Number(p.stock),
    0
  );
  const valorVentaBodega = productos.reduce(
    (acc, p) => acc + Number(p.precio_venta) * Number(p.stock),
    0
  );
  const totalVendido = ventas.reduce((acc, v) => acc + Number(v.total_venta), 0);
  const gananciaNetaTotal = ventas.reduce(
    (acc, v) => acc + Number(v.ganancia_neta),
    0
  );

  if (!autenticado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/25 backdrop-blur-xs">
        <form
          onSubmit={verificarPin}
          className="bg-[#FDF8F6] rounded-3xl p-8 max-w-sm w-full gold-ring-border shadow-xl text-center relative"
        >
          <button
            type="button"
            onClick={alCerrar}
            className="absolute top-4 right-4 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 rounded-full bg-[#F7E6E1] text-[#C6736A] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-serif text-[#5E3A36] mb-1">Jadara Studio</h3>
          <p className="text-xs text-[#9E7B74] mb-6">
            Acceso exclusivo administración (PIN: 2026)
          </p>
          <input
            type="password"
            value={pinIngresado}
            onChange={(e) => setPinIngresado(e.target.value)}
            placeholder="••••"
            className="w-full text-center tracking-[0.5em] text-lg py-3 rounded-2xl bg-white gold-ring-border mb-4 focus:outline-none text-[#5E3A36]"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium cursor-pointer"
          >
            Entrar al Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#5E3A36]/25 backdrop-blur-xs">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 gold-ring-border shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#F7E6E1] mb-5">
          <div>
            <span className="text-lg font-serif font-semibold text-[#C6736A]">
              JADARA STUDIO
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-[#9E7B74]">
              Tallas, Colores, Stock & Finanzas
            </span>
          </div>
          <button
            onClick={alCerrar}
            className="p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl gold-ring-border mb-6">
          <button
            onClick={() => setPestana("subir")}
            className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              pestana === "subir" ? "bg-[#C6736A] text-white" : "text-[#9E7B74]"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar</span>
          </button>
          <button
            onClick={() => setPestana("inventario")}
            className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              pestana === "inventario" ? "bg-[#C6736A] text-white" : "text-[#9E7B74]"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock ({productos.length})</span>
          </button>
          <button
            onClick={() => setPestana("contabilidad")}
            className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              pestana === "contabilidad" ? "bg-[#C6736A] text-white" : "text-[#9E7B74]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Finanzas</span>
          </button>
        </div>
        {pestana === "subir" && (
          <form onSubmit={guardarProducto} className="space-y-4 max-w-xl mx-auto">
            {mensaje && (
              <div className="p-3 rounded-xl bg-[#F7E6E1] text-xs font-medium text-[#C6736A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{mensaje}</span>
              </div>
            )}

            <label className="block border-2 border-dashed border-[#C89B54]/50 rounded-2xl p-4 text-center bg-white cursor-pointer">
              <Upload className="w-6 h-6 text-[#C6736A] mx-auto mb-1" />
              <span className="block text-xs font-medium text-[#5E3A36]">
                {archivoPrincipal
                  ? `Foto portada lista: ${archivoPrincipal.name}`
                  : "Toca aquí para subir la foto principal de portada"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArchivoPrincipal(e.target.files?.item(0) ?? null)}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Conjunto Seda Primavera"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              >
                <option>Ropa Dama</option>
                <option>Belleza</option>
                <option>Carteras</option>
                <option>Tenis</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                required
                value={costoCompra}
                onChange={(e) => setCostoCompra(e.target.value)}
                placeholder="Costo ($)"
                className="w-full px-3 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              />
              <input
                type="number"
                required
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                placeholder="Venta ($)"
                className="w-full px-3 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              />
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Stock"
                className="w-full px-3 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              />
            </div>

            <div className="bg-white p-3.5 rounded-2xl gold-ring-border">
              <span className="block text-xs font-semibold text-[#5E3A36] mb-2">
                1. Toca las tallas que tienes disponibles:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TALLAS_DISPONIBLES.map((talla) => {
                  const activa = tallasSeleccionadas.includes(talla);
                  return (
                    <button
                      type="button"
                      key={talla}
                      onClick={() => alternarTalla(talla)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                        activa
                          ? "bg-[#C6736A] text-white"
                          : "bg-[#FDF8F6] text-[#9E7B74] gold-ring-border"
                      }`}
                    >
                      {talla}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl gold-ring-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5E3A36]">
                <Palette className="w-4 h-4 text-[#C89B54]" />
                <span>2. Colores disponibles (elige rápido o crea cualquier tono):</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PALETA_RAPIDA.map((p) => (
                  <button
                    type="button"
                    key={p.nombre}
                    onClick={() => {
                      setNuevoColorNombre(p.nombre);
                      setNuevoColorHex(p.hex);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#FDF8F6] gold-ring-border text-[11px] flex items-center gap-1.5 cursor-pointer hover:bg-[#F7E6E1]"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/15"
                      style={{ backgroundColor: p.hex }}
                    />
                    <span>{p.nombre}</span>
                  </button>
                ))}
              </div>

              <div className="bg-[#FDF8F6] p-2.5 rounded-xl gold-ring-border space-y-2">
                <span className="block text-[11px] text-[#9E7B74]">
                  Toca el cuadro de color para elegir <strong>cualquier tono</strong> y escribe su nombre:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    title="Toca para elegir cualquier color"
                    value={nuevoColorHex}
                    onChange={(e) => setNuevoColorHex(e.target.value)}
                    className="w-11 h-10 rounded-xl border border-[#C89B54]/40 cursor-pointer shrink-0 bg-white p-0.5"
                  />
                  <input
                    type="text"
                    value={nuevoColorNombre}
                    onChange={(e) => setNuevoColorNombre(e.target.value)}
                    placeholder="Escribe cualquier color (ej: Vinotinto)"
                    className="flex-1 px-3 py-2 rounded-xl bg-white gold-ring-border text-xs text-[#5E3A36]"
                  />
                  <button
                    type="button"
                    onClick={agregarColorLista}
                    className="px-4 py-2 rounded-xl bg-[#C6736A] text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {coloresForm.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#FDF8F6]">
                  {coloresForm.map((col, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-[#FDF8F6] p-2 rounded-xl gold-ring-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="font-medium">{col.nombre}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1 rounded-lg bg-white gold-ring-border text-[11px] font-medium text-[#C6736A] cursor-pointer">
                          {col.archivo ? "Foto lista ✓" : "Subir foto"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              asignarFotoAColor(idx, e.target.files?.item(0) ?? null)
                            }
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => quitarColorLista(idx)}
                          className="text-[#9E7B74] hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium cursor-pointer"
            >
              {cargando ? "Subiendo fotos y publicando..." : "Publicar en Tienda Jadara"}
            </button>
          </form>
        )}
        {pestana === "inventario" && (
          <div className="space-y-3">
            {productos.map((prod) => {
              const gananciaUnidad = Number(prod.precio_venta) - Number(prod.costo_compra);
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl p-3.5 gold-ring-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {prod.imagen_url ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.nombre}
                        className="w-12 h-12 rounded-xl object-cover gold-ring-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F7E6E1] flex items-center justify-center text-[10px] text-[#9E7B74]">
                        Sin foto
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold">{prod.nombre}</h4>
                      <p className="text-xs text-[#9E7B74]">
                        Venta: ${Number(prod.precio_venta).toLocaleString("es-CO")} · Ganancia:{" "}
                        <span className="text-emerald-700 font-semibold">
                          +${gananciaUnidad.toLocaleString("es-CO")}
                        </span>
                      </p>
                      {prod.stock <= 2 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Quedan {prod.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => actualizarStock(prod.id, prod.stock - 1)}
                      className="w-7 h-7 rounded-full bg-[#FDF8F6] gold-ring-border font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{prod.stock}</span>
                    <button
                      onClick={() => actualizarStock(prod.id, prod.stock + 1)}
                      className="w-7 h-7 rounded-full bg-[#FDF8F6] gold-ring-border font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id)}
                      className="p-1.5 text-[#9E7B74] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {pestana === "contabilidad" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5E3A36]">
                Resumen Financiero en Vivo
              </span>
              {ventas.length > 0 && (
                <button
                  onClick={resetearFinanzas}
                  className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetear Finanzas a $0</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Costo Bodega</span>
                <span className="text-base font-bold">
                  ${inversionBodega.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Valor Comercial</span>
                <span className="text-base font-bold text-[#C89B54]">
                  ${valorVentaBodega.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Total Vendido</span>
                <span className="text-base font-bold text-[#C6736A]">
                  ${totalVendido.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Ganancia Neta</span>
                <span className="text-base font-bold text-emerald-700">
                  ${gananciaNetaTotal.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 gold-ring-border">
              <h4 className="font-serif text-base mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#C89B54]" />
                <span>Ventas Registradas</span>
              </h4>
              {ventas.length === 0 ? (
                <p className="text-xs text-[#9E7B74] text-center py-4">
                  No hay ventas registradas en este periodo.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ventas.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border flex justify-between items-center text-xs gap-2"
                    >
                      <div>
                        <span className="font-semibold">{v.cliente}</span>
                        <span className="text-[#9E7B74]"> · {v.ciudad}</span>
                        <p className="text-[11px] text-[#9E7B74]">{v.detalle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="block font-bold text-[#C6736A]">
                            ${Number(v.total_venta).toLocaleString("es-CO")}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            +${Number(v.ganancia_neta).toLocaleString("es-CO")}
                          </span>
                        </div>
                        <button
                          onClick={() => eliminarVenta(v.id)}
                          title="Eliminar esta venta"
                          className="p-1.5 text-[#9E7B74] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
