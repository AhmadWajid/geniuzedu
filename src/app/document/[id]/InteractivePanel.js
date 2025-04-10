"use client";
import MarkdownViewer from '@/components/MarkdownViewer';
import React from 'react';
// Tab Components
const ChatTab = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 text-center py-4">Chat messages will appear here.</p>
        {/* Chat messages would be mapped and displayed here */}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a question about this document..."
          className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
        <button className="px-4 py-2 bg-[#1087da] text-white rounded-lg hover:bg-[#e68a30] transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Send
        </button>
      </div>
    </div>
  );
};

const NotesTab = ({
  generatedContent,
  notesContent,
  notesError,
  isGenerating,
  customInstructions,
  onGenerateContent,
  onInstructionsChange,
  onDeleteNotes,
  setNotesContent
}) => {
  return (
    <div className="h-full flex flex-col">
      {generatedContent.notes ? (
        <>
          <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <MarkdownViewer
                content={notesContent}
                className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => onDeleteNotes()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete Notes
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <label htmlFor="instructions" className="block text-sm font-medium mb-1">
              Custom Instructions (Optional)
            </label>
            <textarea
              id="instructions"
              value={customInstructions}
              onChange={onInstructionsChange}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Add specific instructions for note generation. For example: 'Focus on key concepts and definitions' or 'Format as bullet points'."
              rows={3}
            />
          </div>
          <button
            onClick={() => onGenerateContent('notes')}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#1087da] text-white rounded-lg hover:bg-[#e68a30] transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Notes...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Generate Notes
              </>
            )}
          </button>
          {notesError && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {notesError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FlashcardsTab = ({
  generatedContent,
  flashcardsContent,
  flashcardsError,
  isGenerating,
  customInstructions,
  onGenerateContent,
  onInstructionsChange,
  onDeleteFlashcards
}) => {
  const [currentCardIndex, setCurrentCardIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [showGenerationForm, setShowGenerationForm] = React.useState(false);

  const flipCard = () => setIsFlipped(!isFlipped);
  
  const nextCard = () => {
    if (currentCardIndex < flashcardsContent.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };
  
  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleDeleteFlashcards = () => {
    onDeleteFlashcards();
    setShowGenerationForm(true);
  };

  // Reset showGenerationForm when content changes
  React.useEffect(() => {
    setShowGenerationForm(false);
  }, [flashcardsContent]);

  return (
    <div className="h-full flex flex-col">
      {generatedContent.flashcards && flashcardsContent.length > 0 && !showGenerationForm ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center mb-2">
            <div 
              className="w-full max-w-md aspect-[3/2] border-l-4 border-[#1087da] bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-pointer transition-all duration-300 perspective-[1000px]"
              onClick={flipCard}
            >
              <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 p-6 flex items-center justify-center text-center [backface-visibility:hidden]">
                  <MarkdownViewer
                    content={flashcardsContent[currentCardIndex]?.question || 'No question available'}
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
                </div>
                <div className="absolute inset-0 p-6 flex items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <MarkdownViewer
                    content={flashcardsContent[currentCardIndex]?.answer || 'No answer available'}
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"></MarkdownViewer>
                </div>
              </div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Card {currentCardIndex + 1} of {flashcardsContent.length}
            </p>
          </div>
          <div className="flex justify-between mb-4">
            <button 
              onClick={prevCard} 
              disabled={currentCardIndex === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Previous
            </button>
            <button 
              onClick={nextCard} 
              disabled={currentCardIndex === flashcardsContent.length - 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDeleteFlashcards}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Delete Flashcards
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <label htmlFor="flashcard-instructions" className="block text-sm font-medium mb-1">
              Custom Instructions (Optional)
            </label>
            <textarea
              id="flashcard-instructions"
              value={customInstructions}
              onChange={onInstructionsChange}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Add specific instructions for flashcard generation. For example: 'Focus on key terms and definitions' or 'Include numerical examples'."
              rows={3}
            />
          </div>
          <button
            onClick={() => onGenerateContent('flashcards')}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#1087da] text-white rounded-lg hover:bg-[#e68a30] transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Flashcards...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6.01" y2="6"></line>
                  <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
                Generate Flashcards
              </>
            )}
          </button>
          {flashcardsError && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {flashcardsError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const InteractivePanel = ({
  document,
  documentId,
  activeTab,
  generatedContent,
  notesContent,
  notesError,
  flashcardsContent,
  flashcardsError,
  isGenerating,
  customInstructions,
  onTabChange,
  onGenerateContent,
  onDeleteNotes,
  onDeleteFlashcards,
  onInstructionsChange,
  setGeneratedContent,
  setNotesContent,
  setFlashcardsContent,
  onToggleFullWidth, // Add this prop to communicate with parent
}) => {
  const [isFullWidth, setIsFullWidth] = React.useState(false);
  
  const toggleFullWidth = () => {
    const newState = !isFullWidth;
    setIsFullWidth(newState);
    if (onToggleFullWidth) {
      onToggleFullWidth(newState);
    }
  };

  return (
    <div className={`transition-all duration-300 ${isFullWidth ? 'w-full' : 'w-full lg:w-1/2'}`}>
      <div className="bg-white dark:bg-gray-900 shadow-md border-l-4 border-[#1087da] rounded-lg p-4 h-[500px] md:h-[700px] flex flex-col">
        {/* Toggle Full Width Button */}
        <div className="flex justify-end mb-2">
          <button 
            onClick={toggleFullWidth}
            className="text-gray-500 hover:text-[#1087da] transition-colors flex items-center gap-1 text-sm"
          >
            {isFullWidth ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                Show PDF
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
                Expand Panel
              </>
            )}
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b mb-4 dark:border-gray-700">
          <button
            onClick={() => onTabChange('chat')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'chat'
                ? 'text-[#1087da] border-b-2 border-[#1087da] dark:text-[#1087da] dark:border-[#1087da]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onTabChange('notes')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'notes'
                ? 'text-[#1087da] border-b-2 border-[#1087da] dark:text-[#1087da] dark:border-[#1087da]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => onTabChange('flashcards')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'flashcards'
                ? 'text-[#1087da] border-b-2 border-[#1087da] dark:text-[#1087da] dark:border-[#1087da]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Flashcards
          </button>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'notes' && (
            <NotesTab
              generatedContent={generatedContent}
              notesContent={notesContent}
              notesError={notesError}
              isGenerating={isGenerating}
              customInstructions={customInstructions}
              onGenerateContent={onGenerateContent}
              onInstructionsChange={onInstructionsChange}
              onDeleteNotes={onDeleteNotes}
              setNotesContent={setNotesContent}
            />
          )}
          {activeTab === 'flashcards' && (
            <FlashcardsTab
              generatedContent={generatedContent}
              flashcardsContent={flashcardsContent}
              flashcardsError={flashcardsError}
              isGenerating={isGenerating}
              customInstructions={customInstructions}
              onGenerateContent={onGenerateContent}
              onInstructionsChange={onInstructionsChange}
              onDeleteFlashcards={onDeleteFlashcards}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractivePanel;