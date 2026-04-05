// @scryglass/pwa — application entry point
import { render } from 'preact';
import { App } from './components/App.js';
import './assets/styles.css';

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
