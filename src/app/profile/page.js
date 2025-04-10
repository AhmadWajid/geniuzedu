"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Changed from 'next/router' to 'next/navigation'
import { 
  onAuthStateChanged, 
  updateUserProfile, 
  updateUserEmail, 
  updateUserPassword, 
  reauthenticateUser 
} from '../../firebase/auth';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setEmail(currentUser.email || '');
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await updateUserProfile({ displayName });
      setMessage('Profile updated successfully!');
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('Current password is required to update email');
      return;
    }
    
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await reauthenticateUser(currentPassword);
      await updateUserEmail(email);
      setMessage('Email updated successfully!');
      setCurrentPassword('');
    } catch (error) {
      setError('Failed to update email: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('Current password is required to set a new password');
      return;
    }
    
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await reauthenticateUser(currentPassword);
      await updateUserPassword(newPassword);
      setMessage('Password updated successfully!');
      setNewPassword('');
      setCurrentPassword('');
    } catch (error) {
      setError('Failed to update password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Edit Profile</h1>
          
          {error && (
            <div className="mb-4 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="mb-4 bg-green-50 p-4 rounded-md">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Update Profile</h2>
              <form onSubmit={handleUpdateProfile}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ef9441] focus:border-[#ef9441]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef9441] hover:bg-[#d87b2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef9441] disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Update Email</h2>
              <form onSubmit={handleUpdateEmail}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ef9441] focus:border-[#ef9441]"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ef9441] focus:border-[#ef9441]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef9441] hover:bg-[#d87b2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef9441] disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <form onSubmit={handleUpdatePassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ef9441] focus:border-[#ef9441]"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#ef9441] focus:border-[#ef9441]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef9441] hover:bg-[#d87b2e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef9441] disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}