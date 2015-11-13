"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var isServer = typeof window === "undefined";
var isClient = !isServer;
var WINDOW = isClient ? window : null;

exports.isServer = isServer;
exports.isClient = isClient;
exports.window = WINDOW;