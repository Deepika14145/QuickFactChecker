import { BotMessageSquare } from "lucide-react";
import { BatteryCharging } from "lucide-react";
import { Fingerprint } from "lucide-react";
import { ShieldHalf } from "lucide-react";
import { PlugZap } from "lucide-react";
import { GlobeLock } from "lucide-react";


export const navItems = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export const testimonials = [                   //add Testimonials here whenever available
  {
    user: "abc",                                //name of user
    company: "Student",                         //company name
    text: " // dummy text //",                  //testimonial text
  },
  {
    user: "Jane Smith",                            //dummy testimonial
    company: "Social Media Manager",
    text: "This app is a game-changer for scrolling through my social media feed. I can finally verify those viral headlines and 'unbelievable' stories in seconds. No more accidentally sharing fake news! It's simple, fast, and so necessary today.",
  },
  {
    user: "David Johnson",
    company: "Student",
    text: "As a university student, accuracy is everything. The Quick Fact Checker is my go-to tool for verifying statistics and sources for my research papers. It's like having a personal research assistant in my pocket. It has saved me hours of work.",
  },
  {
    user: "Ronee Brown",
    company: "Freelance Journalist",
    text: "In my line of work, deadlines are tight and facts are non-negotiable. This app is indispensable for on-the-fly verification during interviews and while writing articles. It's fast, reliable, and helps maintain my professional integrity.",
  },
  {
    user: "Michael Wilson",
    company: "Visionary Creations",
    text: "I am amazed by the level of professionalism and dedication shown by the team. They were able to exceed our expectations and deliver outstanding results.",
  },
  {
    user: "Emily Davis",
    company: "Synergy Systems",
    text: "The team went above and beyond to ensure our project was a success. Their expertise and dedication are unmatched. I look forward to working with them again in the future.",
  },
];

export const features = [
  {
    icon: <BotMessageSquare />,
    text: "Advanced AI Analysis",
    description:
      "Our app uses a suite of machine learning models, including Naive Bayes and LSTM, to analyze articles for subtle signs of fabrication and misinformation."
  },
  {
    icon: <Fingerprint />,
    text: "Source Verification",
    description:
      "Trace any claim back to it's original source.We flag potentially unreliable sources to help you make informed decisions.",
  },
  {
    icon: <ShieldHalf />,
    text: " Trained on Academic Datasets",
    description:
      "The AI is rigorously trained on recognized academic datasets like LIAR, ensuring a high degree of accuracy in distinguishing credible news from fake ones.",
  },
  {
    icon: <BatteryCharging />,
    text: "Updated in Real-Time",
    description:
      "Our models are continuously updated with the latest data to adapt to new misinformation tactics and trends.",
  },
  {
    icon: <PlugZap />,
    text: "Seamless Integration",
    description:
      "Easily integrate our fact-checking capabilities into your existing workflows with our user-friendly API and browser extensions.",
  },
  {
    icon: <GlobeLock />,
    text: "Privacy and Security",
    description:
      "We provide secure, encrypted fact checking so that your curiousity remains yours alone.",
  },
];


export const resourcesLinks = [
  { href: "#", text: "How It Works" },
  { href: "#", text: "Media Literacy Guide" },
  { href: "#", text: "Browser Extension" },
  { href: "#", text: "Report an Issue" },
  { href: "#", text: "Contact Us" },
];

export const platformLinks = [
  { href: "#", text: "Our Mission" },
  { href: "#", text: "The LIAR Dataset" },
  { href: "#", text: "Our Technology (LSTM)" },
  { href: "#", text: "Privacy Policy" },
  { href: "#", text: "Terms of Service" },
];

export const communityLinks = [
  { href: "#", text: "Blog" },
  { href: "#", text: "X (Twitter)" },
  { href: "#", "text": "GitHub" },
  { href: "#", text: "Contribute" },
  { href: "#", text: "Join our Newsletter" },
];