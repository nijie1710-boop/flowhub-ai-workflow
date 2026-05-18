import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import * as FlowHubApi from './lib/api.js';
import * as FlowHubAuth from './lib/auth.js';
import './styles/main.css';

window.FlowHubApi = FlowHubApi;
window.FlowHubAuth = FlowHubAuth;

createRoot(document.getElementById('root')).render(<App />);
