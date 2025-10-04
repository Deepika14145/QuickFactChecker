import React from 'react'
import {resourcesLinks} from '../constants';
import {platformLinks} from '../constants';
import {communityLinks} from '../constants';
import {BsInstagram} from 'react-icons/bs';
import {FaDiscord} from 'react-icons/fa';
import {FiGithub} from 'react-icons/fi';
import { AiOutlineMail } from 'react-icons/ai';

const Footer=()=>{
    return (
        <footer className="mt-40 border-t border-neutral-800 py-10">
          <div id="contact"className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between">
            <div>
              <h3 className='text-md font-semibold mb-4'>Resources</h3>
              <ul className="space-y-2">
                {resourcesLinks.map((link, index) => (
                  <li key={index}>
                    <a className="text-neutral-300 hover:text-white" href={link.href}>
                        {link.text}
                    </a>
                  </li>
                ))}
                </ul>
            </div>
            <div>
              <h3 className='text-md font-semibold mb-4'>Platform</h3>
              <ul className="space-y-2">
                {platformLinks.map((link, index) => (
                  <li key={index}>
                    <a className="text-neutral-300 hover:text-white" href={link.href}>
                        {link.text}
                    </a>
                  </li>
                ))}
                </ul>
            </div>
            <div>
              <div className="mt-8 lg:mt-0">
                <h3 className='text-md font-semibold mb-8'>Community</h3>
                <ul className="space-y-2">
                  <div className='footer-icons flex space-x-4 mb-8'>
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-cyan-400"><BsInstagram className='w-8 h-8'/></a>
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-cyan-400"><FaDiscord className='w-8 h-8'/></a>
                    <a href="https://github.com/Deepika14145/QuickFactChecker" target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-cyan-400"><FiGithub className='w-8 h-8'/></a>
                  </div>
                </ul>
                <h4 className='text-md font-semibold mb-8'>Contact us</h4>
                <ul className="space-y-2">
                  abc@gmail.com
                </ul>
              </div>
            </div>
          </div>
        </footer>
  );
};
export default Footer;
