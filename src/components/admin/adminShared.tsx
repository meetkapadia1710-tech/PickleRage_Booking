import type { Court, Venue } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALL_AMENITIES: { key: string; label: string }[] = [
  { key: 'local_parking', label: 'Parking' },
  { key: 'shower',        label: 'Showers' },
  { key: 'lock',          label: 'Lockers' },
  { key: 'water_drop',    label: 'Water' },
  { key: 'storefront',    label: 'Pro Shop' },
  { key: 'restaurant',    label: 'Cafe' },
  { key: 'wifi',          label: 'Wi-Fi' },
  { key: 'ac_unit',       label: 'AC' },
  { key: 'light_mode',    label: 'Floodlights' },
  { key: 'first_aid_kit', label: 'First Aid' },
];

export const BLANK_VENUE: Omit<Venue, 'id'> = {
  name: '',
  type: 'pickleball',
  images: [''],
  price: 600,
  address: '',
  distance: '',
  rating: 4.5,
  amenities: [],
  isPremium: false,
};

export const BLANK_COURT: Omit<Court, 'id' | 'venueId'> = {
  name: '',
  surface: '',
  isIndoor: true,
};

// ─── Shared form primitives ───────────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-[44px] px-3 border-[1.5px] border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors w-full"
    />
  );
}
