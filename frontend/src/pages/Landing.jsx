import React from 'react';
import { ArrowRight, Zap, LayoutDashboard, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageCarousel from '../components/ImageCarousel';
import img1 from "../assets/carousel/slide.jpg";   // ✅ correct
import img2 from "../assets/carousel/slide2.jpg";
import img3 from "../assets/carousel/slide3.jpg";


export default function Landing() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center block-low">
          <h1 className="font-display text-[2.75rem] md:text-[3.75rem] font-bold leading-none mb-5 max-w-4xl tracking-tighter">
            
            Hyperlocal Disaster Volunteer Coordination
          </h1>
          <p className="text-lg max-w-5xl mb-10 text-red ">
            When Every Second Counts
          </p>
          <p className="text-lg max-w-3xl mb-10 text-secondary">
            Real-time coordination platform connecting NGOs, volunteers, and donors during floods, earthquakes, and cyclones. Right resource. Right place. Right now.
          </p>
          <button>
            <Link
              to="/map"
              className="bg-red-500 text-white px-6 py-3 font-bold border-none transition-all duration-100 ease-in-out hover:bg-red-600 shadow-none cursor-pointer text-center flex items-center justify-center gap-2"
              style={{ borderRadius: 0 }}>
              POST a Request
              <ArrowRight size={20} strokeWidth={2.5} />
          </Link>
          </button>
                      <h1 className="font-display text-2xl font-bold mb-3"> How it Works</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
            <div className="card-brutalist p-8 text-left">
              <h3 className="font-display text-2xl font-bold mb-3">Post a Resource Request </h3>
              <p className="text-secondary">Volunteers and NGO's on the ground post whats needed - blood group , medicines, trapped person location- directly from their phones , even offline</p>
            </div>
            <div className="card-brutalist p-8 text-left block-container">
              <h3 className="font-display text-2xl font-bold mb-3">See the Live Map</h3>
              <p className="text-secondary">All requests appear instantly on a shared real-time map. Nearby donors and volunteers can see exactly what's needed and where.</p>
            </div>
            <div className="card-brutalist p-8 text-left">
              <h3 className="font-display text-2xl font-bold mb-3">Tap "I'm On My Way"</h3>
              <p className="text-secondary">One tap to commit. The system broadcasts your response to all connected users so everyone knows help is coming.</p>
            </div>
             <div className="card-brutalist p-8 text-left">
              <h3 className="font-display text-2xl font-bold mb-3">Smart Duplicate Prevention </h3>
              <p className="text-secondary">If 10 volunteers are already heading to a location, the 11th gets a warning. No wasted effort. Resources go where they're actually needed.</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <main className="flex-1 px-6 py-16 block-low">
        <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="text-left">
            <h1 className="font-display text-[1.75rem] md:text-[2.25rem] font-bold leading-none mb-5 tracking-tighter">
              A HYPERLOCAL DISASTER RESPONSE NETWORK
            </h1>
            <p className="text-base max-w-2xl mb-6 text-secondary">
             When disaster strikes, coordination saves lives. A real-time, offline-first platform that matches ground volunteers with critical resource requests eliminating chaos and preventing duplicate efforts.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="btn-primary no-underline">
                Get Started <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
              <Link to="/register" className="btn-primary no-underline bg-transparent text-primary border border-primary hover:bg-primary hover:text-on-primary">
                Register
              </Link>
            </div>
          </div>
          <div className="relative w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto">
            <ImageCarousel
              images={[
                img1,
                img2,
                img3
              ]}
              intervalMs={3000}
              aspectRatio="16:10"
            />
          </div>
        </section>
      </main>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y ghost-border">
        <div className="card-brutalist flex flex-col items-start gap-4 h-full border-r ghost-border p-8">
          <div className="bg-primary p-3 text-on-primary">
            <Zap size={24} strokeWidth={2} />
          </div>
          <h3 className="font-display text-lg font-bold">Real-Time Crisis Mapping</h3>
          <p className="text-secondary">Powered by live WebSockets, watch SOS requests and volunteer deployments update instantly on the ground. No page refreshes, just pure coordination.</p>
        </div>
        <div className="card-brutalist flex flex-col items-start gap-4 h-full border-r ghost-border p-8 block-container">
          <div className="bg-primary p-3 text-on-primary">
            <LayoutDashboard size={24} strokeWidth={2} />
          </div>
          <h3 className="font-display text-lg font-bold">Smart Volunteer Routing</h3>
          <p className="text-secondary">Stop the supply pile-up. Our intelligent matching system monitors volunteer quotas and automatically redirects incoming help to areas that actually need it.</p>
        </div>
        <div className="card-brutalist flex flex-col items-start gap-4 h-full p-8">
          <div className="bg-primary p-3 text-on-primary">
            <Settings size={24} strokeWidth={2} />
          </div>
          <h3 className="font-display text-lg font-bold">Offline-First Resilience</h3>
          <p className="text-secondary">Built for the harshest conditions. As a Progressive Web App (PWA), critical data is cached locally so volunteers remain effective even when cell towers fail.</p>
        </div>
      </section>
    </>
  );
}
