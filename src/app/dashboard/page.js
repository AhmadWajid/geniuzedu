"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../firebase/config";
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

  const fetchUserDocuments = useCallback(async (userId) => {
    try {
      if (!userId) return;

      setError(null);
      console.time('Firestore query');

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

      if (!user.uid) {
        throw new Error("User ID not available. Please try logging in again.");
      }

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

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const userFolderPath = `documents/users/${user.uid}`;
      const filePath = `${userFolderPath}/${fileName}`;
      const storageRef = ref(storage, filePath);

      if (!filePath.includes(user.uid)) {
        throw new Error("Storage path validation failed: User ID not included in path");
      }

      await uploadBytes(storageRef, file).catch(err => {
        console.error("Storage upload failed:", err);
        if (err.code === 'storage/unauthorized') {
          throw new Error(`Permission denied: Check Firebase Storage rules for access to ${userFolderPath}`);
        }
        throw new Error(`File upload failed: ${err.message}`);
      });

      const downloadURL = await getDownloadURL(storageRef).catch(err => {
        console.error("Failed to get download URL:", err);
        throw new Error(`Couldn't get file URL: ${err.message}`);
      });

      const documentRef = doc(db, `users/${user.uid}/documents`, docRef.id);
      await updateDoc(documentRef, {
        fileUrl: downloadURL,
        status: 'complete',
        lastUpdated: new Date(),
        storagePath: filePath
      }).catch(err => {
        console.error("Document update failed:", err);
        throw new Error(`Couldn't update document with download URL: ${err.message}`);
      });

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
    router.push(`/document/${documentId}?uid=${user.uid}`);
  };

  const handleDeleteDocument = async (docId, storagePath, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      setDeleting(true);

      if (!user || !user.uid) {
        throw new Error("User not authenticated");
      }

      const documentRef = doc(db, `users/${user.uid}/documents`, docId);
      await deleteDoc(documentRef);

      if (storagePath) {
        try {
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.error("Storage delete error (non-fatal):", storageErr);
        }
      }

      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));

      setDeleteConfirm(null);

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
    <div className="min-h-screen bg-[#f8f7f2] dark:bg-gray-900 bg-[white] bg-repeat">
      <main className="container mx-auto px-6 py-10">

        <div className="bg-white dark:bg-gray-800 p-6 mb-8 border-2 border-[#58b595] sketchy-box relative">
          <div className="absolute -top-3 -left-2 bg-[#58b595] text-white px-4 py-1 skewed-tab transform -rotate-2">
            <h2 className="text-xl font-bold">Upload Document</h2>
          </div>


          <div className="mt-4 pt-2">
            <div 
              className="border-dashed border-2 border-gray-400 dark:border-gray-600 p-8 text-center hover:border-[#58b595] transition-colors bg-[#fbfbf8] dark:bg-gray-800 sketchy-upload-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-[#58b595] sketchy-icon">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                <path d="M12 12v6"></path>
                <path d="m15 15-3-3-3 3"></path>
              </svg>
              <div className="mt-6 flex flex-col items-center">
                <label className="cursor-pointer">
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                  <div className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2 transform hover:rotate-1 hover:scale-105 sketchy-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" x2="12" y1="3" y2="15"></line>
                    </svg>
                    {uploading ? 'Uploading...' : 'Choose PDF'}
                  </div>
                </label>
               
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Maximum file size: 20MB</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 border-2 border-[#58b595] sketchy-box relative">
          <div className="absolute -top-3 -left-2 bg-[#58b595] text-white px-4 py-1 skewed-tab transform -rotate-2">
            <h2 className="text-xl font-bold">Your Documents</h2>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 mt-4 sketchy-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="mt-4 pt-2">
            {documents.length === 0 || documents[0]?.isStorageNotice ? (
              <div className="text-center py-10 border-dashed border-2 border-gray-300 dark:border-gray-700 sketchy-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3 sketchy-icon">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2" />
                  <path d="M12 17h.01" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 ">📚 You haven't uploaded any documents yet</p>
                <div className="mt-3 flex justify-center">
                  <svg className="hand-drawn-circle" width="100" height="40" viewBox="0 0 100 40" fill="none">
                    <ellipse cx="50" cy="20" rx="45" ry="15" stroke="#58b595" strokeWidth="1" strokeDasharray="5 3" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`relative bg-[#fbfbf8] dark:bg-gray-800 cursor-pointer transform hover:rotate-1 hover:scale-101 transition-transform sketchy-document-card ${doc.status === 'uploading' ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                    onClick={() => handleDocumentClick(doc.id)}
                  >

                    <div className="p-5 pt-6 border-2 border-[#58b595] sketchy-doc-border">
                      <div className="ml-2 border-l-4 border-[#58b595] pl-3 sketchy-doc-content">
                        <div className="flex items-start space-x-2">
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate  text-lg">{doc.fileName}</h3>
                              {doc.status === 'uploading' && (
                                <span className="ml-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 sketchy-status">
                                  ⏳ Processing
                                </span>
                              )}
                            </div>
                            <div className="flex items-start mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58b595" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <p className="text-sm text-gray-500 dark:text-gray-400 ">
                                {doc.createdAt && doc.createdAt.seconds ? formatDate(new Date(doc.createdAt.seconds * 1000)) : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!doc.isStorageNotice && (
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, doc.storagePath, e)}
                        className={`absolute bottom-2 right-2 p-2 rounded-full sketchy-delete-btn
                          ${deleteConfirm === doc.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
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

          <div className="mt-6 py-2 flex justify-center">
            <div className="sketchy-doodle w-32 h-4 border-b-2 border-[#58b595] opacity-50"></div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Kalam:wght@300;400;700&display=swap');
        
        . {
          font-family: 'Caveat', cursive;
        }
        
        .sketchy-box {
          border-radius: 8px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.05);
          position: relative;
        }
        
        .skewed-tab {
          border-radius: 4px 4px 0 0;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
        }
        
        .sketchy-underline {
          position: relative;
        }
        
        .sketchy-underline:after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          left: 3px;
          top: 3px;
          background: #e68a30;
          border-radius: 4px;
          z-index: -1;
          opacity: 0.4;
        }
        
        .sketchy-upload-area {
          border-radius: 8px;
          position: relative;
        }
        
        .sketchy-upload-area:after {
          content: '';
          position: absolute;
          top: 8px;
          left: 8px;
          right: -8px;
          bottom: -8px;
          border: 1px dashed #58b595;
          border-radius: 8px;
          z-index: -1;
          opacity: 0.3;
        }
        
        .sketchy-button {
          border-radius: 4px;
          position: relative;
          overflow: visible;
        }
        
        .sketchy-button:after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
          z-index: -1;
        }
        
        .sketchy-icon {
          filter: url('#sketchy-filter');
        }
        
        .sketchy-document-card {
          border-radius: 4px;
          position: relative;
        }
        
        .sketchy-doc-border {
          border-radius: 4px;
          position: relative;
        }
        
        .hand-drawn-arrow-container {
          position: relative;
        }
        
        .hand-drawn-arrow {
          position: absolute;
          top: -15px;
          right: -25px;
          transform: rotate(15deg);
        }
        
        .sketchy-delete-btn {
          transition: all 0.2s;
          border: 1px solid currentColor;
        }
        
        .sketchy-delete-btn:hover {
          transform: rotate(5deg);
        }
        
        .sketchy-circle {
          box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
        }
      `}</style>

      <svg width="0" height="0" style={{position:'absolute'}}>
        <filter id="sketchy-filter">
          <feTurbulence baseFrequency="0.01" numOctaves="3" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="2" />
        </filter>
      </svg>
    </div>
  );
}