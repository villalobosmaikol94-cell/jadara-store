"use client";

import React, { useState } from "react";
import { X, Send, ShieldCheck, Printer, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export interface ItemPedido {
  id: number;
  nombre: string;
  opcionSeleccionada: string;
  cantidad: number;
  precio: number;
  costo: number;
  stockActual: number;
  esRealDB?: boolean;
}

interface CheckoutProps {
  abierto: boolean;
  alCerrar: () => void;
  items: ItemPedido[];
  total: number;
  alCompletarVenta: () => void;
}

interface FacturaGenerada {
  numeroOrden: string;
  fecha: string;
  cliente: string;
  ciudad: string;
  direccion: string;
  metodoPago: string;
  items: ItemPedido[];
  total: number;
  mensajeCodificado: string;
}

export default function CheckoutWhatsApp({
  abierto,
  alCerrar,
  items,
  total,
  alCompletarVenta,
}: CheckoutProps) {
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("Bucaramanga");
  const [direccion, setDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState("Nequi / Bancolombia");
  const [procesando, setProcesando] = useState(false);
  const [factura, setFactura] = useState<FacturaGenerada | null>(null);

  if (!abierto && !factura) return null;

    const abrirWhatsAppInteligente = (encodedMessage: string) => {
    const urlWeb = `https://wa.me{encodedMessage}`;
    const urlApp = `whatsapp://send?phone=573246670248&text=${encodedMessage}`;
    const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (esMovil) {
      window.location.href = urlApp;
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = urlWeb;
        }
      }, 1500);
    } else {
      window.open(urlWeb, "_blank", "noopener,noreferrer");
    }
  };


  const confirmarYGenerarFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !direccion.trim()) return;
    setProcesando(true);

    const numeroOrden = `JAD-${Math.floor(100000 + Math.random() * 900000)}`;
    const fechaActual = new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const detalleProductos = items
      .map(
        (item) =>
          `• ${item.cantidad}x ${item.nombre} (${item.opcionSeleccionada}) - $${(
            item.precio * item.cantidad
          ).toLocaleString("es-CO")}`
      )
      .join("\n");

    const gananciaTotal = items.reduce(
      (acc, item) => acc + (item.precio - item.costo) * item.cantidad,
      0
    );

    try {
      await supabase.from("ventas").insert([
        {
          cliente: nombre,
          ciudad,
          detalle: `[${numeroOrden}] ` + items.map((i) => `${i.cantidad}x ${i.nombre} (${i.opcionSeleccionada})`).join(", "),
          total_venta: total,
          ganancia_neta: gananciaTotal,
        },
      ]);

      for (const item of items) {
        if (item.esRealDB) {
          const nuevoStock = Math.max(0, item.stockActual - item.cantidad);
          await supabase
            .from("productos")
            .update({ stock: nuevoStock })
            .eq("id", item.id);
        }
      }
    } catch {
      // Continúa mostrando la factura aunque haya latencia de red
    }

    const mensaje = `Hola *JADARA* ✨, confirmo mi orden *${numeroOrden}*:\n\n*Clienta:* ${nombre}\n*Ciudad:* ${ciudad}\n*Dirección:* ${direccion}\n*Pago:* ${metodoPago}\n\n*Detalle:*\n${detalleProductos}\n\n*Total Neto (Sin IVA):* $${total.toLocaleString("es-CO")}`;
    const mensajeCodificado = encodeURIComponent(mensaje);

    setFactura({
      numeroOrden,
      fecha: fechaActual,
      cliente: nombre,
      ciudad,
      direccion,
      metodoPago,
      items: [...items],
      total,
      mensajeCodificado,
    });

    setProcesando(false);
    alCompletarVenta();
  };

  const cerrarTodo = () => {
    setFactura(null);
    setNombre("");
    setDireccion("");
    alCerrar();
  };
  if (factura) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/30 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 gold-ring-border shadow-2xl relative my-6">
          <button
            onClick={cerrarTodo}
            className="absolute top-5 right-5 p-2 rounded-full bg-[#FDF8F6] gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer print:hidden"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-3 print:hidden">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Orden registrada con éxito!</span>
          </div>

          <div className="border-b border-[#F7E6E1] pb-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/images/jadara.png"
                alt="Jadara"
                className="w-12 h-12 rounded-full object-cover gold-ring-border"
              />
              <div>
                <h3 className="font-serif text-xl tracking-[0.18em] text-[#C6736A] font-bold">
                  JADARA
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-[#9E7B74]">
                  Belleza con propósito
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-xs font-bold text-[#5E3A36]">
                COMPROBANTE DE VENTA
              </span>
              <span className="block text-xs text-[#C89B54] font-semibold">
                {factura.numeroOrden}
              </span>
              <span className="block text-[11px] text-[#9E7B74]">{factura.fecha}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-[#FDF8F6] p-3.5 rounded-2xl gold-ring-border text-xs mb-4">
            <div>
              <span className="text-[#9E7B74] block text-[10px] uppercase">Clienta</span>
              <span className="font-semibold text-[#5E3A36]">{factura.cliente}</span>
            </div>
            <div>
              <span className="text-[#9E7B74] block text-[10px] uppercase">Método de Pago</span>
              <span className="font-semibold text-[#5E3A36]">{factura.metodoPago}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-[#F7E6E1]">
              <span className="text-[#9E7B74] block text-[10px] uppercase">Dirección de Entrega</span>
              <span className="font-medium text-[#5E3A36]">
                {factura.direccion} · {factura.ciudad}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-[#9E7B74] pb-2 border-b border-[#F7E6E1]">
              <span>Descripción</span>
              <span>Subtotal</span>
            </div>
            <div className="divide-y divide-[#FDF8F6]">
              {factura.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-[#5E3A36]">
                      {item.cantidad}x {item.nombre}
                    </span>
                    <span className="block text-[11px] text-[#9E7B74]">
                      Detalle: {item.opcionSeleccionada} · Unitario: ${item.precio.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <span className="font-semibold text-[#5E3A36]">
                    ${(item.precio * item.cantidad).toLocaleString("es-CO")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FDF8F6] p-4 rounded-2xl gold-ring-border mb-5">
            <div className="flex justify-between text-xs text-[#9E7B74] mb-1">
              <span>Impuestos (IVA)</span>
              <span>No aplica ($0)</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#C6736A] pt-2 border-t border-[#F7E6E1]">
              <span>TOTAL NETO A PAGAR</span>
              <span>${factura.total.toLocaleString("es-CO")} COP</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="py-3 px-4 rounded-full bg-white gold-ring-border text-[#5E3A36] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#FDF8F6] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#C89B54]" />
              <span>Guardar Factura PDF</span>
            </button>

            <button
              type="button"
              onClick={() => abrirWhatsAppInteligente(factura.mensajeCodificado)}
              className="py-3 px-4 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Confirmar en WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/25 backdrop-blur-xs">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-md w-full p-6 md:p-7 gold-ring-border shadow-xl relative">
        <button
          onClick={cerrarTodo}
          className="absolute top-5 right-5 p-2 rounded-full bg-white gold-ring-border text-[#9E7B74] hover:text-[#C6736A] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-[#C89B54] mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Compra Protegida Jadara</span>
        </div>
        <h3 className="text-2xl font-serif text-[#5E3A36] mb-4">
          Datos para tu envío
        </h3>

        <form onSubmit={confirmarYGenerarFactura} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#5E3A36] mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Laura Martínez"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm text-[#5E3A36] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5E3A36] mb-1">
                Ciudad
              </label>
              <input
                type="text"
                required
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm text-[#5E3A36] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5E3A36] mb-1">
                Método de pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-xs text-[#5E3A36] focus:outline-none"
              >
                <option>Nequi / Bancolombia</option>
                <option>Contra entrega</option>
                <option>Tarjeta / PSE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E3A36] mb-1">
              Dirección exacta y barrio
            </label>
            <input
              type="text"
              required
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Calle 45 # 27-10, Cabecera"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white gold-ring-border text-sm text-[#5E3A36] focus:outline-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-white gold-ring-border flex items-center justify-between">
            <span className="text-xs text-[#9E7B74]">Total Neto (Sin IVA):</span>
            <span className="text-base font-semibold text-[#C6736A]">
              ${total.toLocaleString("es-CO")}
            </span>
          </div>

          <button
            type="submit"
            disabled={procesando}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {procesando ? "Generando Factura..." : "Generar Factura y Continuar"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
