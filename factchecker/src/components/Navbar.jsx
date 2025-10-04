import {useState,useEffect} from "react";
import logo from '../assets/logo.svg';         // Uncomment this line if you have a logo image to use
import {navItems} from "../constants";
import {Menu,X} from "lucide-react";
const Navbar=()=>{
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 2. Effect to listen for scroll events
  useEffect(() => {
    const handleScroll = () => {
      // Set scrolled to true if user has scrolled more than 50px
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    // Cleanup function to remove the listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  const toggleNavbar = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  }
  return (
    <nav className={`sticky top-0 z-50 py-7 backdrop-blur-lg border-b border-neutral-700/80 ${scrolled ? "bg-neutral-900/80" : "bg-transparent"}`}>
      <div className="px-10 relative text-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center flex-shrink-0">
            <img className='h-10 w-10 mr-1' src={logo} alt="logo"/>
            <span className="text-xl tracking-tight text-white-800 text-semibold bg-clip-text">QuickFactChecker</span> 
          </div>
          <ul className="hidden lg:flex space-x-12">
            {navItems.map((item, index) => (
                <li key={index}>
                    <a href={item.href} className="hover:text-cyan-400">{item.label}</a>
                </li>
            ))}
          </ul> 
          <div className="lg:hidden md:flex flex-col justify-end">
            <button onClick={toggleNavbar}>
              {mobileDrawerOpen ? <X /> : <Menu />}
            </button>
          </div>
          {mobileDrawerOpen && (
            <div className="fixed top-16 right-0 z-40 bg-neutral-900 w-full p-12 flex flex-col justify-center items-center lg:hidden">
              <ul>
                {navItems.map((item, index) => (
                  <li key={index} className="py-4">
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
export default Navbar;