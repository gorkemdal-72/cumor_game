// Hile/açık düzeltmelerinin kendi kendine testi. Çalıştır: npx tsx packages/server/src/game/RoomManager.selfcheck.ts
import assert from 'node:assert/strict';
import { GameStatus, PlayerColor, ResourceType } from '@cumor/shared';
import { RoomManager } from './RoomManager.js';

function setup() {
  const room = new RoomManager('r1', 'Test');
  room.addPlayer('a', 'Ali', PlayerColor.RED, 'user-a');
  room.addPlayer('b', 'Banu', PlayerColor.BLUE, 'user-b');
  room.addPlayer('c', 'Cem', PlayerColor.ORANGE);
  const state = (room as any).room;
  state.status = GameStatus.PLAYING;
  state.activePlayerId = 'a';
  (room as any).hasRolled = true;
  const player = (id: string) => state.players.find((p: any) => p.id === id);
  return { room, state, player };
}

// 1. Bilinmeyen kaynak satarak bedava altın alınamaz
{
  const { room, player } = setup();
  assert.throws(() => room.tradeWithBank('a', 'x' as any), /Geçersiz kaynak/);
  assert.equal(player('a').resources[ResourceType.GOLD], 0);
}

// 2. Negatif, kesirli ve bilinmeyen takas miktarları reddedilir
{
  const { room } = setup();
  assert.throws(() => room.createP2PTrade('a', { [ResourceType.DIAMOND]: -5 }, {}), /Geçersiz miktar/);
  assert.throws(() => room.createP2PTrade('a', { [ResourceType.DIAMOND]: 1.5 }, {}), /Geçersiz miktar/);
  assert.throws(() => room.createP2PTrade('a', {}, { foo: 1 }), /Geçersiz kaynak/);
}

// 3. Eski hile kodu artık altın vermiyor
{
  const { room, player } = setup();
  room.createP2PTrade('a', {}, { lumber: 7, textile: 7, diamond: 7, concrete: 2, food: 2, gold: 2 });
  assert.equal(player('a').resources[ResourceType.GOLD], 0);
}

// 4. Teklif sonrası kaynağı harcanmışsa takas tamamlanamaz (eksiye düşme yok)
{
  const { room, player } = setup();
  player('a').resources[ResourceType.LUMBER] = 2;
  player('b').resources[ResourceType.FOOD] = 1;
  room.createP2PTrade('a', { [ResourceType.LUMBER]: 2 }, { [ResourceType.FOOD]: 1 });
  room.acceptP2PTrade('b');
  player('a').resources[ResourceType.LUMBER] = 0; // teklif sonrası harcadı
  assert.throws(() => room.finalizeP2PTrade('a', 'b'), /artık sende yok/);
  assert.equal(player('b').resources[ResourceType.FOOD], 1);
}

// 5. Geçerli takas hâlâ çalışıyor
{
  const { room, player } = setup();
  player('a').resources[ResourceType.LUMBER] = 2;
  player('b').resources[ResourceType.FOOD] = 1;
  room.createP2PTrade('a', { [ResourceType.LUMBER]: 2 }, { [ResourceType.FOOD]: 1 });
  room.acceptP2PTrade('b');
  room.finalizeP2PTrade('a', 'b');
  assert.equal(player('a').resources[ResourceType.FOOD], 1);
  assert.equal(player('b').resources[ResourceType.LUMBER], 2);
}

// 6. Admin kaynak verme geçersiz anahtarı reddeder, geçerliyi uygular
{
  const { room, player } = setup();
  assert.throws(() => room.adminGiveResources('b', { hack: 5 }), /Geçersiz kaynak/);
  room.adminGiveResources('b', { [ResourceType.GOLD]: 5 });
  assert.equal(player('b').resources[ResourceType.GOLD], 5);
}

// 7. Ban hesap id'sine de uygulanır (yenileyip geri girilemez)
{
  const { room, state } = setup();
  state.status = GameStatus.LOBBY;
  state.hostId = 'a';
  room.banPlayer('a', 'b');
  assert.ok(room.isBanned('user-b'));
}

// 8. Oyuncu adı/rengi doğrulanır
{
  const room = new RoomManager('r2', 'Test');
  assert.throws(() => room.addPlayer('x', '   ', PlayerColor.RED), /Takma ad/);
  assert.throws(() => room.addPlayer('x', 'Ali', 'mor' as any), /Geçersiz renk/);
}

// 9. Host ayrılınca yeni host atanır
{
  const { room, state } = setup();
  state.status = GameStatus.LOBBY;
  state.hostId = 'a';
  room.removePlayer('a');
  assert.equal(state.hostId, 'b');
}

// 10. Sıradaki oyuncu oyundan çıkarılırsa sıra bir sonrakine geçer (oyun kilitlenmez)
{
  const { room, state } = setup();
  room.removePlayer('a');
  assert.equal(state.activePlayerId, 'b');
}

// 11. Oyuncu düşünce sıra atlanmaz, oylama başlar; çoğunluk "bitir" derse en yüksek puanlı kazanır
{
  const { room, state } = setup();
  room.adminSetVP('c', 6);
  room.disconnectPlayer('b');
  room.endTurn('a');
  assert.equal(state.activePlayerId, 'b'); // sıra düşen oyuncuda bekler
  assert.ok(state.disconnectVote);
  assert.equal(room.endVotesNeeded(), 2); // 2 bağlı oyuncu → ikisi de onaylamalı
  assert.equal(room.castDisconnectVote('a', true), false);
  assert.throws(() => room.castDisconnectVote('b', true), /Oy veremezsin/);
  assert.equal(room.castDisconnectVote('c', true), true);
  assert.equal(state.status, GameStatus.FINISHED);
  assert.equal(state.winnerId, 'c');
  assert.equal(state.endReason, 'vote');
}

// 11b. Düşen oyuncu geri dönerse oylama iptal olur
{
  const { room, state } = setup();
  room.disconnectPlayer('b');
  room.castDisconnectVote('a', true);
  room.reconnectPlayer('user-b', 'b2');
  assert.equal(state.disconnectVote, null);
}

// 12. Sadece turunu bitiren kazanır; oyun bitince hamle yapılamaz
{
  const { room, state } = setup();
  room.adminSetVP('b', 12); // b'nin puanı yüksek ama sıra a'da
  room.endTurn('a');
  assert.equal(state.status, GameStatus.PLAYING);
  assert.equal(state.activePlayerId, 'b');
  room.endTurn('b');
  assert.equal(state.status, GameStatus.FINISHED);
  assert.equal(state.winnerId, 'b');
  assert.throws(() => room.rollDice('c'), /Sıra sende değil/);
}

// 13. Admin VP ayarı tur sonu yeniden hesaplamada kaybolmaz
{
  const { room, player } = setup();
  room.adminSetVP('c', 4);
  room.endTurn('a');
  assert.equal(player('c').victoryPoints, 4);
}

console.log('✅ RoomManager selfcheck: tüm kontroller geçti');
