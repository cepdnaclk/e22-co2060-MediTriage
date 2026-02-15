import React, { useState } from 'react';
import { User, UserRole } from '../types';
import * as authService from '../services/authService';

interface LoginProps {
   onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
   const [role, setRole] = useState<UserRole>(UserRole.NURSE);
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [error, setError] = useState('');
   const [isLoading, setIsLoading] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');

      try {
         const user = await authService.login(username, password);
         onLogin(user);
      } catch (err: any) {
         setError(err.message || 'Invalid credentials');
         setIsLoading(false);
      }
   };

   return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-[#dfe3ea] font-sans">
         <div className="w-full max-w-[420px] bg-white rounded-[45px] shadow-md p-[40px] mx-4">

            {/* Logo */}
            <div className="flex justify-center mb-[30px]">
               <img
                  src="/assets/branding/MediTriage.png"
                  alt="MediTriage"
                  className="h-[8rem] object-contain"
               />
            </div>

            {/* Role Toggle */}
            <div className="bg-[#eef1f6] p-1.5 rounded-full flex mb-[25px]">
               <button
                  onClick={() => setRole(UserRole.NURSE)}
                  className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${role === UserRole.NURSE
                     ? 'bg-[#17406E] text-white shadow-md hover:bg-[#1c5b7e]'
                     : 'text-gray-400 hover:text-gray-600'
                     }`}
               >
                  Nurse
               </button>
               <button
                  onClick={() => setRole(UserRole.DOCTOR)}
                  className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${role === UserRole.DOCTOR
                     ? 'bg-[#17406E] text-white shadow-md hover:bg-[#1c5b7e]'
                     : 'text-gray-400 hover:text-gray-600'
                     }`}
               >
                  Doctor
               </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
               <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-[7px]">Username</label>
                  <input
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     className="w-full focus:ring-0 focus:ring-offset-0 focus:outline-none bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[15px] text-gray-900 text-sm transition-all outline-none placeholder-gray-400"
                     placeholder="Enter Hospital ID"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-[7px]">Password</label>
                  <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full focus:ring-0 focus:ring-offset-0 focus:outline-none bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[15px] text-gray-900 text-sm transition-all outline-none placeholder-gray-400"
                     placeholder="Enter your password"
                  />
               </div>

               {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-[15px] text-sm font-medium flex items-center gap-2">
                     <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     {error}
                  </div>
               )}

               {/* Separator line */}
               <div className="border-t border-gray-100"></div>

               <div>
                  <button
                     type="submit"
                     disabled={isLoading}
                     className="w-full py-4 rounded-full bg-[#17406E] text-white font-semibold text-sm hover:bg-[#1c5b7e] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                     {isLoading ? 'Authenticating...' : 'Log In'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
};

export default Login;