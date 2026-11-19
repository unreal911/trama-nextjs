const base = { id: 'polo-esencial', name: 'Polo Algodón Licra 30/1', image: '/images/trama/polo-basico.jpg', unit_price: 15 };
export const demoOrder = {
  id: '00000000-0000-4000-8000-000000000042', order_number: 42,
  customer_name: 'Cliente de prueba', customer_whatsapp: '51999999999', notes: '',
  status: 'confirmed', quantity: 22, total: 330,
  created_at: '2026-11-19T15:00:00.000Z', updated_at: '2026-11-19T17:00:00.000Z', availability_reviewed_at: '2026-11-19T17:00:00.000Z',
  items: [
    { ...base, color: 'Azul marino', color_hex: '#223c6b', size: 'L', qty: 2 },
    { ...base, color: 'Azul marino', color_hex: '#223c6b', size: 'M', qty: 10 },
    { ...base, color: 'Marron camel', color_hex: '#b48b5f', size: 'M', qty: 3 },
    { ...base, color: 'Blanco', color_hex: '#ffffff', size: 'M', qty: 4 },
    { ...base, color: 'Beige arena', color_hex: '#d9c8ac', size: 'M', qty: 3 },
  ],
  availability: [
    { id: base.id, color: 'Azul marino', size: 'L', qty: 2 },
    { id: base.id, color: 'Azul marino', size: 'M', qty: 8 },
    { id: base.id, color: 'Marron camel', size: 'M', qty: 0 },
    { id: base.id, color: 'Blanco', size: 'M', qty: 4 },
    { id: base.id, color: 'Beige arena', size: 'M', qty: 2 },
  ],
};
