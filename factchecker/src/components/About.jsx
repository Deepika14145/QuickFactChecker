import React from 'react'
import img from "../assets/img.svg"
const About= () => {
  return (
    <div id="about"className="mt-20">
        <h2 className="text-3xl sm:text-5xl lg:text-6xl mt-6 tracking-wide text-center">
            About
            <span className="bg-gradient-to-r from-cyan-400 to-sky-800 text-transparent bg-clip-text">
          {" "}
          Us
        </span>
        </h2> 
        <div className="flex flex-wrap justify-center mt-10 lg:mt-20 lg:pr-20">
        <div className="w-full lg:w-1/2 p-4">
          <img src={img} alt="About QuickFactChecker Image" />
        </div>
        <div className="w-full lg:w-1/2 p-4 flex items-center lg:pl-20">
          <p className="text-lg text-neutral-500 max-w-xl text-center lg:text-left">
            In today's fast-paced digital world, information travels at the speed of light. But not all of it is accurate. Misleading headlines, biased reporting, and outright fake news can spread rapidly, making it increasingly difficult to distinguish fact from fiction. We believe that access to reliable information is not a privilege, but a necessity for an informed society.
          </p>
        </div>
      </div>
    </div>
    
  );
};
export default About;