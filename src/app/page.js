import Image from "next/image";
import Hero from "../components/Hero";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 ">
      <Hero />
    </main>
  );
}
