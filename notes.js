simplified = simplify(pointsArrayToHash(shortest_path), 0.27, true)

points = simplified.map((a) => {return [a.y, a.x]})

points = points.map((a) => {
  return pointToLngLat(a, containingTileAndZoom[0], containingTileAndZoom[1]);
})

  var line = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": points
        }
    }]
  }
  map.addLayer({
        'id': 'line-animation1',
        'type': 'line',
        'source': {
            'type': 'geojson',
            'data': line
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'paint': {
            'line-color': '#ed6498',
            'line-width': 5,
            'line-opacity': .8
        }
    });
