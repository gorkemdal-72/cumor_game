// Profil gizlilik kuralı ve id doğrulamasının kendi kendine testi. Çalıştır: npx tsx packages/server/src/auth/SocialManager.selfcheck.ts
import assert from 'node:assert/strict';
import { canViewProfile, assertUuid } from './SocialManager.js';

// Kendi profilini her zaman görürsün
assert.equal(canViewProfile('self', 'private'), true);
// Herkese açık profil: herkes
assert.equal(canViewProfile('none', 'public'), true);
// Sadece arkadaşlar: kabul edilmiş arkadaş görür, istek bekleyen görmez
assert.equal(canViewProfile('friends', 'friends'), true);
assert.equal(canViewProfile('pending_out', 'friends'), false);
assert.equal(canViewProfile('pending_in', 'friends'), false);
assert.equal(canViewProfile('none', 'friends'), false);
// Gizli: arkadaş bile görmez
assert.equal(canViewProfile('friends', 'private'), false);

// .or() filtresine giren id'ler: UUID dışı reddedilir (filtre enjeksiyonu engeli)
assertUuid('3f2b8c1e-9d4a-4e6b-8f1a-2c3d4e5f6a7b');
assert.throws(() => assertUuid('x,requester_id.neq.0'), /Geçersiz kullanıcı/);
assert.throws(() => assertUuid(undefined), /Geçersiz kullanıcı/);

console.log('✅ SocialManager selfcheck: tüm kontroller geçti');
