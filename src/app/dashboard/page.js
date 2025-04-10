"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../firebase/config";
// Import signOut directly from firebase/auth
import { signOut as firebaseSignOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown size";
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Helper function to format date
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Improved document fetching function
  const fetchUserDocuments = useCallback(async (userId) => {
    try {
      if (!userId) return;
      
      setError(null);
      console.time('Firestore query');
      
      // Updated to use user-specific collection path
      const q = query(
        collection(db, `users/${userId}/documents`), 
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q).catch(err => {
        console.error("Firestore query failed:", err);
        throw new Error(`Firestore query failed: ${err.message}`);
      });
      
      console.timeEnd('Firestore query');
      
      const userDocs = [];
      querySnapshot.forEach(doc => {
        // Safely extract data with null checks
        const data = doc.data();
        userDocs.push({
          id: doc.id,
          fileName: data.fileName || 'Unnamed document',
          createdAt: data.createdAt?.toDate?.() || null,
          fileUrl: data.fileUrl || '',
          fileSize: data.fileSize || 0,
          fileType: data.fileType || '',
          status: data.status || '',
          storagePath: data.storagePath || '',
          ...data
        });
      });
      
      setDocuments(userDocs.length ? userDocs : [
        {
          id: 'empty-state',
          fileName: 'No documents found',
          isStorageNotice: true
        }
      ]);
    } catch (err) {
      console.error("Document fetch error:", err);
      setError(`Failed to fetch documents: ${err.message}`);
      setDocuments([
        {
          id: 'error-state',
          fileName: 'Error loading documents',
          isStorageNotice: true,
          isError: true
        }
      ]);
    }
  }, []);

  // Auth state listener with better error handling
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        router.push('/');
      } else {
        fetchUserDocuments(currentUser.uid);
      }
    }, (error) => {
      console.error("Auth state error:", error);
      setError(`Authentication error: ${error.message}`);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [router, fetchUserDocuments]);

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      setError(`Sign out failed: ${error.message}`);
    }
  };

  const uploadFileToFirebase = async (file) => {
    if (!file || !user) return null;
    
    try {
      setUploading(true);
      setError(null);
      
      // Verify user ID is available
      if (!user.uid) {
        throw new Error("User ID not available. Please try logging in again.");
      }
      
      console.log("Current user ID:", user.uid);
      
      // 1. Create initial document in Firestore to track upload
      const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
        fileName: file.name,
        userId: user.uid,
        createdAt: new Date(),
        fileType: file.type,
        fileSize: file.size,
        status: 'uploading',
        lastUpdated: new Date(),
        uploadedBy: user.email || user.displayName || user.uid,
        tags: []
      }).catch(err => {
        console.error("Document creation failed:", err);
        throw new Error(`Couldn't initialize document record: ${err.message}`);
      });
      
      // 2. Upload file to Firebase Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const userFolderPath = `documents/users/${user.uid}`;
      const filePath = `${userFolderPath}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      console.log("Uploading file to:", filePath);
      
      // Safety check for storage path
      if (!filePath.includes(user.uid)) {
        throw new Error("Storage path validation failed: User ID not included in path");
      }
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, file).catch(err => {
        console.error("Storage upload failed:", err);
        if (err.code === 'storage/unauthorized') {
          throw new Error(`Permission denied: Check Firebase Storage rules for access to ${userFolderPath}`);
        }
        throw new Error(`File upload failed: ${err.message}`);
      });
      
      console.log("File uploaded successfully to path:", filePath);
      
      // 3. Get the download URL
      const downloadURL = await getDownloadURL(storageRef).catch(err => {
        console.error("Failed to get download URL:", err);
        throw new Error(`Couldn't get file URL: ${err.message}`);
      });
      
      // 4. Save the URL in Firestore
      const documentRef = doc(db, `users/${user.uid}/documents`, docRef.id);
      await updateDoc(documentRef, {
        fileUrl: downloadURL,
        status: 'complete',
        lastUpdated: new Date(),
        storagePath: filePath // Store the storage path for potential future management
      }).catch(err => {
        console.error("Document update failed:", err);
        throw new Error(`Couldn't update document with download URL: ${err.message}`);
      });
      
      console.log("Document updated with download URL:", downloadURL);
      
      // Refresh documents list
      await fetchUserDocuments(user.uid);
      router.push(`/document/${docRef.id}`);
      
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile?.type === "application/pdf" && selectedFile.size <= 20 * 1024 * 1024) {
      setFile(selectedFile);
      await uploadFileToFirebase(selectedFile);
    } else {
      alert("Please select a PDF file under 20MB");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf" && droppedFile.size <= 20 * 1024 * 1024) {
      setFile(droppedFile);
      await uploadFileToFirebase(droppedFile);
    } else {
      alert("Please drop a PDF file under 20MB");
    }
  };

  const handleDocumentClick = (documentId) => {
    if (documentId === 'empty-state' || documentId === 'error-state') return;
    // Pass user ID as query parameter for document access
    router.push(`/document/${documentId}?uid=${user.uid}`);
  };

  // Add function to delete document
  const handleDeleteDocument = async (docId, storagePath, event) => {
    // Ensure we prevent the event from bubbling up
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    try {
      setDeleting(true);
      
      if (!user || !user.uid) {
        throw new Error("User not authenticated");
      }
      // Delete document from Firestore
      const documentRef = doc(db, `users/${user.uid}/documents`, docId);
      await deleteDoc(documentRef);
      
      // Delete file from Storage if path exists
      if (storagePath) {
        try {
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);
          console.log("File deleted from storage:", storagePath);
        } catch (storageErr) {
          console.error("Storage delete error (non-fatal):", storageErr);
          // Continue even if storage deletion fails
        }
      }
      
      // Update UI by filtering out the deleted document
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
      
      console.log("Document successfully deleted:", docId);
      setDeleteConfirm(null);
      
      // If documents array is now empty, set it to show the empty state message
      if (documents.length === 1) {
        setDocuments([{
          id: 'empty-state',
          fileName: 'No documents found',
          isStorageNotice: true
        }]);
      }
      
    } catch (err) {
      console.error("Delete error:", err);
      setError(`Failed to delete document: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Clear delete confirmation when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setDeleteConfirm(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="container mx-auto px-6 py-10">
        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 shadow-md p-6 mb-8 border-l-4 border-[#58b595]">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Upload Document</h2>
          <div
            className="border border-gray-300 dark:border-gray-700 p-8 text-center hover:border-[#58b595] dark:hover:border-[#58b595] transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
              <path d="M12 12v6"></path>
              <path d="m15 15-3-3-3 3"></path>
            </svg>
            <div className="mt-6 flex flex-col items-center">
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                <div className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" x2="12" y1="3" y2="15"></line>
                  </svg>
                  {uploading ? 'Uploading...' : 'Choose PDF'}
                </div>
              </label>
              <span className="text-gray-500 dark:text-gray-400 mt-3">or drag and drop</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Maximum file size: 20MB</p>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white dark:bg-gray-800 shadow-md p-6 border-l-4 border-[#58b595]">
          <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Documents</h2>
            {error && (
              <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1">
                {error}
              </span>
            )}
          </div>

          {documents.length === 0 || documents[0]?.isStorageNotice ? (
            <div className="text-center py-10 border border-gray-200 dark:border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2" />
                <path d="M12 17h.01" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">You haven't uploaded any documents yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`relative border-l-4 border-[#58b595] bg-white dark:bg-gray-800 shadow-md cursor-pointer ${doc.status === 'uploading' ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                  onClick={() => handleDocumentClick(doc.id)}
                >
                  <div className="p-5">
                    <div className="flex items-start space-x-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[#58b595]">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                      </svg>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.fileName}</h3>
                          {doc.status === 'uploading' && (
                            <span className="ml-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200">
                              Processing
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{doc.createdAt && doc.createdAt.seconds ? formatDate(new Date(doc.createdAt.seconds * 1000)) : ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delete button - only show for actual documents */}
                  {!doc.isStorageNotice && (
                    <button
                      onClick={(e) => handleDeleteDocument(doc.id, doc.storagePath, e)}
                      className={`absolute top-2 right-2 p-2 ${deleteConfirm === doc.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'} hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors`}
                      disabled={deleting && deleteConfirm === doc.id}
                    >
                      {deleteConfirm === doc.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}