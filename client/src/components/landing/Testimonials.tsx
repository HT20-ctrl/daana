import { useState } from 'react';

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: "Dana AI has completely transformed how we handle customer inquiries. We've seen a 45% reduction in response time and a dramatic improvement in customer satisfaction scores.",
    author: "Sarah Johnson",
    role: "Customer Success Manager",
    company: "TechFlow Inc.",
    avatarUrl: "https://randomuser.me/api/portraits/women/1.jpg"
  },
  {
    id: 2,
    quote: "The ROI on Dana AI has been incredible. Within 3 months, we reduced support costs by 60% while handling 3x more customer conversations across all our channels.",
    author: "Michael Chen",
    role: "VP of Operations",
    company: "Nexus Solutions",
    avatarUrl: "https://randomuser.me/api/portraits/men/2.jpg"
  },
  {
    id: 3,
    quote: "What impressed me most about Dana AI is how easy it was to set up. In less than an hour, we had connected all our platforms and were already seeing the benefits.",
    author: "Lisa Rodriguez",
    role: "Digital Transformation Lead",
    company: "Global Retail Group",
    avatarUrl: "https://randomuser.me/api/portraits/women/3.jpg"
  }
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };
  
  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };
  
  const currentTestimonial = testimonials[activeIndex];
  
  return (
    <section className="py-24 px-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">What Our Customers Say</h2>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
            Businesses of all sizes are seeing remarkable results with Dana AI.
          </p>
        </div>
        
        <div className="relative">
          {/* Main testimonial */}
          <div className="relative backdrop-blur-sm bg-white/80 rounded-2xl border border-blue-100 p-8 md:p-10 shadow-xl">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-blue-100">
                  <img 
                    src={currentTestimonial.avatarUrl} 
                    alt={currentTestimonial.author}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                    </svg>
                  ))}
                </div>
                
                <blockquote className="text-xl text-slate-700 mb-6 italic">"{currentTestimonial.quote}"</blockquote>
                
                <div>
                  <p className="font-semibold text-slate-900">{currentTestimonial.author}</p>
                  <p className="text-sm text-slate-600">{currentTestimonial.role}, {currentTestimonial.company}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation controls */}
          <div className="flex justify-center mt-8 gap-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeIndex 
                    ? 'bg-blue-600 w-8' 
                    : 'bg-blue-300 hover:bg-blue-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
          
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between pointer-events-none">
            <button
              onClick={prevTestimonial}
              className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm shadow-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-blue-600 transition-all duration-300 pointer-events-auto"
              aria-label="Previous testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={nextTestimonial}
              className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm shadow-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-blue-600 transition-all duration-300 pointer-events-auto"
              aria-label="Next testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
        

      </div>
    </section>
  );
}