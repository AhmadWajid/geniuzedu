"use client";

export default function CustomInstructionsForm({ customInstructions, onInstructionsChange, icon = "notes" }) {
  // Get the correct icon based on the type
  const getIcon = () => {
    if (icon === "notes") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-pink-500 dark:text-pink-400">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      );
    } else if (icon === "flashcards") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-pink-500 dark:text-pink-400">
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path>
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path>
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>
        </svg>
      );
    }
    return null;
  };

  // Get placeholder text based on type
  const getPlaceholder = () => {
    if (icon === "notes") {
      return "Add specific instructions about topics to focus on or areas you want to explore in more detail (e.g. 'Create detailed notes with bullet points', 'Include section headers')";
    } else if (icon === "flashcards") {
      return "Add specific instructions about topics to focus on or areas you want to explore in more detail (e.g. 'Focus on math concepts', 'Emphasize key theories')";
    }
    return "Add your custom instructions here...";
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative bg-white dark:bg-gray-900 ring-1 ring-gray-200/50 dark:ring-gray-700/50 rounded-lg p-6 shadow-lg dark:shadow-gray-950/50">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            {getIcon()}
            Custom Instructions
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
          </label>
          <button className="text-xs text-[#1087da] dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            Show Example
          </button>
        </div>
        <div className="relative">
          <textarea 
            placeholder={getPlaceholder()} 
            className="w-full h-32 px-4 py-3 text-gray-700 dark:text-gray-200 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 dark:focus:ring-pink-400/50 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
            maxLength="500" 
            autoComplete="off" 
            spellCheck="false"
            value={customInstructions}
            onChange={onInstructionsChange}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
            <span>{customInstructions.length}/500 characters</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-pink-500 dark:bg-pink-400"></div>
          Your instructions will be prioritized during generation
        </div>
      </div>
    </div>
  );
}
