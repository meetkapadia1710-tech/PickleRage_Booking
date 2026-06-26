import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';
import type { Venue, Booking, UserProfile } from '../types';
import Avatar from '../components/Avatar';
import VenueEditor from '../components/admin/VenueEditor';
import UserEditor from '../components/admin/UserEditor';

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!currentUser) { setIsAdmin(false); return; }
    getDoc(doc(db, 'admins', currentUser.uid))
      .then(snap => setIsAdmin(snap.exists()))
      .catch(() => setIsAdmin(false));
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<'bookings' | 'venues' | 'users'>('bookings');

  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingVenue, setEditingVenue] = useState<Venue | null | 'new'>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getDocs(collection(db, 'venues')),
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'users')),
    ])
      .then(([venuesSnap, bookingsSnap, usersSnap]) => {
        if (cancelled) return;
        setVenues(venuesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Venue)));
        setBookings(bookingsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Booking)));
        setUsers(usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        logger.error('AdminDashboard: data fetch failed', err);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const refreshData = () => {
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  const navItems: { id: 'bookings' | 'venues' | 'users'; icon: string; label: string }[] = [
    { id: 'bookings', icon: 'calendar_today', label: 'Bookings' },
    { id: 'venues',   icon: 'stadium',        label: 'Venues' },
    { id: 'users',    icon: 'group',          label: 'Users' },
  ];

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mb-2">
          <span className="material-symbols-outlined text-[40px] text-error">lock</span>
        </div>
        <h1 className="font-bold text-[24px] text-on-background">Access Denied</h1>
        <p className="text-[14px] text-on-surface-variant max-w-xs">
          You don't have permission to access the admin dashboard.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="mt-2 h-[48px] px-8 bg-primary text-on-primary rounded-full font-semibold text-[15px] cursor-pointer hover:opacity-90 transition-opacity"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col md:flex-row antialiased">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container-lowest border-r border-surface-variant shrink-0">
        <div className="flex items-center gap-2 text-primary px-5 py-6">
          <span className="material-symbols-outlined text-[26px]">sports_tennis</span>
          <span className="font-bold text-[22px]">PlayHub Admin</span>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Admin navigation">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer text-left ${
                activeTab === item.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-3 pb-6">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-on-surface-variant hover:bg-surface-container transition-colors w-full cursor-pointer"
          >
            <span className="material-symbols-outlined">exit_to_app</span>
            Exit Admin
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden bg-surface-container-lowest border-b border-surface-variant px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[22px]">sports_tennis</span>
          <span className="font-bold text-[18px]">PlayHub Admin</span>
        </div>
        <button
          onClick={() => navigate('/home')}
          aria-label="Exit admin"
          className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-2 mb-6" role="tablist" aria-label="Admin sections">
          {navItems.map(item => (
            <button
              key={item.id}
              role="tab"
              aria-selected={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2 rounded-full font-medium text-[14px] whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === item.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Bookings tab ── */}
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="font-bold text-[28px] text-on-background mb-6">Manage Bookings</h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total',     value: totalBookings,     color: 'text-primary' },
                  { label: 'Confirmed', value: confirmedBookings, color: 'text-secondary' },
                  { label: 'Cancelled', value: cancelledBookings, color: 'text-error' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm"
                  >
                    <p className="text-[13px] text-on-surface-variant font-medium mb-1">{stat.label}</p>
                    <p className={`text-[32px] font-bold ${stat.color}`}>
                      {loading ? '—' : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-8 text-center text-on-surface-variant">
                  No bookings found.
                </div>
              ) : (
                <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-surface-variant text-[13px] text-on-surface-variant">
                          <th className="p-4 font-semibold">Booking ID</th>
                          <th className="p-4 font-semibold">Date</th>
                          <th className="p-4 font-semibold">Time</th>
                          <th className="p-4 font-semibold">Venue</th>
                          <th className="p-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map(b => {
                          const venueName = venues.find(v => v.id === b.venueId)?.name ?? b.venueId;
                          return (
                            <tr
                              key={b.id}
                              className="border-b border-surface-variant/50 hover:bg-surface-container-low/60 text-[14px] transition-colors"
                            >
                              <td className="p-4 font-mono text-[13px] text-on-surface-variant">
                                {b.id.slice(0, 10)}…
                              </td>
                              <td className="p-4">{b.date}</td>
                              <td className="p-4 whitespace-nowrap">{b.startTime} – {b.endTime}</td>
                              <td className="p-4 max-w-[180px] truncate">{venueName}</td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium text-[12px] capitalize ${
                                    b.status === 'confirmed'
                                      ? 'bg-secondary/10 text-secondary'
                                      : 'bg-error/10 text-error'
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Venues tab ── */}
          {activeTab === 'venues' && (
            <motion.div
              key="venues"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-6 gap-4">
                <h1 className="font-bold text-[28px] text-on-background">Manage Venues</h1>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setEditingVenue('new')}
                  className="bg-primary text-on-primary px-4 py-2.5 rounded-full font-semibold text-[14px] flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Venue
                </motion.button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
                </div>
              ) : venues.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-12 text-center flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[48px] text-outline">stadium</span>
                  <p className="text-on-surface-variant font-medium">No venues yet.</p>
                  <button
                    onClick={() => setEditingVenue('new')}
                    className="mt-1 px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-[14px] cursor-pointer hover:opacity-90"
                  >
                    Add your first venue
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {venues.map(venue => (
                    <motion.div
                      key={venue.id}
                      whileHover={{ y: -3 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="bg-surface-container-lowest rounded-2xl border border-surface-variant overflow-hidden shadow-sm flex flex-col"
                    >
                      <div className="h-36 bg-surface-variant relative">
                        {venue.images?.[0] ? (
                          <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-[40px]">image_not_supported</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[12px] font-semibold capitalize text-on-surface">
                          {venue.type}
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-1">
                        <h3 className="font-bold text-[16px] text-on-surface leading-tight">{venue.name}</h3>
                        <p className="text-[13px] text-on-surface-variant line-clamp-1">{venue.address}</p>
                        {venue.distance && (
                          <p className="text-[13px] text-on-surface-variant mt-1">{venue.distance}</p>
                        )}
                      </div>
                      <div className="px-4 pb-4 flex items-center justify-between border-t border-surface-variant/50 pt-3">
                        <span className="font-bold text-[16px] text-primary">
                          ₹{venue.price}
                          <span className="font-normal text-[13px] text-on-surface-variant">/hr</span>
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditingVenue(venue)}
                          className="h-[36px] px-4 rounded-full bg-primary text-on-primary font-semibold text-[13px] flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Edit
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Users tab ── */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="font-bold text-[28px] text-on-background mb-6">Manage Users</h1>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Users',     value: users.length,                           color: 'text-primary' },
                  { label: 'Active Profiles', value: users.filter(u => u.displayName).length, color: 'text-secondary' },
                  { label: 'Missing Phone',   value: users.filter(u => !u.phone).length,     color: 'text-error' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="bg-surface-container-lowest p-5 rounded-xl border border-surface-variant shadow-sm"
                  >
                    <p className="text-[13px] text-on-surface-variant font-medium mb-1">{stat.label}</p>
                    <p className={`text-[32px] font-bold ${stat.color}`}>
                      {loading ? '—' : stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
                </div>
              ) : users.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-8 text-center text-on-surface-variant">
                  No users found.
                </div>
              ) : (
                <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-surface-variant text-[13px] text-on-surface-variant">
                          <th className="p-4 font-semibold">User</th>
                          <th className="p-4 font-semibold">Email</th>
                          <th className="p-4 font-semibold">Phone</th>
                          <th className="p-4 font-semibold">Joined Date</th>
                          <th className="p-4 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr
                            key={u.uid}
                            className="border-b border-surface-variant/50 hover:bg-surface-container-low/60 text-[14px] transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar name={u.displayName || 'Anonymous'} photoURL={u.photoURL} size={36} />
                                <span className="font-semibold text-on-surface">
                                  {u.displayName || 'Anonymous'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-on-surface-variant">{u.email || '—'}</td>
                            <td className="p-4">
                              {u.phone ? (
                                <span className="font-medium text-on-surface">{u.phone}</span>
                              ) : (
                                <span className="text-error font-medium bg-error/5 px-2 py-0.5 rounded-full text-[12px] border border-error/15">
                                  Missing
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-on-surface-variant">
                              {u.createdAt
                                ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="p-4">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setEditingUser(u)}
                                className="h-[32px] px-3.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[13px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                                Edit
                              </motion.button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Venue Editor panel ── */}
      <AnimatePresence>
        {editingVenue !== null && (
          <VenueEditor
            venue={editingVenue === 'new' ? null : editingVenue}
            isNew={editingVenue === 'new'}
            onClose={() => setEditingVenue(null)}
            onSaved={() => { setEditingVenue(null); refreshData(); }}
          />
        )}
      </AnimatePresence>

      {/* ── User Editor panel ── */}
      <AnimatePresence>
        {editingUser !== null && (
          <UserEditor
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSaved={() => { setEditingUser(null); refreshData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
