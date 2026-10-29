import { supabase } from '../supabase.js';

export type Visibility = 'public' | 'friends' | 'private';
// Bakan kişinin (viewer) hedef profile göre durumu
export type Relation = 'self' | 'friends' | 'pending_out' | 'pending_in' | 'none';

const VISIBILITIES: Visibility[] = ['public', 'friends', 'private'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// İstemciden gelen id'ler .or() filtresine giriyor: UUID değilse reddet (filtre enjeksiyonu engeli)
export function assertUuid(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !UUID_RE.test(id)) throw new Error('Geçersiz kullanıcı.');
}

// Gizlilik kuralı: kendi profilin her zaman; "public" herkese; "friends" sadece kabul edilmiş arkadaşa; "private" kimseye
export function canViewProfile(relation: Relation, visibility: Visibility): boolean {
  return relation === 'self' || visibility === 'public' || (visibility === 'friends' && relation === 'friends');
}

export class SocialManager {

  // OYUNCU ARAMA (herkes için): sadece ad ve id döner
  async searchUsers(query: string): Promise<{ id: string; username: string }[]> {
    const q = query.trim().toLowerCase().replace(/[%_,()]/g, '');
    if (!q) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .ilike('username', `${q}%`)
      .order('username')
      .limit(8);
    if (error) throw new Error(error.message);
    return (data || []).map(d => ({ id: d.id, username: d.display_name || d.username }));
  }

  private async findRow(a: string, b: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async relation(viewerId: string, targetId: string): Promise<Relation> {
    if (viewerId === targetId) return 'self';
    const row = await this.findRow(viewerId, targetId);
    if (!row) return 'none';
    if (row.status === 'accepted') return 'friends';
    return row.requester_id === viewerId ? 'pending_out' : 'pending_in';
  }

  // Profil görülebilir mi? (kendi profilin her zaman; arkadaşlara "friends"; herkese "public")
  async access(viewerId: string, targetId: string) {
    assertUuid(targetId);
    const { data: target, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, profile_visibility')
      .eq('id', targetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!target) return null;

    const visibility = (target.profile_visibility || 'public') as Visibility;
    const relation = await this.relation(viewerId, targetId);
    return { username: target.display_name || target.username, visibility, relation, canView: canViewProfile(relation, visibility) };
  }

  async sendRequest(fromId: string, toId: string): Promise<string> {
    assertUuid(toId);
    if (fromId === toId) throw new Error('Kendine arkadaşlık isteği gönderemezsin.');
    const { data: target } = await supabase.from('profiles').select('id').eq('id', toId).maybeSingle();
    if (!target) throw new Error('Kullanıcı bulunamadı.');

    const row = await this.findRow(fromId, toId);
    if (row?.status === 'accepted') throw new Error('Zaten arkadaşsınız.');
    if (row && row.requester_id === fromId) throw new Error('İstek zaten gönderildi, cevap bekleniyor.');
    if (row) {
      // Karşı taraf zaten istek göndermiş: göndermek yerine kabul et
      const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', row.id);
      if (error) throw new Error(error.message);
      return 'Artık arkadaşsınız! 🤝';
    }
    const { error } = await supabase.from('friendships').insert({ requester_id: fromId, addressee_id: toId });
    if (error) throw new Error(error.message);
    return 'Arkadaşlık isteği gönderildi.';
  }

  // Gelen isteği kabul et / reddet
  async respond(meId: string, fromId: string, accept: boolean): Promise<string> {
    assertUuid(fromId);
    const table = supabase.from('friendships');
    const { data, error } = await (accept ? table.update({ status: 'accepted' }) : table.delete())
      .eq('requester_id', fromId).eq('addressee_id', meId).eq('status', 'pending')
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Bekleyen istek bulunamadı.');
    return accept ? 'Arkadaşlık isteği kabul edildi! 🤝' : 'İstek reddedildi.';
  }

  // Arkadaşlıktan çıkar veya gönderdiğin isteği geri çek
  async remove(meId: string, otherId: string): Promise<string> {
    assertUuid(otherId);
    const row = await this.findRow(meId, otherId);
    if (!row) throw new Error('Aranızda arkadaşlık veya istek yok.');
    const { error } = await supabase.from('friendships').delete().eq('id', row.id);
    if (error) throw new Error(error.message);
    return row.status === 'accepted' ? 'Arkadaşlıktan çıkarıldı.' : 'İstek geri çekildi.';
  }

  async list(meId: string) {
    const { data: rows, error } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);
    if (error) throw new Error(error.message);

    const otherIds = (rows || []).map(r => (r.requester_id === meId ? r.addressee_id : r.requester_id));
    const names = new Map<string, string>();
    if (otherIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', otherIds);
      for (const p of profs || []) names.set(p.id, p.display_name || p.username);
    }
    const toUser = (id: string) => ({ id, username: names.get(id) || '?' });

    return {
      friends: (rows || []).filter(r => r.status === 'accepted').map(r => toUser(r.requester_id === meId ? r.addressee_id : r.requester_id)),
      incoming: (rows || []).filter(r => r.status === 'pending' && r.addressee_id === meId).map(r => toUser(r.requester_id)),
      outgoing: (rows || []).filter(r => r.status === 'pending' && r.requester_id === meId).map(r => toUser(r.addressee_id)),
    };
  }

  async setVisibility(meId: string, visibility: unknown) {
    if (!VISIBILITIES.includes(visibility as Visibility)) throw new Error('Geçersiz görünürlük.');
    const { error } = await supabase.from('profiles').update({ profile_visibility: visibility }).eq('id', meId);
    if (error) throw new Error(error.message);
  }
}
