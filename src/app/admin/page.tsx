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
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

interface ProductoDB {
  id: number;
  nombre: string;
  categoria: string;
  precio_venta: number;
  costo_compra: number;
  stock: number;
  imagen_url: string | null;
  opciones: string[];
  descripcion: string | null;
}

interface VentaDB {
  id: number;
  created_at: string;
  cliente: string;
  ciudad: string | null;
  detalle: string;
  total_venta: number;
  ganancia_neta: number;
}

const PIN_ACCESO = "2026";

export default function AdminJadara() {
  const [autenticado, setAutenticado] = useState(false);
  const [pinIngresado, setPinIngresado] = useState("");
  const [pestana, setPestana] = useState<"subir" | "inventario" | "contabilidad">("subir");

  const [productos, setProductos] = useState<ProductoDB[]>([]);
  const [ventas, setVentas] = useState<VentaDB[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Estados del formulario para subir desde el celular
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
    if (autenticado) {
      cargarDatos();
    }
  }, [autenticado]);

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
      setMensaje("Producto publicado con éxito en Jadara.");
      setNombre("");
      setPrecioVenta("");
      setCostoCompra("");
      setStock("5");
      setDescripcion("");
      setArchivoFoto(null);
      cargarDatos();
    } else {
      setMensaje("Error al guardar: " + error.message);
    }
  };

  const actualizarStock = async (id: number, nuevoStock: number) => {
    if (nuevoStock < 0) return;
    await supabase.from("productos").update({ stock: nuevoStock }).eq("id", id);
    cargarDatos();
  };

  const eliminarProducto = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
    await supabase.from("productos").delete().eq("id", id);
    cargarDatos();
  };

  // Cálculos Contables Automáticos
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
      <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center p-4">
        <form
          onSubmit={verificarPin}
          className="bg-white rounded-3xl p-8 max-w-sm w-full gold-ring-border shadow-sm text-center"
        >
          <div className="w-14 h-14 rounded-full bg-[#F7E6E1] text-[#C6736A] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif text-[#5E3A36] mb-1">Jadara Studio</h1>
          <p className="text-xs text-[#9E7B74] mb-6">
            Ingresa tu PIN de administración (por defecto: 2026)
          </p>
          <input
            type="password"
            value={pinIngresado}
            onChange={(e) => setPinIngresado(e.target.value)}
            placeholder="••••"
            className="w-full text-center tracking-[0.5em] text-lg py-3 rounded-2xl bg-[#FDF8F6] gold-ring-border mb-4 focus:outline-none text-[#5E3A36]"
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
    <div className="min-h-screen bg-[#FDF8F6] text-[#5E3A36] pb-20">
      <header className="sticky top-0 z-30 glass-jadara px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-lg font-serif font-semibold text-[#C6736A]">
              JADARA STUDIO
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-[#9E7B74]">
              Control Móvil & Contabilidad
            </span>
          </div>
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-full bg-white gold-ring-border text-xs font-medium text-[#5E3A36] flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C6736A]" />
            <span>Ver Tienda</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl gold-ring-border mb-6">
          <button
            onClick={() => setPestana("subir")}
            className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              pestana === "subir" ? "bg-[#C6736A] text-white" : "text-[#9E7B74]"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Subir</span>
          </button>
          <button
            onClick={() => setPestana("inventario")}
            className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              pestana === "inventario" ? "bg-[#C6736A] text-white" : "text-[#9E7B74]"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock ({productos.length})</span>
          </button>
          <button
            onClick={() => setPestana("contabilidad")}
            className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
              pestana === "contabilidad" ? "bg-[#C6736A] text-white" : "text-[#9E7B74]"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Finanzas</span>
          </button>
        </div>

        {pestana === "subir" && (
          <form
            onSubmit={guardarProducto}
            className="bg-white rounded-3xl p-6 gold-ring-border space-y-4 max-w-xl mx-auto"
          >
            <h2 className="text-xl font-serif text-[#5E3A36]">
              Publicar Nuevo Producto
            </h2>

            {mensaje && (
              <div className="p-3 rounded-xl bg-[#F7E6E1] text-xs font-medium text-[#C6736A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{mensaje}</span>
              </div>
            )}

            <label className="block border-2 border-dashed border-[#C89B54]/50 rounded-2xl p-6 text-center bg-[#FDF8F6] cursor-pointer">
              <Upload className="w-7 h-7 text-[#C6736A] mx-auto mb-1.5" />
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
              <div>
                <label className="block text-xs font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Bolso Aura Rosa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border text-sm"
                >
                  <option>Belleza</option>
                  <option>Carteras</option>
                  <option>Tenis</option>
                  <option>Ropa Dama</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Costo ($)</label>
                <input
                  type="number"
                  required
                  value={costoCompra}
                  onChange={(e) => setCostoCompra(e.target.value)}
                  placeholder="80000"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Venta ($)</label>
                <input
                  type="number"
                  required
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                  placeholder="150000"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Stock</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Tallas o tonos (separados por coma)
              </label>
              <input
                type="text"
                value={opcionesTexto}
                onChange={(e) => setOpcionesTexto(e.target.value)}
                placeholder="Ej: Talla 36, Talla 37, Talla 38"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDF8F6] gold-ring-border text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium cursor-pointer"
            >
              {cargando ? "Publicando en la nube..." : "Publicar en Tienda Jadara"}
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
                  className="bg-white rounded-2xl p-4 gold-ring-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {prod.imagen_url ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.nombre}
                        className="w-14 h-14 rounded-xl object-cover gold-ring-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#F7E6E1] flex items-center justify-center text-[10px] text-[#9E7B74]">
                        Sin foto
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-[#5E3A36]">
                        {prod.nombre}
                      </h3>
                      <p className="text-xs text-[#9E7B74]">
                        Venta: ${Number(prod.precio_venta).toLocaleString("es-CO")} · Ganancia:{" "}
                        <span className="text-emerald-700 font-semibold">
                          +${gananciaUnidad.toLocaleString("es-CO")}
                        </span>
                      </p>
                      {prod.stock <= 2 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Stock bajo
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
                    <span className="text-sm font-bold w-6 text-center">{prod.stock}</span>
                    <button
                      onClick={() => actualizarStock(prod.id, prod.stock + 1)}
                      className="w-7 h-7 rounded-full bg-[#FDF8F6] gold-ring-border font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      onClick={() => eliminarProducto(prod.id)}
                      className="p-2 text-[#9E7B74] hover:text-red-600 cursor-pointer ml-1"
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Costo en Bodega</span>
                <span className="text-lg font-bold text-[#5E3A36]">
                  ${inversionBodega.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Valor Comercial</span>
                <span className="text-lg font-bold text-[#C89B54]">
                  ${valorVentaBodega.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Total Vendido</span>
                <span className="text-lg font-bold text-[#C6736A]">
                  ${totalVendido.toLocaleString("es-CO")}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl gold-ring-border">
                <span className="text-[11px] text-[#9E7B74] block">Ganancia Neta Real</span>
                <span className="text-lg font-bold text-emerald-700">
                  ${gananciaNetaTotal.toLocaleString("es-CO")}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 gold-ring-border">
              <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#C89B54]" />
                <span>Historial de Ventas Automáticas</span>
              </h3>
              {ventas.length === 0 ? (
                <p className="text-xs text-[#9E7B74] py-6 text-center">
                  Aún no hay ventas registradas. Cada pedido confirmado descontará stock y aparecerá aquí.
                </p>
              ) : (
                <div className="space-y-3">
                  {ventas.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl bg-[#FDF8F6] gold-ring-border flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#5E3A36]">{v.cliente}</span>
                        <span className="text-[#9E7B74]"> · {v.ciudad}</span>
                        <p className="text-[11px] text-[#9E7B74] mt-0.5">{v.detalle}</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-[#C6736A]">
                          ${Number(v.total_venta).toLocaleString("es-CO")}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Ganancia: +${Number(v.ganancia_neta).toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
