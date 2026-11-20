import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanStreetNumber,
  formatSavedAddressLine,
  formatSavedAddressHeaderLabel,
  pickActiveCustomerAddress,
  getSelectedAddressStorageKey,
} from '../src/utils/customerAddresses.ts';
import type { CustomerSavedAddress } from '../src/utils/customerAddresses.ts';

const SAMPLE_ADDRESSES: CustomerSavedAddress[] = [
  {
    id: 'addr-casa',
    label: 'Casa',
    calle: 'Calle Hidalgo',
    numero: '#42',
    numeroInterior: null,
    colonia: 'Centro - Colonia',
    referencias: 'Puerta de madera azul',
    lat: 20.9144,
    lng: -100.7437,
    isDefault: true,
  },
  {
    id: 'addr-depto',
    label: 'Departamento',
    calle: 'Ancha de San Antonio',
    numero: '18',
    numeroInterior: '4B',
    colonia: 'San Antonio - Colonia',
    referencias: 'Tocar timbre 4B',
    lat: 20.9085,
    lng: -100.749,
    isDefault: false,
  },
  {
    id: 'addr-rancho',
    label: 'Otro',
    calle: 'Camino Real',
    numero: null,
    numeroInterior: null,
    colonia: 'Los Martínez',
    referencias: null,
    lat: null,
    lng: null,
    isDefault: false,
  },
];

test('cleanStreetNumber elimina signos # duplicados y espacios', () => {
  assert.equal(cleanStreetNumber('#14'), '14');
  assert.equal(cleanStreetNumber('## 22A '), '22A');
  assert.equal(cleanStreetNumber(null), '');
  assert.equal(cleanStreetNumber('   '), '');
});

test('formatSavedAddressLine evita ## duplicado, soporta S/N y numeroInterior', () => {
  assert.equal(
    formatSavedAddressLine(SAMPLE_ADDRESSES[0]),
    'Calle Hidalgo #42, Centro - Colonia'
  );
  assert.equal(
    formatSavedAddressLine(SAMPLE_ADDRESSES[1]),
    'Calle Ancha de San Antonio #18, Int. 4B, San Antonio - Colonia'
  );
  assert.equal(
    formatSavedAddressLine(SAMPLE_ADDRESSES[2]),
    'Calle Camino Real S/N, Col. Los Martínez'
  );
});

test('formatSavedAddressHeaderLabel incluye etiqueta del perfil y direccion formateada', () => {
  assert.equal(
    formatSavedAddressHeaderLabel(SAMPLE_ADDRESSES[1]),
    'Departamento · Calle Ancha de San Antonio #18, Int. 4B, San Antonio - Colonia'
  );
});

test('pickActiveCustomerAddress respeta direccion preferida, luego isDefault, luego primera y null si vacio', () => {
  assert.equal(pickActiveCustomerAddress([], 'addr-casa'), null);
  assert.equal(pickActiveCustomerAddress(SAMPLE_ADDRESSES, 'addr-depto')?.id, 'addr-depto');
  assert.equal(pickActiveCustomerAddress(SAMPLE_ADDRESSES, 'addr-inexistente')?.id, 'addr-casa');
  assert.equal(pickActiveCustomerAddress(SAMPLE_ADDRESSES, null)?.id, 'addr-casa');

  const noDefaults = SAMPLE_ADDRESSES.map((a) => ({ ...a, isDefault: false }));
  assert.equal(pickActiveCustomerAddress(noDefaults, null)?.id, 'addr-casa');
});

test('getSelectedAddressStorageKey aisla la preferencia por usuario y omite invitados', () => {
  assert.equal(getSelectedAddressStorageKey(null), null);
  assert.equal(getSelectedAddressStorageKey('guest-123'), null);
  assert.equal(getSelectedAddressStorageKey('user-a'), 'rodo_selected_address_id_user-a');
  assert.notEqual(
    getSelectedAddressStorageKey('user-a'),
    getSelectedAddressStorageKey('user-b')
  );
});
