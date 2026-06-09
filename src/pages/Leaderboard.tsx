import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Booking } from '../types';

interface PlayerRank {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  bookingsCount: number;
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        // 1. Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => doc.data());

        // 2. Fetch all confirmed bookings
        const bookingsQuery = query(collection(db, 'bookings'), where('status', '==', 'confirmed'));
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookingsList = bookingsSnap.docs.map(doc => doc.data() as Booking);

        // 3. Count bookings per user
        const countsMap: Record<string, number> = {};
        bookingsList.forEach((booking) => {
          if (booking.userId) {
            countsMap[booking.userId] = (countsMap[booking.userId] || 0) + 1;
          }
        });

        // 4. Map user details to ranking counts
        const ranks: PlayerRank[] = usersList.map((user: any) => ({
          uid: user.uid,
          displayName: user.displayName || 'Anonymous Player',
          photoURL: user.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqT7gT3w8VGrOXV49StH1nWex9b27L6YbXB8-fwKyxCnYtqSbu_HVJ3laXaP1YC_rpwAvXTAF1Cmos46SARzpMK8PRuDRgTey5nSnWECMaDo2YscrZ6UEtvpym-EnT4iTnWWFiGn2GsftfX7M9Nfv1BsijRCGHocSP2FTPvzHTueCkcDCGDTXzaIyum1lBAUmvw3ZTuildnKEeh010NeVfdhNg6WdzMlsG1NeeNEho3CR6VnQs0oJTvIDHnhdgpUm1eMb-6tg9FPw',
          email: user.email || '',
          bookingsCount: countsMap[user.uid] || 0,
        }));

        // 5. Sort by booking count descending
        ranks.sort((a, b) => b.bookingsCount - a.bookingsCount);
        setLeaderboard(ranks);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  // Partition top 3 from the rest
  const topThree = leaderboard.slice(0, 3);
  const remainingPlayers = leaderboard.slice(3);

  // Position podium items: [2nd, 1st, 3rd] for classic podium render
  const podiumList = [];
  if (topThree[1]) podiumList.push({ ...topThree[1], rank: 2 });
  if (topThree[0]) podiumList.push({ ...topThree[0], rank: 1 });
  if (topThree[2]) podiumList.push({ ...topThree[2], rank: 3 });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background text-on-background min-h-screen pb-24 md:pb-6 pt-[72px] antialiased font-sans"
    >
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-background flex justify-between items-center px-5 h-[48px] border-b border-surface-variant/20">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[24px]">sports_tennis</span>
          <span className="font-bold text-[24px]">PlayHub</span>
        </div>
        <button className="text-primary w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 duration-100 cursor-pointer">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="px-5 max-w-3xl mx-auto mt-6 flex flex-col gap-6">
        <div className="mb-2">
          <h1 className="font-bold text-[28px] md:text-[30px] text-primary mb-1">Leaderboard</h1>
          <p className="text-[14px] text-on-surface-variant">Top players based on slot bookings.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-[20px] p-8 text-center text-on-surface-variant border border-dashed border-outline-variant/30">
            No players registered yet.
          </div>
        ) : (
          <>
            {/* Top 3 Podium Rendering */}
            {topThree.length > 0 && (
              <section className="bg-surface-container-lowest rounded-[24px] p-6 shadow-[0_4px_16px_rgba(0,52,43,0.03)] flex flex-col items-center border border-outline-variant/10">
                <h2 className="font-bold text-[18px] text-primary mb-6 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary-container">emoji_events</span>
                  Top Performers
                </h2>

                <div className="flex items-end justify-center w-full max-w-md gap-4 pt-4">
                  {/* Render 2nd place if exists */}
                  {topThree[1] && (
                    <PodiumItem player={topThree[1]} rank={2} heightClass="h-28" colorClass="bg-outline-variant/20" borderClass="border-outline-variant/30" />
                  )}

                  {/* Render 1st place if exists */}
                  {topThree[0] && (
                    <PodiumItem player={topThree[0]} rank={1} heightClass="h-36" colorClass="bg-secondary-container/10" borderClass="border-secondary-container/30" isGold />
                  )}

                  {/* Render 3rd place if exists */}
                  {topThree[2] && (
                    <PodiumItem player={topThree[2]} rank={3} heightClass="h-24" colorClass="bg-orange-600/5" borderClass="border-orange-600/20" />
                  )}
                </div>
              </section>
            )}

            {/* Ranks 4+ List */}
            {remainingPlayers.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="font-semibold text-[16px] text-on-surface-variant px-1">Other Ranks</h3>
                <div className="flex flex-col gap-2">
                  {remainingPlayers.map((player, index) => (
                    <motion.div 
                      key={player.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-surface-container-lowest rounded-xl p-4 flex items-center justify-between shadow-sm border border-outline-variant/10"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[16px] text-on-surface-variant w-6 text-center">{index + 4}</span>
                        <img 
                          src={player.photoURL} 
                          alt={player.displayName} 
                          className="w-10 h-10 rounded-full object-cover shrink-0 bg-surface-container border border-surface-variant/30"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-semibold text-[15px] text-on-surface leading-snug">{player.displayName}</p>
                          <p className="text-[12px] text-on-surface-variant">{player.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[16px] text-primary">{player.bookingsCount}</span>
                        <span className="text-[12px] text-on-surface-variant">bookings</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </motion.div>
  );
}

function PodiumItem({ 
  player, 
  rank, 
  heightClass, 
  colorClass, 
  borderClass, 
  isGold = false 
}: { 
  player: PlayerRank; 
  rank: number; 
  heightClass: string; 
  colorClass: string; 
  borderClass: string; 
  isGold?: boolean; 
}) {
  return (
    <div className="flex flex-col items-center flex-1 max-w-[110px]">
      <div className="relative mb-2">
        {isGold && (
          <span className="material-symbols-outlined text-[28px] text-secondary-container absolute top-[-20px] left-1/2 transform -translate-x-1/2 drop-shadow-sm animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
            crown
          </span>
        )}
        <img 
          src={player.photoURL} 
          alt={player.displayName} 
          className={`w-14 h-14 rounded-full object-cover border-2 shadow-sm ${isGold ? 'border-secondary-container' : 'border-surface-variant'}`}
          referrerPolicy="no-referrer"
        />
        <div className={`absolute bottom-[-6px] right-[-6px] w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white shadow-sm ${
          rank === 1 ? 'bg-secondary-container !text-on-secondary-container' : rank === 2 ? 'bg-outline' : 'bg-orange-700'
        }`}>
          {rank}
        </div>
      </div>

      <p className="font-bold text-[13px] text-center text-on-surface truncate w-full mb-0.5">{player.displayName.split(' ')[0]}</p>
      
      {/* Podium Block Column */}
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        transition={{ type: 'spring', damping: 20 }}
        className={`w-full ${heightClass} ${colorClass} ${borderClass} border-[1.5px] rounded-t-xl flex flex-col items-center justify-center p-2 mt-2`}
      >
        <span className="font-extrabold text-[22px] text-primary">{player.bookingsCount}</span>
        <span className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-wider">Bookings</span>
      </motion.div>
    </div>
  );
}
