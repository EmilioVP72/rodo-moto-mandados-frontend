import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectUsedLocalCodes,
  generateUniqueRandomLocalCode,
  isUniqueValidLocalCode,
} from '../src/utils/localCodeGenerator.ts';

test('generateUniqueRandomLocalCode genera códigos aleatorios de 3 dígitos (100-999) sin colisiones', () => {
  const generated = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const code = generateUniqueRandomLocalCode(generated);
    assert.match(code, /^[1-9]\d{2}$/);
    assert.equal(generated.has(code), false, `Código duplicado detectado: ${code}`);
    generated.add(code);
  }
  assert.equal(generated.size, 300);
});

test('generateUniqueRandomLocalCode evita códigos ya ocupados incluso con 899 ocupados', () => {
  const almostFull = new Set<string>();
  for (let n = 100; n <= 999; n++) {
    if (n !== 742) almostFull.add(String(n));
  }
  const onlyRemaining = generateUniqueRandomLocalCode(almostFull);
  assert.equal(onlyRemaining, '742');
});

test('collectUsedLocalCodes excluye el restaurante en edición para permitir conservar su propio PIN', () => {
  const restaurants = [
    { id: 'rest-1', localCode: '234' },
    { id: 'rest-2', localCode: '567' },
  ];
  const partnerLocals = [
    { id: 'loc-rest-1', code: '234' },
    { id: 'loc-extra', code: '890' },
  ];

  const usedForRest1 = collectUsedLocalCodes(restaurants, partnerLocals, 'rest-1');
  assert.equal(usedForRest1.has('234'), false);
  assert.equal(usedForRest1.has('567'), true);
  assert.equal(usedForRest1.has('890'), true);
  assert.equal(isUniqueValidLocalCode('234', usedForRest1), true);
  assert.equal(isUniqueValidLocalCode('567', usedForRest1), false);
});
