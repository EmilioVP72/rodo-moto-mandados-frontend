/**
 * Generador y descargador autónomo del archivo HTML de Presentación para Inversionistas
 * RODO Moto Mandados San Miguel de Allende.
 * Permite descargar un archivo .html 100% autocontenido y funcional sin depender de servidores.
 */

export const generateStandaloneHtml = (): string => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RODO Moto Mandados — Dossier Ejecutivo de Inversión 2026</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f1722;
      color: #e2e8f0;
      line-height: 1.5;
      padding-bottom: 60px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #162232;
      border-bottom: 1px solid #334155;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #10b981;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-red { background: #ed0718; color: #fff; }
    .btn-green { background: #25D366; color: #fff; }
    .btn-gray { background: #1e293b; color: #cbd5e1; border: 1px solid #475569; }

    .hero-card {
      background: linear-gradient(135deg, #1c2c40 0%, #152333 50%, #0e1620 100%);
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 30px;
      margin-top: 20px;
      position: relative;
    }
    .tag {
      display: inline-block;
      background: rgba(237, 7, 24, 0.2);
      border: 1px solid rgba(237, 7, 24, 0.5);
      color: #ff4d5a;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      color: #fff;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    h1 span { color: #ed0718; }
    .subtitle {
      font-size: 15px;
      color: #94a3b8;
      max-width: 600px;
      margin-bottom: 16px;
    }
    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meta-pill {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      color: #cbd5e1;
    }

    .section-title {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      margin: 35px 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-bar {
      width: 4px;
      height: 22px;
      background: #ed0718;
      border-radius: 2px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .card {
      background: #162232;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 18px;
    }
    .card h3 {
      font-size: 15px;
      color: #fff;
      margin-bottom: 6px;
      font-weight: 800;
    }
    .card p {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }

    /* Locales */
    .local-card {
      background: #162232;
      border: 1px solid #28374d;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .local-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .local-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .badge-restaurant {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .badge-moto {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .local-price {
      font-size: 12px;
      font-weight: 900;
      color: #ed0718;
      font-family: monospace;
    }
    .local-name {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 4px;
    }
    .local-desc {
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .local-pill {
      background: #0f1722;
      border: 1px solid #1e293b;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 11px;
      color: #cbd5e1;
      font-family: monospace;
    }

    /* Métricas */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-box {
      background: #0f1722;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .metric-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 900;
      font-family: monospace;
      color: #fff;
      margin-top: 4px;
    }
    .text-green { color: #10b981; }
    .text-red { color: #ed0718; }

    /* Calculadora */
    .calc-box {
      background: #162232;
      border: 1px solid #28374d;
      border-radius: 18px;
      padding: 22px;
      margin-top: 15px;
    }
    .slider-group {
      margin-bottom: 14px;
    }
    .slider-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    input[type=range] {
      width: 100%;
      accent-color: #ed0718;
      cursor: pointer;
    }

    .footer {
      margin-top: 40px;
      background: linear-gradient(90deg, #162232 0%, #0e1620 100%);
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 26px;
      text-align: center;
    }

    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; color: #000 !important; }
      .card, .local-card, .hero-card { border-color: #ccc !important; background: #fff !important; color: #000 !important; }
      h1, h2, h3, .local-name { color: #000 !important; }
    }
  </style>
</head>
<body>

  <!-- BARRA SUPERIOR -->
  <div class="top-bar no-print">
    <div class="badge-live">
      <span class="dot"></span>
      <span>Dossier de Inversión 2026 · Archivo Oficial</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" class="btn btn-gray">🖨️ Imprimir / Guardar PDF</button>
      <button onclick="compartirWhatsApp()" class="btn btn-green">📲 Compartir por WhatsApp</button>
    </div>
  </div>

  <div class="container">

    <!-- HERO -->
    <div class="hero-card">
      <div class="tag">⚡ Oportunidad de Inversión 2026</div>
      <h1>RODO <span>Moto Mandados</span></h1>
      <p class="subtitle">
        Plataforma hiperlocal de logística y reparto en motocicleta diseñada a la medida de San Miguel de Allende, Guanajuato.
      </p>
      <div class="meta-pills">
        <span class="meta-pill">📍 San Miguel de Allende, Gto.</span>
        <span class="meta-pill">🚀 Modelo Dual (15% Restaurante / 20% Sobreprecio Mandados)</span>
        <span class="meta-pill">📦 Entregas &lt; 35 min</span>
        <span class="meta-pill">🔑 Acceso PIN 3 Dígitos para Negocios</span>
      </div>
    </div>

    <!-- 1. TESIS -->
    <div class="section-title">
      <div class="section-bar"></div>
      <h2>1. Tesis de Inversión & Ventaja Competitiva</h2>
    </div>

    <div class="grid-3">
      <div class="card">
        <div style="font-size: 26px; margin-bottom: 8px;">🛑</div>
        <h3>El Problema de las Apps Globales</h3>
        <p>
          UberEats y Rappi cobran 30% a 35% de comisión, marginan a las taquerías y fondas tradicionales, no tienen soporte en San Miguel de Allende y colapsan durante desfiles o fiestas patrias.
        </p>
      </div>

      <div class="card">
        <div style="font-size: 26px; margin-bottom: 8px;">⚡</div>
        <h3>La Solución Adaptativa RODO</h3>
        <p>
          Tarifas de envío fijas ($35 – $40 MXN) y modelo dual: 15% para restaurantes formales con facturación y SPEI, y 20% de sobreprecio directo en efectivo para taquerías nocturnas.
        </p>
      </div>

      <div class="card">
        <div style="font-size: 26px; margin-bottom: 8px;">🏍️</div>
        <h3>Agilidad Geográfica en SMA</h3>
        <p>
          Calles empedradas, callejones peatonales y tráfico turístico hacen de la motocicleta el único medio viable para entregas en menos de 35 minutos.
        </p>
      </div>
    </div>

    <!-- 2. LOCALES -->
    <div class="section-title">
      <div class="section-bar"></div>
      <h2>2. Portafolio de Comercios Afiliados Activos</h2>
    </div>

    <div class="grid-2">
      <!-- 1 -->
      <div class="local-card">
        <div>
          <div class="local-header">
            <span class="local-badge badge-restaurant">PIN #102 · Restaurante</span>
            <span class="local-price">$40 Envío</span>
          </div>
          <div class="local-name">Little Caesars Pizza</div>
          <div class="local-desc">Calzada de la Aurora #12. Franquicia masiva de alta demanda y rotación rápida.</div>
        </div>
        <div class="local-pill">Comisión RODO: 15% · Facturación & SPEI</div>
      </div>

      <!-- 2 -->
      <div class="local-card">
        <div>
          <div class="local-header">
            <span class="local-badge badge-moto">PIN #105 · Motomandado</span>
            <span class="local-price">$40 Envío</span>
          </div>
          <div class="local-name">Ferechiken Las Alamedas</div>
          <div class="local-desc">Av. Central #96, Santa Cruz de La Paz. Especialistas en pollos rostizados y empanizados.</div>
        </div>
        <div class="local-pill">Sobreprecio RODO: 20% · Solo Efectivo</div>
      </div>

      <!-- 3 -->
      <div class="local-card">
        <div>
          <div class="local-header">
            <span class="local-badge badge-moto">PIN #103 · Motomandado</span>
            <span class="local-price">$40 Envío</span>
          </div>
          <div class="local-name">Tacos Don Santos</div>
          <div class="local-desc">Calzada de la Estación #28. Tacos nocturnos tradicionales de bistec, tripa dorada y longaniza.</div>
        </div>
        <div class="local-pill">Tacos a $30 c/u (+$5 sobreprecio RODO)</div>
      </div>

      <!-- 4 -->
      <div class="local-card">
        <div>
          <div class="local-header">
            <span class="local-badge badge-moto">PIN #104 · Motomandado</span>
            <span class="local-price">$40 Envío</span>
          </div>
          <div class="local-name">Comida China Mesones</div>
          <div class="local-desc">Calle Mesones #38, Centro. Combos de comida cantonesa con entrega veloz.</div>
        </div>
        <div class="local-pill">Sobreprecio RODO: 20% · Solo Efectivo</div>
      </div>

      <!-- 5 -->
      <div class="local-card">
        <div>
          <div class="local-header">
            <span class="local-badge badge-restaurant">PIN #101 · Restaurante</span>
            <span class="local-price">$35 Envío</span>
          </div>
          <div class="local-name">Tacos Sebastián</div>
          <div class="local-desc">Calle Hidalgo #45-B, Centro. Cortes y especialidades al carbón reconocidos en SMA.</div>
        </div>
        <div class="local-pill">Comisión RODO: 15% · Facturación & SPEI</div>
      </div>

      <!-- 6 -->
      <div class="local-card" style="border-color: #ed0718; background: rgba(237, 7, 24, 0.05);">
        <div>
          <div class="local-header">
            <span class="local-badge" style="background: #ed0718; color: #fff;">INNOVACIÓN PROPIA</span>
            <span class="local-price">API PIN 3 Dígitos</span>
          </div>
          <div class="local-name">Portal de Autoservicio de Locales</div>
          <div class="local-desc">Cualquier local comercial asociado ingresa su PIN (ej: 101-105) y solicita de 1 a 4 repartidores en 5 segundos.</div>
        </div>
        <div class="local-pill">Cero comisiones fijas mensuales</div>
      </div>
    </div>

    <!-- 3. TECNOLOGÍA -->
    <div class="section-title">
      <div class="section-bar"></div>
      <h2>3. Infraestructura Tecnológica Desarrollada</h2>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>📲 Despacho WhatsApp Dual 1-Clic</h3>
        <p>Ruteo automático y coordinado a Repartidor 1 (Principal) y Repartidor 2 (Respaldo) con folios únicos y coordenadas GPS exactas en Google Maps.</p>
      </div>

      <div class="card">
        <h3>🧾 Ticket Térmico con QR y Auditoría</h3>
        <p>Comprobante de compra en línea que previene fraudes, verifica transferencias SPEI y genera folios irrepetibles para clientes y locales.</p>
      </div>

      <div class="card">
        <h3>🚦 Gestor de Cierres Viales</h3>
        <p>Pausa instantánea de entregas por zonas en caso de desfiles o festividades religiosas y patrias en el primer cuadro de la ciudad.</p>
      </div>

      <div class="card">
        <h3>📸 Gestor Administrativo con PIN</h3>
        <p>Panel privado para carga de fotografías de platillos, configuración de sobreprecios, tarifas kilométricas y cortes de caja del día.</p>
      </div>
    </div>

    <!-- 4. CALCULADORA Y FINANZAS -->
    <div class="section-title">
      <div class="section-bar"></div>
      <h2>4. Unit Economics & Calculadora Interactiva</h2>
    </div>

    <div class="calc-box">
      <h3 style="font-size: 16px; color: #fff; margin-bottom: 14px;">🧮 Simulación de Ingresos Mensuales</h3>
      
      <div class="slider-group">
        <div class="slider-label">
          <span>Motocicletas en Flota:</span>
          <b id="val-motos" style="color: #ed0718;">4 Motos</b>
        </div>
        <input type="range" id="slider-motos" min="1" max="25" value="4" oninput="recalcular()">
      </div>

      <div class="slider-group">
        <div class="slider-label">
          <span>Pedidos por Moto al Día:</span>
          <b id="val-pedidos" style="color: #ed0718;">15 Pedidos</b>
        </div>
        <input type="range" id="slider-pedidos" min="5" max="35" value="15" oninput="recalcular()">
      </div>

      <div class="metrics-grid" style="margin-top: 20px;">
        <div class="metric-box">
          <div class="metric-label">Pedidos Diarios</div>
          <div class="metric-value" id="res-pedidos-dia">60</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Pedidos Mensuales</div>
          <div class="metric-value" id="res-pedidos-mes">1,800</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Ventas Brutas (GMV)</div>
          <div class="metric-value text-green" id="res-gmv">$414,000</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Ingreso RODO Mensual</div>
          <div class="metric-value text-red" id="res-ingreso">$135,000</div>
        </div>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center;">
        * Margen promedio proyectado de $75 MXN por pedido (Envío fijo $40 + comisión/sobreprecio promedio de $35).
      </p>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <h3 style="font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 8px;">¿Listo para escalar la red en San Miguel de Allende?</h3>
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto;">
        La plataforma está completamente desarrollada, probada y lista para sumar nuevas unidades de motocicletas.
      </p>
      <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
        <button onclick="compartirWhatsApp()" class="btn btn-green" style="padding: 12px 24px; font-size: 14px;">
          📲 Enviar Propuesta a un Inversionista
        </button>
      </div>
      <div style="margin-top: 24px; font-size: 11px; color: #475569;">
        © 2026 RODO Moto Mandados SMA · Todos los derechos reservados · Documento Ejecutivo
      </div>
    </div>

  </div>

  <script>
    function recalcular() {
      const motos = parseInt(document.getElementById('slider-motos').value);
      const pedidos = parseInt(document.getElementById('slider-pedidos').value);
      
      document.getElementById('val-motos').innerText = motos + (motos === 1 ? ' Moto' : ' Motos');
      document.getElementById('val-pedidos').innerText = pedidos + ' Pedidos';

      const pedidosDia = motos * pedidos;
      const pedidosMes = pedidosDia * 30;
      const gmv = pedidosMes * 230; // ticket promedio $230
      const ingreso = pedidosMes * 75; // promedio $75 por pedido

      document.getElementById('res-pedidos-dia').innerText = pedidosDia.toLocaleString();
      document.getElementById('res-pedidos-mes').innerText = pedidosMes.toLocaleString();
      document.getElementById('res-gmv').innerText = '$' + gmv.toLocaleString() + ' MXN';
      document.getElementById('res-ingreso').innerText = '$' + ingreso.toLocaleString() + ' MXN';
    }

    function compartirWhatsApp() {
      const text = encodeURIComponent(
        "Hola, te comparto la propuesta ejecutiva de inversión de *RODO Moto Mandados San Miguel de Allende*:\\n\\n" +
        "🏍️ *Plataforma de Logística y Reparto Hiperlocal 2026*\\n" +
        "• Modelo Dual (15% Restaurantes con SPEI / 20% Sobreprecio Mandados en Efectivo)\\n" +
        "• Locales activos: Little Caesars, Ferechiken, Tacos Don Santos, Comida China, Tacos Sebastián\\n" +
        "• Portal de Autoservicio por PIN de 3 dígitos con despacho por WhatsApp\\n" +
        "• Ticket térmico digital con QR y auditoría bancaria anti-fraude\\n\\n" +
        "Te comparto el archivo adjunto para que puedas revisar el plan completo y las proyecciones financieras."
      );
      window.open('https://wa.me/?text=' + text, '_blank');
    }
  </script>
</body>
</html>`;
};

/**
 * Descarga directamente el archivo HTML al almacenamiento del dispositivo
 */
export function downloadInvestorDossierFile(): boolean {
  try {
    const htmlContent = generateStandaloneHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RODO_Presentacion_Inversionista_2026.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Error al descargar archivo:', err);
    return false;
  }
}
