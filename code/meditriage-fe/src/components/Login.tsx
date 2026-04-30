import React, { useState } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';

interface LoginProps {
   onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [error, setError] = useState('');
   const [isLoading, setIsLoading] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!username.trim() || !password.trim()) {
         setError('Please enter both username and password');
         return;
      }

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
         <div className="w-full max-w-[350px] bg-white rounded-[45px] shadow-md p-[25px] pb-[30px] mx-4">

            {/* Logo */}
            <div className="flex justify-center mb-[30px]">
               <img
                  src="/assets/branding/MediTriage.png"
                  alt="MediTriage"
                  className="h-[8rem] object-contain"
               />
            </div>

            {/* Login Heading */}
            {/* <div className="text-center mb-[25px]">
               <h1 className="text-2xl font-bold text-[#17406E]">User Login</h1>
               <p className="text-gray-500 text-sm mt-2">Access your medical dashboard</p>
            </div> */}

            <form onSubmit={handleSubmit} className="space-y-6">
               <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-[7px]">Username</label>
                  <input
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     className="w-full focus:ring-0 focus:ring-offset-0 focus:outline-none bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[12px] text-gray-900 text-sm transition-all outline-none placeholder-gray-400"
                     placeholder="Enter Hospital ID"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-[7px]">Password</label>
                  <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full focus:ring-0 focus:ring-offset-0 focus:outline-none bg-[#f0f2f7] border-0 rounded-[18px] px-[20px] py-[12px] text-gray-900 text-sm transition-all outline-none placeholder-gray-400"
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
                     className="w-full p-[14px] rounded-full bg-[#17406E] text-white font-semibold text-sm hover:bg-[#1c5b7e] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
