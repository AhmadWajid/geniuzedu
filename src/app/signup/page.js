'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { registerUser } from '../../firebase/auth';

export default function SignUp() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await registerUser(formData.email, formData.password, formData.name);
      router.push('/dashboard');
    } catch (error) {
      setError(error.message.replace('Firebase:', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");
    
    try {
      const provider = new GoogleAuthProvider();
      
      try {
        // First try popup method
        const result = await signInWithPopup(auth, provider);
        
        if (result.user) {
          router.push('/dashboard');
        }
      } catch (popupError) {
        console.error('Popup error:', popupError);
        
        // If popup fails, try redirect method
        if (popupError.code === 'auth/cancelled-popup-request' || 
            popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user') {
          
          setError('Popup was blocked or closed. Switching to redirect method...');
          // Use redirect as fallback
          signInWithRedirect(auth, provider);
          return;
        }
        
        // For other errors, throw to be caught by outer catch block
        throw popupError;
      }
    } catch (error) {
      console.error('Google Sign Up Error:', error);
      
      // More specific error messages
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completion. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please enable popups for this site.');
      } else {
        setError('Failed to sign in with Google. Please try again or use email registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
        <div className="max-w-md mx-auto pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{' '}
              <Link href="/login" className="font-medium text-[#ef9441] hover:text-[#d87b2e]">
                sign in to your existing account
              </Link>
            </p>
          </div>

          <div className="mt-8 bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 mb-6"
            >
              <img src="/assets/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#ef9441] focus:border-[#ef9441] sm:text-sm text-black"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#ef9441] focus:border-[#ef9441] sm:text-sm text-black"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#ef9441] focus:border-[#ef9441] sm:text-sm text-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef9441] hover:bg-[#d87b2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef9441] disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}