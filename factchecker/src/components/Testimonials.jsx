import React from 'react'
import { testimonials } from '../constants';
import { User } from 'lucide-react';
import { cn } from "../lib/utils";
import {Carousel,CarouselContent,CarouselItem,CarouselNext,CarouselPrevious} from "../components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
const Testimonials = () => {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false })
  );
  return (
    <div id="testimonials"className="mt-40 tracking-wide">
      <h2 className="text-3xl sm:text-5xl lg:text-6xl text-center my-10 lg:my-20">
        What people 
        <span className="bg-gradient-to-r from-cyan-400 to-sky-800 text-transparent bg-clip-text">
            {" "}are saying
        </span>
      </h2>
      <div className="flex flex-wrap justify-center">
        <Carousel
          plugins={[plugin.current]}
          className="w-full max-w-3xl"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          opts={{
            align: "start",
            loop: true,
          }}
        >
        <CarouselContent>
          {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="w-full sm:w-1/2 md:basis-1/2 px-4 py-2">
                <div className="bg-neutral-900 rounded-md p-6 text-md border border-cyan-800 font-thin min-h-[300px] flex flex-col">
                    <div className="flex-grow">
                        <p>{testimonial.text}</p>
                    </div>
                    <div className="flex mt-8 items-start">
                        <User className="w-12 h-12 mr-6 text-neutral-400" />
                        <div>
                            <h6>{testimonial.user}</h6>
                            <span className="text-sm font-normal italic text-neutral-600">
                            {testimonial.company}
                            </span>
                        </div>
                    </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious/>
          <CarouselNext/>
        </Carousel>
      </div>
    </div>
  );
};
export default Testimonials;
