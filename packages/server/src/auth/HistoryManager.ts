import { supabase } from '../supabase.js';

export interface GameHistoryPlayer {
    userId: string;
    username: string;
    color: string;
    vp: number;
    isWinner: boolean;
    gameStats?: {
        sabotagesUsed: number;
        robbedByTaxCollector: number;
        tradesMade: number;
    };
    awards?: {
        gaddar: boolean;
        sanssiz: boolean;
        borsa: boolean;
    };
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
        winnerId: string | null, // null = kazanan misafir
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

        if (error || !game) throw new Error(`game_history kaydedilemedi: ${error?.message}`);

        // Sonra game_history_players tablosuna oyuncuları ekle
        const playersData = players.map(p => ({
            game_id: game.id,
            user_id: p.userId,
            username: p.username,
            color: p.color,
            vp: p.vp,
            is_winner: p.isWinner,
            sabotages_used: p.gameStats?.sabotagesUsed || 0,
            robbed_count: p.gameStats?.robbedByTaxCollector || 0,
            trades_made: p.gameStats?.tradesMade || 0
        }));

        const { error: playersError } = await supabase.from('game_history_players').insert(playersData);
        if (playersError) throw new Error(`game_history_players kaydedilemedi: ${playersError.message}`);

        console.log(`📜 Oyun geçmişi kaydedildi: ${winnerName} kazandı! (${durationMinutes} dk)`);
    }

    // KULLANICININ OYUN GEÇMİŞİ (son 20)
    async getUserHistory(userId: string): Promise<GameHistoryEntry[]> {
        // Hangi oyunlarda oynadığını bul (id UUID olduğu için sıralama/limit tarihe göre 2. sorguda yapılır)
        // shortcut: tüm oyun id'leri URL'e gidiyor, kullanıcı başına yüzlerce oyun olursa tek sorguluk RPC'ye geç
        const { data: userGames, error: userGamesError } = await supabase
            .from('game_history_players')
            .select('game_id')
            .eq('user_id', userId);

        if (userGamesError) throw new Error(userGamesError.message);
        if (!userGames || userGames.length === 0) return [];

        const gameIds = userGames.map(ug => ug.game_id);

        // Bu oyunların detaylarını ve tüm oyuncularını çek (en yeni 20)
        const { data: gamesData, error: gamesError } = await supabase
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
                    is_winner,
                    sabotages_used,
                    robbed_count,
                    trades_made
                )
            `)
            .in('id', gameIds)
            .order('date', { ascending: false })
            .limit(20);

        if (gamesError) throw new Error(gamesError.message);
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
                isWinner: p.is_winner,
                gameStats: {
                    sabotagesUsed: p.sabotages_used || 0,
                    robbedByTaxCollector: p.robbed_count || 0,
                    tradesMade: p.trades_made || 0
                }
            }))
        }));
    }
}
