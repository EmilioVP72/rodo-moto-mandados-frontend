import { paymentInstructionForRider } from '../src/services/whatsappDispatch.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RESTAURANTS,
  DEFAULT_PARTNER_LOCALS,
  INITIAL_SETTINGS,
  INITIAL_SPECIALTIES,
} from '../src/data/seeds.ts';
import {
  buildWhatsAppDispatchMessage,
  generateWhatsAppLink,
} from '../src/services/whatsappDispatch.ts';
import {
  SMA_COLONIAS_CATALOG,
  filterSmaColonias,
  isValidSmaColoniaLabel,
} from '../src/data/smaColonias.ts';

describe('Frontend Catalog Seeds & WhatsApp Dispatch Formatter Unit Tests', () => {
  describe('1. Integridad del Catálogo Semilla de San Miguel de Allende (seeds.ts)', () => {
    it('todos los restaurantes tienen ID único, tarifa de envío válida y precios coherentes', () => {
      assert.ok(DEFAULT_RESTAURANTS.length >= 15);
      const ids = new Set<string>();

      for (const rest of DEFAULT_RESTAURANTS) {
        assert.ok(rest.id && !ids.has(rest.id), `ID duplicado o vacío: ${rest.id}`);
        ids.add(rest.id);
        assert.ok(rest.deliveryFee >= 0, `deliveryFee inválido en ${rest.name}`);

        for (const item of rest.menu) {
          assert.ok(item.price > 0, `Precio inválido en platillo ${item.name}`);
          if (item.originalPrice !== undefined && item.surcharge !== undefined) {
            assert.equal(
              item.price,
              item.originalPrice + item.surcharge,
              `Inconsistencia de sobreprecio en ${item.name} (${rest.name})`
            );
          }
        }
      }
    });

    it('los locales asociados (PartnerLocals) tienen códigos PIN únicos de 3 dígitos', () => {
      assert.ok(DEFAULT_PARTNER_LOCALS.length >= 5);
      const codes = new Set<string>();
      for (const loc of DEFAULT_PARTNER_LOCALS) {
        assert.match(loc.code, /^\d{3}$/);
        assert.ok(!codes.has(loc.code), `Código PIN duplicado: ${loc.code}`);
        codes.add(loc.code);
      }
    });

    it('la configuración inicial incluye zonas de cobertura y deja la flotilla en el directorio', () => {
      assert.equal('ridersList' in INITIAL_SETTINGS, false);
      assert.equal(INITIAL_SETTINGS.adminPasscode, '');
      assert.ok(INITIAL_SETTINGS.coverageZones.length >= 10);
      assert.ok(INITIAL_SPECIALTIES.length >= 10);
    });
  });

  describe('2. buildWhatsAppDispatchMessage & generateWhatsAppLink (Despacho Operativo)', () => {
    it('formatea orden de comida en efectivo indicando el monto exacto a cobrar al cliente', () => {
      const msg = buildWhatsAppDispatchMessage(
        {
          id: 'ord-1',
          folio: 'RD-261118-ABCDE',
          orderType: 'comida',
          customerId: 'cust-1',
          customerName: 'María López',
          customerPhone: '4151234567',
          restaurantId: 'tacos-sebas',
          restaurantName: 'Tacos Sebastián',
          restaurantDeliveryFee: 35,
          restaurantCommissionRate: 15,
          items: [{ id: 'ts-1', name: 'Orden de 4 Tacos de Bistec', price: 100, quantity: 2 }],
          subtotal: 200,
          deliveryFee: 35,
          commissionAmount: 30,
          tipAmount: 20,
          tipPercentage: 10,
          total: 255,
          paymentMethod: 'efectivo',
          paymentStatus: 'en_efectivo',
          deliveryAddress: 'Calle Correo #14, Col. Centro',
          status: 'asignado',
          createdAt: '2026-11-18T12:00:00Z',
          updatedAt: '2026-11-18T12:00:00Z',
        },
        'Moto 1 - Juan Principal',
        'https://rodomotomandados.com'
      );

      assert.ok(msg.includes('RD-261118-ABCDE'));
      assert.ok(msg.includes('Tacos Sebastián'));
      assert.ok(msg.includes('2x Orden de 4 Tacos de Bistec'));
      assert.ok(msg.includes('COBRAR EN EFECTIVO AL ENTREGAR'));
      assert.ok(msg.includes('$255.00 MXN'));
      assert.ok(!msg.includes('Propina Repartidor'));
      assert.ok(msg.includes('https://rodomotomandados.com?ticket=RD-261118-ABCDE'));
    });

    it('formatea orden por transferencia verificada advirtiendo NO COBRAR AL CLIENTE', () => {
      const msg = buildWhatsAppDispatchMessage(
        {
          id: 'ord-2',
          folio: 'RD-261118-SPEI1',
          orderType: 'comida',
          customerId: 'cust-2',
          customerName: 'Pedro Ramírez',
          customerPhone: '4159876543',
          restaurantId: 'little-caesars',
          restaurantName: 'Little Caesars Pizza',
          restaurantDeliveryFee: 40,
          restaurantCommissionRate: 15,
          items: [{ id: 'lc-1', name: 'Pizza Pepperoni', price: 139, quantity: 1 }],
          subtotal: 139,
          deliveryFee: 40,
          commissionAmount: 20,
          total: 179,
          paymentMethod: 'transferencia',
          paymentStatus: 'verificado',
          deliveryAddress: 'Calzada de la Aurora #12',
          status: 'asignado',
          createdAt: '2026-11-18T12:00:00Z',
          updatedAt: '2026-11-18T12:00:00Z',
        },
        'Moto 2 - Carlos',
        'https://rodomotomandados.com'
      );

      assert.ok(msg.includes('TRANSFERENCIA VERIFICADA'));
      assert.ok(msg.includes('NO COBRAR AL CLIENTE'));
    });

    it('formatea solicitud de local asociado (solicitud_local) y auxilio de gasolina (auxilio_gasolina)', () => {
      const localMsg = buildWhatsAppDispatchMessage(
        {
          id: 'ord-3',
          folio: 'RD-261118-LOC1',
          orderType: 'solicitud_local',
          localCode: '101',
          ridersRequestedCount: 2,
          urgencyTiming: 'En 15 minutos',
          customerId: 'loc-101',
          customerName: 'Cliente Local',
          customerPhone: '4151112233',
          restaurantId: 'loc-101',
          restaurantName: 'Tacos Sebastián',
          restaurantDeliveryFee: 35,
          restaurantCommissionRate: 0,
          items: [],
          subtotal: 0,
          deliveryFee: 35,
          commissionAmount: 0,
          total: 70,
          paymentMethod: 'efectivo',
          paymentStatus: 'en_efectivo',
          deliveryAddress: 'Calle Hidalgo #45, Centro',
          status: 'nuevo',
          createdAt: '2026-11-18T12:00:00Z',
          updatedAt: '2026-11-18T12:00:00Z',
        },
        'Moto 3',
        'https://rodomotomandados.com'
      );

      assert.ok(localMsg.includes('SOLICITUD DE LOCAL'));
      assert.ok(localMsg.includes('Código: 101'));
      assert.ok(localMsg.includes('2 Repartidores'));

      const waUrl = generateWhatsAppLink('+52 (415) 101-9920', 'Hola RODO 🏍️');
      assert.equal(
        waUrl,
        'https://api.whatsapp.com/send/?phone=524151019920&text=Hola%20RODO%20%F0%9F%8F%8D%EF%B8%8F'
      );
    });
  });

  describe('3. Catálogo Oficial de Colonias y Asentamientos de SMA (smaColonias.ts)', () => {
    it('contiene más de 380 asentamientos únicos con formato exacto "Nombre - Tipo"', () => {
      assert.ok(SMA_COLONIAS_CATALOG.length > 380);
      const uniqueLabels = new Set(SMA_COLONIAS_CATALOG.map((c) => c.label));
      assert.equal(uniqueLabels.size, SMA_COLONIAS_CATALOG.length);
      assert.ok(isValidSmaColoniaLabel('Los Martínez - Ranchería'));
      assert.ok(isValidSmaColoniaLabel('Centro - Colonia'));
      assert.ok(isValidSmaColoniaLabel('Zirándaro - Fraccionamiento'));
      assert.equal(isValidSmaColoniaLabel('Colonia Inventada con Faltas'), false);
    });

    it('filtra en tiempo real ignorando acentos y mayúsculas', () => {
      const martinez = filterSmaColonias('martinez');
      assert.ok(martinez.some((c) => c.label === 'Los Martínez - Ranchería'));

      const luciernaga = filterSmaColonias('luciernaga');
      assert.ok(luciernaga.some((c) => c.label === 'La Luciérnaga - Fraccionamiento'));

      const ojoDeAgua = filterSmaColonias('Ojo de Agua');
      assert.ok(ojoDeAgua.some((c) => c.label === 'Ojo de Agua - Colonia'));
      assert.ok(ojoDeAgua.some((c) => c.label === 'Ojo de Agua - Ranchería'));
      assert.ok(ojoDeAgua.some((c) => c.label === 'Ojo de Agua - Rancho'));
    });
  });
});

it('una transferencia pendiente exige confirmación del despacho', () => {
  assert.match(paymentInstructionForRider({ paymentMethod: 'transferencia', paymentStatus: 'pendiente', total: 20 }), /PENDIENTE/);
});
