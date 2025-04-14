"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config"; // Import auth from your firebase.js in src directory

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setMobileMenuOpen(false); // Close menu after sign out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
                <span className="bg-gradient-to-r from-[#58b595] to-[#5aa613] bg-clip-text text-transparent">Edu</span>
              </span>
            </div>
          </Link>
          
          {/* Hamburger Menu Button (mobile only) */}
          <button 
            className="md:hidden p-2 rounded-md text-gray-800 hover:bg-gray-100 focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/pricing" 
              className="group relative px-5 py-2.5 overflow-hidden rounded-lg bg-gradient-to-br from-[#58b595] to-[#5aa613] text-white font-medium shadow-md hover:scale-105 transition-all duration-200 ease-out"
            >
              <span className="relative flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Upgrade
                <span className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-white transform -translate-x-1/2 group-hover:w-full transition-all duration-300"></span>
              </span>
              <span className="absolute top-0 left-0 w-full h-full bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out rounded-lg"></span>
            </Link>
            
            {user ? (
              <>
                <Link className="text-base px-4 py-2 bg-[#58b595] rounded font-semibold text-white" href="/dashboard">Dashboard</Link>
                <button 
                  onClick={handleSignOut}
                  className="text-base p-2 bg-red-500 hover:bg-red-700 rounded text-white transition-colors"
                  title="Sign Out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
                <Link 
                  className="text-base p-2 bg-[#5aa613] hover:bg-[#4a8f10] rounded text-white transition-colors" 
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
                <Link className="text-base px-4 py-2 text-black" href="/login">Sign In</Link>
                <Link className="text-base px-4 py-2 bg-[#58b595] rounded font-semibold text-white" href="/signup">Get Started</Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'} transition-all duration-300 ease-in-out`}>
          <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
            <Link 
              className="block px-3 py-2.5 rounded-md text-base font-medium bg-gradient-to-r from-[#58b595] to-[#5aa613] text-white shadow-sm flex items-center gap-1.5"
              href="/pricing" 
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Upgrade
            </Link>
            
            {user ? (
              <>
                <Link 
                  className="block px-3 py-2 rounded-md text-base font-medium bg-[#58b595] text-white"
                  href="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  className="block px-3 py-2 rounded-md text-base font-medium bg-[#5aa613] text-white"
                  href="/profile" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium bg-red-500 text-white"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-[#58b595]" 
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link 
                  className="block px-3 py-2 rounded-md text-base font-medium bg-[#58b595] text-white"
                  href="/signup" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
