import { supabase } from '../supabase.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomInt, timingSafeEqual } from 'crypto';

const RESET_CODE_TTL_MS = 15 * 60 * 1000;   // Sıfırlama kodu 15 dk geçerli
const RESET_RESEND_COOLDOWN_MS = 60 * 1000; // Aynı hesaba en fazla dakikada bir kod
const RESET_MAX_ATTEMPTS = 5;               // 5 yanlış denemede kod geçersiz olur

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Şifre kuralı: kayıt ve şifre sıfırlama aynı kuralı kullanır
function assertStrongPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Şifre en az 8 karakter olmalı!');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new Error('Şifre en az bir harf ve bir rakam içermelidir!');
}

// Brevo ile e-posta gönder; gönderilemezse hata fırlatır (sessizce "gönderildi" demesin)
async function sendEmail(to: string, name: string, subject: string, htmlContent: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('E-posta servisi yapılandırılmamış (BREVO_API_KEY yok).');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ sender: { name: 'CUMOR', email: 'gorkemdal.72@gmail.com' }, to: [{ email: to, name }], subject, htmlContent }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

// 6 haneli kodu öne çıkaran ortak e-posta şablonu
const codeEmail = (title: string, intro: string, code: string, footer: string) => `
  <div style="font-family: sans-serif; text-align: center; padding: 20px;">
    <h2>${title}</h2>
    <p>${intro}</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #b45309; padding: 20px; background: #fffbeb; display: inline-block; border-radius: 8px; margin: 15px 0;">${code}</div>
    <p style="margin-top: 20px; font-size: 12px; color: #666;">${footer}</p>
  </div>`;

export interface UserProfile {
  id: string;
  username: string;
  isAdmin: boolean;
  gamesPlayed: number;
  gamesWon: number;
  totalVP: number;
  totalPlaytimeMinutes: number;
  createdAt: number;
  sikke: number;
  equippedBuilding: string;
  awardGaddar?: number;
  awardSanssiz?: number;
  awardBorsa?: number;
}

export class AuthManager {

  // KAYIT: Yeni hesap oluştur
  async register(username: string, password: string, email: string): Promise<{ success: boolean; message: string; userId?: string }> {
    const trimmed = typeof username === 'string' ? username.trim() : '';
    // Sadece harf/rakam/_ : e-postadaki HTML enjeksiyonunu ve Supabase .or() filtre enjeksiyonunu kapatır
    if (!/^[\p{L}\p{N}_]{2,20}$/u.test(trimmed)) throw new Error('Kullanıcı adı 2-20 karakter olmalı ve sadece harf, rakam veya _ içermeli!');
    
    // Şifre gücü kontrolü: En az 8 karakter, harf ve rakam içermeli
    assertStrongPassword(password);
    // E-posta format kontrolü (düzgün regex ile)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email.trim())) {
        throw new Error('Geçerli bir e-posta adresi girin! (örn: kullanici@mail.com)');
    }

    // Kullanıcı adı veya email kontrolü
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .or(`username.eq.${trimmed.toLowerCase()},email.eq.${email.toLowerCase()}`)
        .limit(1);
        
    if (existingUser && existingUser.length > 0) {
        throw new Error('Bu kullanıcı adı veya e-posta zaten alınmış!');
    }

    // İlk kullanıcı mı? Super Admin olur
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const isFirstUser = count === 0;

    const passwordHash = await bcrypt.hash(password, 10);
    
    // 6 HANELİ DOĞRULAMA KODU OLUŞTUR (kriptografik rastgele)
    const verificationCode = randomInt(100000, 1000000).toString();

    // Profile ekle (is_verified: false ve verification_token ile)
    const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .insert({
            email: email.toLowerCase(),
            username: trimmed.toLowerCase(),
            display_name: trimmed,
            password_hash: passwordHash,
            is_admin: isFirstUser,
            // E-posta doğrulamasını iptal ettik, ileride açmak için alttaki satırları açıp üsttekileri silin:
            // is_verified: false,
            // verification_token: verificationCode
            is_verified: true,
            verification_token: null
        })
        .select('id')
        .single();

    if (insertError || !newUser) {
        console.error("Supabase Insert Error:", insertError);
        throw new Error('Kayıt olurken bir hata oluştu.');
    }

    const userId = newUser.id;

    // Brevo ile E-posta Gönderme (6 Haneli Kod)
    // Doğrulama kapalıyken mail atma: işe yaramıyor ve herkes başka birinin adresine bizim adımıza mail attırabiliyordu
    const EMAIL_VERIFICATION_ENABLED = false; // Doğrulamayı açınca true yap (yukarıdaki is_verified satırlarıyla birlikte)
    if (EMAIL_VERIFICATION_ENABLED) {
        try {
            await sendEmail(email.toLowerCase(), trimmed, 'CUMOR - E-Posta Doğrulama Kodunuz', codeEmail(
                `CUMOR'a Hoş Geldin, ${escapeHtml(trimmed)}!`,
                'Kayıt işlemini tamamlamak için aşağıdaki 6 haneli doğrulama kodunu kullanabilirsin:',
                verificationCode,
                'Eğer bu kaydı sen yapmadıysan bu e-postayı dikkate alma.'));
            console.log(`📧 Doğrulama kodu maili gönderildi: ${email}`);
        } catch (err) {
            console.error("Brevo Mail Gönderme Hatası:", err);
        }
    }

    console.log(`✅ Kayıt: ${trimmed} (admin: ${isFirstUser})`);
    // E-posta doğrulamasını iptal ettik, ileride açmak için alttaki satırı açıp üsttekini silin:
    // return { success: true, message: "Kayıt başarılı! Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin.", userId };
    return { success: true, message: "Kayıt başarılı! Şimdi giriş yapabilirsiniz.", userId };
  }

  // GİRİŞ: Kullanıcı adı VEYA e-posta ile oturum aç
  async login(username: string, password: string): Promise<{ token: string; userId: string; isAdmin: boolean; username: string }> {
    if (typeof username !== 'string' || typeof password !== 'string') throw new Error('Kullanıcı adı veya şifre hatalı!');
    const trimmed = username.trim().toLowerCase();

    // '@' içeriyorsa e-posta ile, içermiyorsa kullanıcı adı ile ara
    const isEmail = trimmed.includes('@');
    const { data: userDoc, error } = await supabase
        .from('profiles')
        .select('*')
        .eq(isEmail ? 'email' : 'username', trimmed)
        .single();

    // Tek tip hata: "kullanıcı yok" ile "şifre yanlış" ayrımı kayıtlı kullanıcıları ele veriyordu
    if (error || !userDoc) throw new Error('Kullanıcı adı veya şifre hatalı!');

    // E-posta doğrulama kontrolü iptal edildi
    // if (userDoc.is_verified === false) {
    //     throw new Error('E-posta adresiniz henüz doğrulanmamış. Lütfen kayıt olurken gönderilen doğrulama kodunu girin.');
    // }

    const isValid = await bcrypt.compare(password, userDoc.password_hash);
    if (!isValid) throw new Error('Kullanıcı adı veya şifre hatalı!');

    // Oturum oluştur
    const token = uuidv4();
    await supabase.from('sessions').insert({
        token,
        user_id: userDoc.id
    });

    console.log(`✅ Giriş: ${trimmed}`);
    return { token, userId: userDoc.id, isAdmin: userDoc.is_admin || false, username: userDoc.display_name || userDoc.username };
  }

  // E-POSTA DOĞRULAMA (6 HANELİ KOD)
  async verifyEmail(email: string, code: string): Promise<boolean> {
      if (!email || !code) throw new Error("E-posta ve doğrulama kodu gereklidir.");

      const trimmedEmail = email.trim().toLowerCase();

      const { data: user, error } = await supabase
          .from('profiles')
          .select('id, verification_token')
          .eq('email', trimmedEmail)
          .single();

      if (error || !user) {
          throw new Error("Kullanıcı bulunamadı.");
      }

      if (user.verification_token !== code.trim()) {
          throw new Error("Hatalı doğrulama kodu!");
      }

      // Kullanıcıyı doğrulanmış olarak işaretle ve token'ı temizle
      const { error: updateError } = await supabase
          .from('profiles')
          .update({
              is_verified: true,
              verification_token: null
          })
          .eq('id', user.id);

      if (updateError) throw new Error("Doğrulama işlemi başarısız oldu.");

      console.log(`✅ E-posta doğrulandı: ${user.id}`);
      return true;
  }
  
  private async findByIdentifier(identifier: unknown) {
    if (typeof identifier !== 'string' || !identifier.trim()) throw new Error('E-posta veya kullanıcı adı gerekli.');
    const key = identifier.trim().toLowerCase();
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, display_name, reset_code_hash, reset_expires_at, reset_attempts')
        .eq(key.includes('@') ? 'email' : 'username', key)
        .maybeSingle();
    if (error) throw new Error('Sıfırlama şu an yapılamıyor.');
    return data;
  }

  // ŞİFREMİ UNUTTUM 1/2: hesabın e-postasına 6 haneli kod gönder.
  // Hesap yoksa da aynı cevap döner (kayıtlı e-postalar öğrenilemesin); çağıran yer her durumda aynı mesajı gösterir.
  async requestPasswordReset(identifier: unknown): Promise<void> {
    const user = await this.findByIdentifier(identifier);
    if (!user) return;

    // Yeni kod çok sık istenmesin (mail kutusunu doldurma / Brevo kotası)
    const sentAt = user.reset_expires_at ? new Date(user.reset_expires_at).getTime() - RESET_CODE_TTL_MS : 0;
    if (Date.now() - sentAt < RESET_RESEND_COOLDOWN_MS) return;

    const code = randomInt(100000, 1000000).toString();
    const { error } = await supabase.from('profiles').update({
        reset_code_hash: sha256(code),
        reset_expires_at: new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(),
        reset_attempts: 0,
    }).eq('id', user.id);
    if (error) throw new Error('Sıfırlama şu an yapılamıyor.');

    const name = user.display_name || user.username;
    await sendEmail(user.email, name, 'CUMOR - Şifre Sıfırlama Kodun', codeEmail(
        `Merhaba ${escapeHtml(name)},`,
        'Şifreni sıfırlamak için aşağıdaki 6 haneli kodu kullan. Kod 15 dakika geçerli.',
        code,
        'Bu isteği sen yapmadıysan bu e-postayı dikkate alma; şifren değişmez.'));
    console.log(`📧 Şifre sıfırlama kodu gönderildi: ${user.id}`);
  }

  // ŞİFREMİ UNUTTUM 2/2: kod doğruysa yeni şifreyi kaydet ve tüm oturumları kapat
  async resetPassword(identifier: unknown, code: unknown, newPassword: unknown): Promise<void> {
    const invalid = 'Kod hatalı veya süresi dolmuş. Yeni kod isteyebilirsin.';
    assertStrongPassword(newPassword);
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) throw new Error(invalid);

    const user = await this.findByIdentifier(identifier);
    if (!user || !user.reset_code_hash || !user.reset_expires_at) throw new Error(invalid);
    if (new Date(user.reset_expires_at).getTime() < Date.now() || (user.reset_attempts || 0) >= RESET_MAX_ATTEMPTS) throw new Error(invalid);

    const ok = timingSafeEqual(Buffer.from(sha256(code.trim())), Buffer.from(user.reset_code_hash));
    if (!ok) {
        const attempts = (user.reset_attempts || 0) + 1;
        await supabase.from('profiles').update({ reset_attempts: attempts }).eq('id', user.id);
        const left = RESET_MAX_ATTEMPTS - attempts;
        throw new Error(left > 0 ? `Kod hatalı. ${left} deneme hakkın kaldı.` : invalid);
    }

    const { error } = await supabase.from('profiles').update({
        password_hash: await bcrypt.hash(newPassword, 10),
        reset_code_hash: null,
        reset_expires_at: null,
        reset_attempts: 0,
    }).eq('id', user.id);
    if (error) throw new Error('Şifre güncellenemedi.');

    // Şifre değişti: çalınmış olabilecek eski oturumlar dahil hepsini kapat
    await supabase.from('sessions').delete().eq('user_id', user.id);
    console.log(`🔑 Şifre sıfırlandı: ${user.id}`);
  }

  // TOKEN DOĞRULAMA: Token geçerli mi kontrol et (30 günden eski oturumlar geçersiz)
  async verifyToken(token: string): Promise<{ userId: string; isAdmin: boolean } | null> {
    // sessions.token UUID kolonu: UUID olmayan değer Postgres hatası verir, baştan ele
    if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) return null;

    const { data: sessionDoc } = await supabase
        .from('sessions')
        .select('user_id, created_at')
        .eq('token', token)
        .single();

    if (!sessionDoc) return null;
    if (Date.now() - new Date(sessionDoc.created_at).getTime() > 30 * 24 * 60 * 60 * 1000) {
        await supabase.from('sessions').delete().eq('token', token);
        return null;
    }

    const { data: userDoc } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', sessionDoc.user_id)
        .single();
        
    if (!userDoc) return null;

    return { userId: sessionDoc.user_id, isAdmin: userDoc.is_admin || false };
  }

  // PROFİL: Kullanıcı bilgilerini getir
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data: d, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
    if (error || !d) return null;

    return {
      id: d.id,
      username: d.display_name || d.username,
      isAdmin: d.is_admin || false,
      gamesPlayed: d.games_played || 0,
      gamesWon: d.games_won || 0,
      totalVP: d.total_vp || 0,
      totalPlaytimeMinutes: d.total_playtime_minutes || 0,
      createdAt: new Date(d.created_at).getTime(),
      sikke: d.sikke || 0,
      equippedBuilding: d.equipped_building || 'default',
      awardGaddar: d.award_gaddar || 0,
      awardSanssiz: d.award_sanssiz || 0,
      awardBorsa: d.award_borsa || 0
    };
  }

  // ADMİN YAPMA/KALDIRMA: Sadece adminler çağırabilir
  async setAdmin(requesterId: string, targetUserId: string, makeAdmin: boolean): Promise<string> {
    const { data: requester } = await supabase.from('profiles').select('is_admin').eq('id', requesterId).single();
    
    if (!requester || !requester.is_admin) {
      throw new Error('Bu işlem için admin yetkisi gerekli!');
    }

    const { data: target, error } = await supabase.from('profiles').select('display_name, username').eq('id', targetUserId).single();
    if (error || !target) throw new Error('Hedef kullanıcı bulunamadı!');

    await supabase.from('profiles').update({ is_admin: makeAdmin }).eq('id', targetUserId);
    
    const targetName = target.display_name || target.username;
    return makeAdmin
      ? `${targetName} artık Admin! ⭐`
      : `${targetName} admin olmaktan çıkarıldı.`;
  }

  // KULLANICI ARA: İsme göre arama (admin paneli için)
  async searchUsers(query: string): Promise<UserProfile[]> {
    const { data: docs } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${query.toLowerCase()}%`)
        .limit(10);
        
    if (!docs) return [];

    return docs.map((d: any) => ({
        id: d.id,
        username: d.display_name || d.username,
        isAdmin: d.is_admin || false,
        gamesPlayed: d.games_played || 0,
        gamesWon: d.games_won || 0,
        totalVP: d.total_vp || 0,
        totalPlaytimeMinutes: d.total_playtime_minutes || 0,
        createdAt: new Date(d.created_at).getTime(),
        sikke: d.sikke || 0,
        equippedBuilding: d.equipped_building || 'default'
    }));
  }

  // İSTATİSTİK GÜNCELLE (Supabase rpc veya iki sorgu)
  async updateStats(userId: string, won: boolean, vp: number, playtimeMinutes: number, awards?: {gaddar: boolean, sanssiz: boolean, borsa: boolean}): Promise<void> {
    if (!userId || userId.trim() === '') {
      console.warn("⚠️ updateStats: userId boş, güncelleme yapılmadı.");
      return;
    }

    const { data: d, error: selectError } = await supabase.from('profiles').select('games_played, games_won, total_vp, total_playtime_minutes, sikke, award_gaddar, award_sanssiz, award_borsa').eq('id', userId).single();
    if (selectError) {
      console.error(`❌ updateStats SELECT hatası (${userId}):`, selectError.message);
      return;
    }
    if (!d) return;
    
    const sikkeEarned = won ? 10 : 2;

    const { error: updateError } = await supabase.from('profiles').update({
        games_played: (d.games_played || 0) + 1,
        games_won: (d.games_won || 0) + (won ? 1 : 0),
        total_vp: (d.total_vp || 0) + vp,
        total_playtime_minutes: (d.total_playtime_minutes || 0) + playtimeMinutes,
        sikke: (d.sikke || 0) + sikkeEarned,
        award_gaddar: (d.award_gaddar || 0) + (awards?.gaddar ? 1 : 0),
        award_sanssiz: (d.award_sanssiz || 0) + (awards?.sanssiz ? 1 : 0),
        award_borsa: (d.award_borsa || 0) + (awards?.borsa ? 1 : 0)
    }).eq('id', userId);

    if (updateError) {
      console.error(`❌ updateStats UPDATE hatası (${userId}):`, updateError.message);
    }
  }

  // ÇIKIŞ
  async logout(token: string): Promise<void> {
    await supabase.from('sessions').delete().eq('token', token);
  }
}
