import { supabase } from '../supabase.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface UserProfile {
  id: string;
  username: string;
  isAdmin: boolean;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: number;
}

export class AuthManager {

  // KAYIT: Yeni hesap oluştur
  async register(username: string, password: string, email: string): Promise<{ token: string; userId: string; isAdmin: boolean }> {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) throw new Error('Kullanıcı adı en az 2 karakter olmalı!');
    
    // Şifre gücü kontrolü: En az 8 karakter, harf ve rakam içermeli
    if (!password || password.length < 8) throw new Error('Şifre en az 8 karakter olmalı!');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        throw new Error('Şifre en az bir harf ve bir rakam içermelidir!');
    }
    if (!email || !email.includes('@')) throw new Error('Geçerli bir e-posta adresi girin!');

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

    // Profile ekle
    const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .insert({
            email: email.toLowerCase(),
            username: trimmed.toLowerCase(),
            display_name: trimmed,
            password_hash: passwordHash,
            is_admin: isFirstUser
        })
        .select('id')
        .single();

    if (insertError || !newUser) {
        console.error("Supabase Insert Error:", insertError);
        throw new Error('Kayıt olurken bir hata oluştu.');
    }

    const userId = newUser.id;

    // Oturum oluştur
    const token = uuidv4();
    await supabase.from('sessions').insert({
        token,
        user_id: userId
    });

    console.log(`✅ Kayıt: ${trimmed} (admin: ${isFirstUser})`);
    return { token, userId, isAdmin: isFirstUser };
  }

  // GİRİŞ: Mevcut hesapla oturum aç
  async login(username: string, password: string): Promise<{ token: string; userId: string; isAdmin: boolean }> {
    const trimmed = username.trim().toLowerCase();
    
    const { data: userDoc, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', trimmed)
        .single();

    if (error || !userDoc) throw new Error('Kullanıcı bulunamadı!');

    const isValid = await bcrypt.compare(password, userDoc.password_hash);
    if (!isValid) throw new Error('Yanlış şifre!');

    // Oturum oluştur
    const token = uuidv4();
    await supabase.from('sessions').insert({
        token,
        user_id: userDoc.id
    });

    console.log(`✅ Giriş: ${trimmed}`);
    return { token, userId: userDoc.id, isAdmin: userDoc.is_admin || false };
  }
  
  // ŞİFREMİ UNUTTUM
  async forgotPassword(username: string): Promise<void> {
      const trimmed = username.trim().toLowerCase();
      const { data: userDoc } = await supabase.from('profiles').select('email').eq('username', trimmed).single();
      
      if (!userDoc) {
          throw new Error('Kullanıcı bulunamadı!');
      }
      
      // Gerçek bir e-posta gönderme servisi eklenebilir. 
      // Şimdilik sadece konsola logluyoruz.
      console.log(`📧 SIFIRLAMA MAILI GÖNDERILECEK: ${userDoc.email}`);
  }

  // TOKEN DOĞRULAMA: Token geçerli mi kontrol et
  async verifyToken(token: string): Promise<{ userId: string; isAdmin: boolean } | null> {
    if (!token) return null;
    
    const { data: sessionDoc } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('token', token)
        .single();
        
    if (!sessionDoc) return null;

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
      createdAt: new Date(d.created_at).getTime()
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
        createdAt: new Date(d.created_at).getTime()
    }));
  }

  // İSTATİSTİK GÜNCELLE (Supabase rpc veya iki sorgu)
  async updateStats(userId: string, won: boolean): Promise<void> {
    const { data: d } = await supabase.from('profiles').select('games_played, games_won').eq('id', userId).single();
    if (!d) return;
    
    await supabase.from('profiles').update({
        games_played: (d.games_played || 0) + 1,
        games_won: (d.games_won || 0) + (won ? 1 : 0)
    }).eq('id', userId);
  }

  // ÇIKIŞ
  async logout(token: string): Promise<void> {
    await supabase.from('sessions').delete().eq('token', token);
  }
}
