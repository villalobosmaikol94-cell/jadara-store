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
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface ProductoDB {
  id: number;
  nombre: string;
  categoria: string;
  precio_venta: number;
  costo_compra: number;
  stock: number;
  imagen_url: string | null;
  opciones: string[];
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

const PIN_ACCESO = "2026";
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
  const [categoria, setCategoria] = useState("Belleza");
  const [precioVenta, setPrecioVenta] = useState("");
  const [costoCompra, setCostoCompra] = useState("");
  const [stock, setStock] = useState("5");
  const [opcionesTexto, setOpcionesTexto] = useState("Única");
  const [descripcion, setDescripcion] = useState("");
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);

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
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precioVenta || !costoCompra) return;
    setCargando(true);
    setMensaje(null);

    let urlPublica: string | null = null;

    if (archivoFoto) {
      const nombreArchivo = `${Date.now()}-${archivoFoto.name.replace(/\s+/g, "-")}`;
      const { error: errorSubida } = await supabase.storage
        .from("fotos-jadara")
        .upload(nombreArchivo, archivoFoto);

      if (!errorSubida) {
        const { data } = supabase.storage
          .from("fotos-jadara")
          .getPublicUrl(nombreArchivo);
        urlPublica = data.publicUrl;
      }
    }

    const listaOpciones = opcionesTexto
      .split(",")
      .map((op) => op.trim())
      .filter(Boolean);

    const { error } = await supabase.from("productos").insert([
      {
        nombre,
        categoria,
        precio_venta: Number(precioVenta),
        costo_compra: Number(costoCompra),
        stock: Number(stock),
        imagen_url: urlPublica,
        opciones: listaOpciones.length > 0 ? listaOpciones : ["Única"],
        descripcion,
      },
    ]);

    setCargando(false);
    if (!error) {
      setMensaje("Producto publicado en tu tienda Jadara.");
      setNombre("");
      setPrecioVenta("");
      setCostoCompra("");
      setStock("5");
      setDescripcion("");
      setArchivoFoto(null);
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
    if (!confirm("¿Seguro que deseas resetear TODAS las finanzas y borrar el historial a $0?")) return;
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
              Inventario, Fotos & Contabilidad en Vivo
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
            <span>Subir</span>
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

            <label className="block border-2 border-dashed border-[#C89B54]/50 rounded-2xl p-5 text-center bg-white cursor-pointer">
              <Upload className="w-7 h-7 text-[#C6736A] mx-auto mb-1" />
              <span className="block text-xs font-medium text-[#5E3A36]">
                {archivoFoto
                  ? `Foto lista: ${archivoFoto.name}`
                  : "Toca aquí para tomar foto o elegir de tu galería"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setArchivoFoto(e.target.files?.item(0) ?? null)}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del producto"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
              >
                <option>Belleza</option>
                <option>Carteras</option>
                <option>Tenis</option>
                <option>Ropa Dama</option>
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

            <input
              type="text"
              value={opcionesTexto}
              onChange={(e) => setOpcionesTexto(e.target.value)}
              placeholder="Tallas o tonos (ej: Talla 36, Talla 37, Talla 38)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm"
            />

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium cursor-pointer"
            >
              {cargando ? "Publicando..." : "Publicar en Tienda Jadara"}
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
