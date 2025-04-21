"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../firebase/config'; // Make sure you have the correct path to your firebase config

const Hero = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user); // Sets to true if user exists, false otherwise
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  return (
    <div className="py-16 max-md:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
      <div className="flex gap-5 max-lg:flex-col items-center justify-center">
        {/* Left Column - Text Content */}
        <div className="flex flex-col w-[43%] max-lg:w-full max-w-[90vw]">
          <div className="flex flex-col items-center lg:items-start w-full">
            <h1 className="self-stretch text-center lg:text-left font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
              <span className="whitespace-nowrap text-black ">Learn Faster.</span><br/>
              <span className="whitespace-nowrap text-[#58b595]">Learn Quicker.</span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl leading-8 text-black  max-w-[434px] text-center lg:text-left">
              Upload once, get interactive flashcards and study notes instantly — powered by AI.
            </p>
            
            <div className="mt-7 relative">
              <Link
                className="group relative rounded-2xl bg-[#58b595] overflow-hidden transition-all duration-300 text-base md:text-xl lg:text-xl font-semibold text-white px-10 md:px-8 lg:px-12 py-4 md:py-4 lg:py-6"
                href={isLoggedIn ? "/dashboard" : "/signup"}
              >
                {isLoggedIn ? "Dashboard" : "Get Started"}
              </Link>
            </div>            
          </div>
        </div>
        
        {/* Right Column - Image */}
        <div className="flex flex-col items-center ml-5 w-[55%] max-lg:ml-0 max-lg:w-full">
          <div className="relative w-[600px] h-[482px] max-md:w-full max-md:h-[300px] rounded-2xl max-w-full">
            <div className="relative w-full h-full shadow-[0_0_11px_0px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_0px_rgba(255,255,255,0.1)] rounded-2xl overflow-hidden border border-gray-200  dark:bg-white">
              <Image 
                src="/assets/logo.png" 
                alt="Geniuz Edu Learning Interface" 
                fill
                className="object-contain rounded-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;