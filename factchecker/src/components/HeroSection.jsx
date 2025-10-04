import React from "react";

const HeroSection = () => {
  const handleButtonClick = () => {
    window.open('https://quickfactchecker.onrender.com/', '_blank');
  };
  return (
    <div className="relative flex flex-col items-center mt-6 lg:mt-20">
      <h1 className="text-4xl sm:text-6xl lg:text-7xl text-center tracking-wide">
        Separate Fact 
        <span className="bg-gradient-to-r from-cyan-400 to-sky-800 text-transparent bg-clip-text">
          {" "}
          from Fiction
        </span>
        </h1>
        <p className="mt-20 text-lg text-center text-neutral-500 max-w-4xl">
        In a world of overwhelming information, get the verified answers you need in seconds. 
        Paste a link, type a claim, or upload a file to instantly check sources and uncover the truth. 
        Stop misinformation before it spreads.
        </p>
      <div className="flex justify-center my-20">
        <a href="https://quickfactchecker.onrender.com/" target="_blank" rel="noopener noreferrer"className="bg-gradient-to-r from-cyan-400 to-sky-800 py-3 px-4 mx-3 rounded-md">
            Check a Fact Now!
        </a>
      </div>
    </div>
  );
};

export default HeroSection;