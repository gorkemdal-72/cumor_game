import { useState, useEffect, useCallback } from 'react';
import { HexBoard } from './components/HexBoard';
import { Lobby } from './components/Lobby';
import { Tile, GameState, PlayerColor, Player, GameStatus, RoomInfo, Building, BuildingType, ResourceType, DevCardType, hexToPixel, getHexCorners } from '@cumor/shared';
import { io, Socket } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import { ResourcePanel, MobileResourcePanel, MobileDevCardPanel } from './components/ResourcePanel';
import { ActionPanel, MobileActionPanel } from './components/ActionPanel';
import { TradePanel, MobileTradePanel } from './components/TradePanel';
import { BuildCostPanel, MobileBuildCostPanel } from './components/BuildCostPanel';
import { ChatPanel } from './components/ChatPanel';
import { AuthScreen } from './components/AuthScreen';
import { ProfilePanel } from './components/ProfilePanel';
import { TutorialModal } from './components/TutorialModal';
import { StorePanel } from './components/StorePanel';
import { HomeHeader, type HomeTab } from './components/HomeHeader';
import { STATUS_LABELS } from './components/Lobby';
import { GameHelpPanel } from './components/GameHelpPanel';
import { DisconnectVotePanel } from './components/DisconnectVotePanel';
import { WaitingRoom } from './components/WaitingRoom';
import { RESOURCE_INFO } from './gameInfo';

// Zar sonrası "ne kazandın/kaybettin" bildirimi için: zar sonucu gelir, ardından gelen durum güncellemesinde farka bakılır
let pendingDice: { die1: number; die2: number; total: number } | null = null;
let lastMyResources: Record<string, number> | null = null;

function describeResourceChange(before: Record<string, number>, after: Record<string, number>) {
  const parts: string[] = [];
  for (const type of Object.values(ResourceType)) {
    const diff = (after[type] || 0) - (before[type] || 0);
    if (diff !== 0) parts.push(`${diff > 0 ? '+' : ''}${diff} ${RESOURCE_INFO[type].icon} ${RESOURCE_INFO[type].name}`);
  }
  return parts.join(', ');
}

let socket: Socket;

// Socket URL
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const socketUrl = isLocal ? 'http://localhost:3001' : 'https://cumor-game.onrender.com';

function App() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isInGame, setIsInGame] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOBBY);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [turnSubPhase, setTurnSubPhase] = useState<'settlement' | 'road' | 'city' | 'waiting'>('waiting');
  const [myId, setMyId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<any>(null);
  const [possibleVictims, setPossibleVictims] = useState<string[]>([]); // Kurban ID listesi

  // CUMOR: Yeni State'ler
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [longestRoadPlayerId, setLongestRoadPlayerId] = useState<string | null>(null);
  const [largestArmyPlayerId, setLargestArmyPlayerId] = useState<string | null>(null);
  const [activeCartelPlayerId, setActiveCartelPlayerId] = useState<string | null>(null);
  const [startRolls, setStartRolls] = useState<{ playerId: string, rolls: number[] }[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false); // CHAT STATE
  const [highlightNumber, setHighlightNumber] = useState<number | null>(null); // ZAR SONUCU (Tile Highlight İçin)

  // YENİ: Mercator kartı kaynak seçim modalı
  const [showMercatorModal, setShowMercatorModal] = useState(false);
  // YENİ: Tüccar kartı kaynak seçim modalı
  const [showTraderModal, setShowTraderModal] = useState(false);
  // Admin panel durumu
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  // Ücretsiz yol ve tüccar kalan hakkı
  const [freeRoadsRemaining, setFreeRoadsRemaining] = useState(0);
  const [traderPicksRemaining, setTraderPicksRemaining] = useState(0);
  // Destede kalan kart sayısı ve admin kaynak verme miktarı
  const [devCardDeckCount, setDevCardDeckCount] = useState(0);
  const [adminResourceAmount, setAdminResourceAmount] = useState(5);

  // HESAP SİSTEMİ STATE'LERİ
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('cumor_token'));
  const [authUserId, setAuthUserId] = useState<string | null>(localStorage.getItem('cumor_userId'));
  const [authUsername, setAuthUsername] = useState<string>(localStorage.getItem('cumor_username') || '');
  const [authIsAdmin, setAuthIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeTab>('play');
  const [showHelp, setShowHelp] = useState(false);
  const [disconnectVote, setDisconnectVote] = useState<GameState['disconnectVote']>(null);
  const [endReason, setEndReason] = useState<GameState['endReason']>(undefined);
  const [myProfileData, setMyProfileData] = useState<any>(null);

  // Profil verisini çekme
  const fetchMyProfile = async () => {
    if (!authUserId) return;
    try {
      const res = await fetch(`${socketUrl}/api/profile/${authUserId}`);
      const data = await res.json();
      if (data.success) {
        setMyProfileData(data.profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (authToken && authUserId) {
      fetchMyProfile();
    }
  }, [authToken, authUserId]);

  // MOBİL RESPONSIVE STATE
  const [activeMobilePanel, setActiveMobilePanel] = useState<'none' | 'trade' | 'actions' | 'costs' | 'cards'>('none');


  // Socket bağlantısını başlat (token ile)
  const connectSocket = useCallback((token: string | null) => {
    if (socket) socket.disconnect();

    console.log('🔗 Bağlanıyor:', socketUrl);
    socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: false,
      auth: { token: token || undefined }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setMyId(socket.id || null);
      // Token varsa reconnect dene
      if (token) {
        socket.emit('reconnect_to_game');
      }
    });
    socket.on('connect_error', (err) => console.error('❌ Connection', err));
    socket.on('disconnect', () => setIsConnected(false));

    // Auth bilgisi sunucudan gelir
    socket.on('auth_info', (info: { userId: string; isAdmin: boolean } | null) => {
      if (info) {
        setAuthIsAdmin(info.isAdmin);
        setAuthChecked(true);
      } else {
        // Token geçersiz: misafir olarak oynayıp istatistik kaybetmesin, tekrar giriş yapsın
        toast.error('Oturumunuz geçersiz, lütfen tekrar giriş yapın.');
        handleLogout();
      }
    });

    // Reconnect sonucu
    socket.on('reconnected', (data: { roomId: string }) => {
      console.log('🔄 Oyuna geri bağlanıldı:', data.roomId);
      toast.success('Oyuna geri bağlandınız! 🔄');
    });
    socket.on('no_active_game', () => {
      console.log('🔍 Aktif oyun bulunamadı');
    });

    socket.on('room_list_update', setRooms);

    socket.on('game_state_update', (gameState: GameState) => {
      setTiles(gameState.tiles);
      setPlayers(gameState.players);
      setGameStatus(gameState.status);
      setActivePlayerId(gameState.activePlayerId);
      setHostId(gameState.hostId);
      setBuildings(gameState.buildings);
      if (gameState.currentTradeOffer !== undefined) setCurrentOffer(gameState.currentTradeOffer);
      if (gameState.turnSubPhase) setTurnSubPhase(gameState.turnSubPhase);

      setWinnerId((gameState as any).winnerId || null);
      setLongestRoadPlayerId((gameState as any).longestRoadPlayerId || null);
      setLargestArmyPlayerId((gameState as any).largestArmyPlayerId || null);
      setActiveCartelPlayerId((gameState as any).activeCartelPlayerId || null);
      setStartRolls((gameState as any).startRolls || []);
      setFreeRoadsRemaining((gameState as any).freeRoadsRemaining || 0);
      setTraderPicksRemaining((gameState as any).traderPicksRemaining || 0);
      setDevCardDeckCount((gameState as any).devCardDeckCount || 0);
      if (gameState.hasRolled !== undefined) setHasRolled(gameState.hasRolled);
      setDisconnectVote(gameState.disconnectVote ?? null);
      setEndReason(gameState.endReason);

      // Zar bildirimi: zarla birlikte bu oyuncunun kazandığı/kaybettiği kaynakları tek mesajda göster
      const me = gameState.players.find(p => p.id === socket.id);
      if (pendingDice && me && lastMyResources) {
        const change = describeResourceChange(lastMyResources, me.resources);
        const head = `🎲 ${pendingDice.total} geldi (${pendingDice.die1}+${pendingDice.die2})`;
        if (pendingDice.total === 7) {
          toast.warning(`${head} — Vergi Memuru uyandı!${change ? ` Kaybın: ${change}` : ' Kaynak kaybın yok.'}`, { autoClose: 6000 });
        } else if (change) {
          toast.success(`${head} — Kazancın: ${change}`, { autoClose: 5000 });
        } else {
          toast.info(`${head} — Bu zardan kaynak almadın.`, { autoClose: 3500 });
        }
      }
      pendingDice = null;
      if (me) lastMyResources = { ...me.resources };
    });
    socket.on('dice_result', (data: { die1: number, die2: number, total: number }) => {
      setHasRolled(true);
      setHighlightNumber(data.total);
      setTimeout(() => setHighlightNumber(null), 3000);
      pendingDice = data; // Bildirim, hemen arkasından gelen durum güncellemesinde (kaynak farkıyla) gösterilir
    });

    socket.on('robber_victims', (data: { victims: string[] }) => {
      if (data.victims.length === 1) {
        socket.emit('rob_player', { victimId: data.victims[0] });
        setTurnSubPhase('waiting');
      } else {
        setPossibleVictims(data.victims);
      }
    });

    socket.on('join_success', () => setIsInGame(true));
    socket.on('error_message', (data: { message: string }) => toast.error(data.message));
    socket.on('system_alert', (data: { message: string }) => toast.info(data.message));
    socket.on('banned_from_room', (data: { message: string }) => {
      toast.error(data.message);
      setIsInGame(false);
      setGameStatus(GameStatus.LOBBY);
    });
    socket.on('room_closed', (data: { message: string }) => {
      toast.info(data.message);
      setIsInGame(false);
      setGameStatus(GameStatus.LOBBY);
      setActivePlayerId(null);
      setTiles([]);
      setBuildings([]);
      setPlayers([]);
    });
  }, []);

  // İlk yüklemede socket bağla
  useEffect(() => {
    if (authToken) {
      connectSocket(authToken);
    }
    return () => { if (socket) socket.disconnect(); };
  }, [authToken, connectSocket]);

  // Auth handler
  const handleAuth = (data: { token: string; userId: string; username: string; isAdmin: boolean }) => {
    setAuthToken(data.token);
    setAuthUserId(data.userId);
    setAuthUsername(data.username);
    setAuthIsAdmin(data.isAdmin);
    setAuthChecked(true);
  };

  // Logout handler
  const handleLogout = () => {
    const token = localStorage.getItem('cumor_token');
    if (token) fetch(`${socketUrl}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem('cumor_token');
    localStorage.removeItem('cumor_userId');
    localStorage.removeItem('cumor_username');
    setAuthToken(null);
    setAuthUserId(null);
    setAuthUsername('');
    setAuthIsAdmin(false);
    setAuthChecked(false);
    setIsInGame(false);
    setHomeTab('play');
    if (socket) socket.disconnect();
  };

  // Ctrl+Alt+G: Admin panelini aç/kapa (admin ise)
  useEffect(() => {
    const handleAdminHotkey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (authIsAdmin) {
          setShowAdminPanel(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleAdminHotkey);
    return () => window.removeEventListener('keydown', handleAdminHotkey);
  }, [authIsAdmin]);


  useEffect(() => { if (activePlayerId === myId) setHasRolled(false); }, [activePlayerId, myId]);

  // Sıra sana geçince haber ver (başka sekmedeysen veya dalgınsan kaçırma)
  useEffect(() => {
    if (!myId || activePlayerId !== myId) return;
    if (gameStatus === GameStatus.PLAYING) toast.info('🎯 Sıra sende! Zar atarak başla.', { toastId: 'my-turn', autoClose: 3000 });
    else if (gameStatus.startsWith('setup')) toast.info('🎯 Sıra sende! Haritaya bir köy ve yanına bir yol yerleştir.', { toastId: 'my-turn', autoClose: 4000 });
  }, [activePlayerId, myId, gameStatus]);

  const handleRollDice = () => socket.emit('roll_dice');
  const handleEndTurn = () => { socket.emit('end_turn'); setHasRolled(false); setTurnSubPhase('waiting'); };
  const startBuildRoad = () => setTurnSubPhase('road');
  const startBuildCity = () => setTurnSubPhase('city');
  const startBuildSettlement = () => setTurnSubPhase('settlement');
  const cancelBuild = () => setTurnSubPhase('waiting');
  const handleCreateRoom = (roomName: string, pass: string, playerName: string, color: PlayerColor) => socket.emit('create_room', { roomName, password: pass, playerName, playerColor: color });
  const handleJoinRoom = (roomId: string, pass: string, playerName: string, color: PlayerColor) => socket.emit('join_room', { roomId, password: pass, playerName, playerColor: color });
  const handleStartGame = () => socket.emit('start_game');
  const handleVertexClick = (q: number, r: number, i: number) => {
    if (activePlayerId === myId) {
      if (turnSubPhase === 'settlement') {
        socket.emit('build_settlement', { q, r, vertexIndex: i });
      } else if (turnSubPhase === 'city') {
        // YENİ: Şehir Kurma İsteği
        socket.emit('upgrade_to_city', { q, r, vertexIndex: i });
      }
    }
  };
  const handleEdgeClick = (q: number, r: number, i: number) => {
    if (activePlayerId === myId) {
      // Enkaz kontrolü - piksel bazlı eşleştirme
      const HEX = 50;
      const { x, y } = hexToPixel(q, r, HEX);
      const corners = getHexCorners(x, y, HEX);
      const c1 = corners[i];
      const c2 = corners[(i + 1) % 6];
      const clickMidX = (c1.x + c2.x) / 2;
      const clickMidY = (c1.y + c2.y) / 2;

      // Enkaz bul (piksel mesafesi ile)
      const debris = buildings.find(b => {
        if (b.type !== 'debris') return false;
        if (b.coord.edgeIndex === undefined || b.coord.edgeIndex < 0) return false;
        const { x: bx, y: by } = hexToPixel(b.coord.q, b.coord.r, HEX);
        const bc = getHexCorners(bx, by, HEX);
        const bc1 = bc[b.coord.edgeIndex];
        const bc2 = bc[(b.coord.edgeIndex + 1) % 6];
        const mx = (bc1.x + bc2.x) / 2;
        const my = (bc1.y + bc2.y) / 2;
        const dx = mx - clickMidX;
        const dy = my - clickMidY;
        return Math.sqrt(dx * dx + dy * dy) < 5;
      });

      if (debris) {
        // Orijinal koordinatları gönder
        socket.emit('repair_debris', { q: debris.coord.q, r: debris.coord.r, edgeIndex: debris.coord.edgeIndex });
        return;
      }

      // İnşaat Modu (veya free_road modu)
      if (turnSubPhase === 'road' || (turnSubPhase as any) === 'free_road') {
        socket.emit('build_road', { q, r, edgeIndex: i });
      }
      // Sabotaj Modu
      else if ((turnSubPhase as any) === 'sabotage') {
        socket.emit('sabotage_road', { q, r, edgeIndex: i });
      }
    }
  };

  const handleTileClick = (q: number, r: number) => {
    if (activePlayerId === myId && (turnSubPhase as any) === 'robber') {
      socket.emit('move_robber', { q, r });
    }
  };

  const handleBuyCard = () => socket.emit('buy_card');

  // KART OYNAMA: Mercator için önce modal aç, diğerleri direkt oyna
  const handlePlayCard = (cardType: any) => {
    if (cardType === DevCardType.MERCATOR || cardType === 'Mercator') {
      setShowMercatorModal(true); // Mercator modali aç (kaynak seçimi için)
      return;
    }
    socket.emit('play_card', { cardType });
  };

  // Kurban Seçildiğinde
  const handleSelectVictim = (victimId: string) => {
    socket.emit('rob_player', { victimId });
    setPossibleVictims([]); // Modalı kapat
    setTurnSubPhase('waiting');
  };

  // TİCARET FONKSİYONLARI (EKLENDİ)
  const handleBankSell = (res: any) => socket.emit('trade_with_bank', { resource: res });
  const handleBankBuy = (res: any) => socket.emit('buy_black_market', { resource: res });

  const handleCreateOffer = (give: any, want: any) => socket.emit('create_p2p_offer', { give, want });
  const handleAcceptOffer = () => socket.emit('accept_p2p_offer');
  const handleFinalizeTrade = (partnerId: string) => socket.emit('finalize_p2p_offer', { partnerId });
  const handleCancelOffer = () => socket.emit('cancel_p2p_offer');

  const activePlayer = players.find(p => p.id === activePlayerId);
  const isMyTurn = activePlayerId === myId;
  // ADMİN KONTROLÜ: Hesap bazlı admin kontrolü
  const myPlayer = players.find(p => p.id === myId);
  const isAdmin = authIsAdmin;

  // "ŞİMDİ NE YAPMALIYIM?" İPUCU: oyunun o anki durumuna göre tek cümlelik yönlendirme
  const phase = turnSubPhase as string;
  const cartelOwner = players.find(p => p.id === activeCartelPlayerId);
  const phaseHint: { text: string; strong?: boolean } | null = (() => {
    if (!isInGame || disconnectVote) return null;
    if (gameStatus.startsWith('setup')) {
      if (!isMyTurn) return { text: `⏳ ${activePlayer?.name ?? 'Rakip'} başlangıç yerleşimini yapıyor…` };
      return phase === 'road'
        ? { text: '🛣️ Kurulum: az önce kurduğun köyün yanındaki bir kenara tıklayıp yol yerleştir (ücretsiz).', strong: true }
        : { text: '🏠 Kurulum: boş bir köşeye tıklayıp ücretsiz köy kur. Komşu köşeler boş olmalı.', strong: true };
    }
    if (gameStatus !== GameStatus.PLAYING) return null;
    if (!isMyTurn) {
      const who = `⏳ ${activePlayer?.name ?? 'Rakip'} oynuyor…`;
      return { text: cartelOwner ? `${who} 🏢 Kartel aktif: ${cartelOwner.name} dışında kimse üretim yapamıyor.` : who };
    }
    if (!hasRolled) return { text: '🎲 Sıra sende! Turuna başlamak için zar at. (7 gelirse Vergi Memuru uyanır)', strong: true };
    switch (phase) {
      case 'robber': return { text: '🥷 Vergi Memurunu taşımak için bir araziye tıkla. O arazi üretmez ve oradaki bir rakipten kaynak alırsın.', strong: true };
      case 'sabotage': return { text: '💣 Sabotaj: yıkmak istediğin rakip yoluna tıkla.', strong: true };
      case 'free_road': return { text: `🛣️ Mühendis: ${freeRoadsRemaining} ücretsiz yol hakkın var. Yolunun/köyünün ucundaki bir kenara tıkla.`, strong: true };
      case 'road': return { text: '🛣️ Yol: kendi yoluna veya köyüne bağlı boş bir kenara tıkla. (1🧱 1🌲) Vazgeçmek için İptal.', strong: true };
      case 'settlement': return { text: '🏠 Köy: yolunun ucundaki boş bir köşeye tıkla. Yanındaki köşeler boş olmalı. (1🧱 1🌲 1🐑 1🌾)', strong: true };
      case 'city': return { text: '🏰 Şehir: yükseltmek istediğin kendi köyüne tıkla. (2🌾 3💎)', strong: true };
      case 'trader_pick': return null; // Tüccar penceresi zaten açık
      default: return { text: '✅ İnşa et, ticaret yap veya kart oyna. İşin bitince "Turu Bitir".' };
    }
  })();

  // Auth ekranı: token yoksa giriş/kayıt göster
  if (!authToken) {
    return (
      <>
        <AuthScreen socketUrl={socketUrl} onAuth={handleAuth} />
        <ToastContainer position="top-center" />
      </>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0f172a] text-white flex flex-col overflow-hidden font-sans">
      <ToastContainer position="top-center" theme="dark" limit={3} newestOnTop autoClose={3500} />
      <TutorialModal />
      {showHelp && <GameHelpPanel onClose={() => setShowHelp(false)} />}
      {!isInGame ? (
        <HomeHeader
          tab={homeTab}
          onTabChange={setHomeTab}
          username={authUsername}
          isAdmin={authIsAdmin}
          sikke={myProfileData ? myProfileData.sikke ?? 0 : null}
          isConnected={isConnected}
          onLogout={handleLogout}
        />
      ) : (
      <header className="h-14 bg-slate-800/95 border-b border-slate-600 flex items-center px-4 z-20 shrink-0 gap-3">
        {/* SOL: Logo + Durum */}
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-xs md:text-xl font-bold text-cyan-400 tracking-wider">CUMOR</h1>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <button
            onClick={() => setShowHelp(true)}
            className="text-xs bg-amber-400/15 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 px-2 py-1 rounded transition-colors ml-1 font-bold"
            title="Kurallar, kartlar ve sık sorulan sorular"
          >
            ❓<span className="hidden sm:inline"> Yardım</span>
          </button>
          <span className="hidden lg:inline text-gray-400 text-xs">{STATUS_LABELS[gameStatus]?.label ?? gameStatus}</span>
        </div>

        {/* ORTA: Oyuncu Skor Tablosu */}
        {isInGame && (
          <div className="flex-1 flex items-center justify-center gap-1 md:gap-1.5 overflow-x-auto min-w-0">
            {players.map(p => {
              const isActive = activePlayerId === p.id;
              const isMe = p.id === myId;
              const hasLongestRoad = longestRoadPlayerId === p.id;
              const hasLargestArmy = largestArmyPlayerId === p.id;
              return (
                <div key={p.id}
                  className={`flex items-center gap-0.5 md:gap-1 px-1 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs transition-all shrink-0 ${isActive
                    ? 'bg-yellow-500/20 border border-yellow-400 text-white shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                    : 'bg-slate-700/40 border border-slate-600/50 text-gray-400'
                    } ${isMe ? 'ring-1 ring-cyan-500/50' : ''}`}
                  title={`${p.name} - ${p.victoryPoints} VP${p.disconnected ? ' (bağlantısı koptu)' : ''}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className={`font-semibold truncate max-w-[60px] ${p.disconnected ? 'line-through opacity-60' : ''}`}>{p.name}</span>
                  {p.disconnected && <span title="Bağlantısı koptu" aria-label="Bağlantısı koptu">🔌</span>}
                  <span className="text-yellow-400 font-bold">{p.victoryPoints}</span>
                  {hasLongestRoad && <span title="En Uzun Yol (+2 VP)" className="text-[10px]">🛤️</span>}
                  {hasLargestArmy && <span title="Vergi Rekortmeni (+2 VP)" className="text-[10px]">💼</span>}
                  {isActive && <span className="text-[9px] text-yellow-300 animate-pulse">●</span>}
                  {/* Ban butonu - host görür, kendisi hariç */}
                  {myId === hostId && !isMe && (
                    <button
                      onClick={() => { if (confirm(`${p.name} oyuncusunu odadan atmak istiyor musunuz?`)) socket.emit('ban_player', { targetId: p.id }); }}
                      className="text-red-500 hover:text-red-300 text-[10px] ml-0.5" title="Oyuncuyu At"
                    >
                      🚫
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SAĞ: Sıradaki + Admin */}
        {isInGame && (
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-700/50 px-2 py-1 rounded text-xs border border-slate-600">
              <span className="text-gray-500">Sıra:</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activePlayer?.color || 'gray' }} />
              <span className="font-semibold text-white">{activePlayer?.name || '...'}</span>
            </div>

            {/* Admin butonu + kilit göstergesi (Sadece panel AÇIKKEN görünür) */}
            {isAdmin && showAdminPanel && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Admin Modu Aktif (Ctrl+Alt+G)" />
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  className="bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold"
                  title="Admin Paneli (Ctrl+Alt+G ile aç/kapa)"
                >
                  ⚙️
                </button>
              </>
            )}

            {/* Odayı Kapat Butonu (Sadece Host) */}
            {myId === hostId && (
              <button
                onClick={() => { if (confirm("Odayı kapatmak istediğinize emin misiniz? Herkes lobiyie dönecek.")) socket.emit('close_room'); }}
                className="bg-red-900/80 hover:bg-red-800 text-white px-2 py-1 rounded text-xs border border-red-700 ml-2"
                title="Odayı Kapat"
              >
                🏁 Kapat
              </button>
            )}
          </div>
        )}
      </header>
      )}

      <main className={`flex-1 relative bg-slate-950 ${isInGame ? 'flex items-center justify-center overflow-hidden' : 'overflow-y-auto'}`}>
        {!isInGame && (
          <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-10">
            {homeTab === 'play' && (
              <Lobby rooms={rooms} defaultName={authUsername} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
            )}
            {homeTab === 'profile' && (
              <ProfilePanel socketUrl={socketUrl} userId={authUserId!} username={authUsername} isAdmin={authIsAdmin} />
            )}
            {homeTab === 'store' && (
              <StorePanel
                socketUrl={socketUrl}
                userId={authUserId!}
                token={authToken!}
                sikke={myProfileData?.sikke ?? 0}
                isAdmin={authIsAdmin}
                equippedBuilding={myProfileData?.equippedBuilding || 'default'}
                onUpdate={fetchMyProfile}
              />
            )}
          </div>
        )}
        {isInGame && (
          <>
            {/* BOARD - EN ALT KATMAN */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pb-44 md:pb-20">
              <HexBoard
                tiles={tiles}
                buildings={buildings}
                players={players}
                onVertexClick={handleVertexClick}
                onEdgeClick={handleEdgeClick}
                onTileClick={handleTileClick}
                highlightNumber={highlightNumber} // YENİ PROP
              />
            </div>

            {/* ŞİMDİ NE YAPMALIYIM? (tüm faz ipuçları tek yerde) */}
            {phaseHint && (
              <div className="absolute top-3 md:top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[calc(100vw-1.5rem)] max-w-xl flex justify-center" role="status" aria-live="polite">
                <div className={`px-4 py-2 rounded-2xl backdrop-blur text-center shadow-xl ${phaseHint.strong
                  ? 'bg-slate-900/90 border border-amber-400/70 text-white text-sm md:text-base font-semibold'
                  : 'bg-slate-900/70 border border-slate-700 text-slate-300 text-xs md:text-sm'}`}>
                  {phaseHint.text}
                </div>
              </div>
            )}

            {/* ODA LOBİSİ: oyuncu sayısı, kim başlatır */}
            {gameStatus === GameStatus.LOBBY && (
              <WaitingRoom
                players={players}
                myId={myId}
                hostId={hostId}
                onStart={handleStartGame}
                onLeave={() => { socket.emit('leave_room'); setIsInGame(false); setGameStatus(GameStatus.LOBBY); }}
              />
            )}

            {/* DÜŞEN OYUNCU OYLAMASI */}
            {disconnectVote && gameStatus !== GameStatus.FINISHED && myId && (
              <DisconnectVotePanel vote={disconnectVote} players={players} myId={myId} onVote={end => socket.emit('vote_end_game', { end })} />
            )}

            {/* (Eski oyuncu listesi kaldırıldı - artık header'da gösteriliyor) */}

            {/* === BAŞLANGIÇ ZARI PANELİ (BASİT & ŞEFFAF) === */}
            {(gameStatus === GameStatus.ROLLING_FOR_START || gameStatus === 'rolling_for_start' as GameStatus) && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
                <div className="bg-slate-900/90 p-6 rounded-2xl border-2 border-cyan-500 shadow-2xl backdrop-blur-sm text-center min-w-[300px]">
                  <h2 className="text-xl font-bold text-cyan-400 mb-4 tracking-wider">🎲 Başlangıç Zarları</h2>

                  <div className="space-y-2 mb-6">
                    {players.map(p => {
                      // Sunucu her oyuncunun atışlarını dizi olarak gönderir (beraberlikte birden fazla atış)
                      const rolls = startRolls.find(r => r.playerId === p.id)?.rolls || [];
                      const rollVal = rolls.length > 0 ? rolls.join(' → ') : null;
                      return (
                        <div key={p.id} className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded border border-slate-700">
                          <span className={`${activePlayerId === p.id ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                          <span className="font-mono text-cyan-300 font-bold">{rollVal !== null ? rollVal : (activePlayerId === p.id ? '...' : '-')}</span>
                        </div>
                      );
                    })}
                  </div>

                  {activePlayerId === myId ? (
                    <button
                      onClick={() => socket.emit('roll_dice_start')}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95"
                    >
                      ZAR AT
                    </button>
                  ) : (
                    <div className="text-gray-400 text-sm animate-pulse">
                      {players.find(p => p.id === activePlayerId)?.name} bekleniyor...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- KURBAN SEÇİM MODALI --- */}
            {possibleVictims.length > 0 && (
              <div className="absolute inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-800 p-5 md:p-8 rounded-2xl border-2 border-red-500 shadow-2xl text-center w-[calc(100vw-1.5rem)] max-w-lg">
                  <h2 className="text-2xl font-black text-white mb-4">👮 KİME CEZA KESİLSİN?</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {possibleVictims.map(vId => {
                      const p = players.find(player => player.id === vId);
                      return (
                        <button
                          key={vId}
                          onClick={() => handleSelectVictim(vId)}
                          className="bg-slate-700 hover:bg-red-600 text-white p-4 rounded-xl font-bold transition-all border border-slate-600 hover:scale-105 flex flex-col items-center"
                        >
                          <div className="w-8 h-8 rounded-full mb-2" style={{ backgroundColor: p?.color }}></div>
                          {p?.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* === OYUN SONU MODALI === */}
            {gameStatus === GameStatus.FINISHED && winnerId && (
              <div className="absolute inset-0 bg-black/80 z-[100] flex overflow-y-auto p-3 backdrop-blur-md">
                {/* m-auto + overflow: kısa ekranda pencere kesilmez, kaydırılabilir */}
                <div className="m-auto w-full bg-gradient-to-b from-yellow-900/90 to-slate-900/90 p-5 md:p-10 rounded-3xl border-4 border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.5)] text-center max-w-lg">
                  {/* Konfeti Efekti */}
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4 animate-bounce">🏆</div>

                  <h1 className="text-3xl md:text-4xl font-black text-yellow-400 mb-2 tracking-wider">
                    OYUN BİTTİ!
                  </h1>

                  <div className={`text-2xl text-white font-bold ${endReason && endReason !== 'normal' ? 'mb-2' : 'mb-6'}`}>
                    🎉 {players.find(p => p.id === winnerId)?.name} KAZANDI! 🎉
                  </div>
                  {endReason === 'vote' && (
                    <p className="text-sm text-slate-300 mb-6">🗳️ Bir oyuncu düştüğü için oyun oylamayla bitirildi; en yüksek puanlı oyuncu kazandı.</p>
                  )}
                  {endReason === 'timeout' && (
                    <p className="text-sm text-slate-300 mb-6">⏱️ Düşen oyuncu 5 dakika içinde dönmediği için oyun bitti; en yüksek puanlı oyuncu kazandı.</p>
                  )}

                  <div className="w-20 h-20 rounded-full mx-auto mb-6 border-4 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.6)]"
                    style={{ backgroundColor: players.find(p => p.id === winnerId)?.color }}>
                  </div>

                  {/* SKOR TABLOSU */}
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                    <h3 className="text-sm text-gray-400 uppercase font-bold mb-3">SKOR TABLOSU</h3>
                    <div className="space-y-2">
                      {[...players]
                        .sort((a, b) => b.victoryPoints - a.victoryPoints)
                        .map((p, idx) => (
                          <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${idx === 0 ? 'bg-yellow-500/20' : 'bg-slate-700/30'}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  '}</span>
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}></div>
                              <span className="font-bold text-white">{p.name}</span>
                            </div>
                            <span className="text-yellow-400 font-bold">{p.victoryPoints} VP</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* ÖZEL ÖDÜLLER */}
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                    <h3 className="text-sm text-purple-400 uppercase font-bold mb-3">ÖZEL ÖDÜLLER</h3>
                    <div className="flex flex-col gap-2 text-sm">
                      {(() => {
                        let maxSabotage = 0, maxRobbed = 0, maxTrades = 0;
                        players.forEach(p => {
                          if (p.gameStats?.sabotagesUsed > maxSabotage) maxSabotage = p.gameStats.sabotagesUsed;
                          if (p.gameStats?.robbedByTaxCollector > maxRobbed) maxRobbed = p.gameStats.robbedByTaxCollector;
                          if (p.gameStats?.tradesMade > maxTrades) maxTrades = p.gameStats.tradesMade;
                        });

                        const gaddar = players.find(p => maxSabotage > 0 && p.gameStats?.sabotagesUsed === maxSabotage);
                        const sanssiz = players.find(p => maxRobbed > 0 && p.gameStats?.robbedByTaxCollector === maxRobbed);
                        const borsa = players.find(p => maxTrades > 0 && p.gameStats?.tradesMade === maxTrades);

                        return (
                          <>
                            <div className="flex justify-between px-2">
                              <span className="text-gray-300">😈 En Gaddar:</span>
                              <span className="font-bold text-white">{gaddar ? `${gaddar.name} (${maxSabotage} Sabotaj)` : '-'}</span>
                            </div>
                            <div className="flex justify-between px-2">
                              <span className="text-gray-300">😭 En Şanssız:</span>
                              <span className="font-bold text-white">{sanssiz ? `${sanssiz.name} (${maxRobbed} Kere Soyuldu)` : '-'}</span>
                            </div>
                            <div className="flex justify-between px-2">
                              <span className="text-gray-300">📈 Borsa Kurdu:</span>
                              <span className="font-bold text-white">{borsa ? `${borsa.name} (${maxTrades} Ticaret)` : '-'}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      socket.emit('leave_room');
                      setIsInGame(false);
                      setGameStatus(GameStatus.LOBBY);
                      fetchMyProfile(); // Kazanılan sikke lobide görünsün
                    }}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 py-3 rounded-lg font-bold transition-colors"
                  >
                    Lobiye Dön
                  </button>
                </div>
              </div>
            )}

            {isInGame && isMyTurn && gameStatus === GameStatus.PLAYING && !hasRolled && (
              <div className="absolute right-119 bottom-10 z-50 pointer-events-none md:pointer-events-auto flex flex-col items-center gap-2">
                 {/* PC DICE BUTTON (Hidden on Mobile) */}
                <button onClick={handleRollDice} className="hidden md:flex bg-red-600 hover:bg-red-500 text-white w-24 h-24 rounded-full font-black text-xl shadow-[0_0_30px_rgba(220,38,38,0.6)] border-4 border-slate-900 transition-transform active:scale-90 flex-col items-center justify-center gap-1">
                  <span>🎲</span><span>ZAR AT</span>
                </button>
                <div className="hidden md:block text-[10px] text-yellow-500 bg-slate-900/80 p-1 rounded font-bold">
                  ⚠️ 7 gelirse Vergi Memuru uyanır!
                </div>
              </div>
            )}

            {/* MOBILE DICE BUTTON (Hidden on Desktop) */}
            {isInGame && isMyTurn && gameStatus === GameStatus.PLAYING && !hasRolled && (
              <div className="md:hidden fixed bottom-40 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                 <button 
                  onClick={handleRollDice} 
                  className="bg-red-600 hover:bg-red-500 text-white w-20 h-20 rounded-full font-black text-lg shadow-[0_0_20px_rgba(220,38,38,0.8)] border-4 border-slate-900 flex flex-col items-center justify-center animate-bounce"
                 >
                  <span>🎲</span>
                  <span className="text-xs">ZAR AT</span>
                </button>
                <div className="text-[10px] text-yellow-500 bg-slate-900/80 p-1 rounded font-bold text-center">
                  ⚠️ 7 gelirse Vergi <br/> Memuru uyanır!
                </div>
              </div>
            )}

            {/* MOBILE END TURN BUTTON (Hidden on Desktop) */}
            {isInGame && isMyTurn && gameStatus === GameStatus.PLAYING && hasRolled && (
                 <button 
                  onClick={handleEndTurn} 
                  className="md:hidden fixed bottom-40 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white w-20 h-20 rounded-full font-black text-lg shadow-[0_0_20px_rgba(37,99,235,0.8)] border-4 border-slate-900 z-50 flex flex-col items-center justify-center animate-pulse"
                 >
                  <span>⏭️</span>
                  <span className="text-[10px]">BİTİR</span>
                </button>
            )}

            {/* DESKTOP PANELS (Hidden on Mobile via CSS) */}
            {isInGame && isMyTurn && gameStatus === GameStatus.PLAYING && hasRolled && (
              <ActionPanel
                onBuildRoad={startBuildRoad}
                onBuildSettlement={startBuildSettlement}
                onBuildCity={startBuildCity}
                onBuyCard={handleBuyCard}
                onEndTurn={handleEndTurn}
                isBuilding={turnSubPhase === 'road' || turnSubPhase === 'settlement' || turnSubPhase === 'city' ? turnSubPhase : null}
                onCancelBuild={cancelBuild}
                devCardDeckCount={devCardDeckCount}
              />
            )}

            {isInGame && gameStatus === GameStatus.PLAYING && (
              <TradePanel
                onBankSell={handleBankSell}
                onBankBuy={handleBankBuy}
                onCreateOffer={handleCreateOffer}
                onAcceptOffer={handleAcceptOffer}
                onFinalizeTrade={handleFinalizeTrade}
                onCancelOffer={handleCancelOffer}
                currentOffer={currentOffer}
                myId={myId || ''}
                players={players}
                buildings={buildings}
                tiles={tiles}
                onBuyVictoryPoint={() => socket.emit('buy_victory_point')}
                canBuyVP={(players.find(p => p.id === myId)?.resources?.[ResourceType.GOLD] || 0) >= 33}
                isMyTurn={isMyTurn}
              />
            )}

            {isInGame && activePlayer && myId && (
              <ResourcePanel
                resources={players.find(p => p.id === myId)?.resources || {} as any}
                devCards={players.find(p => p.id === myId)?.devCards || {} as any}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyTurn}
              />
            )}

            {isInGame && myId && (
              <BuildCostPanel
                playerResources={players.find(p => p.id === myId)?.resources || {} as any}
                buildingCounts={{
                  settlements: buildings.filter(b => b.ownerId === myId && b.type === BuildingType.SETTLEMENT).length,
                  cities: buildings.filter(b => b.ownerId === myId && b.type === BuildingType.CITY).length,
                  roads: buildings.filter(b => b.ownerId === myId && b.type === BuildingType.ROAD).length,
                }}
              />
            )}

            {/* MOBILE PANELS (Conditional Render) */}
            {isInGame && isMyTurn && gameStatus === GameStatus.PLAYING && hasRolled && activeMobilePanel === 'actions' && (
              <MobileActionPanel
                onBuildRoad={startBuildRoad}
                onBuildSettlement={startBuildSettlement}
                onBuildCity={startBuildCity}
                onBuyCard={handleBuyCard}
                onEndTurn={handleEndTurn}
                isBuilding={turnSubPhase === 'road' || turnSubPhase === 'settlement' || turnSubPhase === 'city' ? turnSubPhase : null}
                onCancelBuild={cancelBuild}
                devCardDeckCount={devCardDeckCount}
              />
            )}

            {isInGame && gameStatus === GameStatus.PLAYING && activeMobilePanel === 'trade' && (
              <MobileTradePanel
                onBankSell={handleBankSell}
                onBankBuy={handleBankBuy}
                onCreateOffer={handleCreateOffer}
                onAcceptOffer={handleAcceptOffer}
                onFinalizeTrade={handleFinalizeTrade}
                onCancelOffer={handleCancelOffer}
                currentOffer={currentOffer}
                myId={myId || ''}
                players={players}
                buildings={buildings}
                tiles={tiles}
                onBuyVictoryPoint={() => socket.emit('buy_victory_point')}
                canBuyVP={(players.find(p => p.id === myId)?.resources?.[ResourceType.GOLD] || 0) >= 33}
                isMyTurn={isMyTurn}
                onClose={() => setActiveMobilePanel('none')}
              />
            )}

            {isInGame && activePlayer && myId && (
              <MobileResourcePanel
                resources={players.find(p => p.id === myId)?.resources || {} as any}
                devCards={players.find(p => p.id === myId)?.devCards || {} as any}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyTurn}
              />
            )}

            {isInGame && myId && activeMobilePanel === 'costs' && (
              <MobileBuildCostPanel
                playerResources={players.find(p => p.id === myId)?.resources || {} as any}
                buildingCounts={{
                  settlements: buildings.filter(b => b.ownerId === myId && b.type === BuildingType.SETTLEMENT).length,
                  cities: buildings.filter(b => b.ownerId === myId && b.type === BuildingType.CITY).length,
                  roads: buildings.filter(b => b.ownerId === myId && b.type === BuildingType.ROAD).length,
                }}
                onClose={() => setActiveMobilePanel('none')}
              />
            )}

            {isInGame && activePlayer && myId && activeMobilePanel === 'cards' && (
               <MobileDevCardPanel
                resources={players.find(p => p.id === myId)?.resources || {} as any}
                devCards={players.find(p => p.id === myId)?.devCards || {} as any}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyTurn}
                onClose={() => setActiveMobilePanel('none')}
               />
            )}





            {/* CHAT PANELİ */}
            <ChatPanel
              socket={socket}
              myId={myId || ''}
              players={players}
              isOpen={isChatOpen}
              onToggle={() => setIsChatOpen(!isChatOpen)}
            />


            {/* TÜCCAR MODALİ: Bankadan kaynak seç */}
            {isMyTurn && ((turnSubPhase as any) === 'trader_pick' || showTraderModal) && (
              <div className="absolute inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-800 p-5 md:p-8 rounded-2xl border-2 border-green-500 shadow-2xl text-center w-[calc(100vw-1.5rem)] max-w-lg">
                  <h2 className="text-2xl font-black text-white mb-2">📦 Tüccar - Kaynak Seç</h2>
                  <p className="text-gray-400 mb-4">Kalan seçim: {traderPicksRemaining}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                    {[ResourceType.LUMBER, ResourceType.CONCRETE, ResourceType.TEXTILE, ResourceType.FOOD, ResourceType.DIAMOND].map(res => (
                      <button
                        key={res}
                        onClick={() => {
                          socket.emit('trader_pick_resource', { resource: res });
                          setShowTraderModal(false);
                        }}
                        className="bg-slate-700 hover:bg-green-600 text-white p-3 md:p-4 rounded-xl font-bold transition-all border border-slate-600 hover:scale-105 flex flex-col items-center gap-1"
                        title={`${res} al`}
                      >
                        <span className="text-2xl">{res === ResourceType.LUMBER ? '🌲' : res === ResourceType.CONCRETE ? '🧱' : res === ResourceType.TEXTILE ? '🐑' : res === ResourceType.FOOD ? '🌾' : '💎'}</span>
                        <span className="text-xs">{RESOURCE_INFO[res].name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MERCATOR MODALİ: Kaynak türü seç */}
            {showMercatorModal && (
              <div className="absolute inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-800 p-5 md:p-8 rounded-2xl border-2 border-purple-500 shadow-2xl text-center w-[calc(100vw-1.5rem)] max-w-lg">
                  <h2 className="text-2xl font-black text-white mb-2">🌍 Mercator - Kaynak Talep Et</h2>
                  <p className="text-gray-400 mb-4">Her rakipten seçtiğin kaynaktan max 2 alırsın!</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                    {[ResourceType.LUMBER, ResourceType.CONCRETE, ResourceType.TEXTILE, ResourceType.FOOD, ResourceType.DIAMOND].map(res => (
                      <button
                        key={res}
                        onClick={() => {
                          socket.emit('play_card', { cardType: DevCardType.MERCATOR, targetResource: res });
                          setShowMercatorModal(false);
                        }}
                        className="bg-slate-700 hover:bg-purple-600 text-white p-3 md:p-4 rounded-xl font-bold transition-all border border-slate-600 hover:scale-105 flex flex-col items-center gap-1"
                        title={`${res} talep et`}
                      >
                        <span className="text-2xl">{res === ResourceType.LUMBER ? '🌲' : res === ResourceType.CONCRETE ? '🧱' : res === ResourceType.TEXTILE ? '🐑' : res === ResourceType.FOOD ? '🌾' : '💎'}</span>
                        <span className="text-xs">{RESOURCE_INFO[res].name}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowMercatorModal(false)} className="mt-4 text-gray-400 hover:text-white text-sm">İptal</button>
                </div>
              </div>
            )}

            {/* ADMİN PANELİ: Hesap bazlı admin */}
            {showAdminPanel && isAdmin && (
              <div className="absolute top-16 right-4 z-[80] bg-slate-800/95 p-5 rounded-xl border-2 border-red-500 shadow-2xl w-96 backdrop-blur-sm max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-red-400">⚙️ Admin Paneli</h3>
                  <button onClick={() => setShowAdminPanel(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
                </div>

                {/* DESTE BİLGİSİ */}
                <div className="bg-slate-700/50 p-3 rounded-lg mb-3 flex items-center justify-between">
                  <span className="text-sm text-gray-300">🃏 Destede Kalan Kart:</span>
                  <span className="text-lg font-bold text-yellow-400">{devCardDeckCount} / {players.length === 5 ? 45 : 30}</span>
                </div>

                {/* KAYNAK MİKTARI AYARI */}
                <div className="bg-slate-700/50 p-3 rounded-lg mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Verilecek miktar:</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAdminResourceAmount(Math.max(1, adminResourceAmount - 1))} className="bg-slate-600 hover:bg-slate-500 text-white w-6 h-6 rounded text-sm font-bold">-</button>
                      <span className="text-yellow-400 font-bold text-lg w-8 text-center">{adminResourceAmount}</span>
                      <button onClick={() => setAdminResourceAmount(adminResourceAmount + 1)} className="bg-slate-600 hover:bg-slate-500 text-white w-6 h-6 rounded text-sm font-bold">+</button>
                    </div>
                  </div>
                </div>

                {/* OYUNCU LİSTESİ */}
                {players.map(p => {
                  const totalCards = p.devCards ? Object.values(p.devCards).reduce((s: number, v: number) => s + v, 0) : 0;
                  return (
                    <div key={p.id} className="mb-3 bg-slate-700/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-bold text-sm flex-1">{p.name}</span>
                        <span className="text-xs text-gray-400">{p.victoryPoints} VP</span>
                        <span className="text-xs text-purple-400" title="Toplam gelişim kartı">🃏{totalCards}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[ResourceType.LUMBER, ResourceType.CONCRETE, ResourceType.TEXTILE, ResourceType.FOOD, ResourceType.DIAMOND, ResourceType.GOLD].map(res => (
                          <div key={res} className="flex flex-col gap-0.5">
                            <button
                              onClick={() => {
                                const r: any = {}; r[res] = adminResourceAmount;
                                socket.emit('admin_give_resources', { targetId: p.id, resources: r });
                              }}
                              className="bg-slate-600 hover:bg-green-600 text-white px-1.5 py-1 rounded text-[10px] transition-colors"
                              title={`${res} +${adminResourceAmount} ver`}
                            >
                              {res === ResourceType.LUMBER ? '🌲' : res === ResourceType.CONCRETE ? '🧱' : res === ResourceType.TEXTILE ? '🐑' : res === ResourceType.FOOD ? '🌾' : res === ResourceType.DIAMOND ? '💎' : '💰'}
                              +{adminResourceAmount}
                            </button>
                            <button
                              onClick={() => {
                                const r: any = {}; r[res] = -adminResourceAmount;
                                socket.emit('admin_give_resources', { targetId: p.id, resources: r });
                              }}
                              className="bg-slate-600 hover:bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] transition-colors"
                              title={`${res} -${adminResourceAmount} sil`}
                            >
                              -{adminResourceAmount}
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => {
                              const r: any = {};
                              r[ResourceType.LUMBER] = adminResourceAmount; r[ResourceType.CONCRETE] = adminResourceAmount;
                              r[ResourceType.TEXTILE] = adminResourceAmount; r[ResourceType.FOOD] = adminResourceAmount;
                              r[ResourceType.DIAMOND] = adminResourceAmount; r[ResourceType.GOLD] = adminResourceAmount;
                              socket.emit('admin_give_resources', { targetId: p.id, resources: r });
                            }}
                            className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                            title={`Tüm kaynaklar +${adminResourceAmount}`}
                          >
                            HEPSİ +
                          </button>
                          <button
                            onClick={() => {
                              const r: any = {};
                              r[ResourceType.LUMBER] = -adminResourceAmount; r[ResourceType.CONCRETE] = -adminResourceAmount;
                              r[ResourceType.TEXTILE] = -adminResourceAmount; r[ResourceType.FOOD] = -adminResourceAmount;
                              r[ResourceType.DIAMOND] = -adminResourceAmount; r[ResourceType.GOLD] = -adminResourceAmount;
                              socket.emit('admin_give_resources', { targetId: p.id, resources: r });
                            }}
                            className="bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                            title={`Tüm kaynaklar -${adminResourceAmount}`}
                          >
                            HEPSİ -
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const vp = prompt(`${p.name} için VP değeri:`, String(p.victoryPoints));
                            if (vp !== null) socket.emit('admin_set_vp', { targetId: p.id, vp: parseInt(vp) || 0 });
                          }}
                          className="bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                          title="VP ayarla"
                        >
                          VP
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </>
        )}

        {/* MOBILE NAVBAR - Sadece mobilde ve oyun başladıktan sonra görünür (bekleme odasında anlamsız) */}
        {isInGame && gameStatus !== GameStatus.LOBBY && (
          <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 flex justify-around items-center h-16 z-[60] pb-2 safe-area-bottom">
            <button onClick={() => {
              setActiveMobilePanel(activeMobilePanel === 'trade' ? 'none' : 'trade');
              setIsChatOpen(false); 
            }} className={`flex flex-col items-center p-2 transition-colors ${activeMobilePanel === 'trade' ? 'text-blue-400' : 'text-gray-400'}`}>
              <span className="text-2xl">⚖️</span>
              <span className="text-[10px] font-bold">Takas</span>
            </button>
            <button onClick={() => {
              setActiveMobilePanel(activeMobilePanel === 'actions' ? 'none' : 'actions');
              setIsChatOpen(false);
            }} className={`flex flex-col items-center p-2 transition-colors ${activeMobilePanel === 'actions' ? 'text-blue-400' : 'text-gray-400'}`}>
              <span className="text-2xl">🔨</span>
              <span className="text-[10px] font-bold">İnşaat</span>
            </button>
            <button onClick={() => {
               setActiveMobilePanel(activeMobilePanel === 'cards' ? 'none' : 'cards');
               setIsChatOpen(false);
            }} className={`flex flex-col items-center p-2 transition-colors ${activeMobilePanel === 'cards' ? 'text-blue-400' : 'text-gray-400'}`}>
              <span className="text-2xl">🃏</span>
              <span className="text-[10px] font-bold">Kartlar</span>
            </button>
            <button onClick={() => {
              setActiveMobilePanel(activeMobilePanel === 'costs' ? 'none' : 'costs');
              setIsChatOpen(false);
            }} className={`flex flex-col items-center p-2 transition-colors ${activeMobilePanel === 'costs' ? 'text-blue-400' : 'text-gray-400'}`}>
              <span className="text-2xl">📋</span>
              <span className="text-[10px] font-bold">Maliyet</span>
            </button>
            <button onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setActiveMobilePanel('none');
            }} className={`flex flex-col items-center p-2 transition-colors ${isChatOpen ? 'text-blue-400' : 'text-gray-400'}`}>
              <span className="text-2xl">💬</span>
              <span className="text-[10px] font-bold">Sohbet</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;