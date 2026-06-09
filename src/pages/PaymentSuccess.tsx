import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Booking, Venue, Court } from '../types';
import { formatDate, formatTime } from '../lib/format';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [court, setCourt] = useState<Court | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!bookingId) return;
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
        if (!bookingSnap.exists()) return;
        const bookingData = bookingSnap.data() as Booking;
        setBooking(bookingData);

        const [venueSnap, courtSnap] = await Promise.all([
          getDoc(doc(db, 'venues', bookingData.venueId)),
          getDoc(doc(db, 'courts', bookingData.courtId)),
        ]);
        if (venueSnap.exists()) setVenue(venueSnap.data() as Venue);
        if (courtSnap.exists()) setCourt(courtSnap.data() as Court);
      } catch (err) {
        console.error('Error fetching booking details:', err);
      }
    };
    fetchDetails();
  }, [bookingId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Piece {
      x: number; y: number; w: number; h: number; c: string;
      vx: number; vy: number; rot: number; rotSpeed: number;
    }
    const pieces: Piece[] = [];
    const colors = ['#ffbf00', '#00342b', '#7ebdac', '#94d3c1']; // Theme colors

    for (let i = 0; i < 50; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 20 + 10,
        c: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.random() * 2 - 1,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * 360,
        rotSpeed: Math.random() * 5 - 2.5,
      });
    }

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.rotSpeed;

        if (p.y > canvas.height) {
          p.y = -p.h;
          p.x = Math.random() * canvas.width;
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background text-on-background h-screen w-full font-body-md overflow-hidden flex flex-col items-center justify-center relative"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      <main className="relative z-10 flex flex-col items-center justify-center px-5 w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="mb-6 relative flex items-center justify-center w-32 h-32 rounded-full bg-secondary-container/20"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2 border-secondary-container"
          />
          <span className="material-symbols-outlined text-secondary-container" style={{ fontSize: '80px', fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-bold text-[28px] md:text-[30px] text-primary mb-2"
        >
          Payment Successful
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[16px] text-on-surface-variant mb-6"
        >
          {venue ? `${venue.name} is booked and ready for action.` : 'Your court is secured and ready for action.'}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest/80 backdrop-blur-md p-6 rounded-xl shadow-[0_4px_12px_rgba(0,52,43,0.04)] border border-outline-variant/30 w-full mb-6 flex flex-col gap-2"
        >
          <div className="flex justify-between items-center w-full gap-4">
            <span className="font-semibold text-[14px] text-on-surface-variant shrink-0">Booking ID</span>
            <span className="font-semibold text-[14px] text-primary truncate">#{bookingId}</span>
          </div>
          {booking && (
            <>
              <div className="h-px bg-outline-variant/30 w-full my-1"></div>
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-[14px] text-on-surface-variant">Court</span>
                <span className="font-medium text-[14px] text-on-surface">{court?.name ?? booking.courtId}</span>
              </div>
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-[14px] text-on-surface-variant">When</span>
                <span className="font-medium text-[14px] text-on-surface">
                  {formatDate(booking.date)}, {formatTime(booking.startTime)}
                </span>
              </div>
            </>
          )}
          {venue && (
            <>
              <div className="h-px bg-outline-variant/30 w-full my-1"></div>
              <div className="flex justify-between items-center w-full">
                <span className="font-semibold text-[14px] text-on-surface-variant">Amount Paid</span>
                <span className="font-semibold text-[20px] text-primary">₹{venue.price}.00</span>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full flex flex-col gap-4"
        >
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/bookings')}
            className="bg-secondary-container text-primary h-[48px] rounded-full w-full font-semibold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>confirmation_number</span>
            View Bookings
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/home')}
            className="text-primary h-[48px] rounded-full w-full font-semibold text-[14px] flex items-center justify-center hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            Return to Home
          </motion.button>
        </motion.div>
      </main>
    </motion.div>
  );
}
