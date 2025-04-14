"use client";

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// Import react-pdf components
import { Document, Page, pdfjs } from 'react-pdf';
// Import CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import InteractivePanel from './InteractivePanel';
import * as Tesseract from 'tesseract.js';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

export default function DocumentPage({ params }) {
  // Unwrap params immediately
  const unwrappedParams = use(params);
  const documentId = unwrappedParams.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInputValue, setPageInputValue] = useState(''); // New state for page input
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  const [scale, setScale] = useState(1.0); // Add state for zoom control
  const router = useRouter();
  const searchParams = useSearchParams();

  // Add state for tab management
  const [activeTab, setActiveTab] = useState('chat');
  const [generatedContent, setGeneratedContent] = useState({
    chat: true, // Chat is enabled by default
    notes: false,
    flashcards: false,
    test: false  // Add test to generatedContent
  });

  // Add these new state variables for API interaction
  const [notesContent, setNotesContent] = useState('');
  const [notesError, setNotesError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  // Add state for PDF text content
  const [pdfTextContent, setPdfTextContent] = useState('');
  // Add state for content extraction status
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Add these new state variables for flashcards
  const [flashcardsContent, setFlashcardsContent] = useState([]);
  const [flashcardsError, setFlashcardsError] = useState(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  // Add these new state variables for tests
  const [testQuestions, setTestQuestions] = useState([]);
  const [testError, setTestError] = useState(null);

  // Add state for panel expansion
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Function to handle panel expansion toggle
  const handlePanelExpansion = (expanded) => {
    setIsPanelExpanded(expanded);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        router.push('/');
      } else {
        // Either use the UID from URL params (if available) or from the current user
        const uidFromParams = searchParams.get('uid');
        const userId = uidFromParams || currentUser.uid;
        fetchDocument(documentId, userId);
      }
    });
    
    return () => unsubscribe();
  }, [documentId, router, searchParams]);

  const fetchDocument = async (documentId, userId) => {
    try {
      if (!userId) {
        throw new Error("User ID not available");
      }

      // Use the correct nested collection path
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const documentData = docSnap.data();
        console.log("Document data loaded:", documentData);
        setDocument(documentData);
        setNotesContent(documentData.notes);
        setGeneratedContent(prev => ({...prev, notes: true}));
        
        // Check if there are saved flashcards and set the state accordingly
        if (documentData.flashcards && documentData.flashcards.length > 0) {
          setFlashcardsContent(documentData.flashcards);
          setGeneratedContent(prev => ({...prev, flashcards: true}));
        }

        // Check if there are saved test questions and set the state accordingly
        if (documentData.test && documentData.test.length > 0) {
          setTestQuestions(documentData.test);
          setGeneratedContent(prev => ({...prev, test: true}));
        }

        // Check if text content has already been extracted
        if (documentData.extractedText) {
          console.log("Using previously extracted text content");
          setPdfTextContent(documentData.extractedText);
        }
      } else {
        console.error("No such document!");
        router.push('/dashboard');
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching document: ", error);
      setLoading(false);
    } 
  };

  // Function to save extracted text to Firestore
  const saveExtractedTextToFirestore = async (text) => {
    try {
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        extractedText: text
      });
      
      console.log("Extracted text saved to Firestore");
    } catch (error) {
      console.error("Error saving extracted text to Firestore:", error);
    }
  };

  // Function to handle when PDF document loads successfully
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    
    // Check if we need to extract text content
    if (!document.extractedText || document.extractedText.trim() === '') {
      extractAllPagesContent(numPages);
    }
  };

  // Updated function to extract text from all pages
  const extractAllPagesContent = async (totalPages) => {
    try {
      // Check if we already have the content
      if (pdfTextContent && pdfTextContent.length > 0) {
        console.log("Using existing extracted content");
        return;
      }

      // Check if there's already an extraction in progress
      if (isExtracting) {
        console.log("Extraction already in progress");
        return;
      }

      setIsExtracting(true);
      setExtractionProgress(0);
      console.log(`Starting to extract text from all ${totalPages} pages...`);
      setPdfTextContent(''); // Clear existing content before adding new content
      
      // Get the PDF document instance
      if (!pdfjs) {
        setIsExtracting(false);
        return;
      }

      const loadingTask = pdfjs.getDocument(document.fileUrl);
      const pdfDoc = await loadingTask.promise;

      let allText = '';
      
      // Process each page
      for (let i = 1; i <= totalPages; i++) {
        try {
          console.log(`Extracting text from page ${i}/${totalPages}`);
          setExtractionProgress(Math.floor((i / totalPages) * 100));
          
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          
          // Convert the text content items to a string
          const textItems = textContent.items.map(item => item.str);
          const text = textItems.join(' ');
          
          // Add the new page text
          allText += ' ' + text;

          // If text layer is insufficient, try OCR
          if (text.trim().length < 50) {
            console.log(`Page ${i} has little text, attempting OCR...`);
            
            // Render page to canvas for OCR
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
            
            // Small delay to ensure rendering is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            const imageData = canvas.toDataURL('image/png');
            
            // Use Tesseract.js for OCR
            const worker = await Tesseract.createWorker('eng');
            const result = await worker.recognize(imageData);
            const ocrText = result.data.text;
            await worker.terminate();

            if (ocrText && ocrText.length > 0) {
              allText += ' ' + ocrText;
            }
          }
        } catch (pageError) {
          console.error(`Error extracting text from page ${i}:`, pageError);
        }
      }

      console.log("Finished extracting text from all pages");
      setPdfTextContent(allText);

      // Save the extracted text to Firestore
      await saveExtractedTextToFirestore(allText);
      setIsExtracting(false);
      setExtractionProgress(100);
    } catch (error) {
      console.error("Error in extractAllPagesContent:", error);
      setIsExtracting(false);
    }
  };

  // Function to extract text content from a PDF page (keep this for individual page loads)
  const extractTextContent = async (page) => {
    try {
      const textContent = await page.getTextContent();
      // Convert the text content items to a string
      const textItems = textContent.items.map(item => item.str);
      const text = textItems.join(' ');
      console.log("Extracted PDF text content from current page:", text.substring(0, 200) + "...");
      return text;
    } catch (error) {
      console.error("Error extracting text content:", error);
      return '';
    }
  };

  // Function to handle when a page has been rendered
  const onPageLoadSuccess = async (page) => {
    // No need to extract text on each page load as we're now doing it all at once
    // and storing in Firebase
  };

  // Function to handle tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Add function to save notes to Firestore
  const saveNotesToFirestore = async (notes) => {
    try {
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        notes: notes
      });
      
      console.log("Notes saved to Firestore");
    } catch (error) {
      console.error("Error saving notes to Firestore:", error);
    }
  };

  // Add function to save flashcards to Firestore
  const saveFlashcardsToFirestore = async (flashcards) => {
    try {
      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
      
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        flashcards: flashcards
      });
      
      console.log("Flashcards saved to Firestore");
    } catch (error) {
      console.error("Error saving flashcards to Firestore:", error);
    }
  };

  // Add function to save test questions to Firestore
  const saveTestToFirestore = async (questions) => {
    try {
      if (!user || !document) return;

      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;

      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        test: questions
      });

      console.log("Test saved to Firestore");
    } catch (error) {
      console.error("Error saving test to Firestore:", error);
    }
  };

  // Add function to delete notes from Firestore
  const deleteNotesFromFirestore = async () => {
    try {
      // Ask for confirmation before deleting
      if (!confirm('Are you sure you want to delete these notes?')) {
        return;
      }

      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
        
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        notes: null
      });
      
      // Reset notes content
      setNotesContent('');
      setGeneratedContent(prev => ({
        ...prev,
        notes: false
      }));
      
      console.log("Notes deleted from Firestore");
    } catch (error) {
      console.error("Error deleting notes from Firestore:", error);
    }
  };

  // Add function to delete flashcards from Firestore
  const deleteFlashcardsFromFirestore = async () => {
    try {
      // Ask for confirmation before deleting
      if (!confirm('Are you sure you want to delete these flashcards?')) {
        return;
      }

      if (!user || !document) return;
      
      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;
        
      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        flashcards: null
      });
      
      // Reset flashcards content
      setFlashcardsContent([]);
      setGeneratedContent(prev => ({
        ...prev,
        flashcards: false
      }));
      
      console.log("Flashcards deleted from Firestore");
    } catch (error) {
      console.error("Error deleting flashcards from Firestore:", error);
    }
  };

  // Add function to delete test from Firestore
  const deleteTestFromFirestore = async () => {
    try {
      // Ask for confirmation before deleting
      if (!confirm('Are you sure you want to delete this test?')) {
        return;
      }

      if (!user || !document) return;

      const uidFromParams = searchParams.get('uid');
      const userId = uidFromParams || user.uid;

      const docRef = doc(db, `users/${userId}/documents`, documentId);
      await updateDoc(docRef, {
        test: null
      });

      // Reset test content
      setTestQuestions([]);

      // Update UI state to show generate interface
      setGeneratedContent(prev => ({
        ...prev,
        test: false
      }));

      console.log("Test deleted from Firestore");
    } catch (error) {
      console.error("Error deleting test from Firestore:", error);
    }
  };

  // Update the generateContent function to use saved content from Firestore
  const generateContent = async (contentType) => {
    if (contentType === 'notes') {
      try {
        setIsGenerating(true);
        setNotesError(null);
        
        console.log('Starting notes generation');
        
        // Check if text extraction is complete
        if (isExtracting) {
          alert("Text extraction is still in progress. Please wait until it completes.");
          setIsGenerating(false);
          return;
        }
        
        // Use the extracted PDF text content if available
        const docText = pdfTextContent || document?.extractedText || 
                        "This is a sample document for testing note generation. " +
                        "Please upload a real document with text content for proper notes.";
        
        // Make the API call to generate notes with the correct endpoint
        const response = await fetch('/api/generate-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentText: docText,
            customInstructions: customInstructions,
            type: 'notes'  // Specify notes type
          }),
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to generate notes: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Notes generated successfully');
        setNotesContent(data.notes);
        
        // Save notes to Firestore
        await saveNotesToFirestore(data.notes);
        
        // Update UI state to show generated content
        setGeneratedContent(prev => ({
          ...prev,
          [contentType]: true
        }));
      } catch (error) {
        console.error('Error generating notes:', error);
        setNotesError(error.message || 'Failed to generate notes');
      } finally {
        setIsGenerating(false);
      }
    } else if (contentType === 'flashcards') {
      try {
        setIsGenerating(true);
        setFlashcardsError(null);
        
        console.log('Starting flashcards generation');
        
        // Check if text extraction is complete
        if (isExtracting) {
          alert("Text extraction is still in progress. Please wait until it completes.");
          setIsGenerating(false);
          return;
        }
        
        // Use the extracted PDF text content if available
        const docText = pdfTextContent || document?.extractedText || 
                        "This is a sample document for testing flashcard generation. " +
                        "Please upload a real document with text content for proper flashcards.";
        
        // Make the API call to generate flashcards
        const response = await fetch('/api/generate-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentText: docText,
            customInstructions: customInstructions,
            type: 'flashcards'  // Specify flashcards type
          }),
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to generate flashcards: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Flashcards generated successfully:', data);
        
        if (data.flashcards && Array.isArray(data.flashcards)) {
          setFlashcardsContent(data.flashcards);
          
          // Save flashcards to Firestore
          await saveFlashcardsToFirestore(data.flashcards);
          
          // Reset flashcard display state
          setCurrentFlashcardIndex(0);
          setIsFlashcardFlipped(false);
        } else {
          throw new Error('Invalid flashcards data format');
        }
        
        // Update UI state to show generated content
        setGeneratedContent(prev => ({
          ...prev,
          [contentType]: true
        }));
      } catch (error) {
        console.error('Error generating flashcards:', error);
        setFlashcardsError(error.message || 'Failed to generate flashcards');
      } finally {
        setIsGenerating(false);
      }
    } else if (contentType === 'test') {
      try {
        setIsGenerating(true);
        setTestError(null);
        
        console.log('Starting test generation');
        
        // Check if text extraction is complete
        if (isExtracting) {
          alert("Text extraction is still in progress. Please wait until it completes.");
          setIsGenerating(false);
          return;
        }
        
        // Use the extracted PDF text content if available
        const docText = pdfTextContent || document?.extractedText || 
                        "This is a sample document for testing test generation. " +
                        "Please upload a real document with text content for proper tests.";
        
        // Make the API call to generate test questions
        const response = await fetch('/api/generate-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentText: docText,
            customInstructions: customInstructions,
            type: 'test'  // Specify test type
          }),
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to generate test: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Test generated successfully:', data);
        
        if (data.questions && Array.isArray(data.questions)) {
          setTestQuestions(data.questions);
          
          // Save test to Firestore
          await saveTestToFirestore(data.questions);
        } else {
          throw new Error('Invalid test data format');
        }
        
        // Update UI state to show generated content
        setGeneratedContent(prev => ({
          ...prev,
          [contentType]: true
        }));
      } catch (error) {
        console.error('Error generating test:', error);
        setTestError(error.message || 'Failed to generate test');
      } finally {
        setIsGenerating(false);
      }
    } else {
      // For other content types that don't have API implementation yet
      setGeneratedContent(prev => ({
        ...prev,
        [contentType]: true
      }));
    }
  };

  // Handle instructions change
  const handleInstructionsChange = (e) => {
    setCustomInstructions(e.target.value);
  };

  // Add zoom control functions
  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 3));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  // Handle page input change
  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
  };

  // Handle page input submission
  const handlePageSubmit = (e) => {
    e.preventDefault();
    const page = parseInt(pageInputValue, 10);
    // Make sure the page is within valid range
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  };

  // Page navigation functions
  const goToPrevPage = () => setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  const goToNextPage = () => setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages));

  // Download PDF function
  const downloadPdf = () => {
    if (document.fileUrl) {
      const link = window.document.createElement('a');
      link.href = document.fileUrl;
      link.download = document.fileName || 'document.pdf';
      link.target = '_blank';
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ef9441]-500"></div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-64px)]">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#ef9441] text-white rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{document.fileName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {document.createdAt?.toDate ? new Date(document.createdAt.toDate()).toLocaleDateString() : 'Unknown date'}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Document Viewer Panel - Left Side - Hidden when panel is expanded */}
          {!isPanelExpanded && (
            <div className="w-full lg:w-1/2 ">
              <div className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/50 rounded-lg mx-auto">
                {document.isTextDocument ? (
                  <div className="w-full h-[500px] md:h-[700px] border-0 overflow-auto bg-white dark:bg-gray-900 p-6">
                    <div className="mb-4 border-b pb-2">
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        {document.fileName}
                      </h2>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      {document.textContent?.split('\n').map((line, index) => (
                        <p key={index} className="my-2">
                          {line || <br />}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Enhanced responsive controls */}
                    <div className="flex flex-wrap items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      {/* Page navigation controls with new page input */}
                      <div className="flex items-center space-x-2 my-1">
                        <button 
                          onClick={goToPrevPage}
                          disabled={pageNumber <= 1}
                          className={`p-2 rounded-md ${pageNumber <= 1 ? 'text-gray-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          aria-label="Previous page"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </button>
                        
                        {/* Page display with input form */}
                        <form onSubmit={handlePageSubmit} className="flex items-center">
                          <span className="text-sm mr-1">Page</span>
                          <input
                            type="text"
                            value={pageInputValue}
                            onChange={handlePageInputChange}
                            placeholder={pageNumber.toString()}
                            className="w-12 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                            aria-label="Go to page"
                          />
                          <span className="text-sm mx-1">of {numPages || '?'}</span>
                        </form>
                        
                        <button 
                          onClick={goToNextPage}
                          disabled={pageNumber >= numPages}
                          className={`p-2 rounded-md ${pageNumber >= numPages ? 'text-gray-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          aria-label="Next page"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Zoom controls */}
                      <div className="flex items-center space-x-2 my-1">
                        <button 
                          onClick={zoomOut}
                          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                          aria-label="Zoom out"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                          </svg>
                        </button>
                        <span className="text-sm">{Math.round(scale * 100)}%</span>
                        <button 
                          onClick={zoomIn}
                          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                          aria-label="Zoom in"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                        <button 
                          onClick={resetZoom}
                          className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Reset
                        </button>
                      </div>
                      
                      {/* Download button */}
                      <div className="flex items-center my-1">
                        <button 
                          onClick={downloadPdf}
                          className="flex items-center px-3 py-1 text-xs bg-[#ef9441] text-white rounded-md hover:bg-[#d88537]"
                          aria-label="Download PDF"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download
                        </button>
                      </div> 
                    </div>
                    
                    {/* PDF Container with horizontal scroll enabled */}
                    <div className="w-full h-[500px] md:h-[700px] border-0 overflow-x-auto overflow-y-auto">
                      <Document
                        file={document.fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ef9441]-500"></div>
                          </div>
                        }
                        error={
                          <div className="flex justify-center items-center h-full text-red-500">
                            Failed to load PDF. Please try again.
                          </div>
                        }
                        className={`${pdfLoading ? 'hidden' : 'block'}`}
                      >
                        {/* Page component with proper width handling */}
                        <Page
                          pageNumber={pageNumber}
                          onLoadSuccess={onPageLoadSuccess}
                          className="mx-auto"
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          scale={scale}
                          renderZoomLayer={false}
                          width={null} // Let the page determine its own width based on scale
                        />
                      </Document>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Interactive Panel - Right Side - Full width when expanded */}
          <InteractivePanel
            document={document}
            documentId={documentId}
            activeTab={activeTab}
            generatedContent={generatedContent}
            notesContent={notesContent}
            notesError={notesError}
            flashcardsContent={flashcardsContent}
            flashcardsError={flashcardsError}
            testQuestions={testQuestions}
            testError={testError}
            isGenerating={isGenerating}
            isExtracting={isExtracting}
            extractionProgress={extractionProgress}
            customInstructions={customInstructions}
            onTabChange={handleTabChange}
            onGenerateContent={generateContent}
            onDeleteNotes={deleteNotesFromFirestore}
            onDeleteFlashcards={deleteFlashcardsFromFirestore}
            onDeleteTest={deleteTestFromFirestore}
            onInstructionsChange={handleInstructionsChange}
            setGeneratedContent={setGeneratedContent}
            setNotesContent={setNotesContent}
            setFlashcardsContent={setFlashcardsContent}
            isPanelExpanded={isPanelExpanded}
            onTogglePanel={handlePanelExpansion}
          />
        </div>
      </div>
    </div>
  );
}
