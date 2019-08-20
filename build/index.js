'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _createReactClass = require('create-react-class');

var _createReactClass2 = _interopRequireDefault(_createReactClass);

var _reactDomFactories = require('react-dom-factories');

var _reactDomFactories2 = _interopRequireDefault(_reactDomFactories);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _onResize = require('./on-resize');

var resizeEvent = _interopRequireWildcard(_onResize);

var _layout = require('./layout');

var Layout = _interopRequireWildcard(_layout);

var _lodashThrottle = require('lodash.throttle');

var _lodashThrottle2 = _interopRequireDefault(_lodashThrottle);

var _cssVendor = require('css-vendor');

var _cssVendor2 = _interopRequireDefault(_cssVendor);

var _platform = require('./platform');

var _utils = require('./utils');

var _popoverTip = require('./popover-tip');

var _popoverTip2 = _interopRequireDefault(_popoverTip);

var log = (0, _debug2['default'])('react-popover');

var supportedCSSValue = (0, _utils.clientOnly)(_cssVendor2['default'].supportedValue);

var jsprefix = function jsprefix(x) {
  return '' + _cssVendor2['default'].prefix.js + x;
};

var cssprefix = function cssprefix(x) {
  return '' + _cssVendor2['default'].prefix.css + x;
};

var cssvalue = function cssvalue(prop, value) {
  return supportedCSSValue(prop, value) || cssprefix(value);
};

var coreStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  display: cssvalue('display', 'flex')
};

var faces = {
  above: 'down',
  right: 'left',
  below: 'up',
  left: 'right'
};

/* Flow mappings. Each map maps the flow domain to another domain. */

var flowToTipTranslations = {
  row: 'translateY',
  column: 'translateX'
};

var flowToPopoverTranslations = {
  row: 'translateX',
  column: 'translateY'
};

var Popover = (0, _createReactClass2['default'])({
  displayName: 'popover',
  propTypes: {
    body: _propTypes2['default'].node.isRequired,
    target: _propTypes2['default'].object.isRequired,
    preferPlace: _propTypes2['default'].oneOf(Layout.validTypeValues),
    place: _propTypes2['default'].oneOf(Layout.validTypeValues),
    tipSize: _propTypes2['default'].number,
    offsetX: _propTypes2['default'].number,
    offsetY: _propTypes2['default'].number,
    refreshIntervalMs: _propTypes2['default'].oneOfType([_propTypes2['default'].number, _propTypes2['default'].bool]),
    isOpen: _propTypes2['default'].bool,
    onOuterAction: _propTypes2['default'].func,
    enterExitTransitionDurationMs: _propTypes2['default'].number,
    align: _propTypes2['default'].string
  },
  getInitialState: function getInitialState() {
    return {
      standing: 'above',
      exited: !this.props.isOpen, // for animation-dependent rendering, should popover close/open?
      exiting: false, // for tracking in-progress animations
      toggle: false };
  },
  // for business logic tracking, should popover close/open?
  getDefaultProps: function getDefaultProps() {
    return {
      tipSize: 7,
      preferPlace: null,
      place: null,
      offset: 4,
      offsetX: 0,
      offsetY: 0,
      isOpen: false,
      onOuterAction: function noOperation() {},
      enterExitTransitionDurationMs: 500,
      target: null,
      refreshIntervalMs: 200,
      align: 'center'
    };
  },
  checkTargetReposition: function checkTargetReposition() {
    if (this.measureTargetBounds()) this.resolvePopoverLayout();
  },
  resolvePopoverLayout: function resolvePopoverLayout() {
    /* Find the optimal zone to position self. Measure the size of each zone and use the one with
    the greatest area. */

    var pickerSettings = {
      preferPlace: this.props.preferPlace,
      place: this.props.place
    };

    /* This is a kludge that solves a general problem very specifically for Popover.
    The problem is subtle. When Popover positioning changes such that it resolves at
    a different orientation, its Size will change because the Tip will toggle between
    extending Height or Width. The general problem of course is that calculating
    zone positioning based on current size is non-trivial if the Size can change once
    resolved to a different zone. Infinite recursion can be triggered as we noted here:
    https://github.com/littlebits/react-popover/issues/18. As an example of how this
    could happen in another way: Imagine the user changes the CSS styling of the popover
    based on whether it was `row` or `column` flow. TODO: Find a solution to generally
    solve this problem so that the user is free to change the Popover styles in any
    way at any time for any arbitrary trigger. There may be value in investigating the
    http://overconstrained.io community for its general layout system via the
    constraint-solver Cassowary. */
    if (this.zone) this.size[this.zone.flow === 'row' ? 'h' : 'w'] += this.props.tipSize;
    var zone = Layout.pickZone(pickerSettings, this.frameBounds, this.targetBounds, this.size);
    if (this.zone) this.size[this.zone.flow === 'row' ? 'h' : 'w'] -= this.props.tipSize;

    var tb = this.targetBounds;
    this.zone = zone;
    log('zone', zone);

    this.setState({
      standing: zone.standing
    });

    var axis = Layout.axes[zone.flow];
    log('axes', axis);

    var dockingEdgeBufferLength = Math.round(getComputedStyle(this.bodyEl).borderRadius.slice(0, -2)) || 0;
    var scrollSize = Layout.El.calcScrollSize(this.frameEl);
    scrollSize.main = scrollSize[axis.main.size];
    scrollSize.cross = scrollSize[axis.cross.size];

    /* When positioning self on the cross-axis do not exceed frame bounds. The strategy to achieve
    this is thus: First position cross-axis self to the cross-axis-center of the the target. Then,
    offset self by the amount that self is past the boundaries of frame. */
    var pos = Layout.calcRelPos(zone, tb, this.size, this.props.align);

    /* Offset allows users to control the distance betweent the tip and the target. */
    pos[axis.main.start] += this.props.offset * zone.order;

    /* Constrain containerEl Position within frameEl. Try not to penetrate a visually-pleasing buffer from
    frameEl. `frameBuffer` length is based on tipSize and its offset. */

    var frameBuffer = this.props.tipSize + this.props.offset;
    var hangingBufferLength = dockingEdgeBufferLength * 2 + this.props.tipSize * 2 + frameBuffer;
    var frameCrossStart = this.frameBounds[axis.cross.start];
    var frameCrossEnd = this.frameBounds[axis.cross.end];
    var frameCrossLength = this.frameBounds[axis.cross.size];
    var frameCrossInnerLength = frameCrossLength - frameBuffer * 2;
    var frameCrossInnerStart = frameCrossStart + frameBuffer;
    var frameCrossInnerEnd = frameCrossEnd - frameBuffer;
    var popoverCrossStart = pos[axis.cross.start];
    var popoverCrossEnd = pos[axis.cross.end];

    /* If the popover dose not fit into frameCrossLength then just position it to the `frameCrossStart`.
    popoverCrossLength` will now be forced to overflow into the `Frame` */
    if (pos.crossLength > frameCrossLength) {
      log('popoverCrossLength does not fit frame.');
      pos[axis.cross.start] = 0;

      /* If the `popoverCrossStart` is forced beyond some threshold of `targetCrossLength` then bound
      it (`popoverCrossStart`). */
    } else if (tb[axis.cross.end] < hangingBufferLength) {
        log('popoverCrossStart cannot hang any further without losing target.');
        pos[axis.cross.start] = tb[axis.cross.end] - hangingBufferLength;

        /* If the `popoverCrossStart` does not fit within the inner frame (honouring buffers) then
        just center the popover in the remaining `frameCrossLength`. */
      } else if (pos.crossLength > frameCrossInnerLength) {
          log('popoverCrossLength does not fit within buffered frame.');
          pos[axis.cross.start] = (frameCrossLength - pos.crossLength) / 2;
        } else if (popoverCrossStart < frameCrossInnerStart) {
          log('popoverCrossStart cannot reverse without exceeding frame.');
          pos[axis.cross.start] = frameCrossInnerStart;
        } else if (popoverCrossEnd > frameCrossInnerEnd) {
          log('popoverCrossEnd cannot travel without exceeding frame.');
          pos[axis.cross.start] = pos[axis.cross.start] - (pos[axis.cross.end] - frameCrossInnerEnd);
        }

    /* So far the link position has been calculated relative to the target. To calculate the absolute
    position we need to factor the `Frame``s scroll position */

    pos[axis.cross.start] += scrollSize.cross;
    pos[axis.main.start] += scrollSize.main;

    /* Apply `flow` and `order` styles. This can impact subsequent measurements of height and width
    of the container. When tip changes orientation position due to changes from/to `row`/`column`
    width`/`height` will be impacted. Our layout monitoring will catch these cases and automatically
    recalculate layout. */

    this.containerEl.style.flexFlow = zone.flow;
    this.containerEl.style[jsprefix('FlexFlow')] = this.containerEl.style.flexFlow;
    this.bodyEl.style.order = zone.order;
    this.bodyEl.style[jsprefix('Order')] = this.bodyEl.style.order;

    /* Apply Absolute Positioning. */

    log('pos', pos);
    this.containerEl.style.top = pos.y + this.props.offsetY + 'px';
    this.containerEl.style.left = pos.x + this.props.offsetX + 'px';

    /* Calculate Tip Position */

    var tipCrossPos =
    /* Get the absolute tipCrossCenter. Tip is positioned relative to containerEl
    but it aims at targetCenter which is positioned relative to frameEl... we
    need to cancel the containerEl positioning so as to hit our intended position. */
    Layout.centerOfBoundsFromBounds(zone.flow, 'cross', tb, pos)

    /* centerOfBounds does not account for scroll so we need to manually add that
    here. */
     + scrollSize.cross

    /* Center tip relative to self. We do not have to calcualte half-of-tip-size since tip-size
    specifies the length from base to tip which is half of total length already. */
     - this.props.tipSize;

    if (tipCrossPos < dockingEdgeBufferLength) tipCrossPos = dockingEdgeBufferLength;else if (tipCrossPos > pos.crossLength - dockingEdgeBufferLength - this.props.tipSize * 2) {
      tipCrossPos = pos.crossLength - dockingEdgeBufferLength - this.props.tipSize * 2;
    }

    this.tipEl.style.transform = flowToTipTranslations[zone.flow] + '(' + tipCrossPos + 'px)';
    this.tipEl.style[jsprefix('Transform')] = this.tipEl.style.transform;
  },
  measurePopoverSize: function measurePopoverSize() {
    this.size = Layout.El.calcSize(this.containerEl);
  },
  measureTargetBounds: function measureTargetBounds() {
    var newTargetBounds = Layout.El.calcBounds(this.targetEl);

    if (this.targetBounds && Layout.equalCoords(this.targetBounds, newTargetBounds)) {
      return false;
    }

    this.targetBounds = newTargetBounds;
    return true;
  },
  componentDidMount: function componentDidMount() {
    this.targetEl = this.props.target;
    if (this.props.isOpen) this.enter();
  },
  UNSAFE_componentWillReceiveProps: function UNSAFE_componentWillReceiveProps(propsNext) {
    //log(`Component received props!`, propsNext)
    var willOpen = !this.props.isOpen && propsNext.isOpen;
    var willClose = this.props.isOpen && !propsNext.isOpen;

    if (willOpen) this.open();else if (willClose) this.close();
  },
  open: function open() {
    if (this.state.exiting) this.animateExitStop();
    this.setState({ toggle: true, exited: false });
  },
  close: function close() {
    this.setState({ toggle: false });
  },
  componentDidUpdate: function componentDidUpdate(propsPrev, statePrev) {
    //log(`Component did update!`)
    var didOpen = !statePrev.toggle && this.state.toggle;
    var didClose = statePrev.toggle && !this.state.toggle;
    var didChangeTarget = propsPrev.target !== this.props.target;

    if (didChangeTarget) {
      this.targetEl = this.props.target;
    }

    if (didOpen || didChangeTarget) this.enter();else if (didClose) this.exit();
  },
  enter: function enter() {
    if (_platform.isServer) return;
    log('enter!');
    this.trackPopover();
    this.animateEnter();
  },
  exit: function exit() {
    log('exit!');
    this.animateExit();
    this.untrackPopover();
  },
  animateExitStop: function animateExitStop() {
    clearTimeout(this.exitingAnimationTimer1);
    clearTimeout(this.exitingAnimationTimer2);
    this.setState({ exiting: false });
  },
  animateExit: function animateExit() {
    var _this = this;

    this.setState({ exiting: true });
    this.exitingAnimationTimer2 = setTimeout(function () {
      setTimeout(function () {
        _this.containerEl.style.transform = flowToPopoverTranslations[_this.zone.flow] + '(' + _this.zone.order * 50 + 'px)';
        _this.containerEl.style.opacity = '0';
      }, 0);
    }, 0);

    this.exitingAnimationTimer1 = setTimeout(function () {
      _this.setState({ exited: true, exiting: false });
    }, this.props.enterExitTransitionDurationMs);
  },
  animateEnter: function animateEnter() {
    /* Prepare `entering` style so that we can then animate it toward `entered`. */

    this.containerEl.style.transform = flowToPopoverTranslations[this.zone.flow] + '(' + this.zone.order * 50 + 'px)';
    this.containerEl.style[jsprefix('Transform')] = this.containerEl.style.transform;
    this.containerEl.style.opacity = '0';

    /* After initial layout apply transition animations. */

    /* Hack: http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes */
    this.containerEl.offsetHeight;

    this.tipEl.style.transition = 'transform 150ms ease-in';
    this.tipEl.style[jsprefix('Transition')] = cssprefix('transform') + ' 150ms ease-in';
    this.containerEl.style.transitionProperty = 'top, left, opacity, transform';
    this.containerEl.style.transitionDuration = '500ms';
    this.containerEl.style.transitionTimingFunction = 'cubic-bezier(0.230, 1.000, 0.320, 1.000)';
    this.containerEl.style.opacity = '1';
    this.containerEl.style.transform = 'translateY(0)';
    this.containerEl.style[jsprefix('Transform')] = this.containerEl.style.transform;
  },
  trackPopover: function trackPopover() {
    var minScrollRefreshIntervalMs = 200;
    var minResizeRefreshIntervalMs = 200;

    /* Get references to DOM elements. */

    this.containerEl = (0, _utils.findDOMNode)(this);
    this.bodyEl = this.containerEl.querySelector('.Popover-body');
    this.tipEl = this.containerEl.querySelector('.Popover-tip');

    /* Note: frame is hardcoded to window now but we think it will
    be a nice feature in the future to allow other frames to be used
    such as local elements that further constrain the popover`s world. */

    this.frameEl = _platform.window;

    /* Set a general interval for checking if target position changed. There is no way
    to know this information without polling. */
    if (this.props.refreshIntervalMs) {
      this.checkLayoutInterval = setInterval(this.checkTargetReposition, this.props.refreshIntervalMs);
    }

    /* Watch for boundary changes in all deps, and when one of them changes, recalculate layout.
    This layout monitoring must be bound immediately because a layout recalculation can recursively
    cause a change in boundaries. So if we did a one-time force-layout before watching boundaries
    our final position calculations could be wrong. See comments in resolver function for details
    about which parts can trigger recursive recalculation. */

    this.onFrameScroll = (0, _lodashThrottle2['default'])(this.onFrameScroll, minScrollRefreshIntervalMs);
    this.onFrameResize = (0, _lodashThrottle2['default'])(this.onFrameResize, minResizeRefreshIntervalMs);
    this.onPopoverResize = (0, _lodashThrottle2['default'])(this.onPopoverResize, minResizeRefreshIntervalMs);
    this.onTargetResize = (0, _lodashThrottle2['default'])(this.onTargetResize, minResizeRefreshIntervalMs);

    this.frameEl.addEventListener('scroll', this.onFrameScroll);
    resizeEvent.on(this.frameEl, this.onFrameResize);
    resizeEvent.on(this.containerEl, this.onPopoverResize);
    resizeEvent.on(this.targetEl, this.onTargetResize);

    /* Track user actions on the page. Anything that occurs _outside_ the Popover boundaries
    should close the Popover. */

    _platform.window.addEventListener('mousedown', this.checkForOuterAction);
    _platform.window.addEventListener('touchstart', this.checkForOuterAction);

    /* Kickstart layout at first boot. */

    this.measurePopoverSize();
    this.measureFrameBounds();
    this.measureTargetBounds();
    this.resolvePopoverLayout();
  },
  checkForOuterAction: function checkForOuterAction(event) {
    var isOuterAction = !this.containerEl.contains(event.target) && !this.targetEl.contains(event.target);
    if (isOuterAction) this.props.onOuterAction();
  },
  untrackPopover: function untrackPopover() {
    clearInterval(this.checkLayoutInterval);
    this.frameEl.removeEventListener('scroll', this.onFrameScroll);
    resizeEvent.off(this.frameEl, this.onFrameResize);
    resizeEvent.off(this.containerEl, this.onPopoverResize);
    resizeEvent.off(this.targetEl, this.onTargetResize);
    _platform.window.removeEventListener('mousedown', this.checkForOuterAction);
    _platform.window.removeEventListener('touchstart', this.checkForOuterAction);
  },
  onTargetResize: function onTargetResize() {
    log('Recalculating layout because _target_ resized!');
    this.measureTargetBounds();
    this.resolvePopoverLayout();
  },
  onPopoverResize: function onPopoverResize() {
    log('Recalculating layout because _popover_ resized!');
    this.measurePopoverSize();
    this.resolvePopoverLayout();
  },
  onFrameScroll: function onFrameScroll() {
    log('Recalculating layout because _frame_ scrolled!');
    this.measureTargetBounds();
    this.resolvePopoverLayout();
  },
  onFrameResize: function onFrameResize() {
    log('Recalculating layout because _frame_ resized!');
    this.measureFrameBounds();
    this.resolvePopoverLayout();
  },
  measureFrameBounds: function measureFrameBounds() {
    this.frameBounds = Layout.El.calcBounds(this.frameEl);
  },
  componentWillUnmount: function componentWillUnmount() {
    clearInterval(this.checkLayoutInterval);
  },
  render: function render() {
    if (this.state.exited) return null;

    var _props = this.props;
    var _props$className = _props.className;
    var className = _props$className === undefined ? '' : _props$className;
    var _props$style = _props.style;
    var style = _props$style === undefined ? {} : _props$style;

    var popoverProps = {
      className: 'Popover ' + className,
      style: (0, _utils.assign)({}, coreStyle, style)
    };

    var tipProps = {
      direction: faces[this.state.standing],
      size: this.props.tipSize
    };

    /* If we pass array of nodes to component children React will complain that each
    item should have a key prop. This is not a valid requirement in our case. Users
    should be able to give an array of elements applied as if they were just normal
    children of the body component (note solution is to spread array items as args). */

    var popoverBody = (0, _utils.arrayify)(this.props.body);

    return _reactDomFactories2['default'].div(popoverProps, _reactDomFactories2['default'].div.apply(_reactDomFactories2['default'], [{ className: 'Popover-body' }].concat(_toConsumableArray(popoverBody))), _react2['default'].createElement(_popoverTip2['default'], tipProps));
  }
});

exports['default'] = Popover;
module.exports = exports['default'];