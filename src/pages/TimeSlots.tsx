import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { mockVenues, mockCourts } from '../data/mockVenues';
import { mockBookings } from '../data/mockBookings';

export default function TimeSlots() {
  const { id: venueId, courtId } = useParams();
  const navigate = useNavigate();

  const venue = mockVenues.find(v => v.id === venueId);
  const court = mockCourts.find(c => c.id === courtId);

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Generate 5 days of dates
  const dates = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({
        iso: d.toISOString().split('T')[0],
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayOfMonth: d.getDate()
      });
    }
    return arr;
  }, []);

  // Filter slots to determine availability
  const isSlotAvailable = (time: string) => {
    // If there is any booking for the selected date, court, and start time, it's unavailable
    const booking = mockBookings.find(b => 
      b.venueId === venueId && 
      b.courtId === courtId && 
      b.date === selectedDate && 
      b.startTime === time
    );
    return !booking;
  };

  const handleSlotClick = (time: string) => {
    if (isSlotAvailable(time)) {
      setSelectedSlot(time);
    }
  };

  if (!venue || !court) return <div>Data not found</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-background text-on-background min-h-screen flex flex-col"
    >
      {/* TopAppBar */}
      <header className="bg-background w-full top-0 sticky z-40">
        <div className="flex justify-between items-center px-5 h-[48px] w-full">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full p-1 cursor-pointer text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-bold text-[24px] text-primary">PlayHub</h1>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined cursor-pointer hover:bg-surface-container-high transition-colors rounded-full p-1">notifications</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-[100px]">
        <div className="max-w-3xl mx-auto px-5 pt-4">
          {/* Context Header */}
          <div className="mb-6">
            <h2 className="font-bold text-[28px] text-primary mb-2">Select Time</h2>
            <div className="flex items-center text-on-surface-variant gap-2 text-[14px]">
              <span className="material-symbols-outlined text-[18px]">
                {venue.type === 'pickleball' ? 'sports_tennis' : 'sports_cricket'}
              </span>
              <span>{venue.name.split(',')[0]} • {court.name}</span>
            </div>
          </div>

          {/* Date Scroller */}
          <div className="mb-6 flex overflow-x-auto gap-4 pb-2 hide-scrollbar snap-x">
            {dates.map((d) => {
              const isSelected = selectedDate === d.iso;
              return (
                <button 
                  key={d.iso}
                  onClick={() => {
                    setSelectedDate(d.iso);
                    setSelectedSlot(null); // reset slot on date change
                  }}
                  className={`flex flex-col items-center justify-center min-w-[60px] h-[72px] rounded-xl snap-start relative transition-colors ${
                    isSelected 
                      ? 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(0,52,43,0.15)]' 
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="font-medium text-[12px] uppercase">{d.dayOfWeek}</span>
                  <span className="font-semibold text-[20px] mt-1">{d.dayOfMonth}</span>
                  {isSelected && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-secondary-container"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Slots Container */}
          <div className="space-y-6">
            <SlotSection 
              title="Morning" 
              icon="light_mode" 
              slots={["06:00", "07:00", "08:00", "09:00", "10:00", "11:00"]} 
              selectedSlot={selectedSlot}
              isSlotAvailable={isSlotAvailable}
              handleSlotClick={handleSlotClick}
            />
            <SlotSection 
              title="Afternoon" 
              icon="wb_sunny" 
              slots={["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]} 
              selectedSlot={selectedSlot}
              isSlotAvailable={isSlotAvailable}
              handleSlotClick={handleSlotClick}
            />
            <SlotSection 
              title="Evening" 
              icon="nights_stay" 
              slots={["18:00", "19:00", "20:00", "21:00", "22:00"]} 
              selectedSlot={selectedSlot}
              isSlotAvailable={isSlotAvailable}
              handleSlotClick={handleSlotClick}
            />
          </div>
        </div>
      </main>

      {/* Floating Action Area */}
      {selectedSlot && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 w-full z-50 bg-surface-container-lowest shadow-[0_-4px_20px_rgba(0,52,43,0.08)] pb-safe"
        >
          <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-[12px] text-on-surface-variant">Selected</p>
              <p className="font-semibold text-[20px] text-primary">
                {selectedSlot} - {(parseInt(selectedSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
              </p>
            </div>
            <button 
              onClick={() => {
                // Next phase will handle the actual booking confirmation
                alert('Booking Confirmed! (To be implemented in Phase 4)');
              }}
              className="h-[48px] px-8 rounded-full bg-secondary-container text-on-secondary-container font-semibold text-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(255,191,0,0.2)] hover:opacity-90 active:scale-95 transition-all"
            >
              Confirm Selection
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function SlotSection({ 
  title, 
  icon, 
  slots, 
  selectedSlot, 
  isSlotAvailable, 
  handleSlotClick 
}: { 
  title: string, 
  icon: string, 
  slots: string[], 
  selectedSlot: string | null, 
  isSlotAvailable: (t: string) => boolean, 
  handleSlotClick: (t: string) => void 
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <h3 className="font-semibold text-[20px] text-primary">{title}</h3>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {slots.map(time => {
          const available = isSlotAvailable(time);
          const isSelected = selectedSlot === time;

          return (
            <button 
              key={time}
              onClick={() => handleSlotClick(time)}
              disabled={!available}
              className={`h-[48px] rounded-[12px] font-semibold text-[14px] flex items-center justify-center border transition-all ${
                isSelected 
                  ? 'bg-primary text-on-primary border-primary' 
                  : available 
                    ? 'bg-surface-container text-on-surface border-transparent hover:border-primary/50' 
                    : 'bg-surface-variant text-on-surface-variant opacity-40 cursor-not-allowed border-transparent'
              }`}
            >
              {!available ? <span className="line-through">{time}</span> : time}
            </button>
          );
        })}
      </div>
    </section>
  );
}
