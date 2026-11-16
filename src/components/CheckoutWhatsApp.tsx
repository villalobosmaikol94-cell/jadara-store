"use client";

import React, { useState } from "react";
import { X, Send, ShieldCheck } from "lucide-react";
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

  if (!abierto) return null;

  const enviarPedidoWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !direccion.trim()) return;
    setProcesando(true);

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

    await supabase.from("ventas").insert([
      {
        cliente: nombre,
        ciudad,
        detalle: items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", "),
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

    setProcesando(false);
    alCompletarVenta();

    const mensaje = `Hola *JADARA* ✨, quiero confirmar mi pedido:\n\n*Clienta:* ${nombre}\n*Ciudad:* ${ciudad}\n*Dirección:* ${direccion}\n*Método de pago:* ${metodoPago}\n\n*Productos seleccionados:*\n${detalleProductos}\n\n*Total a pagar:* $${total.toLocaleString("es-CO")}`;

    const url = `https://wa.me{encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5E3A36]/25 backdrop-blur-xs">
      <div className="bg-[#FDF8F6] rounded-3xl max-w-md w-full p-6 md:p-7 gold-ring-border shadow-xl relative">
        <button
          onClick={alCerrar}
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

        <form onSubmit={enviarPedidoWhatsApp} className="space-y-3.5">
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
            <span className="text-xs text-[#9E7B74]">Total a confirmar:</span>
            <span className="text-base font-semibold text-[#C6736A]">
              ${total.toLocaleString("es-CO")}
            </span>
          </div>

          <button
            type="submit"
            disabled={procesando}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#C6736A] to-[#C89B54] text-white text-sm font-medium shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {procesando ? "Registrando pedido..." : "Confirmar y Enviar por WhatsApp"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
