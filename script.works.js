// watchify script.js -o bundle.js
_ = require('lodash')
png = require('pngjs')
Deque = require("double-ended-queue");
simplify = require("simplify-js")

// this url will be the smallest tile containing the two points we want to find a path between. 
// an improvement would be to get higher zoom (and resolution) tiles and combine them
// url - zoom, x, y
url = "https://api.mapbox.com/styles/v1/gkrathwohl/cjvjqopg8169r1cpa951fcykp/tiles/256/0/0/0?access_token=pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA"
// url = "https://api.mapbox.com/styles/v1/gkrathwohl/cjvjqopg8169r1cpa951fcykp/tiles/256/10/310/377?access_token=pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA"

// eg. (url, [0,0], [250,243])
function loadMap(url, pointA, pointB){
startTime = Date.now()

fetch(url).then(function(response){
  return response.arrayBuffer();
}).then(function(buffer) {
  new png.PNG({ filterType:4 }).parse( buffer, function(error, image){
    pixels = _.chunk(image.data, 4);
    mask = pixels.map(function(p){ return p[3]}).map(function(p){return (p == 0) ? false : true})
    mask = _.chunk(mask, 256)

    start = pointA
    current_pixel = pointB
    shortest_path = []
    goal = start;

    // start at the first pixel, enqueue all others that touch it.
    distances = Array.from(Array(image.height), () => new Array(image.width))
    q = new Deque();

    curr_distance = 0;
    q.push(start)

    // process generation

    // for all pixels in the queue, give them the current distance
    current_generation = new Deque();
    while(q.peekFront()){
      while(x = q.pop()) { current_generation.push(x) }
      while(curr_pixel = current_generation.pop()) {
        if(!mask[curr_pixel[0]][curr_pixel[1]]){
          continue;
        }
        if(distances[curr_pixel[0]][curr_pixel[1]] == undefined){
          distances[curr_pixel[0]][curr_pixel[1]] = curr_distance;
        }else{
          continue;
        }
        // add neighbors to queue
        // neighbors = filtered_neighbors(neighbors(curr_pixel), 256, 256);
        neighbors = [];
        neighbors.push([curr_pixel[0]+1, curr_pixel[1]])
        neighbors.push([curr_pixel[0], curr_pixel[1]+1])
        neighbors.push([curr_pixel[0]-1, curr_pixel[1]])
        neighbors.push([curr_pixel[0], curr_pixel[1]-1])
        // diagonals
        neighbors.push([curr_pixel[0]+1, curr_pixel[1]+1])
        neighbors.push([curr_pixel[0]-1, curr_pixel[1]-1])
        neighbors.push([curr_pixel[0]+1, curr_pixel[1]-1])
        neighbors.push([curr_pixel[0]-1, curr_pixel[1]+1])

        neighbors = neighbors.filter(function(p){ return p[0] <= 255 && p[0] >= 0 && p[1] <= 255 && p[1] >= 0});
        neighbors.forEach(function(n){q.push(n)});
      }
      curr_distance++;
    }
    

    d = distances.map(function(row){ return row.map(function(x){ return x == undefined ? false : true})})

    prev_direction = null;
    i = 0
    skip = distances[current_pixel[0], current_pixel[1]] == undefined;
    while(!skip && !(current_pixel[0] == goal[0] && current_pixel[1] == goal[1])){
      neighbors = [
        [current_pixel[0] + 1, current_pixel[1]],
        [current_pixel[0], current_pixel[1] + 1],
        [current_pixel[0] - 1, current_pixel[1]],
        [current_pixel[0], current_pixel[1] - 1],
        [current_pixel[0]+1, current_pixel[1]+1],
        [current_pixel[0]-1, current_pixel[1] - 1],
        [current_pixel[0]+1, current_pixel[1] - 1],
        [current_pixel[0]-1, current_pixel[1] + 1]
      ].filter(function(a){ 
        return a[0] >= 0 && a[0] <= 255 && a[1] >= 0 && a[1] <= 255
      }).filter(function(a){
        return !containsPixel(shortest_path, a)
      });

      neighborsDistances = neighbors.map(function(n){
        return distances[n[0]][n[1]];
      })

      neighborsDistances = neighborsDistances.map(function(a){
        if(a == null) {
          return Number.MAX_SAFE_INTEGER;
        }else{
          return a
        }
      })

      // min_neighbor = neighbors[neighborsDistances.indexOf(Math.min(...neighborsDistances))]
      min_neighbor_distance = Math.min(...neighborsDistances)
      min_neighbors = neighbors.filter((n,i) => { return neighborsDistances[i] == min_neighbor_distance})
      min_neighbor = min_neighbors[0]
      if(prev_direction != null && min_neighbors.length > 1){
        preferred_min_neighbors = min_neighbors.filter((n) => {
          n_direction = direction(current_pixel, n)
          return !(prev_direction[0] == n_direction[0] && prev_direction[1] == n_direction[1])
        })

        min_neighbor = preferred_min_neighbors[0]
      }
      
      // min_neighbor = s

      prev_direction = direction(current_pixel, min_neighbor)


      shortest_path.push(min_neighbor)
      current_pixel = min_neighbor
      i++;
    }

    // for(i=0;i<256;i++){
    //   shortest_path.push([i,i])
    // }
    drawPath();
    // draw(distances, shortest_path)  //debugger

    console.log((Date.now() - startTime) / 1000);

  });
});
}

direction = function(a, b) {
  return [
    b[0] - a[0],
    b[1] - a[1]
  ]
}

containsPixel = function(pixelArray, pixel){
  var contains = false
  pixelArray.forEach((a) => {
    if(a[0] == pixel[0] && a[1] == pixel[1]) {
      contains=true;
    }
  })
  return contains;
}

draw = function(distances, shortest_path) {
  distances = distances.reduce(function(acc, currArray){ return acc.concat(currArray) }, [])
  var max = Math.max(...distances.flat())
  var scale = 255 / max;
  distances = distances.map(function(p){ return p * scale })

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');

  var imageData = ctx.getImageData(0, 0, 256, 256);
  var data = imageData.data;

  for (var i = 0; i < data.length; i += 4) {
    data[i]     = 0;     // red
    data[i + 1] = distances[i/4]; // green
    data[i + 2] = 255 - distances[i/4]; // blue
    data[i + 3] = 255
  }

  shortest_path.forEach(function(p){
    r = ((p[0] * 256) + p[1]) * 4
    data[r] = 255;
    data[r+1] = 0;
    data[r+2] = 0;
  })

  ctx.putImageData(imageData, 0, 0);
}


mapboxgl.accessToken = 'pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA';
var tileset = 'mapbox.streets';
map = new mapboxgl.Map({
    container: 'map', // container id
    style: {
        "version": 8,
        "sources": {
            "raster-tiles": {
                "type": "raster",
                "url": "mapbox://" + tileset,
                "tileSize": 256
            }
        },
        "layers": [{
            "id": "simple-tiles",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0,
            "maxzoom": 22
        }]
    },
    center: [-74.50, 40], // starting position
    zoom: 2 // starting zoom
});

markers = []
map.on('click', function (e) {
  var lat = e.lngLat.lat;
  var lng = e.lngLat.lng;

  var marker = new mapboxgl.Marker().setLngLat(e.lngLat).addTo(map);

  markers.push(e.lngLat)

  if (markers.length > 1) {
    prevTwo = [markers[markers.length - 2].toArray(), markers[markers.length - 1].toArray()]
    // drawLine(prevTwo[0], prevTwo[1])

    containingTileAndZoom = tileContainingPoints(prevTwo[0], prevTwo[1])

    zoom = containingTileAndZoom[1]
    x = containingTileAndZoom[0][0]
    y = containingTileAndZoom[0][1]

    url = "https://api.mapbox.com/styles/v1/gkrathwohl/cjvjqopg8169r1cpa951fcykp/tiles/256/" + zoom + "/" + x + "/" + y + "?access_token=pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA"

    pointA = lngLatToTilePercentage(prevTwo[0],zoom).map(function(a){return Math.floor(a*255)}).reverse()
    pointB = lngLatToTilePercentage(prevTwo[1], zoom).map(function(a){return Math.floor(a*255)}).reverse()
    console.log(pointA, pointB)
    loadMap(url, pointA, pointB) //lngLatToTilePercentage(prevTwo[0],zoom), lngLatToTilePercentage(prevTwo[1], zoom));
  }
});

lngLatToTilePercentage = function(lngLat,zoom) {
  return [long2tilePercentage(lngLat[0],zoom), lat2tilePercentage(lngLat[1],zoom)]
}

long2tilePercentage = function(lon,zoom) { 
   tile = (lon+180)/360*Math.pow(2,zoom); 
   return tile - Math.floor(tile) || 0;
}
lat2tilePercentage = function(lat,zoom)  {
  var x = (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom);
  return (x - Math.floor(x)) || 0;
}


function long2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }
function lngLat2tile(lngLat, zoom) {
  longTile = long2tile(lngLat[0], zoom)
  latTile = lat2tile(lngLat[1], zoom)

  return [longTile, latTile];
}

function tileContainingPoints(lngLat1, lngLat2) {
  startZoom = 15
  
  for(zoom = startZoom; zoom >= 0; zoom--){
    tile1 = lngLat2tile(lngLat1, zoom)
    tile2 = lngLat2tile(lngLat2, zoom)

    if(tile1[0] == tile2[0] && tile1[1] == tile2[1]){
      return [tile1, zoom]
    }
  }
}


function drawLine(a, b) {
  var line = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [a, b]
        }
    }]
  }
  map.addLayer({
        'id': 'line-animation',
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
}


drawPath = function(){
  simplified = simplify(pointsArrayToHash(shortest_path), .8, true)

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

}




pointsArrayToHash = function(pointsArray) {
  return pointsArray.map((a) => {return { x: a[1], y: a[0] }});
}

function pointsHashToArray(pointsHash) {
  pointsHash.map((a) => {return [a.y, a.x]})
}

pointToLngLat = function(point, tile, zoom) {
  var y = point[0]
  var x = point[1]
  // get top left of the tile
  var lat = tileYToLat(y, tile[1], zoom)
  var lon = tileXToLon(x, tile[0], zoom)

  return [lon, lat];
}

tileXToLon = function(tilePixelX, tileNumberX, z) {
  return tile2long(tileNumberX + (tilePixelX / 255),z);
}

tileYToLat = function(tilePixelY, tileNumberY, z) {
  return tile2lat(tileNumberY + (tilePixelY / 255),z);
}

function tile2long(x,z) {
  return (x/Math.pow(2,z)*360-180);
}
function tile2lat(y,z) {
  var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
 }