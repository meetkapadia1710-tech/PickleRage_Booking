import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function PhoneLogin() {
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    if (!x) return;
    const formatted = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    setPhone(formatted);
  };

  const handleContinue = () => {
    // Basic transition for now. Phase 1 auth will be fleshed out later.
    navigate('/home');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="bg-background text-on-background min-h-screen flex flex-col font-sans"
    >
      <main className="flex-1 flex flex-col justify-center px-5 pb-6 max-w-md mx-auto w-full relative">
        <div className="absolute top-8 left-5 flex items-center space-x-2">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
          <span className="font-bold text-[20px] text-primary">PlayHub</span>
        </div>
        
        <div className="mt-24 space-y-6">
          <div className="space-y-2">
            <h1 className="font-bold text-[28px] md:text-[30px] text-on-background">Welcome</h1>
            <p className="text-[14px] text-on-surface-variant">Enter your phone number to continue</p>
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-[48px] px-4 border-[1.5px] border-outline-variant rounded-xl flex items-center justify-center bg-surface-container-lowest text-on-surface">
                <span className="text-[16px]">+1</span>
              </div>
              <div className="input-group flex-1 h-[48px]">
                <input 
                  id="phone"
                  type="tel"
                  placeholder=" "
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full h-full border-[1.5px] border-outline-variant rounded-xl px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface text-[16px] transition-colors"
                />
                <label htmlFor="phone">Phone number</label>
              </div>
            </div>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="w-full h-[48px] bg-secondary-container text-on-secondary-container rounded-[20px] font-semibold text-[14px] flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm"
            >
              Continue
            </motion.button>
          </div>
          
          <div className="text-center pt-2">
            <p className="font-medium text-[12px] text-on-surface-variant">By continuing, you agree to our Terms &amp; Conditions</p>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
