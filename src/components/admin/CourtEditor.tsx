import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Court } from '../../types';
import { Field, TextInput } from './adminShared';

export default function CourtEditor({
  court,
  onSave,
  onDelete,
  onCancel,
}: {
  court: Partial<Court>;
  onSave: (c: Partial<Court>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Court>>(court);
  const set = (key: keyof Court, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3"
    >
      <Field label="Court Name">
        <TextInput value={form.name ?? ''} onChange={v => set('name', v)} placeholder="e.g. Court 1" />
      </Field>
      <Field label="Surface">
        <TextInput
          value={form.surface ?? ''}
          onChange={v => set('surface', v)}
          placeholder="e.g. Hard Court, Astro Turf"
        />
      </Field>
      <Field label="Location">
        <div className="flex gap-2">
          {(['Indoor', 'Outdoor'] as const).map(opt => {
            const val = opt === 'Indoor';
            const active = form.isIndoor === val;
            return (
              <button
                key={opt}
                onClick={() => set('isIndoor', val)}
                className={`flex-1 h-[40px] rounded-xl font-medium text-[14px] border-[1.5px] transition-colors cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 h-[40px] rounded-full border border-outline-variant text-on-surface-variant font-medium text-[14px] hover:bg-surface-container transition-colors cursor-pointer"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="h-[40px] px-4 rounded-full border border-error/40 text-error font-medium text-[14px] hover:bg-error-container/20 transition-colors cursor-pointer"
          >
            Delete
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (!form.name?.trim() || !form.surface?.trim()) return;
            onSave(form);
          }}
          className="flex-1 h-[40px] rounded-full bg-primary text-on-primary font-medium text-[14px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          Save
        </motion.button>
      </div>
    </motion.div>
  );
}
