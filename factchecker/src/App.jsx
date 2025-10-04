import React from 'react'
import Navbar from './components/Navbar.jsx'
import HeroSection from './components/HeroSection.jsx';
import FeatureSection from './components/FeatureSection.jsx';
import About from './components/About.jsx';
import Testimonials from './components/Testimonials.jsx';
import Footer from './components/Footer.jsx';
export const App = () => {
  return (
    <>
      <Navbar/>
      <div className="max-w-7xl mx-auto pt-20 px-6">
        <HeroSection />
        <FeatureSection />
        <About />
        <Testimonials />
        <Footer />
      </div>
    </>
  );
};

export default App