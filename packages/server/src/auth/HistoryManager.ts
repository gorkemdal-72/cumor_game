import { supabase } from '../supabase.js';

export interface GameHistoryPlayer {
    userId: string;
    username: string;
    color: string;
    vp: number;
    isWinner: boolean;
}

export interface GameHistoryEntry {
    id: string;
    roomName: string;
    date: number;
    durationMinutes: number;
    players: GameHistoryPlayer[];
    winnerId: string;
    winnerName: string;
}

export class HistoryManager {

    // OYUN SONUCU KAYDET
    async saveGameResult(
        roomName: string,
        players: GameHistoryPlayer[],
        winnerId: string,
        winnerName: string,
        durationMinutes: number
    ): Promise<void> {
        
        // Önce game_history tablosuna oyunu ekle
        const { data: game, error } = await supabase.from('game_history').insert({
            room_name: roomName,
            winner_id: winnerId,
            winner_name: winnerName,
            duration_minutes: durationMinutes
        }).select('id').single();

        if (error || !game) {
            console.error("Supabase Game History Save Error:", error);
            return;
        }

        // Sonra game_history_players tablosuna oyuncuları ekle
        const playersData = players.map(p => ({
            game_id: game.id,
            user_id: p.userId,
            username: p.username,
            color: p.color,
            vp: p.vp,
            is_winner: p.isWinner
        }));

        await supabase.from('game_history_players').insert(playersData);

        console.log(`📜 Oyun geçmişi kaydedildi: ${winnerName} kazandı! (${durationMinutes} dk)`);
    }

    // KULLANICININ OYUN GEÇMİŞİ (son 20)
    async getUserHistory(userId: string): Promise<GameHistoryEntry[]> {
        // Hangi oyunlarda oynadığını bul
        const { data: userGames } = await supabase
            .from('game_history_players')
            .select('game_id')
            .eq('user_id', userId)
            .order('id', { ascending: false })
            .limit(20);

        if (!userGames || userGames.length === 0) return [];

        const gameIds = userGames.map(ug => ug.game_id);

        // Bu oyunların detaylarını ve tüm oyuncularını çek
        const { data: gamesData } = await supabase
            .from('game_history')
            .select(`
                id,
                room_name,
                winner_id,
                winner_name,
                duration_minutes,
                date,
                game_history_players (
                    user_id,
                    username,
                    color,
                    vp,
                    is_winner
                )
            `)
            .in('id', gameIds)
            .order('date', { ascending: false });

        if (!gamesData) return [];

        return gamesData.map((g: any) => ({
            id: g.id,
            roomName: g.room_name,
            winnerId: g.winner_id,
            winnerName: g.winner_name,
            durationMinutes: g.duration_minutes || 0,
            date: new Date(g.date).getTime(),
            players: g.game_history_players.map((p: any) => ({
                userId: p.user_id,
                username: p.username,
                color: p.color,
                vp: p.vp,
                isWinner: p.is_winner
            }))
        }));
    }
}
