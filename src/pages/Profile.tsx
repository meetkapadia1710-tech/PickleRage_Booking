import { motion } from 'framer-motion';

export default function Profile() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-background text-on-background min-h-screen pb-[80px]"
    >
      {/* TopAppBar */}
      <header className="bg-background dark:bg-on-background top-0 w-full z-40 hidden md:block">
        <div className="flex justify-between items-center px-5 h-[48px] w-full">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
            <span className="font-bold text-[24px] text-primary">PlayHub</span>
          </div>
          <button className="w-[48px] h-[48px] flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto md:max-w-4xl px-5 pt-6">
        {/* Profile Header */}
        <section className="flex flex-col items-center mb-6 relative pt-12">
          <div className="w-24 h-24 rounded-full bg-surface-container-high overflow-hidden shadow-sm mb-4 border-2 border-surface">
            <img 
              alt="Profile avatar" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqT7gT3w8VGrOXV49StH1nWex9b27L6YbXB8-fwKyxCnYtqSbu_HVJ3laXaP1YC_rpwAvXTAF1Cmos46SARzpMK8PRuDRgTey5nSnWECMaDo2YscrZ6UEtvpym-EnT4iTnWWFiGn2GsftfX7M9Nfv1BsijRCGHocSP2FTPvzHTueCkcDCGDTXzaIyum1lBAUmvw3ZTuildnKEeh010NeVfdhNg6WdzMlsG1NeeNEho3CR6VnQs0oJTvIDHnhdgpUm1eMb-6tg9FPw"
            />
          </div>
          <h1 className="font-semibold text-[20px] text-on-background mb-1">Alex Carter</h1>
          <p className="text-[14px] text-on-surface-variant">alex.carter@example.com</p>
          <span className="mt-4 px-4 py-1 rounded-full bg-secondary-container text-on-secondary-container font-medium text-[12px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            Pro Member
          </span>
        </section>

        {/* Stats / Quick Info */}
        <section className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-surface-container-lowest p-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,52,43,0.04)] flex flex-col items-center">
            <span className="font-bold text-[24px] text-primary mb-1">24</span>
            <span className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider">Bookings</span>
          </div>
          <div className="bg-surface-container-lowest p-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,52,43,0.04)] flex flex-col items-center">
            <span className="font-bold text-[24px] text-primary mb-1">12</span>
            <span className="font-medium text-[12px] text-on-surface-variant uppercase tracking-wider">Hours Played</span>
          </div>
        </section>

        {/* Settings List */}
        <section className="bg-surface-container-lowest rounded-[20px] shadow-[0_4px_12px_rgba(0,52,43,0.04)] overflow-hidden">
          <div className="flex flex-col">
            <SettingItem icon="person" title="Edit Profile" subtitle="Update your personal details" />
            <SettingItem icon="notifications" title="Notifications" subtitle="Manage your alerts" />
            <SettingItem icon="credit_card" title="Payment Methods" subtitle="Cards and billing info" />
            <SettingItem icon="help" title="Help & Support" subtitle="FAQs and contact" isLast />
          </div>
        </section>

        {/* Logout Action */}
        <div className="mt-8 mb-12 flex justify-center">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 text-error font-semibold text-[14px] hover:bg-error-container/20 rounded-full transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </motion.button>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden bg-surface-container-lowest shadow-[0_-4px_12px_0_rgba(0,52,43,0.04)] fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-2 rounded-t-xl">
        <a href="#" className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="font-medium text-[12px]">Home</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center text-on-surface-variant hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined mb-1">event_available</span>
          <span className="font-medium text-[12px]">My Bookings</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-6 py-1 active:scale-90 duration-150 hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="font-medium text-[12px]">Profile</span>
        </a>
      </nav>
    </motion.div>
  );
}

function SettingItem({ icon, title, subtitle, isLast = false }: { icon: string, title: string, subtitle: string, isLast?: boolean }) {
  return (
    <motion.button 
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center p-4 hover:bg-surface-container-low transition-colors ${!isLast ? 'border-b border-surface-variant/50' : ''}`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center mr-4 text-primary">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-[14px] text-on-background">{title}</h3>
        <p className="text-[14px] text-on-surface-variant mt-0.5">{subtitle}</p>
      </div>
      <span className="material-symbols-outlined text-outline">chevron_right</span>
    </motion.button>
  );
}
