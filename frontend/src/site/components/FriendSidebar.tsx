import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/apiService';
import * as Icons from './Icons';
import { theme } from '../../configs/theme';
import { matchmakingSocket } from '../../services/matchmakingSocket';
import { GameEvents, USERNAME_REGEX, USERNAME_MIN, USERNAME_MAX, USERNAME_ERROR_MESSAGE } from '@transcendence/types';


const SIDEBAR_WIDTH = 300;

type Tab = 'friends' | 'requests' | 'add';

const statusColor = (s: string) =>
  s === 'ONLINE' ? theme.colors.hpHigh
  : s === 'IN_GAME' ? theme.colors.zeus
  : s === 'IN_QUEUE' ? theme.colors.hpMid
  : theme.colors.textMuted;

const statusLabel = (s: string) =>
  s === 'ONLINE' ? 'Online'
  : s === 'IN_GAME' ? 'In Game'
  : s === 'IN_QUEUE' ? 'In Queue'
  : 'Offline';

interface FriendsSidebarProps {
  onGameInviteAccepted: (sessionId: string, inviterId?: number) => void;
  gameInvites: api.GameInvite[];
  onAcceptInvite: (invite: api.GameInvite) => void;
  onDeclineInvite: (invite: api.GameInvite) => void;
}

export default function FriendsSidebar({ onGameInviteAccepted, gameInvites, onAcceptInvite, onDeclineInvite }: FriendsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<api.FriendEntry[]>([]);
  const [requests, setRequests] = useState<api.FriendRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [now, setNow] = useState(Date.now());

  // Add friend
  const [addUser, setAddUser] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');

  // Invite feedback
  const [inviteMsg, setInviteMsg] = useState<Record<number, string>>({});

  const fetchFriends = useCallback(async () => {
    const [friendsData, reqData] = await Promise.all([
      api.getFriends(),
      api.getFriendRequests(),
    ]);
    if (friendsData) setFriends(friendsData.friends);
    if (reqData) setRequests(reqData);
    setLoading(false);
  }, []);

  // Caricamento iniziale
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as Tab | undefined;
      if (tab) setTab(tab);
      setIsOpen(true);
    };
    window.addEventListener('open-friends-sidebar', handler);
    return () => window.removeEventListener('open-friends-sidebar', handler);
  }, []);

  // Aggiornamento lista amici via SSE quando cambia una friendship
  useEffect(() => {
    const handler = () => fetchFriends();
    window.addEventListener('friend-list-changed', handler);
    return () => window.removeEventListener('friend-list-changed', handler);
  }, [fetchFriends]);

  // Ricezione live degli status amici via SSE (propagato dalla Navbar tramite CustomEvent)
  //    Aggiorna lo status dell'amico nella lista locale senza rifare il fetch.
  useEffect(() => {
    const handler = (e: Event) => {
      const { userId, status } = (e as CustomEvent).detail;
      setFriends(prev => prev.map(f =>
        f.friend.id === userId ? { ...f, friend: { ...f.friend, status } } : f
      ));
    };
    window.addEventListener('friend-status-update', handler);
    return () => window.removeEventListener('friend-status-update', handler);
  }, []);

  // 6. Il nostro invite è stato rifiutato — aggiorna il messaggio e rimuovi l'invite
  useEffect(() => {
    const handler = (e: Event) => {
      const { receiverId } = (e as CustomEvent).detail;
      setInviteMsg(prev => ({ ...prev, [receiverId]: 'Declined' }));
      setTimeout(() => {
        setInviteMsg(prev => { const n = { ...prev }; delete n[receiverId]; return n; });
      }, 3000);
    };
    window.addEventListener('game-invite-declined', handler);
    return () => window.removeEventListener('game-invite-declined', handler);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Contatori
  const receivedCount = requests?.received?.length || 0;
  const activeInvites = gameInvites.filter(inv => new Date(inv.expiresAt).getTime() > now);
  const badgeCount = receivedCount + activeInvites.length;
  const onlineCount = friends.filter(f => f.friend.status === 'ONLINE' || f.friend.status === 'IN_GAME' || f.friend.status === 'IN_QUEUE').length;

  // Ordina: online first
  const sortedFriends = [...friends].sort((a, b) => {
    const order: Record<string, number> = { 'ONLINE': 0, 'IN_QUEUE': 1, 'IN_GAME': 2, 'OFFLINE': 3 };
    return (order[a.friend.status] ?? 4) - (order[b.friend.status] ?? 4);
  });

  const handleAddFriend = async () => {
  setAddMsg('');
  setAddError('');
  const input = addUser.trim();
  if (!input) return setAddError('Enter a username.');
  if (input.length < USERNAME_MIN) return setAddError(`Username too short (min ${USERNAME_MIN} characters).`);
  if (input.length > USERNAME_MAX) return setAddError(`Username too long (max ${USERNAME_MAX} characters).`);
  if (!USERNAME_REGEX.test(input)) return setAddError(USERNAME_ERROR_MESSAGE);

  const found = await api.searchUserByUsername(input);
  if (!found) return setAddError(`User "${input}" not found.`);

  const result = await api.sendFriendRequest(found.id);
  if (result.ok) {
    setAddMsg('Request sent!');
    setAddUser('');
    fetchFriends();
  } else {
    setAddError(result.message || 'Error');
  }
};

const handleAcceptFriend = async (targetId: number) => {
  if (await api.respondFriendRequest(targetId, 'ACCEPTED')) fetchFriends();
};
const handleRejectFriend = async (targetId: number) => {
  if (await api.respondFriendRequest(targetId, 'REJECTED')) fetchFriends();
};
const handleRemove = async (targetId: number) => {
  if (await api.removeFriend(targetId)) fetchFriends();
};

const handleSendInvite = async (targetId: number) => {
  const socket = matchmakingSocket.connect();

  const registerListener = () => {
    socket.once(GameEvents.DIRECT_SESSION_READY, (data: { sessionId?: string }) => {
      if (data?.sessionId) onGameInviteAccepted(data.sessionId);
    });
  };

  if (socket.connected) {
    registerListener();
  } else {
    socket.once('connect', registerListener);
  }

  const result = await api.sendGameInvite(targetId);
  setInviteMsg(prev => ({
    ...prev,
    [targetId]: result.ok ? 'Invited!' : (result.message || 'Error'),
  }));
  setTimeout(() => {
    setInviteMsg(prev => { const n = { ...prev }; delete n[targetId]; return n; });
  }, 3000);
};

const handleAcceptInvite = (invite: api.GameInvite) => onAcceptInvite(invite);
const handleRejectInvite = (invite: api.GameInvite) => onDeclineInvite(invite);


  // ─── Tab button ───
  const TabBtn = ({ id, label, badge }: { id: Tab; label: string; badge?: number }) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: '8px 4px', border: 'none',
      background: tab === id ? 'rgba(200,170,100,0.12)' : 'transparent',
      color: tab === id ? theme.colors.gold : theme.colors.textMuted,
      fontFamily: theme.fonts.heading, fontSize: '10px', fontWeight: 600,
      letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
      borderBottom: tab === id ? `2px solid ${theme.colors.gold}` : '2px solid transparent',
      position: 'relative', transition: 'all 0.2s',
    }}>
      {label}
      {badge && badge > 0 ? (
        <span style={{
          position: 'absolute', top: 2, right: 6,
          background: theme.colors.dead, color: '#fff',
          fontSize: '9px', fontWeight: 'bold',
          width: 14, height: 14, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge > 9 ? '9+' : badge}</span>
      ) : null}
    </button>
  );

  // ─── Toggle button ───
  const toggleBtn = (
    <button onClick={() => setIsOpen(!isOpen)} style={{
      position: 'fixed', right: isOpen ? SIDEBAR_WIDTH : 0,
      top: '50%', transform: 'translateY(-50%)',
      width: 36, height: 72, border: `1px solid ${theme.colors.border}`,
      borderRight: isOpen ? 'none' : `1px solid ${theme.colors.border}`,
      borderLeft: isOpen ? `1px solid ${theme.colors.border}` : 'none',
      borderRadius: '8px 0 0 8px',
      background: theme.colors.bgPanel, color: theme.colors.goldDim,
      cursor: 'pointer', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '4px',
      zIndex: 2001, transition: 'right 0.3s ease',
      backdropFilter: 'blur(8px)',
    }}>
      <Icons.Users size={16} />
      {(badgeCount > 0 || onlineCount > 0) && (
        <span style={{
          fontSize: '9px', fontWeight: 'bold',
          color: badgeCount > 0 ? theme.colors.dead : theme.colors.hpHigh,
        }}>
          {badgeCount > 0 ? badgeCount : onlineCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      {toggleBtn}

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: SIDEBAR_WIDTH,
        background: `linear-gradient(180deg, ${theme.colors.bgPanel} 0%, ${theme.colors.bgDark} 100%)`,
        borderLeft: `1px solid ${theme.colors.border}`,
        zIndex: 2001,
        transform: isOpen ? 'translateX(0)' : `translateX(${SIDEBAR_WIDTH}px)`,
        transition: 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column',
        fontFamily: theme.fonts.mono,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <span style={{ fontFamily: theme.fonts.heading, fontSize: '14px', fontWeight: 700, color: theme.colors.goldBright, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Friends
          </span>
          <span style={{ fontFamily: theme.fonts.mono, fontSize: '11px', color: theme.colors.hpHigh }}>
            {onlineCount} online
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${theme.colors.border}` }}>
          <TabBtn id="friends" label="List" />
          <TabBtn id="requests" label="Requests" badge={badgeCount} />
          <TabBtn id="add" label="Add" />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

          {loading && (
            <div style={{ padding: '32px', textAlign: 'center', color: theme.colors.textMuted, fontSize: '12px' }}>
              Loading...
            </div>
          )}

          {/* ═══ FRIENDS LIST ═══ */}
          {!loading && tab === 'friends' && (
            sortedFriends.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ color: theme.colors.textMuted, fontSize: '12px', lineHeight: 1.6 }}>
                  No friends yet.<br />Use the Add tab to send a request!
                </p>
              </div>
            ) : (
              sortedFriends.map((f) => {
                const isOnline = f.friend.status === 'ONLINE';
                const isInGame = f.friend.status === 'IN_GAME' || f.friend.status === 'IN_QUEUE';
                return (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 16px', borderBottom: `1px solid rgba(200,170,100,0.06)`,
                    transition: 'background 0.15s',
                    opacity: isOnline || isInGame ? 1 : 0.5,
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(200,170,100,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={f.friend.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${f.friend.username}`}
                        alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${theme.colors.border}` }}
                      />
                      <div style={{
                        position: 'absolute', bottom: -1, right: -1,
                        width: 10, height: 10, borderRadius: '50%',
                        background: statusColor(f.friend.status),
                        border: `2px solid ${theme.colors.bgPanel}`,
                      }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: theme.fonts.heading, fontWeight: 600, fontSize: '12px',
                        color: theme.colors.textPrimary, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{f.friend.username}</div>
                      <div style={{ fontSize: '10px', color: statusColor(f.friend.status) }}>
                        {statusLabel(f.friend.status)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                      {isOnline && (
                        inviteMsg[f.friend.id] ? (
                          <span style={{
                            fontSize: '9px', color: inviteMsg[f.friend.id] === 'Invited!' ? theme.colors.hpHigh : theme.colors.dead,
                          }}>{inviteMsg[f.friend.id]}</span>
                        ) : (
                          <button onClick={() => handleSendInvite(f.friend.id)} title="Invite to game" style={{
                            background: 'none', border: `1px solid ${theme.colors.goldSubtle}`,
                            borderRadius: '4px', color: theme.colors.goldDim, cursor: 'pointer',
                            padding: '3px 6px', display: 'flex', alignItems: 'center',
                            transition: 'all 0.2s', fontSize: '10px', fontFamily: theme.fonts.heading,
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.colors.gold; e.currentTarget.style.color = theme.colors.gold; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.colors.goldSubtle; e.currentTarget.style.color = theme.colors.goldDim; }}
                          >
                            <Icons.Zap size={12} />
                          </button>
                        )
                      )}

                      <button onClick={() => handleRemove(f.friend.id)} title="Remove friend" style={{
                        background: 'none', border: 'none', color: theme.colors.textMuted,
                        cursor: 'pointer', padding: '3px', display: 'flex', opacity: 0.4,
                        transition: 'all 0.2s',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = theme.colors.dead; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = theme.colors.textMuted; }}
                      >
                        <Icons.X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* ═══ REQUESTS TAB (Friend Requests + Game Invites) ═══ */}
          {!loading && tab === 'requests' && (
            <div style={{ padding: '8px 0' }}>

              {/* ── GAME INVITES ── */}
              {activeInvites.length > 0 && (
                <>
                  <div style={{ padding: '8px 16px 4px' }}>
                    <span style={{ fontFamily: theme.fonts.heading, fontSize: '10px', color: theme.colors.gold, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      Game Invites ({activeInvites.length})
                    </span>
                  </div>
                  {activeInvites.map((inv) => {
                    const expiresAt = new Date(inv.expiresAt).getTime();
                    const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
                    const ttlTotal = Math.max(1, Math.ceil((expiresAt - new Date(inv.createdAt).getTime()) / 1000));
                    const progressPct = (remaining / ttlTotal) * 100;

                    return (
                      <div key={`invite-${inv.id}`} style={{
                        padding: '10px 16px', borderBottom: `1px solid rgba(200,170,100,0.06)`,
                        background: 'rgba(200,170,100,0.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <img
                            src={inv.sender.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${inv.sender.username}`}
                            alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${theme.colors.gold}`, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: theme.fonts.heading, fontSize: '12px', fontWeight: 600,
                              color: theme.colors.textPrimary,
                            }}>{inv.sender.username}</div>
                            <div style={{ fontFamily: theme.fonts.mono, fontSize: '10px', color: theme.colors.goldDim }}>
                              wants to fight!
                            </div>
                          </div>
                          <span style={{
                            fontFamily: theme.fonts.mono, fontSize: '16px', fontWeight: 700,
                            color: remaining <= 10 ? theme.colors.dead : theme.colors.gold,
                            transition: 'color 0.3s', minWidth: '32px', textAlign: 'right',
                          }}>{remaining}s</span>
                        </div>

                        {/* Progress bar */}
                        <div style={{
                          width: '100%', height: '2px', background: theme.colors.bgDark,
                          borderRadius: '1px', overflow: 'hidden', marginBottom: '8px',
                        }}>
                          <div style={{
                            height: '100%', width: `${progressPct}%`,
                            background: remaining <= 10 ? theme.colors.dead : theme.colors.gold,
                            transition: 'width 1s linear, background 0.3s',
                          }} />
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleAcceptInvite(inv)} style={{
                            flex: 1, padding: '6px', border: 'none', borderRadius: '3px',
                            background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
                            color: theme.colors.bgDark, fontFamily: theme.fonts.heading,
                            fontSize: '10px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer',
                          }}>ACCEPT</button>
                          <button onClick={() => handleRejectInvite(inv)} style={{
                            flex: 1, padding: '6px', border: `1px solid ${theme.colors.border}`,
                            borderRadius: '3px', background: 'transparent',
                            color: theme.colors.textMuted, fontFamily: theme.fonts.heading,
                            fontSize: '10px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer',
                          }}>DECLINE</button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ height: 1, background: theme.colors.border, margin: '4px 16px' }} />
                </>
              )}

              {/* ── FRIEND REQUESTS: Received ── */}
              <div style={{ padding: '8px 16px 4px' }}>
                <span style={{ fontFamily: theme.fonts.heading, fontSize: '10px', color: theme.colors.textMuted, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  Friend Requests — Received ({receivedCount})
                </span>
              </div>
              {(!requests?.received || requests.received.length === 0) ? (
                <div style={{ padding: '12px 16px', fontSize: '11px', color: theme.colors.textMuted }}>None</div>
              ) : (
                requests.received.map((r) => (
                  <div key={`freq-${r.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 16px', borderBottom: `1px solid rgba(200,170,100,0.06)`,
                  }}>
                    <img src={r.friend.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${r.friend.username}`}
                      alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${theme.colors.border}`, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textPrimary }}>{r.friend.username}</span>
                    </div>
                    <button onClick={() => handleAcceptFriend(r.friend.id)} style={{
                      padding: '4px 10px', background: theme.colors.hpHigh, border: 'none',
                      borderRadius: '2px', color: theme.colors.bgDark, fontFamily: theme.fonts.heading,
                      fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                    }}>OK</button>
                    <button onClick={() => handleRejectFriend(r.friend.id)} style={{
                      padding: '4px 8px', background: 'none', border: `1px solid ${theme.colors.dead}`,
                      borderRadius: '2px', color: theme.colors.dead, fontFamily: theme.fonts.heading,
                      fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                    }}>
                      <Icons.X size={10} />
                    </button>
                  </div>
                ))
              )}

              {/* Divider */}
              <div style={{ height: 1, background: theme.colors.border, margin: '8px 16px' }} />

              {/* ── FRIEND REQUESTS: Sent ── */}
              <div style={{ padding: '8px 16px 4px' }}>
                <span style={{ fontFamily: theme.fonts.heading, fontSize: '10px', color: theme.colors.textMuted, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  Friend Requests — Sent ({requests?.sent?.length || 0})
                </span>
              </div>
              {(!requests?.sent || requests.sent.length === 0) ? (
                <div style={{ padding: '12px 16px', fontSize: '11px', color: theme.colors.textMuted }}>None</div>
              ) : (
                requests.sent.map((r) => (
                  <div key={`fsent-${r.id}`} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 16px', borderBottom: `1px solid rgba(200,170,100,0.06)`,
                  }}>
                    <img src={r.friend.avatarUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${r.friend.username}`}
                      alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${theme.colors.border}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: theme.fonts.heading, fontSize: '12px', color: theme.colors.textPrimary }}>{r.friend.username}</span>
                    <span style={{ fontSize: '9px', color: theme.colors.hpMid, fontFamily: theme.fonts.heading, letterSpacing: '0.5px' }}>PENDING</span>
                    <button onClick={() => handleRemove(r.friend.id)} style={{
                      background: 'none', border: 'none', color: theme.colors.textMuted,
                      cursor: 'pointer', padding: '2px', display: 'flex',
                    }}>
                      <Icons.X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══ ADD TAB ═══ */}
          {!loading && tab === 'add' && (
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: '11px', color: theme.colors.textSecondary, marginBottom: '12px', lineHeight: 1.6 }}>
                Enter a player's numeric ID to send a friend request. You can find IDs on the leaderboard or after a match.
              </p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Type an Username"
                  value={addUser}
                  onChange={(e) => setAddUser(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                  style={{
                    flex: 1, padding: '8px 12px', background: theme.colors.bgDark,
                    border: `1px solid ${theme.colors.border}`, borderRadius: '2px',
                    color: theme.colors.textPrimary, fontFamily: theme.fonts.mono,
                    fontSize: '13px', outline: 'none',
                  }}
                />
                <button onClick={handleAddFriend} style={{
                  padding: '0 16px', background: `linear-gradient(180deg, ${theme.colors.gold}, ${theme.colors.goldDark})`,
                  border: 'none', borderRadius: '2px', color: theme.colors.bgDark,
                  fontFamily: theme.fonts.heading, fontSize: '10px', fontWeight: 700,
                  letterSpacing: '1px', cursor: 'pointer',
                }}>SEND</button>
              </div>
              {addMsg && <div style={{ color: theme.colors.hpHigh, fontSize: '11px', textAlign: 'center', marginBottom: '8px' }}>{addMsg}</div>}
              {addError && <div style={{ color: theme.colors.dead, fontSize: '11px', textAlign: 'center', marginBottom: '8px' }}>{addError}</div>}

              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(200,170,100,0.04)', borderRadius: '4px', border: `1px solid ${theme.colors.border}` }}>
                <p style={{ fontSize: '10px', color: theme.colors.textMuted, lineHeight: 1.5 }}>
                  Your Username is visible on your profile page. Share it with friends so they can add you too!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}