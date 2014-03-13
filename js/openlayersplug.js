OpenLayers.Layer.TransitLayer = OpenLayers.Class(OpenLayers.Layer, {
    isBaseLayer: false,
    isFixed: false,

    initialize: function(name, options) {
        OpenLayers.Layer.prototype.initialize.apply(this, arguments);
        this._transitLayer = options.transitLayer;
    },

    destroy: function() {
      // TODO
    },

    refresh: function(obj) {
      // TODO
    },

    setMap: function(map) {
        OpenLayers.Layer.prototype.setMap.apply(this, arguments);
        map.raiseLayer(this, map.layers.length);
        this._transitLayer.init(this.div);

        map.zoomToProxy = map.zoomTo;
        map._transitLayerWrapper = this;
        map.zoomTo =  function (zoom,xy){
          if (zoom < 6) map._transitLayerWrapper._transitLayer._onZoomStart();
          map.zoomToProxy.apply(this, arguments);
        };
    },

    removeMap: function(map) {

    },

    onMapResize: function() {
        OpenLayers.Layer.prototype.onMapResize.apply(this, arguments);
    },

    moveTo: function(bounds, zoomChanged, dragging) {
        OpenLayers.Layer.prototype.moveTo.apply(this, arguments);
        this._updateViewPort();
        this._transitLayer._onMoveEnd();
    },

    _updateViewPort: function() {
      var extent = this.map.calculateBounds(null, this.map.getResolution());

      var offsetLeft = this.map.layerContainerOriginPx.x;
      var offsetTop = this.map.layerContainerOriginPx.y;

      var newWidth = this.map.getSize().w;
      var newHeight = this.map.getSize().h;

      var bounds = this.map.getExtent();
      var sw = {"x" : bounds.left, "y" : bounds.bottom};
      var ne = {"x" : bounds.right, "y" : bounds.top};
      var pixelOr = {"x" : extent.left + offsetLeft * this.map.getResolution(), "y" : extent.top - offsetTop * this.map.getResolution()};

      this._transitLayer._updateRaphaelViewport(-offsetLeft, -offsetTop, newWidth, newHeight, this.map.getZoom(), pixelOr, sw, ne);
    },

    CLASS_NAME: "OpenLayers.Layer.TransitLayer"
});
