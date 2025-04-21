"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "../../firebase/config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

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
  const [uploadType, setUploadType] = useState('pdf'); // now includes 'pdf', 'text', or 'youtube'
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [fetchingSubtitles, setFetchingSubtitles] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combinedDocName, setCombinedDocName] = useState('');
  const [combiningDocs, setCombiningDocs] = useState(false);
  const [orderedDocuments, setOrderedDocuments] = useState([]); // New state for ordered docs
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
    if (!selectedFile || !user) return;

    if (selectedFile.type === "application/pdf" && selectedFile.size <= 20 * 1024 * 1024) {
      setFile(selectedFile);
      await uploadFileToFirebase(selectedFile);
    } else if ((selectedFile.type === "text/plain" || selectedFile.name.endsWith('.txt')) && selectedFile.size <= 5 * 1024 * 1024) {
      await handleTxtFileUpload({ target: { files: [selectedFile] } });
    } else {
      alert("Please select a PDF file under 20MB or a TXT file under 5MB");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile || !user) return;

    if (droppedFile.type === "application/pdf" && droppedFile.size <= 20 * 1024 * 1024) {
      setFile(droppedFile);
      await uploadFileToFirebase(droppedFile);
    } else if ((droppedFile.type === "text/plain" || droppedFile.name.endsWith('.txt')) && droppedFile.size <= 5 * 1024 * 1024) {
      await handleTxtFileUpload({ target: { files: [droppedFile] } });
    } else {
      alert("Please drop a PDF file under 20MB or a TXT file under 5MB");
    }
  };

  const handleDocumentClick = (documentId) => {
    if (documentId === 'empty-state' || documentId === 'error-state') return;

    if (isSelectionMode) {
      setSelectedDocuments(prevSelected => {
        if (prevSelected.includes(documentId)) {
          return prevSelected.filter(id => id !== documentId);
        } else {
          return [...prevSelected, documentId];
        }
      });
    } else {
      router.push(`/document/${documentId}?uid=${user.uid}`);
    }
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

  const handleTxtFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
      alert("Please upload a .txt file");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });

      const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
        fileName: file.name,
        userId: user.uid,
        createdAt: new Date(),
        fileType: 'text/plain',
        status: 'complete',
        lastUpdated: new Date(),
        uploadedBy: user.email || user.displayName || user.uid,
        tags: [],
        isTextDocument: true,
        textContent: fileContent,
        extractedText: fileContent
      });

      await fetchUserDocuments(user.uid);
      router.push(`/document/${docRef.id}?uid=${user.uid}`);
    } catch (error) {
      console.error("Text file upload error:", error);
      setError(error.message);
      alert(`Failed to upload text file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim() || !textTitle.trim() || !user) return;

    try {
      setUploading(true);
      setError(null);

      if (!user.uid) {
        throw new Error("User ID not available. Please try logging in again.");
      }

      const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
        fileName: textTitle.trim(),
        userId: user.uid,
        createdAt: new Date(),
        fileType: 'text/plain',
        status: 'complete',
        lastUpdated: new Date(),
        uploadedBy: user.email || user.displayName || user.uid,
        tags: [],
        isTextDocument: true,
        textContent: textContent,
        extractedText: textContent
      });

      await fetchUserDocuments(user.uid);

      setTextTitle('');
      setTextContent('');

      router.push(`/document/${docRef.id}?uid=${user.uid}`);

    } catch (error) {
      console.error("Text submission error:", error);
      setError(error.message);
      alert(`Failed to save text document: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const fetchYoutubeSubtitles = async () => {
    if (!youtubeUrl.trim()) return;

    try {
      setFetchingSubtitles(true);
      setError(null);

      let videoId = '';
      const url = new URL(youtubeUrl);

      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.substring(1);
      } else if (url.hostname.includes('youtube.com')) {
        videoId = url.searchParams.get('v');
      }

      if (!videoId) {
        throw new Error("Invalid YouTube URL. Please provide a valid YouTube video link.");
      }

      const response = await fetch('/api/youtube-subtitles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch subtitles");
      }

      const data = await response.json();

      if (!data.transcript || data.transcript.length === 0) {
        throw new Error("No subtitles found for this video. The video might not have subtitles or they are disabled.");
      }

      const videoTitle = youtubeTitle.trim() || `YouTube Video: ${data.videoTitle || videoId}`;

      const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
        fileName: videoTitle,
        userId: user.uid,
        createdAt: new Date(),
        fileType: 'text/plain',
        status: 'complete',
        lastUpdated: new Date(),
        uploadedBy: user.email || user.displayName || user.uid,
        tags: [],
        isTextDocument: false,
        youtubeVideoId: videoId,
        youtubeVideoUrl: youtubeUrl,
        youtubeEmbedUrl: `https://www.youtube.com/embed/${videoId}`,
        textContent: data.transcript,
        extractedText: data.transcript,
        sourceType: 'youtube',
        videoTitle: data.videoTitle || ''
      });

      await fetchUserDocuments(user.uid);

      setYoutubeUrl('');
      setYoutubeTitle('');

      router.push(`/document/${docRef.id}?uid=${user.uid}`);

    } catch (error) {
      console.error("YouTube subtitle fetch error:", error);
      setError(error.message);
      alert(`Failed to get subtitles: ${error.message}`);
    } finally {
      setFetchingSubtitles(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedDocuments([]);
  };

  const toggleDocumentSelection = (documentId, event) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedDocuments(prevSelected => {
      if (prevSelected.includes(documentId)) {
        return prevSelected.filter(id => id !== documentId);
      } else {
        return [...prevSelected, documentId];
      }
    });
  };

  const moveDocumentUp = (index) => {
    if (index === 0) return; // Already at the top
    const newOrder = [...orderedDocuments];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setOrderedDocuments(newOrder);
  };

  const moveDocumentDown = (index) => {
    if (index === orderedDocuments.length - 1) return; // Already at the bottom
    const newOrder = [...orderedDocuments];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setOrderedDocuments(newOrder);
  };

  const handleCombineDocuments = async () => {
    if (selectedDocuments.length < 2 || !combinedDocName.trim() || !user) {
      return;
    }

    try {
      setCombiningDocs(true);

      let allTexts = [];
      let allFileTypes = new Set();
      let containsPdfs = false;

      for (const doc of orderedDocuments) {
        allTexts.push(`## ${doc.fileName}\n\n`);

        if (doc.isTextDocument) {
          allTexts.push(doc.textContent || doc.extractedText || '');
        } else if (doc.sourceType === 'youtube') {
          allTexts.push(doc.textContent || doc.extractedText || '');
          allFileTypes.add('youtube');
        } else if (doc.fileType === "application/pdf") {
          allTexts.push(doc.extractedText || '');
          containsPdfs = true;
          allFileTypes.add('pdf');
        }

        allTexts.push('\n\n---\n\n');
      }

      const combinedText = allTexts.join('');

      let primaryFileType = 'text/plain';
      let isTextDocument = true;
      if (containsPdfs) {
        primaryFileType = 'application/pdf';
        isTextDocument = false;
      }

      const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
        fileName: combinedDocName.trim(),
        userId: user.uid,
        createdAt: new Date(),
        fileType: primaryFileType,
        status: 'complete',
        lastUpdated: new Date(),
        uploadedBy: user.email || user.displayName || user.uid,
        tags: [],
        isTextDocument: isTextDocument,
        isCombinedDocument: true,
        sourceDocumentIds: selectedDocuments,
        textContent: combinedText,
        extractedText: combinedText,
        combinedFileTypes: Array.from(allFileTypes),
        documentOrder: orderedDocuments.map(doc => doc.id)
      });

      await fetchUserDocuments(user.uid);

      setSelectedDocuments([]);
      setIsSelectionMode(false);
      setShowCombineModal(false);
      setCombinedDocName('');

      router.push(`/document/${docRef.id}?uid=${user.uid}`);

    } catch (error) {
      console.error("Error combining documents:", error);
      alert(`Failed to combine documents: ${error.message}`);
    } finally {
      setCombiningDocs(false);
    }
  };

  useEffect(() => {
    if (showCombineModal && selectedDocuments.length >= 2) {
      const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
      setOrderedDocuments(selectedDocs);
    }
  }, [showCombineModal, selectedDocuments, documents]);

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
    <div className="min-h-screen bg-[#f8f7f2]  bg-[white] bg-repeat">
      <main className="container mx-auto px-6 py-10">

        <div className="bg-white   p-6 mb-8 border-2 border-[#58b595] sketchy-box relative">
          <div className="absolute -top-3 -left-2 bg-[#58b595] text-white px-4 py-1 skewed-tab transform -rotate-2">
            <h2 className="text-xl font-bold">Upload Document</h2>
          </div>

          <div className="mt-4 mb-2 flex justify-center">
            <div className="inline-flex rounded-md shadow-sm p-1 bg-gray-100  ">
              <button
                type="button"
                onClick={() => setUploadType('pdf')}
                className={`px-4 py-2 text-sm font-medium text-gray-400 rounded-md transition-colors ${
                  uploadType === 'pdf' 
                    ? 'bg-white   text-gray-900  shadow-sm' 
                    : 'text-gray-500  hover:text-gray-700 '
                }`}
              >
                Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setUploadType('text')}
                className={`px-4 py-2 text-sm font-medium text-gray-400 rounded-md transition-colors ${
                  uploadType === 'text' 
                    ? 'bg-white   text-gray-900  shadow-sm' 
                    : 'text-gray-500  hover:text-gray-700 '
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setUploadType('youtube')}
                className={`px-4 py-2 text-sm font-medium text-gray-400 rounded-md transition-colors ${
                  uploadType === 'youtube' 
                    ? 'bg-white   text-gray-900  shadow-sm' 
                    : 'text-gray-500  hover:text-gray-700 '
                }`}
              >
                YouTube Video
              </button>
            </div>
          </div>

          <div className="mt-4 pt-2">
            {uploadType === 'youtube' ? (
              <div className="bg-[#fbfbf8]   border-2 border-gray-400  p-6 rounded-md hover:border-[#58b595] transition-colors sketchy-text-area">
                <div className="mb-4">
                  <label htmlFor="youtubeTitle" className="block text-sm font-medium text-gray-400 text-gray-700  mb-1">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    id="youtubeTitle"
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-400  rounded-md focus:outline-none focus:ring-2 focus:ring-[#58b595]   "
                    placeholder="Enter document title (or we'll use the video title)"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-400 text-gray-700  mb-1">
                    YouTube Video URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="youtubeUrl"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#58b595]   "
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Paste a YouTube video URL to extract subtitles</p>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={fetchYoutubeSubtitles}
                    disabled={fetchingSubtitles || !youtubeUrl.trim()}
                    className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2 transform hover:rotate-1 hover:scale-105 sketchy-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fetchingSubtitles ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fetching Subtitles...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                        </svg>
                        Get Subtitles
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : uploadType === 'text' ? (
              <div className="bg-[#fbfbf8]   border-2 border-gray-400  p-6 rounded-md hover:border-[#58b595] transition-colors sketchy-text-area">
                <div className="mb-4">
                  <label htmlFor="textTitle" className="block text-sm font-medium text-gray-400 text-gray-700  mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="textTitle"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#58b595]   "
                    placeholder="Enter document title"
                  />
                </div>
                
                <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <label htmlFor="textContent" className="block text-sm font-medium text-gray-400 text-gray-700  mb-1">
                      Text Content
                    </label>
                    <textarea
                      id="textContent"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Paste or type your text here..."
                      className="w-full h-40 px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-[#58b595]   "
                    ></textarea>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleTextSubmit}
                    disabled={uploading || !textContent.trim() || !textTitle.trim()}
                    className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2 transform hover:rotate-1 hover:scale-105 sketchy-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {uploading ? 'Saving...' : 'Save Document'}
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="border-dashed border-2 border-gray-400  p-8 text-center hover:border-[#58b595] transition-colors bg-[#fbfbf8]   sketchy-upload-area"
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
                    <input type="file" className="hidden" accept=".pdf,.txt,text/plain" onChange={handleFileChange} />
                    <div className="px-6 py-3 bg-[#58b595] text-white hover:bg-[#e68a30] transition-colors flex items-center gap-2 transform hover:rotate-1 hover:scale-105 sketchy-button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" x2="12" y1="3" y2="15"></line>
                      </svg>
                      {uploading ? 'Uploading...' : 'Choose PDF or TXT'}
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-400  mt-2">PDF: max 20MB, TXT: max 5MB</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white   p-6 border-2 border-[#58b595] sketchy-box relative">
          <div className="absolute -top-3 -left-2 bg-[#58b595] text-white px-4 py-1 skewed-tab transform -rotate-2">
            <h2 className="text-xl font-bold">Your Documents</h2>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50  px-3 py-1 mt-4 sketchy-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {documents.length > 0 && !documents[0]?.isStorageNotice && (
            <div className="flex justify-between items-center mt-4 mb-2">
              <button
                onClick={toggleSelectionMode}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                  isSelectionMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {isSelectionMode ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 15.5L5 20.5L3 18.5"/>
                      <path d="M21 4L12 13L8 9"/>
                    </svg>
                    Cancel Selection
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M9 14l2 2 4-4"/>
                    </svg>
                    Select Documents
                  </>
                )}
              </button>
              
              {isSelectionMode && selectedDocuments.length >= 2 && (
                <button
                  onClick={() => setShowCombineModal(true)}
                  className="px-3 py-1.5 bg-[#58b595] text-white rounded-md hover:bg-[#e68a30] transition-colors flex items-center gap-1 text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8h6"/>
                    <path d="M19 5v6"/>
                    <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M9 13h6"/>
                  </svg>
                  Combine Selected ({selectedDocuments.length})
                </button>
              )}
            </div>
          )}

          <div className="mt-4 pt-2">
            {documents.length === 0 || documents[0]?.isStorageNotice ? (
              <div className="text-center py-10 border-dashed border-2 border-gray-300  sketchy-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-gray-400  mb-3 sketchy-icon">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2" />
                  <path d="M12 17h.01" />
                </svg>
                <p className="text-gray-500  ">📚 You haven't uploaded any documents yet</p>
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
                    className={`relative bg-[#fbfbf8]   cursor-pointer transform hover:rotate-1 hover:scale-101 transition-transform sketchy-document-card ${
                      doc.status === 'uploading' ? 'bg-gray-50  /50' : ''
                    } ${selectedDocuments.includes(doc.id) ? 'ring-2 ring-[#58b595] ring-offset-2' : ''}`}
                    onClick={() => handleDocumentClick(doc.id)}
                  >
                    {isSelectionMode && !doc.isStorageNotice && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedDocuments.includes(doc.id) ? 'bg-[#58b595] border-[#58b595]' : 'border-gray-400 bg-white'
                        }`}>
                          {selectedDocuments.includes(doc.id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-5 pt-6 border-2 border-[#58b595] sketchy-doc-border">
                      <div className="ml-2 border-l-4 border-[#58b595] pl-3 sketchy-doc-content">
                        <div className="flex items-start space-x-2">
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center">
                              <h3 className="font-medium text-gray-900  truncate  text-lg">{doc.fileName}</h3>
                              {doc.status === 'uploading' && (
                                <span className="ml-2 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 sketchy-status">
                                  ⏳ Processing
                                </span>
                              )}
                              {doc.isCombinedDocument && (
                                <span className="ml-2 px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200 sketchy-status">
                                  Combined
                                </span>
                              )}
                            </div>
                            <div className="flex items-start mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#58b595" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <p className="text-sm text-gray-500  ">
                                {doc.createdAt && doc.createdAt.seconds ? formatDate(new Date(doc.createdAt.seconds * 1000)) : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!doc.isStorageNotice && !isSelectionMode && (
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, doc.storagePath, e)}
                        className={`absolute bottom-2 right-2 p-2 rounded-full sketchy-delete-btn
                          ${deleteConfirm === doc.id ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500   '}`}
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

      {showCombineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Combine Documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              You're about to combine {selectedDocuments.length} documents into one. This will create a new document with all content merged together.
              Use the arrows to arrange documents in the desired order.
            </p>
            
            <div className="mb-4">
              <label htmlFor="combinedName" className="block text-sm font-medium text-gray-700 mb-1">
                Name for Combined Document
              </label>
              <input
                type="text"
                id="combinedName"
                value={combinedDocName}
                onChange={(e) => setCombinedDocName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#58b595]"
                placeholder="Enter a name for the combined document"
              />
            </div>
            
            <div className="text-sm bg-gray-100 p-3 rounded-md mb-4 max-h-60 overflow-y-auto">
              <p className="font-medium mb-2">Arrange documents in desired order:</p>
              <ul className="space-y-2">
                {orderedDocuments.map((doc, index) => (
                  <li key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <span className="text-gray-700 flex-1 truncate">{index + 1}. {doc.fileName}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => moveDocumentUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 15-6-6-6 6"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => moveDocumentDown(index)}
                        disabled={index === orderedDocuments.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCombineModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCombineDocuments}
                disabled={!combinedDocName.trim() || combiningDocs}
                className="px-4 py-2 bg-[#58b595] text-white rounded-md hover:bg-[#e68a30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {combiningDocs ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Combining...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8h6"/>
                      <path d="M19 5v6"/>
                      <path d="M15 3H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <path d="M9 13h6"/>
                    </svg>
                    Combine Documents
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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