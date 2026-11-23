import React, { useState } from 'react';
import { Restaurant, DispatchSettings } from '../types';
import {
  Globe2,
  Code2,
  Copy,
  Check,
  Send,
  Download,
  Terminal,
  Layers,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface AdminExternalIntegrationViewProps {
  restaurants: Restaurant[];
  settings: DispatchSettings;
}

export const AdminExternalIntegrationView: React.FC<AdminExternalIntegrationViewProps> = ({
  restaurants,
  settings,
}) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [testPayloadResult, setTestPayloadResult] = useState<string | null>(null);

  const publicOrigin = window.location.origin;
  const apiEndpointUrl = `${publicOrigin}/api/dispatch-order`;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2500);
  };

  const handleDownloadCatalogJson = () => {
    const catalog = {
      platform: 'RODO Moto Mandados',
      version: '2026.2',
      updatedAt: new Date().toISOString(),
      adminContact: 'edsoncruz14999@gmail.com',
      tariffs: {
        baseTariff: settings.baseDeliveryTariff || 35,
        tariffPerKm: settings.tariffPerKm || 7,
        expressSurcharge: settings.expressDeliverySurcharge || 25,
      },
      restaurants: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        deliveryFee: r.deliveryFee,
        markupPercent: r.markupPercent || 0,
        markupFixed: r.markupFixed || 0,
        menuItemsCount: r.menu.length,
        menu: r.menu.map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          description: m.description,
          image: m.image,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rodo_catalogo_para_otros_sitios_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const embedScriptSnippet = `// Ejecuta en el servidor del comercio con la sesión del cliente.
async function despachar(tokenDelCliente, pedido) {
  const response = await fetch(${JSON.stringify(apiEndpointUrl)}, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tokenDelCliente, 'Content-Type': 'application/json' },
    body: JSON.stringify(pedido)
  });
  const orden = await response.json();
  if (!response.ok) throw new Error(orden.error || 'Pedido rechazado');
  return orden.folio;
}

const folio = await despachar(tokenDelCliente, {
  orderType: 'comida',
  restaurantId: ${JSON.stringify(restaurants[0]?.id || 'ID_DEL_RESTAURANTE')},
  restaurantName: ${JSON.stringify(restaurants[0]?.name || 'Nombre del restaurante')},
  items: [{ id: ${JSON.stringify(restaurants[0]?.menu?.[0]?.id || 'ID_DEL_PRODUCTO')}, quantity: 1 }],
  paymentMethod: 'efectivo',
  deliveryAddress: 'Calle y número, colonia'
});`;

  return (
    <div className="space-y-4 text-xs">
      {/* Cabecera */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm sm:text-base">
              Enlace Central con tus Otros Sitios Web (API & Webhooks)
            </h3>
            <p className="text-gray-500 text-[11px]">
              Permite que cualquier otra página o tienda tuya despache pedidos a través de RODO con control unificado.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadCatalogJson}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition shadow-xs text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Catálogo JSON</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tarjeta 1: Webhook para recibir pedidos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-indigo-600" />
              1. Endpoint de Despacho para tus otros Sitios
            </strong>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
              POST API
            </span>
          </div>
          <p className="text-gray-600 text-[11px] leading-relaxed">
            Usa el token de sesión del cliente obtenido en POST /api/auth/login. Envía los identificadores del catálogo y una dirección de entrega. La respuesta 201 contiene el folio y el importe calculado por RODO.
          </p>

          <div className="bg-gray-900 text-gray-200 p-3 rounded-xl font-mono text-[11px] flex items-center justify-between">
            <span className="text-indigo-300 truncate">{apiEndpointUrl}</span>
            <button
              type="button"
              onClick={() => copyText(apiEndpointUrl, 'api-url')}
              className="text-gray-400 hover:text-white p-1"
            >
              {copiedItem === 'api-url' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tarjeta 2: Código JavaScript para tus otras páginas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <strong className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-indigo-600" />
              2. Ejemplo para el servidor del comercio
            </strong>
            <button
              type="button"
              onClick={() => copyText(embedScriptSnippet, 'script-code')}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 text-[11px]"
            >
              {copiedItem === 'script-code' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copiar Código</span>
            </button>
          </div>
          <pre className="bg-gray-900 text-emerald-300 p-3 rounded-xl font-mono text-[10px] leading-relaxed overflow-x-auto max-h-36">
            {embedScriptSnippet}
          </pre>
        </div>
      </div>

      {/* Tarjeta 3: Resumen de Control de Edson */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">👑</span>
          <strong className="text-sm font-black">
            Control Absoluto y Centralizado por Edson
          </strong>
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">
          Tus otros sitios web únicamente envían la solicitud de compra; <b>todo el sobreprecio, asignación de motos, verificación bancaria y despacho</b> se realiza desde este Panel de Control de RODO. Ningún restaurante ni tercero puede alterar las tarifas ni intervenir en tus ganancias.
        </p>
      </div>
    </div>
  );
};
