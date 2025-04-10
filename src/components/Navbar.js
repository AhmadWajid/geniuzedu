"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config"; // Import auth from your firebase.js in src directory

const Navbar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 min-w-0">
          <img
            src="/assets/logo.png"
            alt="Geniuz Edu Logo"
            className="w-11 h-10 rounded-full bg-gradient-to-r flex items-center justify-center text-white font-semibold"
          />

            <div className="flex flex-col min-w-0">
              <span className="text-lg md:text-2xl font-bold truncate">
                <span className="text-gray-900">Geniuz</span>
                <span className="bg-gradient-to-r from-[#ef9441] to-[#d87b2e] bg-clip-text text-transparent">Edu</span>
              </span>
            </div>
          </Link>
          
          {/* Navigation and Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            
            <div className="flex items-center gap-2 md:gap-4">
              <Link className="text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2 text-black" href="/pricing">Pricing</Link>
              
              {user ? (
                <>
                  <button 
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Sign Out
                  </button>
                  <Link className="text-lg md:text-base px-3 md:px-4 py-1.5 md:py-2 bg-[#ef9441] rounded font-semibold text-white" href="/dashboard">Dashboard</Link>
                  <Link 
                    className="text-sm md:text-base p-2 text-black hover:text-gray-600" 
                    href="/profile"
                    title="Profile"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <Link className="text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2 text-black" href="/login">Sign In</Link>
                  <Link className="text-lg md:text-base px-3 md:px-4 py-1.5 md:py-2 bg-[#ef9441] rounded font-semibold text-white" href="/signup">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
