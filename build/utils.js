'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _objectAssignPolyfill = require('object.assign/polyfill');

var _objectAssignPolyfill2 = _interopRequireDefault(_objectAssignPolyfill);

var assign = (0, _objectAssignPolyfill2['default'])();

var arrayify = function arrayify(x) {
  return Array.isArray(x) ? x : [x];
};

var find = function find(f, xs) {
  return xs.reduce(function (b, x) {
    return b ? b : f(x) ? x : null;
  }, null);
};

var equalRecords = function equalRecords(o1, o2) {
  for (var key in o1) {
    if (o1[key] !== o2[key]) return false;
  }return true;
};

/* React 12<= / >=13 compatible findDOMNode function. */
var supportsFindDOMNode = Number(_react2['default'].version.split('.')[1]) >= 13;

var findDOMNode = function findDOMNode(component) {
  return supportsFindDOMNode ? _react2['default'].findDOMNode(component) : component.getDOMNode();
};

exports.assign = assign;
exports.arrayify = arrayify;
exports.find = find;
exports.equalRecords = equalRecords;
exports.findDOMNode = findDOMNode;