"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PrintService from '../document/[id]/PrintService';
import { auth, db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item component
function SortableItem({ id, title, hasNotes, index, onEdit, isEditing, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative',
  };
  
  // Handle edit button click with stopPropagation to prevent drag interference
  const handleEditClick = (e) => {
    e.stopPropagation(); // Stop the event from bubbling up to the draggable item
    onEdit(id);
  };

  // Handle remove button click
  const handleRemoveClick = (e) => {
    e.stopPropagation(); // Prevent drag initiation
    onRemove(id);
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`p-3 mb-2 rounded flex items-center bg-white border ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div 
        className="mr-2 text-gray-500 cursor-grab p-1 hover:bg-gray-100 rounded" 
        {...attributes} 
        {...listeners}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>
      <span className="font-medium flex-grow">{index + 1}. {title}</span>
      {hasNotes && (
        <span className="mr-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
          Has Notes
        </span>
      )}
      <button
        onClick={handleEditClick}
        className="ml-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
        type="button"
      >
        {isEditing ? "Done Editing" : "Edit"}
      </button>
      <button
        onClick={handleRemoveClick}
        className="ml-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
        type="button"
      >
        Remove
      </button>
    </div>
  );
}

export default function CombinerPage() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [orderedSelectedDocs, setOrderedSelectedDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('Combined Cheatsheet');
  const [isCondensed, setIsCondensed] = useState(true);
  const [generateToc, setGenerateToc] = useState(false);
  const [isTocLoading, setIsTocLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [documentContents, setDocumentContents] = useState({});
  const [editingDocId, setEditingDocId] = useState(null);
  const [showCondensedSettings, setShowCondensedSettings] = useState(false);
  const [condensedSettings, setCondensedSettings] = useState({
    columnCount: 6,
    baseFontSize: 5,
    h1Size: 8,
    h2Size: 7,
    h3Size: 6
  });
  const router = useRouter();
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check authentication and fetch documents
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        router.push('/');
      } else {
        fetchUserDocuments(currentUser.uid);
      }
    }, (error) => {
      console.error("Auth state error:", error);
      setError(`Authentication error: ${error.message}`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch all documents for the user from Firestore
  const fetchUserDocuments = async (userId) => {
    if (!userId) return;
    
    try {
      setError(null);
      setIsLoading(true);
      
      const q = query(
        collection(db, `users/${userId}/documents`),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      
      const userDocs = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        userDocs.push({
          id: doc.id,
          title: data.fileName || 'Unnamed document',
          createdAt: data.createdAt?.toDate?.() || null,
          fileUrl: data.fileUrl || '',
          fileType: data.fileType || '',
          status: data.status || '',
          generatedContent: data.generatedContent || data.notes || '',
          hasNotes: Boolean(data.generatedContent || data.notes),
          textContent: data.textContent || data.extractedText || '',
          isTextDocument: data.isTextDocument || false
        });
      });

      setDocuments(userDocs);
    } catch (err) {
      console.error("Document fetch error:", err);
      setError(`Failed to fetch documents: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDocumentSelection = (docId) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId));
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  // Update orderedSelectedDocs whenever selectedDocs changes
  useEffect(() => {
    const orderedDocs = documents
      .filter(doc => selectedDocs.includes(doc.id))
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        hasNotes: doc.hasNotes
      }));
    setOrderedSelectedDocs(orderedDocs);
  }, [selectedDocs, documents]);

  const fetchDocumentContent = async (docId) => {
    if (!user || !user.uid) return '';
    
    try {
      const docRef = doc(db, `users/${user.uid}/documents`, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const content = data.generatedContent || data.notes || data.textContent || data.extractedText || '';
        
        // Store the content in state for potential editing
        setDocumentContents(prev => ({
          ...prev,
          [docId]: content
        }));
        
        return content;
      } else {
        console.error(`Document ${docId} not found`);
        return '';
      }
    } catch (error) {
      console.error(`Error fetching document ${docId}:`, error);
      return '';
    }
  };

  // Toggle edit mode for a document
  const toggleEditMode = async (docId) => {
    if (editingDocId === docId) {
      setEditingDocId(null);
    } else {
      setEditingDocId(docId);
      // Make sure we have content for this document
      if (!documentContents[docId]) {
        const content = await fetchDocumentContent(docId);
        // No need to set it here since fetchDocumentContent already does it
      }
    }
  };

  // Update edited content
  const updateDocumentContent = (docId, newContent) => {
    setDocumentContents(prev => ({
      ...prev,
      [docId]: newContent
    }));
  };

  // Add this new function to handle removing a document from the selected list
  const removeFromSelected = (docId) => {
    setSelectedDocs(selectedDocs.filter(id => id !== docId));
  };

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setOrderedSelectedDocs((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const generateTableOfContents = async (content) => {
    if (!generateToc) return content;
    
    setIsTocLoading(true);
    try {
      const contentForAI = orderedSelectedDocs.map((doc, index) => {
        return `Section ${index + 1}: ${doc.title}\n${documentContents[doc.id] || ''}\n\n`;
      }).join('');
      
      const prompt = `Create a detailed table of contents for the following cheatsheet titled "${title}". 
      Format it as HTML with proper headings, anchors, and structure. 
      Each main section should be linked to its corresponding section in the document.
      Here's the content to analyze:
      
      ${contentForAI}`;
      
      const response = await fetch('/api/generate-toc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate table of contents');
      }
      
      const data = await response.json();
      const toc = data.toc;
      
      // Add the TOC to the beginning of the content
      return `<div class="table-of-contents">
        <h2>Table of Contents</h2>
        ${toc}
      </div>
      <hr style="border: 0; border-top: 2px solid black; margin: 20px 0;">
      ${content}`;
      
    } catch (error) {
      console.error('Error generating table of contents:', error);
      alert('Failed to generate table of contents. Continuing without it.');
      return content;
    } finally {
      setIsTocLoading(false);
    }
  };

  const combineAndPrint = async () => {
    if (orderedSelectedDocs.length === 0) {
      alert('Please select at least one document to combine');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get content for documents that haven't been loaded/edited yet
      const contentPromises = orderedSelectedDocs.map(doc => {
        if (documentContents[doc.id]) {
          return Promise.resolve(documentContents[doc.id]);
        } else {
          return fetchDocumentContent(doc.id);
        }
      });
      
      const contentArray = await Promise.all(contentPromises);
      
      // Create an array of contents with titled separators
      let result = '';
      
      // Add content with titles as separators
      orderedSelectedDocs.forEach((doc, index) => {
        // Add separator with document title before each document (except the first one)
        if (index > 0) {
          result += `\n\n<hr style="border: 0; border-top: 2px solid black; margin: 10px 0;">\n`;
          result += `<h2 style="text-align: center;" id="section-${index + 1}">${doc.title}</h2>\n\n`;
        } else {
          // For the first document, just add its title as a header
          result += `<h2 style="text-align: center; margin: 10px 0;" id="section-1">${doc.title}</h2>\n\n`;
        }
        
        // Add the actual content - use the edited version if available
        result += contentArray[index];
      });
      
      // Generate table of contents if requested
      if (generateToc) {
        result = await generateTableOfContents(result);
      }
      
      // Pass condensed settings if enabled
      const printConfig = isCondensed ? condensedSettings : false;
      PrintService.printContent(result, title, printConfig);
    } catch (error) {
      console.error('Error combining documents:', error);
      alert('Error combining documents. Please try again.');
    }
    
    setIsLoading(false);
  };

  const combineAndView = async () => {
    if (orderedSelectedDocs.length === 0) {
      alert('Please select at least one document to combine');
      return;
    }

    if (!user || !user.uid) {
      alert('User not authenticated');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get content for documents that haven't been loaded/edited yet
      const contentPromises = orderedSelectedDocs.map(doc => {
        if (documentContents[doc.id]) {
          return Promise.resolve(documentContents[doc.id]);
        } else {
          return fetchDocumentContent(doc.id);
        }
      });
      
      const contentArray = await Promise.all(contentPromises);
      
      // Create an array of contents with titled separators
      let result = '';
      
      // Add content with titles as separators
      orderedSelectedDocs.forEach((doc, index) => {
        // Add separator with document title before each document (except the first one)
        if (index > 0) {
          result += `\n\n<hr style="border: 0; border-top: 2px solid black; margin: 10px 0;">\n`;
          result += `<h2 style="text-align: center;" id="section-${index + 1}">${doc.title}</h2>\n\n`;
        } else {
          // For the first document, just add its title as a header
          result += `<h2 style="text-align: center; margin: 10px 0;" id="section-1">${doc.title}</h2>\n\n`;
        }
        
        // Add the actual content - use the edited version if available
        result += contentArray[index];
      });
      
      // Generate table of contents if requested
      if (generateToc) {
        result = await generateTableOfContents(result);
      }
      
      // Save as a new document in Firestore
      const docRef = await addDoc(collection(db, `users/${user.uid}/documents`), {
        fileName: title,
        generatedContent: result,
        notes: result,
        status: 'combined',
        createdAt: serverTimestamp(),
        fileType: 'combined',
        isCombined: true,
        sourceDocuments: orderedSelectedDocs.map(d => d.id)
      });

      // Navigate to the new combined document
      router.push(`/document/${docRef.id}`);
    } catch (error) {
      console.error('Error combining documents:', error);
      alert('Error combining documents. Please try again.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Document Combiner</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Cheatsheet Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="mb-6 space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isCondensed}
            onChange={() => setIsCondensed(!isCondensed)}
            className="form-checkbox"
          />
          <span>Condensed Format (Better for cheatsheets)</span>
        </label>
        
        {isCondensed && (
          <div className="ml-6 mt-3 p-4 bg-gray-50 rounded border">
            <button
              onClick={() => setShowCondensedSettings(!showCondensedSettings)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-3 flex items-center"
            >
              {showCondensedSettings ? '▼' : '▶'} Customize Format
            </button>
            
            {showCondensedSettings && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Columns: <span className="font-bold text-blue-600">{condensedSettings.columnCount}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={condensedSettings.columnCount}
                    onChange={(e) => setCondensedSettings({...condensedSettings, columnCount: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">More columns = smaller width per column</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Base Font Size: <span className="font-bold text-blue-600">{condensedSettings.baseFontSize}pt</span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={condensedSettings.baseFontSize}
                    onChange={(e) => setCondensedSettings({...condensedSettings, baseFontSize: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Heading 1 Size: <span className="font-bold text-blue-600">{condensedSettings.h1Size}pt</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="14"
                    value={condensedSettings.h1Size}
                    onChange={(e) => setCondensedSettings({...condensedSettings, h1Size: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Heading 2 Size: <span className="font-bold text-blue-600">{condensedSettings.h2Size}pt</span>
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    value={condensedSettings.h2Size}
                    onChange={(e) => setCondensedSettings({...condensedSettings, h2Size: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Heading 3 Size: <span className="font-bold text-blue-600">{condensedSettings.h3Size}pt</span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={condensedSettings.h3Size}
                    onChange={(e) => setCondensedSettings({...condensedSettings, h3Size: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                
                <button
                  onClick={() => setCondensedSettings({
                    columnCount: 6,
                    baseFontSize: 5,
                    h1Size: 8,
                    h2Size: 7,
                    h3Size: 6
                  })}
                  className="text-xs bg-gray-300 hover:bg-gray-400 px-3 py-1 rounded mt-2"
                >
                  Reset to Defaults
                </button>
              </div>
            )}
          </div>
        )}
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={generateToc}
            onChange={() => setGenerateToc(!generateToc)}
            className="form-checkbox"
          />
          <span>Generate AI-powered Table of Contents</span>
        </label>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Select Documents to Combine:</h2>
        
        {isLoading ? (
          <p>Loading documents...</p>
        ) : (
          <div className="max-h-96 overflow-y-auto border rounded p-2">
            {documents.length === 0 ? (
              <p>No documents found. Create some documents first.</p>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="flex items-center p-2 hover:bg-gray-100">
                  <input
                    type="checkbox"
                    id={`doc-${doc.id}`}
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => toggleDocumentSelection(doc.id)}
                    className="mr-3"
                  />
                  <label htmlFor={`doc-${doc.id}`} className="cursor-pointer flex-grow">
                    {doc.title}
                    {doc.hasNotes && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Has Notes
                      </span>
                    )}
                  </label>
                  <button
                    onClick={() => router.push(`/document/${doc.id}`)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {orderedSelectedDocs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Arrange Documents Order:</h2>
          <p className="text-sm text-gray-600 mb-2">Drag and drop to reorder how documents will be combined. You can also edit document content.</p>
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="border rounded p-2 bg-gray-50">
              <SortableContext 
                items={orderedSelectedDocs.map(doc => doc.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedSelectedDocs.map((doc, index) => (
                  <div key={doc.id} className="mb-4">
                    <SortableItem 
                      id={doc.id} 
                      title={doc.title} 
                      hasNotes={doc.hasNotes}
                      index={index}
                      onEdit={toggleEditMode}
                      isEditing={editingDocId === doc.id}
                      onRemove={removeFromSelected}
                    />
                    
                    {editingDocId === doc.id && (
                      <div className="mt-2 mb-4 px-4">
                        <textarea
                          value={documentContents[doc.id] || ''}
                          onChange={(e) => updateDocumentContent(doc.id, e.target.value)}
                          className="w-full p-3 border rounded min-h-[200px] font-mono text-sm"
                        />
                        <div className="mt-2 text-right">
                          <button
                            onClick={() => setEditingDocId(null)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </SortableContext>
            </div>
          </DndContext>
        </div>
      )}
      
      <div className="flex space-x-4">
        <button
          onClick={combineAndPrint}
          disabled={selectedDocs.length === 0 || isLoading || isTocLoading}
          className={`px-4 py-2 rounded ${
            selectedDocs.length === 0 || isLoading || isTocLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLoading || isTocLoading ? 'Processing...' : 'Combine & Print'}
        </button>

        <button
          onClick={combineAndView}
          disabled={selectedDocs.length === 0 || isLoading || isTocLoading}
          className={`px-4 py-2 rounded ${
            selectedDocs.length === 0 || isLoading || isTocLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isLoading || isTocLoading ? 'Processing...' : 'Open Combined Document'}
        </button>
        
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
