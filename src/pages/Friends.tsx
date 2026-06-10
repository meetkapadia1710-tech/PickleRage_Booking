import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  doc, setDoc, deleteDoc, onSnapshot, getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, FriendRequest } from '../types';
import AppHeader from '../components/AppHeader';
import Avatar from '../components/Avatar';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 280 } },
};

export default function Friends() {
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<UserProfile | null | 'none'>(null);
  const [searching, setSearching] = useState(false);

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingIn, setPendingIn] = useState<FriendRequest[]>([]);
  const [pendingOut, setPendingOut] = useState<string[]>([]); // toUids with pending sent requests

  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  // ── Real-time listener: incoming pending requests ──────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'friendRequests'),
      where('toUid', '==', currentUser.uid),
      where('status', '==', 'pending'),
    );
    return onSnapshot(
      q,
      snap => {
        setPendingIn(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
      },
      err => console.warn('Friends incoming requests error:', err)
    );
  }, [currentUser]);

  // ── Real-time listener: outgoing pending requests ──────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', currentUser.uid),
      where('status', '==', 'pending'),
    );
    return onSnapshot(
      q,
      snap => {
        setPendingOut(snap.docs.map(d => d.data().toUid as string));
      },
      err => console.warn('Friends outgoing requests error:', err)
    );
  }, [currentUser]);

  // ── Real-time listener: friends list ──────────────────────────────────────
  const loadFriends = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(collection(db, 'friends', currentUser.uid, 'list'));
      const profiles = await Promise.all(
        snap.docs.map(async d => {
          const profileSnap = await getDoc(doc(db, 'users', d.id));
          return profileSnap.exists()
            ? ({ uid: profileSnap.id, ...profileSnap.data() } as UserProfile)
            : null;
        })
      );
      setFriends(profiles.filter(Boolean) as UserProfile[]);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // ── Search by phone ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !currentUser) return;
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      setSearchResult('none');
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const q = query(collection(db, 'users'), where('phone', '==', trimmed));
      const snap = await getDocs(q);
      if (snap.empty || snap.docs[0].id === currentUser.uid) {
        setSearchResult('none');
      } else {
        setSearchResult({ uid: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile);
      }
    } catch {
      setSearchResult('none');
    } finally {
      setSearching(false);
    }
  };

  // ── Send friend request ────────────────────────────────────────────────────
  const sendRequest = async (toUser: UserProfile) => {
    if (!currentUser) return;
    try {
      // Get current user profile for fromName/fromPhone
      const mySnap = await getDoc(doc(db, 'users', currentUser.uid));
      const myData = mySnap.data() as UserProfile | undefined;
      await addDoc(collection(db, 'friendRequests'), {
        fromUid: currentUser.uid,
        toUid: toUser.uid,
        fromName: myData?.displayName ?? currentUser.displayName ?? 'Unknown',
        fromPhone: myData?.phone ?? '',
        fromPhotoURL: myData?.photoURL ?? currentUser.photoURL ?? '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      showToast(`Friend request sent to ${toUser.displayName} 🎾`);
      setSearchResult(null);
      setSearchQuery('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send request. Try again.');
    }
  };

  // ── Accept friend request ──────────────────────────────────────────────────
  const acceptRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });
      // Write to both users' friend lists
      await setDoc(doc(db, 'friends', currentUser.uid, 'list', req.fromUid), { addedAt: new Date().toISOString() });
      await setDoc(doc(db, 'friends', req.fromUid, 'list', currentUser.uid), { addedAt: new Date().toISOString() });
      showToast(`You and ${req.fromName} are now friends! 🎉`);
      loadFriends();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Decline friend request ─────────────────────────────────────────────────
  const declineRequest = async (req: FriendRequest) => {
    try {
      await updateDoc(doc(db, 'friendRequests', req.id), { status: 'rejected' });
    } catch (err) {
      console.error(err);
    }
  };

  // ── Remove friend ──────────────────────────────────────────────────────────
  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'friends', currentUser.uid, 'list', friendUid));
      await deleteDoc(doc(db, 'friends', friendUid, 'list', currentUser.uid));
      setFriends(prev => prev.filter(f => f.uid !== friendUid));
      showToast('Friend removed.');
    } catch (err) {
      console.error(err);
    }
  };

  const isFriendAlready = (uid: string) => friends.some(f => f.uid === uid);
  const isPendingOut = (uid: string) => pendingOut.includes(uid);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-background min-h-screen pb-[100px]"
    >
      <AppHeader />

      <main className="max-w-lg mx-auto px-5 pt-4 flex flex-col gap-6">

        {/* ── Search ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-semibold text-[18px] text-on-background mb-3">Find Players</h2>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface-container-low rounded-2xl px-4 h-[48px] border border-outline-variant/40">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">phone</span>
              <input
                type="tel"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by phone number"
                className="flex-1 bg-transparent text-[14px] text-on-surface outline-none placeholder:text-on-surface-variant"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResult(null); }} className="cursor-pointer text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searching}
              className="h-[48px] px-5 bg-primary text-on-primary rounded-2xl font-semibold text-[14px] disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              {searching ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : 'Search'}
            </button>
          </div>

          {/* Search Result */}
          <AnimatePresence>
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3"
              >
                {searchResult === 'none' ? (
                  <div className="bg-surface-container-low rounded-2xl p-4 text-center text-on-surface-variant text-[14px]">
                    No player found with that number.
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/40 shadow-sm">
                    <Avatar name={searchResult.displayName} photoURL={searchResult.photoURL} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] text-on-surface truncate">{searchResult.displayName}</p>
                      <p className="text-[12px] text-on-surface-variant">{searchResult.phone}</p>
                    </div>
                    {isFriendAlready(searchResult.uid) ? (
                      <span className="text-[12px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">Friends ✓</span>
                    ) : isPendingOut(searchResult.uid) ? (
                      <span className="text-[12px] font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">Pending</span>
                    ) : (
                      <button
                        onClick={() => sendRequest(searchResult as UserProfile)}
                        className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer active:scale-95 transition-all"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Pending Requests ───────────────────────────────────────────── */}
        <AnimatePresence>
          {pendingIn.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="font-semibold text-[18px] text-on-background mb-3 flex items-center gap-2">
                Requests
                <span className="bg-error text-on-error text-[11px] font-bold px-2 py-0.5 rounded-full">{pendingIn.length}</span>
              </h2>
              <motion.ul variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
                {pendingIn.map(req => (
                  <motion.li key={req.id} variants={itemVariants}
                    className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/40 shadow-sm"
                  >
                    <Avatar name={req.fromName} photoURL={req.fromPhotoURL} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] text-on-surface truncate">{req.fromName}</p>
                      <p className="text-[12px] text-on-surface-variant">{req.fromPhone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptRequest(req)}
                        className="bg-primary text-on-primary px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer active:scale-95 transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req)}
                        className="bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer active:scale-95 transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Friends List ───────────────────────────────────────────────── */}
        <section>
          <h2 className="font-semibold text-[18px] text-on-background mb-3">
            My Friends {friends.length > 0 && <span className="text-on-surface-variant font-normal text-[14px]">({friends.length})</span>}
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[56px] opacity-30">group</span>
              <p className="text-[14px]">No friends yet. Search by phone number above!</p>
            </div>
          ) : (
            <motion.ul variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
              {friends.map(friend => (
                <motion.li key={friend.uid} variants={itemVariants}
                  className="bg-surface-container-lowest rounded-2xl px-4 py-3 flex items-center gap-3 border border-outline-variant/40 shadow-sm"
                >
                  <Avatar name={friend.displayName} photoURL={friend.photoURL} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-on-surface truncate">{friend.displayName}</p>
                    <p className="text-[12px] text-on-surface-variant">{friend.phone}</p>
                  </div>
                  <button
                    onClick={() => removeFriend(friend.uid)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                    aria-label="Remove friend"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_remove</span>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </section>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] bg-on-background text-background px-5 py-2.5 rounded-full text-[13px] font-semibold shadow-xl whitespace-nowrap"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
