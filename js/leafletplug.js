// Copyright 2014, University of Freiburg,
// Chair of Algorithms and Data Structures.
// Author: Patrick Brosi <brosip@informatik.uni-freiburg.de>

// wrapper class to use transitlayer with leaflet, maps leaflet interactions
// to transitlayer

window.T = {};

T.Layer = L.Class.extend({
  includes: L.Mixin.Events,

  initialize: function(transitLayer) {
    this._transitLayer = transitLayer;
  },

  onAdd: function (map) {
    this._transitLayer.init(map._panes.overlayPane);
    this._map = map;
    map._transitLayerwrap = this;
    this._updateViewPort(map);
    map.on('moveend', this._setMoveEnd);
    map.on('movestart', this._setMoveStart);
    map.on('zoomstart', this._setZoomStart);

    this._transitLayer.start();
  },

  _updateViewPort: function(map) {
    var panePosition = L.DomUtil.getPosition(map._mapPane);
    var minPos = panePosition.multiplyBy(-1);
    var maxPos = minPos.add(map.getSize());
    var newWidth = maxPos.x - minPos.x;
    var newHeight = maxPos.y - minPos.y;

    var bounds = map.getBounds();

    console.log("SW");
    console.log(map.project(bounds.getSouthWest()));

    console.log("NE");
    console.log(map.project(bounds.getNorthEast()));

    map._transitLayerwrap._transitLayer._updateRaphaelViewport(minPos.x, minPos.y, newWidth, newHeight,map.getZoom(), map.getPixelOrigin(), map.project(bounds.getSouthWest()), map.project(bounds.getNorthEast()));
  },

  _setMoveEnd: function() {
    this._transitLayerwrap._updateViewPort(this);
    this._transitLayerwrap._transitLayer._onMoveEnd();
  },

  _setMoveStart: function() {
    this._transitLayerwrap._transitLayer._onMoveStart();
  },

  _setZoomStart: function() {
    this._transitLayerwrap._transitLayer._onZoomStart();
  },

  onRemove: function() {
    this._transitLayerwrap._transitLayer.onRemove();
  }
});
