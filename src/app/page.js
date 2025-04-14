import Hero from "../components/Hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-[#f8f7f2] to-[#edf7f4] bg-[#f8f7f2] ">
      <Hero />
      
      {/* Features section with dark mode support */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-[#58b595] to-[#e68a30] bg-clip-text text-transparent">
            Study Smarter with AI
          </span>
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#f8f7f2]  p-6 rounded-lg shadow-md border-l-4 border-[#58b595]">
            <h3 className="text-xl font-bold mb-3 text-gray-900 ">Instant Notes</h3>
            <p className="text-gray-600 ">Upload your documents and get AI-generated study notes instantly.</p>
          </div>
          
          <div className="bg-white  p-6 rounded-lg shadow-md border-l-4 border-[#58b595]">
            <h3 className="text-xl font-bold mb-3 text-gray-900 ">Smart Flashcards</h3>
            <p className="text-gray-600 ">Convert complex topics into easy-to-review flashcards with our AI.</p>
          </div>
          
          <div className="bg-white  p-6 rounded-lg shadow-md border-l-4 border-[#58b595]">
            <h3 className="text-xl font-bold mb-3 text-gray-900 ">Practice Tests</h3>
            <p className="text-gray-600 ">Generate quizzes and tests to evaluate your knowledge before exams.</p>
          </div>
        </div>
      </section>
      
      {/* Testimonial section with dark mode */}
      <section className="py-16 px-4 md:px-8 bg-[#f8f7f2] ">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 ">
            What Students Say
          </h2>
          
          <div className="bg-[#f8f7f2] p-8 rounded-lg shadow-lg border-l-4 border-[#e68a30]">
            <p className="text-lg italic text-gray-600  mb-6">
              "GeniuzEdu has completely transformed my study routine. Creating flashcards used to take hours, now it takes seconds."
            </p>
            <p className="font-semibold text-gray-800 ">— Engineering Student</p>
          </div>
        </div>
      </section>
      
      {/* No need to include Footer here as it's already in layout.js */}
    </main>
  );
}
