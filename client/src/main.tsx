import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title
document.title = "Dana AI Platform | Social Media Management";

// Add meta description for SEO
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'Dana AI Platform - Manage and automate social media communications across Facebook, Instagram, and WhatsApp with AI-powered responses.';
document.head.appendChild(metaDescription);

createRoot(document.getElementById("root")!).render(<App />);
