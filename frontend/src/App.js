import React, { useState, useRef, useEffect } from 'react';
import Login from './Login';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_URL        = `${API_BASE}/chat`;
const HEALTH_URL     = `${API_BASE}/health`;
const ANALYTICS_URL  = `${API_BASE}/analytics`;
const LIVE_PRICE_URL = `${API_BASE}/live-prices`;
const INSIGHTS_URL        = `${API_BASE}/insights`;
const INSIGHTS_QUERY_URL  = `${API_BASE}/insights-query`;

let chatIdCounter = 1;
const newChatObject = (title = 'New Chat') => ({
  id: chatIdCounter++,
  title,
  messages: [],
  sessionId: null,
  createdAt: Date.now(),
});

// ─── Per-user localStorage persistence ───────────────────────────────────────
const STORAGE_KEY = (email) => `tourist_buddy_chats_${email}`;

const saveChats = (email, chats) => {
  try {
    const toSave = chats.filter(c => c.messages.length > 0);
    localStorage.setItem(STORAGE_KEY(email), JSON.stringify(toSave));
  } catch {}
};

const loadChats = (email) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map(c => ({ ...c, id: chatIdCounter++ }));
  } catch { return null; }
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const [currentUser, setCurrentUser]             = useState(null);
  const [chats, setChats]                         = useState([newChatObject('New Chat')]);
  const [activeChatId, setActiveChatId]           = useState(chats[0].id);
  const [inputValue, setInputValue]               = useState('');
  const [isTyping, setIsTyping]                   = useState(false);
  const [livePriceData, setLivePriceData]         = useState(null);
  const [showPriceWidget, setShowPriceWidget]     = useState(false);
  const [connectionStatus, setConnectionStatus]   = useState('checking');
  const [searchQuery, setSearchQuery]             = useState('');
  const [showProfileMenu, setShowProfileMenu]     = useState(false);
  const [hoveredChatId, setHoveredChatId]         = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false);
  const [insightsData, setInsightsData]           = useState(null);
  const [showInsights, setShowInsights]           = useState(false);
  const [insightsChat, setInsightsChat]           = useState([]);
  const [insightsInput, setInsightsInput]         = useState('');
  const [insightsQuerying, setInsightsQuerying]   = useState(false);
  const [showInsightsLeft, setShowInsightsLeft]   = useState(true);
  const messagesEndRef = useRef(null);
  const profileMenuRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const messages   = activeChat?.messages || [];
  const isChat     = messages.length > 0;

  const defaultPrompts = [
    'Find best tourist attractions nearby',
    'Recommend local restaurants and cuisine',
    'Plan a day trip itinerary',
    'Learn about local culture and history',
  ];

  // ── Auto-save chats whenever they change ─────────────────────────────────
  useEffect(() => {
    if (currentUser?.email) saveChats(currentUser.email, chats);
  }, [chats, currentUser]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Health check ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(HEALTH_URL);
        setConnectionStatus(r.ok ? 'connected' : 'error');
      } catch { setConnectionStatus('error'); }
    };
    check();
  }, []);

  // ── Live prices ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showPriceWidget) return;
    const fetch_ = async () => {
      try {
        const r = await fetch(LIVE_PRICE_URL);
        if (r.ok) setLivePriceData(await r.json());
      } catch {
        setLivePriceData({
          flights: [
            { route: 'DEL → GOA', price: '₹4,299', change: '-12%', trend: 'down' },
            { route: 'MUM → JAIPUR', price: '₹3,150', change: '+5%', trend: 'up' },
            { route: 'BLR → KERALA', price: '₹2,800', change: '-8%', trend: 'down' },
          ],
          hotels: [
            { name: 'Taj Mahal Palace', city: 'Mumbai', price: '₹18,000/night', availability: 'Low' },
            { name: 'Umaid Bhawan', city: 'Jodhpur', price: '₹32,500/night', availability: 'Available' },
          ],
          last_updated: new Date().toLocaleTimeString(),
        });
      }
    };
    fetch_();
    const iv = setInterval(fetch_, 30000);
    return () => clearInterval(iv);
  }, [showPriceWidget]);

  // ── Insights ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showInsights) return;
    const fetch_ = async () => {
      try {
        const r = await fetch(INSIGHTS_URL);
        if (r.ok) setInsightsData(await r.json());
      } catch {
        setInsightsData({
          poi_stats: [{ city: 'Jaipur', poi_count: 45 }, { city: 'Delhi', poi_count: 38 }],
          hotel_stats: [{ city: 'Jaipur', avg_rating: 4.8 }, { city: 'Udaipur', avg_rating: 4.7 }],
          trends: [{ category: 'Heritage', count: 120 }, { category: 'Religious', count: 85 }],
        });
      }
    };
    fetch_();
  }, [showInsights]);

  // ── Close profile menu on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target))
        setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Chat helpers ─────────────────────────────────────────────────────────
  const updateChat = (id, updater) =>
    setChats(prev => prev.map(c => c.id === id ? { ...c, ...updater(c) } : c));

  const deleteChat = (id, e) => {
    e.stopPropagation();
    
    // Use the current chats state instead of calculating completely inside the updater callback
    const remaining = chats.filter(c => c.id !== id);
    if (remaining.length === 0) {
      const nc = newChatObject('New Chat');
      setChats([nc]);
      setActiveChatId(nc.id);
    } else {
      setChats(remaining);
      if (id === activeChatId) setActiveChatId(remaining[0].id);
    }
  };

  const createNewChat = () => {
    const nc = newChatObject('New Chat');
    setChats(prev => [nc, ...prev]);
    setActiveChatId(nc.id);
    setInputValue('');
  };

  const getBotResponse = async (userMessage, sessionId) => {
    try {
      const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, session_id: sessionId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return { text: data.response, sessionId: data.session_id };
    } catch {
      return { text: "Sorry, I'm having trouble connecting. Please make sure the backend is running on http://localhost:8000", sessionId };
    }
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const userMsg  = { text, isUser: true };
    const chatSnap = activeChat;

    // If title is still "New Chat", use first message as title
    const newTitle = chatSnap.messages.length === 0 ? (text.slice(0, 40) + (text.length > 40 ? '…' : '')) : chatSnap.title;

    updateChat(chatSnap.id, c => ({
      title: newTitle,
      messages: [...c.messages, userMsg],
    }));
    setInputValue('');
    setIsTyping(true);

    const { text: botText, sessionId: newSid } = await getBotResponse(text, chatSnap.sessionId);
    setIsTyping(false);

    updateChat(chatSnap.id, c => ({
      sessionId: newSid || c.sessionId,
      messages: [...c.messages, { text: botText, isUser: false }],
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handlePromptClick = (prompt) => {
    setInputValue(prompt);
    setTimeout(sendMessage, 80);
  };

  // ── Format bot message ───────────────────────────────────────────────────
  const formatBotMessage = (text) => {
    if (!text) return text;
    const lines = text.split('\n');
    const els = lines.map((line, i) => {
      const t = line.trim();
      if (!t) return null;
      if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) {
        const content = t.replace(/^[-•*]\s*/, '');
        if (!content) return null;
        return (
          <div key={i} style={S.bulletPoint}>
            <span style={S.bullet}>•</span>
            <span style={S.bulletText}>{content}</span>
          </div>
        );
      }
      if (t.endsWith(':') || /^(Day \d+|Accommodation|Transportation|Budget|Tips?|Itinerary|Places|Restaurants|Hotels):/i.test(t))
        return <div key={i} style={S.sectionHeader}>{t}</div>;
      return (
        <div key={i} style={S.bulletPoint}>
          <span style={S.bullet}>•</span>
          <span style={S.bulletText}>{t}</span>
        </div>
      );
    }).filter(Boolean);
    return <div style={S.messageContentWrapper}>{els}</div>;
  };

  // ── Insights Q&A ──────────────────────────────────────────────────────────
  const insightsChatEndRef = useRef(null);
  useEffect(() => { insightsChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [insightsChat, insightsQuerying]);

  const sendInsightsQuery = async () => {
    const q = insightsInput.trim();
    if (!q) return;
    setInsightsChat(prev => [...prev, { role: 'user', text: q }]);
    setInsightsInput('');
    setInsightsQuerying(true);
    try {
      const r = await fetch(INSIGHTS_QUERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (r.ok) {
        const data = await r.json();
        setInsightsChat(prev => [...prev, { role: 'bot', text: data.answer }]);
      } else {
        setInsightsChat(prev => [...prev, { role: 'bot', text: 'Failed to get an answer. Please try again.' }]);
      }
    } catch {
      setInsightsChat(prev => [...prev, { role: 'bot', text: 'Connection error. Is the backend running?' }]);
    }
    setInsightsQuerying(false);
  };

  // ── Filtered chats for search (only show chats that have messages) ──────────
  const filteredChats = chats.filter(c =>
    c.messages.length > 0 &&
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by recency
  const now = Date.now();
  const todayChats   = filteredChats.filter(c => now - c.createdAt < 86400000);
  const olderChats   = filteredChats.filter(c => now - c.createdAt >= 86400000);

  // ── Avatar ───────────────────────────────────────────────────────────────
  const userInitial = currentUser?.name ? currentUser.name[0].toUpperCase() : 'U';
  const userName    = currentUser?.name || 'User';

  // ── Login gate ───────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLogin={(user) => {
      setCurrentUser(user);
      setSearchQuery('');
      // Restore saved chats for this user, or start fresh
      const saved = loadChats(user.email);
      if (saved && saved.length > 0) {
        setChats(saved);
        setActiveChatId(saved[0].id);
      } else {
        const nc = newChatObject('New Chat');
        setChats([nc]);
        setActiveChatId(nc.id);
      }
    }} />;
  }

  return (
    <div style={S.root}>
      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{ ...S.sidebar, width: sidebarCollapsed ? '0px' : '260px', overflow: sidebarCollapsed ? 'hidden' : 'visible' }}>
        <div style={S.sidebarInner}>
          {/* Brand row */}
          <div style={S.sidebarBrand}>
            <div style={S.sidebarLogo}>🗺</div>
            <span style={S.sidebarBrandName}>Tourist Buddy</span>
          </div>

          {/* New chat */}
          <button style={S.newChatBtn} onClick={createNewChat}>
            <span style={S.newChatIcon}>✏</span>
            New Chat
          </button>

          {/* Search */}
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              placeholder="Search chats..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Chat list */}
          <div style={S.chatList}>
            {todayChats.length > 0 && (
              <>
                <div style={S.chatGroupLabel}>Today</div>
                {todayChats.map(c => (
                  <div
                    key={c.id}
                    style={{
                      ...S.chatItem,
                      ...(c.id === activeChatId ? S.chatItemActive : {}),
                      ...(c.id === hoveredChatId ? S.chatItemHover : {}),
                    }}
                    onClick={() => setActiveChatId(c.id)}
                    onMouseEnter={() => setHoveredChatId(c.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                  >
                    <span style={S.chatItemIcon}>💬</span>
                    <span style={S.chatItemTitle}>{c.title}</span>
                    {(c.id === hoveredChatId || c.id === activeChatId) && (
                      <button
                        style={S.chatDeleteBtn}
                        onClick={(e) => deleteChat(c.id, e)}
                        title="Delete chat"
                      >🗑</button>
                    )}
                  </div>
                ))}
              </>
            )}
            {olderChats.length > 0 && (
              <>
                <div style={S.chatGroupLabel}>Previous</div>
                {olderChats.map(c => (
                  <div
                    key={c.id}
                    style={{
                      ...S.chatItem,
                      ...(c.id === activeChatId ? S.chatItemActive : {}),
                      ...(c.id === hoveredChatId ? S.chatItemHover : {}),
                    }}
                    onClick={() => setActiveChatId(c.id)}
                    onMouseEnter={() => setHoveredChatId(c.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                  >
                    <span style={S.chatItemIcon}>💬</span>
                    <span style={S.chatItemTitle}>{c.title}</span>
                    {(c.id === hoveredChatId || c.id === activeChatId) && (
                      <button
                        style={S.chatDeleteBtn}
                        onClick={(e) => deleteChat(c.id, e)}
                        title="Delete chat"
                      >🗑</button>
                    )}
                  </div>
                ))}
              </>
            )}
            {filteredChats.length === 0 && (
              <div style={S.emptyChatList}>No chats found</div>
            )}
          </div>

          {/* Bottom profile bar */}
          <div style={S.profileBar} ref={profileMenuRef}>
            {/* Profile menu popup */}
            {showProfileMenu && (
              <div style={S.profileMenu}>
                {/* User row at top */}
                <div style={S.profileMenuUser}>
                  <div style={S.profileMenuAvatar}>{userInitial}</div>
                  <div>
                    <div style={S.profileMenuName}>{userName}</div>
                    <div style={S.profileMenuEmail}>{currentUser?.email || ''}</div>
                  </div>
                </div>
                <div style={S.profileMenuDivider} />
                <button style={S.profileMenuItem} onClick={() => { setCurrentUser(null); setShowProfileMenu(false); }}>
                  <span style={S.profileMenuItemIcon}>＋</span> Add another account
                </button>
                <div style={S.profileMenuDivider} />
                <button style={S.profileMenuItem} onClick={() => setShowProfileMenu(false)}>
                  <span style={S.profileMenuItemIcon}>👤</span> Profile
                </button>
                <button style={{...S.profileMenuItem, ...S.profileMenuItemDanger}} onClick={() => { setCurrentUser(null); setShowProfileMenu(false); }}>
                  <span style={S.profileMenuItemIcon}>⎋</span> Log out
                </button>
              </div>
            )}

            {/* Clickable avatar */}
            <button style={S.profileAvatar} onClick={() => setShowProfileMenu(p => !p)} title={userName}>
              {userInitial}
            </button>
            <div style={S.profileInfo}>
              <span style={S.profileName}>{userName}</span>
              <span style={S.profileEmail}>{currentUser?.email || ''}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ──────────────────────────────────────────────────── */}
      <main style={S.main}>
        {/* Header */}
        <div style={S.header}>
          <button style={S.sidebarToggle} onClick={() => setSidebarCollapsed(p => !p)} title="Toggle sidebar">
            ☰
          </button>
          <div style={S.logo}>
            <div style={S.logoIcon}>🗺</div>
            Tourist Buddy
          </div>
          <div style={S.headerActions}>
            <button
              style={{ ...S.headerBtn, background: showPriceWidget ? '#00e676' : 'white', color: showPriceWidget ? 'white' : '#1a1a1a' }}
              onClick={() => setShowPriceWidget(p => !p)}
            >💸 Live Prices</button>
            <button
              style={{ ...S.headerBtn, background: showInsights ? '#ff9800' : 'white', color: showInsights ? 'white' : '#1a1a1a' }}
              onClick={() => { setShowInsights(p => !p); }}
            >📈 Insights</button>
            <div style={{ ...S.statusDot, background: connectionStatus === 'connected' ? '#00e676' : connectionStatus === 'error' ? '#f44336' : '#ffc107' }} title={`Backend: ${connectionStatus}`} />
          </div>
        </div>

        {/* Live prices panel */}
        {showPriceWidget && (
          <div style={S.widgetPanel}>
            <div style={S.widgetHeader}>
              <span>📡 Live Prices</span>
              <span style={S.widgetSubtitle}>Kafka → Real-time stream</span>
              <span style={S.widgetTime}>{livePriceData?.last_updated || '...'}</span>
            </div>
            <div style={S.widgetBody}>
              {livePriceData ? (
                <>
                  <div style={S.widgetSection}>
                    <div style={S.widgetSectionTitle}>✈️ Flights</div>
                    {livePriceData.flights?.map((f, i) => (
                      <div key={i} style={S.priceRow}>
                        <span style={S.priceRoute}>{f.route}</span>
                        <span style={S.priceAmt}>{f.price}</span>
                        <span style={{ ...S.priceChange, color: f.trend === 'down' ? '#00e676' : '#f44336' }}>{f.change}</span>
                      </div>
                    ))}
                  </div>
                  <div style={S.widgetSection}>
                    <div style={S.widgetSectionTitle}>🏨 Hotels</div>
                    {livePriceData.hotels?.map((h, i) => (
                      <div key={i} style={S.priceRow}>
                        <span style={S.priceRoute}>{h.name} · {h.city}</span>
                        <span style={S.priceAmt}>{h.price}</span>
                        <span style={{ ...S.priceChange, color: h.availability === 'Low' ? '#ffc107' : '#00e676' }}>{h.availability}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={S.widgetLoading}>Loading live data...</div>}
            </div>
          </div>
        )}



        {/* Insights full-page view OR Chat area */}
        <div style={S.chatArea}>
          {showInsights ? (
            /* Full-page Insights view */
            <div style={S.insightsPage}>
              {/* Top bar */}
              <div style={S.insightsTopBar}>
                <div style={S.insightsTopBarLeft}>
                  <span style={S.insightsTopBarIcon}>📈</span>
                  <div>
                    <div style={S.insightsTopBarTitle}>Insights & Trends</div>
                    <div style={S.insightsTopBarSub}>Powered by Apache Spark → HDFS Data Lake (7 Domains: Food, Hotels, Places, Cities, etc.)</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!showInsightsLeft && (
                    <button style={S.insightsCloseBtn} onClick={() => setShowInsightsLeft(true)}>📊 Show Charts</button>
                  )}
                  <button style={S.insightsCloseBtn} onClick={() => setShowInsights(false)}>× Close Page</button>
                </div>
              </div>
              {/* Split pane */}
              <div style={S.insightsSplitPane}>
                {/* LEFT: Data cards */}
                {showInsightsLeft && (
                <div style={S.insightsLeftPane}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
                    <button onClick={() => setShowInsightsLeft(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '18px' }}>×</button>
                  </div>
                  {insightsData ? (
                    <>
                      <div style={S.insightsSectionTitle}>📍 Top Destinations (Across 7 Tourism Domains)</div>
                      <div style={S.insightsDataCard}>
                        {insightsData.poi_stats?.slice(0, 6).map((s, i) => (
                          <div key={i} style={S.insightsBarRow}>
                            <span style={S.insightsBarLabel}>{s.city}</span>
                            <div style={S.insightsBarTrack}>
                              <div style={{
                                ...S.insightsBarFill,
                                width: `${Math.min(100, (s.poi_count / (insightsData.poi_stats[0]?.poi_count || 1)) * 100)}%`,
                                background: i % 2 === 0 ? 'linear-gradient(90deg,#ff9800,#ffb74d)' : 'linear-gradient(90deg,#667eea,#9c9eff)',
                              }} />
                            </div>
                            <span style={S.insightsBarVal}>{s.poi_count}</span>
                          </div>
                        ))}
                      </div>

                      <div style={S.insightsSectionTitle}>⭐ Accommodation & Hospitality Ratings</div>
                      <div style={S.insightsDataCard}>
                        {insightsData.hotel_stats?.map((s, i) => (
                          <div key={i} style={S.insightsHotelRow}>
                            <span style={S.insightsBarLabel}>{s.city}</span>
                            <div style={S.insightsStars}>
                              {'\u2605'.repeat(Math.round(s.avg_rating || 0)).padEnd(5,'\u2606')}
                            </div>
                            <span style={S.insightsRating}>{s.avg_rating?.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={S.insightsSectionTitle}>🔥 Trending Categories</div>
                      <div style={S.insightsTags}>
                        {insightsData.trends?.map((s, i) => (
                          <div key={i} style={{ ...S.insightsTrendTag, opacity: 1 - i * 0.1 }}>
                            {s.category || s.TYPE || 'Other'}
                            <span style={S.insightsTrendCount}>{s.count}</span>
                          </div>
                        ))}
                      </div>

                      {insightsData.last_updated && (
                        <div style={S.insightsTimestamp}>⏰ Last processed: {insightsData.last_updated}</div>
                      )}
                    </>
                  ) : (
                    <div style={S.insightsLoading}>
                      <div style={S.insightsSpinner} />
                      Loading data from HDFS...
                    </div>
                  )}
                </div>
                )}

                {/* RIGHT: Q&A Chat */}
                <div style={showInsightsLeft ? S.insightsRightPane : { ...S.insightsRightPane, flex: 1, borderLeft: 'none' }}>
                  <div style={S.insightsQAHeader}>
                    <span>🧠 Ask the Data</span>
                    <span style={S.insightsQAHeaderSub}>Query your Spark Parquet lake in plain English</span>
                  </div>
                  {insightsChat.length === 0 && (
                    <div style={S.insightsPromptChips}>
                      {['Which city has the most attractions?',
                        'What is the best rated hotel city?',
                        'What are the top trending categories?',
                        'Compare Jaipur vs Delhi tourism data'].map((q, i) => (
                        <div key={i} style={S.insightsChip} onClick={() => { setInsightsInput(q); }}>{q}</div>
                      ))}
                    </div>
                  )}
                  <div style={S.insightsMessages}>
                    {insightsChat.map((m, i) => (
                      <div key={i} style={m.role === 'user' ? S.insightsUserMsg : S.insightsBotMsg}>
                        <div style={m.role === 'user' ? S.insightsUserBubble : S.insightsBotBubble}>
                          {m.role === 'bot' ? formatBotMessage(m.text) : m.text}
                        </div>
                      </div>
                    ))}
                    {insightsQuerying && (
                      <div style={S.insightsBotMsg}>
                        <div style={{ ...S.insightsBotBubble, fontStyle: 'italic', opacity: 0.6 }}>Querying Spark data lake...</div>
                      </div>
                    )}
                    <div ref={insightsChatEndRef} />
                  </div>
                  <div style={S.insightsInputRow}>
                    <input
                      style={S.insightsInput}
                      placeholder="Ask anything about the tourism data..."
                      value={insightsInput}
                      onChange={e => setInsightsInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendInsightsQuery())}
                    />
                    <button style={S.insightsSendBtn} onClick={sendInsightsQuery} disabled={insightsQuerying}>
                      {insightsQuerying ? '⧗' : '↑'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !isChat ? (
            /* Welcome screen */
            <div style={S.mainContent}>
              <h1 style={S.greetingTitle}>Hello, {userName.split(' ')[0]} 👋</h1>
              <h2 style={S.greetingSubtitle}>How can I help you today?</h2>
              <p style={S.description}>
                Choose a prompt below or write your own to start chatting with Tourist Buddy
              </p>
              <div style={S.promptsGrid}>
                {defaultPrompts.map((prompt, idx) => (
                  <div key={idx} style={S.promptCard} onClick={() => handlePromptClick(prompt)}>
                    {prompt}
                  </div>
                ))}
              </div>
              <div style={S.inputWrapper}>
                <div style={S.inputContainer}>
                  <input type="text" style={S.mainInput} placeholder="How can Tourist Buddy help you today?" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyPress} />
                  <div style={S.inputActions}><button style={S.sendButton} onClick={sendMessage}>↑</button></div>
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div style={S.chatView}>
              <div style={S.messagesArea}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ ...S.message, ...(msg.isUser ? S.messageUser : {}) }}>
                    <div style={{ ...S.messageAvatar, ...(msg.isUser ? S.messageAvatarUser : S.messageAvatarBot) }}>
                      {msg.isUser ? userInitial : '🗺'}
                    </div>
                    <div style={{ ...S.messageBubble, ...(msg.isUser ? S.messageBubbleUser : {}) }}>
                      {msg.isUser ? msg.text : <div style={S.botMessageContent}>{formatBotMessage(msg.text)}</div>}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={S.message}>
                    <div style={{ ...S.messageAvatar, ...S.messageAvatarBot }}>🗺</div>
                    <div style={{ ...S.messageBubble, fontStyle: 'italic', opacity: 0.6 }}>Typing...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={S.chatInputArea}>
                <div style={S.inputContainer}>
                  <input type="text" style={S.mainInput} placeholder="How can Tourist Buddy help you today?" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyPress} />
                  <div style={S.inputActions}><button style={S.sendButton} onClick={sendMessage}>↑</button></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    background: '#f5f5f5',
  },

  // Sidebar
  sidebar: {
    flexShrink: 0,
    height: '100vh',
    background: '#171717',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    position: 'relative',
    zIndex: 20,
  },
  sidebarInner: {
    width: '260px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 8px',
    overflow: 'hidden',
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px 16px',
  },
  sidebarLogo: {
    width: '28px',
    height: '28px',
    background: 'linear-gradient(135deg, #00e676, #69f0ae)',
    borderRadius: '7px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  sidebarBrandName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'background 0.15s',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  newChatIcon: { fontSize: '14px' },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '9px',
    padding: '8px 12px',
    marginBottom: '12px',
  },
  searchIcon: { fontSize: '12px', opacity: 0.5, flexShrink: 0 },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    width: '100%',
    fontFamily: 'inherit',
  },
  chatList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
  },
  chatGroupLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 10px 4px',
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.65)',
    fontSize: '13px',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  chatItemActive: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.95)',
  },
  chatItemHover: {
    background: 'rgba(255,255,255,0.05)',
  },
  chatDeleteBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    transition: 'color 0.2s',
  },
  chatItemIcon: { fontSize: '12px', flexShrink: 0, opacity: 0.5 },
  chatItemTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  emptyChatList: {
    padding: '20px 10px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '12px',
    textAlign: 'center',
  },

  // Profile bar at sidebar bottom
  profileBar: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 10px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    marginTop: 'auto',
    cursor: 'pointer',
  },
  profileAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00e676 0%, #00b248 100%)',
    color: '#0d1a0d',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,230,118,0.3)',
    fontFamily: 'inherit',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: 1,
  },
  profileName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // Profile popup menu
  profileMenu: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: '0',
    width: '240px',
    background: '#2a2a2a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    zIndex: 100,
  },
  profileMenuUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
  },
  profileMenuAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00e676, #00b248)',
    color: '#0d1a0d',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileMenuName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '13px',
    fontWeight: '600',
  },
  profileMenuEmail: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
  },
  profileMenuDivider: {
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    margin: '0',
  },
  profileMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '11px 16px',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  },
  profileMenuItemDanger: {
    color: '#ef9a9a',
  },
  profileMenuItemIcon: {
    fontSize: '14px',
    width: '18px',
    textAlign: 'center',
    flexShrink: 0,
  },

  // Main area
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'linear-gradient(to bottom, #e8f5e9 0%, #f1f8f4 50%, #f5f5f5 100%)',
  },
  header: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
  },
  sidebarToggle: {
    background: 'none',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#555',
    flexShrink: 0,
    transition: 'background 0.15s',
    fontFamily: 'inherit',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
  },
  logoIcon: {
    width: '28px', height: '28px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px',
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerBtn: {
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  statusDot: {
    width: '10px', height: '10px',
    borderRadius: '50%',
    marginLeft: '4px',
    flexShrink: 0,
  },

  // Widgets
  widgetPanel: {
    margin: '0 20px 10px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  widgetHeader: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: 'white',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  widgetSubtitle: { opacity: 0.6, fontSize: '11px', fontWeight: '400', marginLeft: '4px' },
  widgetTime: { marginLeft: 'auto', opacity: 0.6, fontSize: '11px', fontFamily: 'monospace' },
  widgetBody: { padding: '12px 16px', display: 'flex', gap: '24px' },
  widgetSection: { flex: 1 },
  widgetSectionTitle: { fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px' },
  priceRoute: { flex: 1, color: '#333' },
  priceAmt: { fontWeight: '600', color: '#1a1a1a' },
  priceChange: { fontSize: '11px', fontWeight: '600', minWidth: '36px', textAlign: 'right' },
  widgetLoading: { padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' },
  analyticsPanel: {
    margin: '0 20px 10px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  analyticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#f0f0f0' },
  analyticsCard: { background: 'white', padding: '14px 16px' },
  analyticsLabel: { fontSize: '11px', color: '#888', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' },
  analyticsValue: { fontSize: '22px', fontWeight: '700', color: '#667eea' },
  tagsList: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  tag: { background: '#f0f4ff', color: '#667eea', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
  insightsList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' },
  insightRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px', color: '#333' },
  insightRowTiny: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px', color: '#555' },
  insightVal: { fontWeight: '600', color: '#ff9800' },

  // Full-page Insights view — matches light app theme
  insightsPage: {
    display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    background: 'linear-gradient(to bottom, #e8f5e9 0%, #f1f8f4 50%, #f5f5f5 100%)',
  },
  insightsTopBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    flexShrink: 0,
  },
  insightsTopBarLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  insightsTopBarIcon: { fontSize: '22px' },
  insightsTopBarTitle: { color: '#1a1a1a', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.2px' },
  insightsTopBarSub: { color: '#888', fontSize: '11px', marginTop: '2px' },
  insightsCloseBtn: {
    background: 'none', border: '1px solid #e0e0e0',
    color: '#555', borderRadius: '10px', padding: '7px 16px',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  insightsSplitPane: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  insightsLeftPane: {
    width: '42%', flexShrink: 0, overflowY: 'auto',
    padding: '20px', borderRight: '1px solid #e5e5e5',
    display: 'flex', flexDirection: 'column', gap: '16px',
    background: 'white',
  },
  insightsSectionTitle: {
    color: '#888', fontSize: '11px', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px',
  },
  insightsDataCard: {
    background: '#f9fafb', borderRadius: '14px',
    padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
    border: '1px solid #e8f5e9',
  },
  insightsBarRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  insightsBarLabel: { color: '#333', fontSize: '13px', fontWeight: '500', width: '70px', flexShrink: 0 },
  insightsBarTrack: { flex: 1, background: '#e8f5e9', borderRadius: '20px', height: '8px', overflow: 'hidden' },
  insightsBarFill: { height: '100%', borderRadius: '20px', transition: 'width 0.5s ease' },
  insightsBarVal: { color: '#00b248', fontWeight: '700', fontSize: '13px', width: '28px', textAlign: 'right' },
  insightsHotelRow: { display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' },
  insightsStars: { flex: 1, color: '#f59e0b', fontSize: '14px', letterSpacing: '2px' },
  insightsRating: { color: '#00b248', fontWeight: '700', fontSize: '14px' },
  insightsTags: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  insightsTrendTag: {
    background: '#e8f5e9', border: '1px solid #c8e6c9',
    borderRadius: '20px', padding: '5px 12px', color: '#1a6b3a',
    fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '7px',
  },
  insightsTrendCount: {
    background: '#00e676', color: '#0d1a0d', borderRadius: '10px',
    padding: '1px 7px', fontSize: '11px', fontWeight: '700',
  },
  insightsTimestamp: { color: '#aaa', fontSize: '10px', textAlign: 'right', marginTop: 'auto', paddingTop: '8px' },
  insightsLoading: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '16px', color: '#999', fontSize: '14px',
  },
  insightsSpinner: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '3px solid #e8f5e9', borderTop: '3px solid #00e676',
  },
  // Right Q&A pane — matches chat view style
  insightsRightPane: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    background: 'linear-gradient(to bottom, #e8f5e9 0%, #f1f8f4 50%, #f5f5f5 100%)',
  },
  insightsQAHeader: {
    padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0,
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
  },
  insightsQAHeaderSub: { color: '#888', fontSize: '11px' },
  insightsQAHeaderTitle: { color: '#1a1a1a', fontSize: '15px', fontWeight: '600' },
  insightsPromptChips: {
    padding: '16px 20px 0', display: 'flex', flexWrap: 'wrap', gap: '8px', flexShrink: 0,
  },
  insightsChip: {
    background: 'white', border: '1px solid #e5e5e5',
    color: '#444', borderRadius: '20px', padding: '7px 14px',
    fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  insightsMessages: {
    flex: 1, overflowY: 'auto', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '20px',
  },
  insightsUserMsg: { display: 'flex', justifyContent: 'flex-end', maxWidth: '75%', alignSelf: 'flex-end' },
  insightsBotMsg: { display: 'flex', justifyContent: 'flex-start', maxWidth: '75%', alignSelf: 'flex-start' },
  insightsUserBubble: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white', borderRadius: '16px 16px 4px 16px',
    padding: '12px 16px', fontSize: '15px', fontWeight: '500',
    boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
  },
  insightsBotBubble: {
    background: 'white', border: '1px solid #e5e5e5',
    color: '#1a1a1a', borderRadius: '16px 16px 16px 4px',
    padding: '14px 18px', fontSize: '15px', lineHeight: '1.6',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  insightsInputRow: {
    padding: '16px 20px', borderTop: '1px solid #e5e5e5',
    display: 'flex', gap: '10px', flexShrink: 0,
    background: 'white', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
  },
  insightsInput: {
    flex: 1, background: 'white', border: '1px solid #e0e0e0',
    borderRadius: '16px', padding: '14px 16px', color: '#1a1a1a', fontSize: '15px',
    outline: 'none', fontFamily: 'inherit',
  },
  insightsSendBtn: {
    width: '44px', height: '44px', borderRadius: '50%', border: 'none',
    background: '#00e676', color: 'white',
    cursor: 'pointer', fontSize: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.2s', fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(0,230,118,0.35)',
  },

  // Chat area
  chatArea: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },

  // Welcome
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    maxWidth: '860px',
    margin: '0 auto',
    width: '100%',
  },
  greetingTitle: { fontSize: '30px', fontWeight: '600', color: '#1a1a1a', marginBottom: '6px', textAlign: 'center' },
  greetingSubtitle: { fontSize: '30px', fontWeight: '600', color: '#1a1a1a', marginBottom: '14px', textAlign: 'center' },
  description: { fontSize: '14px', color: '#666', textAlign: 'center', lineHeight: '1.5', marginBottom: '32px' },
  promptsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', width: '100%', maxWidth: '800px', marginBottom: '28px' },
  promptCard: {
    background: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '18px 16px',
    fontSize: '13px',
    color: '#1a1a1a',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    lineHeight: '1.4',
  },
  inputWrapper: { width: '100%', maxWidth: '800px' },
  inputContainer: {
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '16px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
  },
  mainInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#1a1a1a', fontFamily: 'inherit', background: 'none' },
  inputActions: { display: 'flex', gap: '4px', alignItems: 'center' },
  sendButton: {
    width: '36px', height: '36px',
    border: 'none',
    background: '#00e676',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    fontFamily: 'inherit',
  },

  // Chat view
  chatView: { display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '860px', margin: '0 auto', width: '100%' },
  messagesArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  message: { display: 'flex', gap: '12px', maxWidth: '75%', animation: 'slideIn 0.3s ease' },
  messageUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageAvatar: { width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
  messageAvatarBot: { background: 'linear-gradient(180deg, #00ff00 0%, #00e676 100%)', color: 'white' },
  messageAvatarUser: { background: '#1a1a1a', color: 'white', fontWeight: '500' },
  messageBubble: {
    background: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '16px',
    padding: '16px 18px',
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1a1a1a',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    maxWidth: '100%',
  },
  messageBubbleUser: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
  },
  botMessageContent: { display: 'flex', flexDirection: 'column', gap: '4px' },
  messageContentWrapper: { display: 'flex', flexDirection: 'column', gap: '4px' },
  bulletPoint: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '4px', paddingLeft: '2px', lineHeight: '1.5' },
  bullet: { color: '#00e676', fontSize: '16px', fontWeight: 'bold', flexShrink: 0, marginTop: '3px', lineHeight: '1.2' },
  bulletText: { flex: 1, lineHeight: '1.5', color: '#1a1a1a', fontSize: '15px', wordBreak: 'break-word' },
  sectionHeader: { fontWeight: '600', fontSize: '16px', color: '#667eea', marginTop: '16px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #e8f5e9' },
  chatInputArea: { padding: '16px 20px', borderTop: '1px solid #e5e5e5', background: 'white', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' },
};

export default App;
