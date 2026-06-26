import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAndroidBackClose } from '../../lib/backClose';
import { logger } from '../../lib/logger';
import type { UserProfile } from '../../types';
import Avatar from '../Avatar';
import { Field, TextInput } from './adminShared';

export default function UserEditor({
  user,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Mounted = open; Android back closes the editor instead of leaving /admin
  useAndroidBackClose(true, onClose);

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSaveUser = async () => {
    if (!displayName.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        phone: phone.trim(),
      });
      onSaved();
    } catch (err: unknown) {
      logger.error('UserEditor: failed to update user', err);
      setError('Failed to update user profile. Permission denied or database error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl flex flex-col pt-safe border-l border-surface-variant/40"
          role="dialog"
          aria-modal="true"
          aria-label="Edit User Profile"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-variant/50">
            <div>
              <h2 className="font-bold text-[20px] text-on-surface">Edit User Profile</h2>
              <p className="text-[12px] text-on-surface-variant">UID: {user.uid.slice(0, 12)}…</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {error && (
              <div className="p-3.5 bg-error-container/20 border border-error/25 text-error rounded-xl text-[13px] font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-center mb-4">
              <Avatar name={displayName} photoURL={user.photoURL} size={80} />
            </div>

            <Field label="Display Name">
              <TextInput value={displayName} onChange={setDisplayName} placeholder="e.g. John Doe" />
            </Field>

            <Field label="Phone Number">
              <TextInput value={phone} onChange={setPhone} placeholder="e.g. +91 9876543210" />
            </Field>

            {user.email && (
              <Field label="Email Address">
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="h-[44px] px-3 border-[1.5px] border-outline-variant rounded-xl bg-surface-container/30 text-on-surface-variant text-[15px] focus:outline-none w-full cursor-not-allowed"
                />
              </Field>
            )}

            {user.createdAt && (
              <Field label="Joined Date">
                <input
                  type="text"
                  value={new Date(user.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  disabled
                  className="h-[44px] px-3 border-[1.5px] border-outline-variant rounded-xl bg-surface-container/30 text-on-surface-variant text-[15px] focus:outline-none w-full cursor-not-allowed"
                />
              </Field>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-surface-variant/50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-[48px] rounded-full border border-outline-variant text-on-surface font-semibold text-[14px] hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSaveUser}
              disabled={saving}
              className="flex-1 h-[48px] rounded-full bg-primary text-on-primary font-semibold text-[14px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="material-symbols-outlined"
                  >
                    sync
                  </motion.span>{' '}
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span> Save Changes
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
