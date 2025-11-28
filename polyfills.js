// React Native polyfills for Node.js modules
import { Buffer } from 'buffer';
import 'react-native-url-polyfill/auto';

// Set up Buffer globally
global.Buffer = global.Buffer || Buffer;

// Polyfill process for React Native
if (!global.process) {
  const process = require('process');
  global.process = process;
  global.process.env = global.process.env || {};
}

// Polyfill TextEncoder/TextDecoder
if (!global.TextEncoder) {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Simple crypto polyfill for React Native
if (!global.crypto) {
  global.crypto = {
    getRandomValues: function(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  };
}

// Simple atob/btoa polyfills if not available
if (!global.atob) {
  global.atob = function(str) {
    return Buffer.from(str, 'base64').toString('binary');
  };
}

if (!global.btoa) {
  global.btoa = function(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

export { };
