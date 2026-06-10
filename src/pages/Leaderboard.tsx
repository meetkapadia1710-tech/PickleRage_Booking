import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { Booking } from '../types';
import AppHeader from '../components/AppHeader';
import Avatar from '../components/Avatar';

// ─── types & constants ────────────────────────────────────────────────────────

interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

interface PlayerRank extends AppUser {
  rank: number;
  bookingsCount: number;
  hoursPlayed: number;
  lastPlayed: string | null; // most recent past/today booking date
  nextGame: string | null;   // soonest upcoming booking date
}

type Period = 'all' | 'month' | 'week';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'week', label: 'This Week' },
];

const MEDAL_COLORS: Record<number, string> = {
  1: '#ffbf00',
  2: '#cbd5dd',
  3: '#d68a52',
};

function tierOf(count: number): { label: string; icon: string; className: string } {
  if (count >= 10) return { label: 'Champion', icon: 'military_tech', className: 'bg-secondary-container/25 text-secondary' };
  if (count >= 5) return { label: 'Pro', icon: 'workspace_premium', className: 'bg-primary/10 text-primary' };
  if (count >= 2) return { label: 'Rising Star', icon: 'trending_up', className: 'bg-tertiary-container/10 text-tertiary-container' };
  return { label: 'Rookie', icon: 'sports_tennis', className: 'bg-surface-container-high text-on-surface-variant' };
}

// ─── date helpers ─────────────────────────────────────────────────────────────

function localISO(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function periodStart(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - (period === 'week' ? 6 : 29));
  return localISO(d);
}

function durationHours(b: Booking): number {
  const sh = parseInt(b.startTime?.split(':')[0] ?? '', 10);
  const eh = parseInt(b.endTime?.split(':')[0] ?? '', 10);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return 1;
  return Math.max(1, eh - sh);
}

function activityLabel(p: Pick<PlayerRank, 'lastPlayed' | 'nextGame'>): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (p.nextGame) {
    const next = new Date(`${p.nextGame}T00:00:00`);
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (diff === 1) return 'Plays tomorrow';
    return `Next game ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  if (p.lastPlayed) {
    const last = new Date(`${p.lastPlayed}T00:00:00`);
    const diff = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (diff === 0) return 'Playing today';
    if (diff === 1) return 'Played yesterday';
    if (diff < 7) return `Played ${diff}d ago`;
    return `Played ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return null;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('all');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'bookings'), where('status', '==', 'confirmed'))),
    ])
      .then(([usersSnap, bookingsSnap]) => {
        if (cancelled) return;

        const usersList: AppUser[] = usersSnap.docs.map(d => {
          const data = d.data();
          return {
            uid: data.uid || d.id,
            displayName: data.displayName || 'Anonymous Player',
            photoURL: data.photoURL || '',
            email: data.email || '',
          };
        });

        // Make sure the signed-in user appears even if their profile doc is missing.
        if (currentUser && !usersList.some(u => u.uid === currentUser.uid)) {
          usersList.push({
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'You',
            photoURL: currentUser.photoURL || '',
            email: currentUser.email || '',
          });
        }

        setUsers(usersList);
        setBookings(bookingsSnap.docs.map(d => d.data() as Booking));
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Error fetching leaderboard data:', err);
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentUser, reloadKey]);

  const retryFetch = () => {
    setLoading(true);
    setError(false);
    setReloadKey(k => k + 1);
  };

  const { ranked, inactive, totals } = useMemo(() => {
    const start = periodStart(period);
    const todayIso = localISO(new Date());

    const stats = new Map<string, { count: number; hours: number; lastPlayed: string | null; nextGame: string | null }>();
    let totalBookings = 0;
    let totalHours = 0;

    for (const b of bookings) {
      if (!b.userId || !b.date) continue;
      if (start && b.date < start) continue;
      const s = stats.get(b.userId) ?? { count: 0, hours: 0, lastPlayed: null, nextGame: null };
      const hours = durationHours(b);
      s.count += 1;
      s.hours += hours;
      if (b.date <= todayIso) {
        if (!s.lastPlayed || b.date > s.lastPlayed) s.lastPlayed = b.date;
      } else {
        if (!s.nextGame || b.date < s.nextGame) s.nextGame = b.date;
      }
      stats.set(b.userId, s);
      totalBookings += 1;
      totalHours += hours;
    }

    const players = users.map(u => {
      const s = stats.get(u.uid) ?? { count: 0, hours: 0, lastPlayed: null, nextGame: null };
      return {
        ...u,
        rank: 0,
        bookingsCount: s.count,
        hoursPlayed: s.hours,
        lastPlayed: s.lastPlayed,
        nextGame: s.nextGame,
      };
    });

    const active = players
      .filter(p => p.bookingsCount > 0)
      .sort(
        (a, b) =>
          b.bookingsCount - a.bookingsCount ||
          b.hoursPlayed - a.hoursPlayed ||
          (b.lastPlayed ?? '').localeCompare(a.lastPlayed ?? '') ||
          a.displayName.localeCompare(b.displayName)
      )
      .map((p, i): PlayerRank => ({ ...p, rank: i + 1 }));

    return {
      ranked: active,
      inactive: players.filter(p => p.bookingsCount === 0),
      totals: { players: active.length, bookings: totalBookings, hours: totalHours },
    };
  }, [users, bookings, period]);

  const me = currentUser ? ranked.find(p => p.uid === currentUser.uid) ?? null : null;
  const topThree = ranked.slice(0, 3);
  const remainingPlayers = ranked.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background text-on-background min-h-screen pb-24 md:pb-6 antialiased font-sans flex flex-col"
    >
      <AppHeader />

      <main className="px-5 max-w-3xl mx-auto mt-6 flex flex-col gap-5 w-full">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-bold text-[28px] md:text-[30px] text-primary mb-1">Leaderboard</h1>
            <p className="text-[14px] text-on-surface-variant">See who rules the courts at PlayHub.</p>
          </div>

          {/* Period segmented control */}
          <div className="flex bg-surface-container-low rounded-full p-1 border border-surface-variant/40 self-start">
            {PERIODS.map(p => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className="relative px-4 py-1.5 rounded-full font-semibold text-[13px] cursor-pointer outline-none select-none"
                >
                  {active && (
                    <motion.div
                      layoutId="period-pill"
                      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                      className="absolute inset-0 bg-primary rounded-full"
                    />
                  )}
                  <span className={`relative z-10 transition-colors duration-200 ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="bg-surface-container-lowest rounded-[20px] p-8 text-center border border-outline-variant/20 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-error">cloud_off</span>
            <p className="text-on-surface font-semibold">Couldn't load the leaderboard</p>
            <p className="text-[13px] text-on-surface-variant">Check your connection and try again.</p>
            <button
              onClick={retryFetch}
              className="mt-1 px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-[14px] cursor-pointer hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant border border-dashed border-outline-variant/30">
            No players registered yet.
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-5"
            >
              {/* Community stats */}
              <section className="grid grid-cols-3 gap-3">
                <StatCard icon="group" value={totals.players} label="Active Players" />
                <StatCard icon="event_available" value={totals.bookings} label="Bookings" />
                <StatCard icon="timer" value={`${totals.hours}h`} label="Court Hours" />
              </section>

              {/* Your standing */}
              {currentUser && (me ? <MyStandingCard player={me} /> : <JoinBoardCard onBook={() => navigate('/home')} />)}

              {ranked.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-[20px] p-8 text-center border border-dashed border-outline-variant/30 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[40px] text-outline">scoreboard</span>
                  <p className="text-on-surface font-semibold">No games {period === 'all' ? 'yet' : PERIODS.find(p => p.id === period)?.label.toLowerCase()}</p>
                  <p className="text-[13px] text-on-surface-variant">Book a slot and claim the top spot.</p>
                </div>
              ) : (
                <>
                  {/* Top 3 Podium */}
                  <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-primary via-[#00291f] to-[#001a14] p-6 pt-7 shadow-[0_16px_40px_rgba(0,52,43,0.30)]">
                    {/* decorative glow */}
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-16 w-56 h-56 rounded-full bg-tertiary-container/20 blur-3xl pointer-events-none" />

                    <h2 className="relative font-bold text-[18px] text-white mb-6 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
                      Top Performers
                    </h2>

                    <div className="relative flex items-end justify-center w-full max-w-md mx-auto gap-3">
                      {topThree[1] && <PodiumItem player={topThree[1]} currentUid={currentUser?.uid} heightClass="h-24" />}
                      {topThree[0] && <PodiumItem player={topThree[0]} currentUid={currentUser?.uid} heightClass="h-32" />}
                      {topThree[2] && <PodiumItem player={topThree[2]} currentUid={currentUser?.uid} heightClass="h-20" />}
                    </div>
                  </section>

                  {/* Ranks 4+ */}
                  {remainingPlayers.length > 0 && (
                    <section className="flex flex-col gap-3">
                      <h3 className="font-semibold text-[16px] text-on-surface-variant px-1">Other Ranks</h3>
                      <div className="flex flex-col gap-2">
                        {remainingPlayers.map((player, index) => (
                          <RankRow key={player.uid} player={player} index={index} isMe={player.uid === currentUser?.uid} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Players without bookings in this period */}
              {inactive.length > 0 && (
                <section className="bg-surface-container-lowest rounded-2xl px-4 py-3.5 border border-outline-variant/10 flex items-center gap-3">
                  <div className="flex -space-x-2 shrink-0">
                    {inactive.slice(0, 5).map(p => (
                      <Avatar key={p.uid} name={p.displayName} photoURL={p.photoURL} size={32} className="ring-2 ring-surface-container-lowest" />
                    ))}
                  </div>
                  <p className="text-[13px] text-on-surface-variant leading-snug">
                    <span className="font-semibold text-on-surface">{inactive.length} player{inactive.length > 1 ? 's' : ''}</span>{' '}
                    waiting for their first booking{period !== 'all' ? ' this period' : ''}.
                  </p>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </motion.div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl px-3 py-4 flex flex-col items-center gap-1 border border-outline-variant/10 shadow-sm">
      <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
      <span className="font-extrabold text-[20px] text-on-surface leading-none">{value}</span>
      <span className="text-[11px] text-on-surface-variant font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

function MyStandingCard({ player }: { player: PlayerRank }) {
  const tier = tierOf(player.bookingsCount);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-primary to-[#00574a] p-5 text-white shadow-[0_12px_28px_rgba(0,52,43,0.25)]"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-secondary-container/15 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar name={player.displayName} photoURL={player.photoURL} size={56} className="ring-2 ring-secondary-container" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-secondary-container text-on-secondary-container font-bold text-[11px] px-2 py-px rounded-full shadow">
            #{player.rank}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-0.5">Your Standing</p>
          <p className="font-bold text-[17px] leading-tight truncate">{player.displayName}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 bg-white/15 px-2 py-0.5 rounded-full text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[13px]">{tier.icon}</span>
            {tier.label}
          </span>
        </div>
        <div className="flex gap-4 text-center shrink-0">
          <div>
            <p className="font-extrabold text-[22px] leading-none">{player.bookingsCount}</p>
            <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mt-1">Bookings</p>
          </div>
          <div>
            <p className="font-extrabold text-[22px] leading-none">{player.hoursPlayed}h</p>
            <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mt-1">On Court</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function JoinBoardCard({ onBook }: { onBook: () => void }) {
  return (
    <section className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-secondary">sports_score</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] text-on-surface leading-tight">You're not on the board yet</p>
        <p className="text-[13px] text-on-surface-variant mt-0.5">Book your first slot to start climbing.</p>
      </div>
      <button
        onClick={onBook}
        className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-semibold text-[13px] cursor-pointer hover:opacity-90 transition-opacity shrink-0"
      >
        Book Now
      </button>
    </section>
  );
}

function PodiumItem({ player, currentUid, heightClass }: { player: PlayerRank; currentUid?: string; heightClass: string }) {
  const medal = MEDAL_COLORS[player.rank] ?? '#cbd5dd';
  const isGold = player.rank === 1;
  const isMe = player.uid === currentUid;

  return (
    <div className="flex flex-col items-center w-24 relative">
      <div className="relative mb-1.5">
        {isGold && (
          <motion.div
            initial={{ y: -6, opacity: 0, rotate: -20 }}
            animate={{ y: 0, opacity: 1, rotate: -12 }}
            transition={{ delay: 0.3, type: 'spring', damping: 10 }}
            className="absolute -top-[18px] left-[20px] z-10"
            style={{ color: medal }}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
          </motion.div>
        )}
        <Avatar
          name={player.displayName}
          photoURL={player.photoURL}
          size={isGold ? 60 : 52}
          className="shadow-lg"
        />
        {/* ring color via wrapper since Tailwind can't take dynamic hex ring colors */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: `0 0 0 2.5px ${medal}` }} />
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shadow-sm text-primary"
          style={{ backgroundColor: medal }}
        >
          {player.rank}
        </div>
      </div>

      <p className="font-bold text-[13px] text-center text-white truncate w-full mb-0.5">
        {isMe ? 'You' : player.displayName.split(' ')[0]}
      </p>

      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 0.1 }}
        style={{ originY: 1 }}
        className={`w-full ${heightClass} rounded-t-2xl flex flex-col items-center justify-center gap-0.5 p-2 mt-2 border backdrop-blur-sm ${
          isGold ? 'bg-secondary-container/20 border-secondary-container/40' : 'bg-white/10 border-white/15'
        }`}
      >
        <span className={`font-extrabold text-[22px] leading-none ${isGold ? 'text-secondary-container' : 'text-white'}`}>
          {player.bookingsCount}
        </span>
        <span className="text-[9px] text-white/60 font-semibold uppercase tracking-wider">Bookings</span>
        <span className="text-[10px] text-white/80 font-medium">{player.hoursPlayed}h played</span>
      </motion.div>
    </div>
  );
}

function RankRow({ player, index, isMe }: { player: PlayerRank; index: number; isMe: boolean }) {
  const tier = tierOf(player.bookingsCount);
  const activity = activityLabel(player);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className={`rounded-2xl p-4 flex items-center gap-3 shadow-sm border ${
        isMe
          ? 'bg-secondary-container/10 border-secondary-container/50'
          : 'bg-surface-container-lowest border-outline-variant/10'
      }`}
    >
      <span className="font-bold text-[15px] text-on-surface-variant w-7 text-center shrink-0">{player.rank}</span>
      <Avatar name={player.displayName} photoURL={player.photoURL} size={40} className="border border-surface-variant/30" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] text-on-surface leading-snug truncate">
          {player.displayName}
          {isMe && (
            <span className="ml-2 align-middle inline-flex bg-secondary-container text-on-secondary-container text-[10px] font-bold px-1.5 py-px rounded-full">
              YOU
            </span>
          )}
        </p>
        <p className="text-[12px] text-on-surface-variant flex items-center gap-1.5 mt-0.5 truncate">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded-full font-semibold text-[10px] ${tier.className}`}>
            <span className="material-symbols-outlined text-[11px]">{tier.icon}</span>
            {tier.label}
          </span>
          {activity && <span className="truncate">{activity}</span>}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-[16px] text-primary leading-none">{player.bookingsCount}</p>
        <p className="text-[11px] text-on-surface-variant mt-1">{player.hoursPlayed}h on court</p>
      </div>
    </motion.div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Stats strip skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl h-[96px] border border-outline-variant/10" />
        ))}
      </div>
      {/* Standing card skeleton */}
      <div className="bg-surface-container-high rounded-[24px] h-[96px]" />
      {/* Podium skeleton */}
      <div className="bg-surface-container-lowest rounded-[28px] p-6 flex flex-col items-center border border-outline-variant/10">
        <div className="h-6 w-36 bg-surface-container-high rounded mb-8" />
        <div className="flex items-end justify-center w-full max-w-md gap-4 pt-4">
          {[28, 36, 24].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-surface-container-high" />
              <div className="h-4 w-16 bg-surface-container-high rounded" />
              <div className="w-24 bg-surface-container-low rounded-t-lg" style={{ height: h * 4 }} />
            </div>
          ))}
        </div>
      </div>
      {/* Rows skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/10">
            <div className="w-7 h-5 bg-surface-container-high rounded shrink-0" />
            <div className="w-10 h-10 rounded-full bg-surface-container-high shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-surface-container-high rounded w-1/2" />
              <div className="h-3 bg-surface-container-high rounded w-1/3" />
            </div>
            <div className="h-8 w-14 bg-surface-container-high rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
