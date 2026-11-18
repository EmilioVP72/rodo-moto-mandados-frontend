# RODO Moto Mandados · Frontend Web PWA

Aplicación Web Progresiva (PWA) para clientes, locales asociados, repartidores y central de despacho en **San Miguel de Allende, Guanajuato**.

## Stack Tecnológico
* **UI:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Framer Motion + Recharts
* **Mapas 100% Gratuitos:** Leaflet + OpenStreetMap + OSRM (vía proxy con caché Redis en Backend)
* **Comunicación:** Cliente HTTP tipado con JWT (`src/api/httpClient.ts`) + WebSockets en tiempo real (`src/api/socketClient.ts`)
* **Resiliencia Offline & PWA:** Service Worker (`public/sw.js`), Manifiesto PWA (`public/manifest.json`) e IndexedDB
* **Servidor Producción:** Nginx 1.27 Alpine (`Dockerfile` + `nginx/default.conf`)

## Arquitectura Destacada (`src/`)
* `api/`: Transporte HTTP JWT, subida de imágenes y bus de eventos Socket.IO.
* `data/seeds.ts`: Catálogo semilla y zonas de cobertura de San Miguel de Allende.
* `hooks/`: Hooks de dominio (`useCart.ts`, `useRealtimeSync.ts`).
* `services/`: Capa de datos (`db.ts`), ruteo Haversine/OSRM (`routing.ts`), colonias SMA (`sanMiguelLocations.ts`), despacho por WhatsApp (`whatsappDispatch.ts`) y verificación SPEI (`bankVerification.ts`).
* `components/`: Vistas de cliente, Checkout inteligente, Rastreo GPS en vivo (`LiveTrackingModal.tsx`), Ticket Digital con transmisión GPS del repartidor (`TicketModal.tsx`) y Panel Administrativo (`AdminPanel.tsx`).

## Desarrollo Local y Pruebas
```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Ejecutar pruebas unitarias (20 pruebas)
npm test

# Servidor de desarrollo (puerto 3000 con proxy a Backend en 4000)
npm run dev

# Compilar bundle optimizado para producción
npm run build
```
