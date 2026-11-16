export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  badge: string;
  tonoFondo: string;
}

export const CATEGORIAS = ["Todo", "Belleza", "Carteras", "Tenis", "Ropa Dama"];

export const CATALOGO: Producto[] = [
  {
    id: 1,
    nombre: "Sérum Pétalo Luminoso Vitamina C",
    categoria: "Belleza",
    precio: 125000,
    badge: "Probador Facial AR",
    tonoFondo: "bg-[#F9EAE6]",
  },
  {
    id: 2,
    nombre: "Cartera Estructurada Aura Rose",
    categoria: "Carteras",
    precio: 280000,
    badge: "Vista 3D 360°",
    tonoFondo: "bg-[#F6EDE7]",
  },
  {
    id: 3,
    nombre: "Tenis CloudWalk Champagne & Cream",
    categoria: "Tenis",
    precio: 340000,
    badge: "Escáner Talla IA",
    tonoFondo: "bg-[#FAF2EE]",
  },
  {
    id: 4,
    nombre: "Vestido Seda Fluida Terracota Suave",
    categoria: "Ropa Dama",
    precio: 215000,
    badge: "Estilista Virtual",
    tonoFondo: "bg-[#F5E6E3]",
  },
];
