var startTime = Date.now()

// watchify script.js -o bundle.js
_ = require('lodash')
png = require('pngjs')
Deque = require("double-ended-queue");

// this url will be the smallest tile containing the two points we want to find a path between. 
// an improvement would be to get higher zoom (and resolution) tiles and combine them
// url = "https://api.mapbox.com/styles/v1/gkrathwohl/cjvjqopg8169r1cpa951fcykp/tiles/256/0/0/0?access_token=pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA"
url = "https://api.mapbox.com/styles/v1/gkrathwohl/cjvjqopg8169r1cpa951fcykp/tiles/256/10/310/377?access_token=pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA"

fetch(url).then(function(response){
  return response.arrayBuffer();
}).then(function(buffer) {
  new png.PNG({ filterType:4 }).parse( buffer, function(error, image){
    pixels = _.chunk(image.data, 4);
    mask = pixels.map(function(p){ return p[3]}).map(function(p){return (p == 0) ? false : true})
    mask = _.chunk(mask, 256)
    

    // start at the first pixel, enqueue all others that touch it.
    distances = Array.from(Array(image.height), () => new Array(image.width))
    q = new Deque();

    curr_distance = 0;
    q.push([0,0])

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
        neighbors = neighbors.filter(function(p){ return p[0] <= 255 && p[0] >= 0 && p[1] <= 255 && p[1] >= 0});
        neighbors.forEach(function(n){q.push(n)});
      }
      curr_distance++;
    }

    // console.log(distances)
    

    d = distances.map(function(row){ return row.map(function(x){ return x == undefined ? false : true})})

    // console.log(mask.map(function(row, i){ return _.isEqual(row, d[i])}))


    // shortest path
    // 256,200 back to 0,0

    shortest_path = []
    goal = [0,0]
    current_pixel = [70,255]


    i = 0
    while(false && !(current_pixel[0] == goal[0] && current_pixel[1] == goal[1])){
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

      // console.log({neighbors})
      // console.log({neighborsDistances})

      min_neighbor = neighbors[neighborsDistances.indexOf(Math.min(...neighborsDistances))]

      // console.log(Math.min(...neighborsDistances))

      shortest_path.push(min_neighbor)
      current_pixel = min_neighbor
      i++;
    }

    // for(i=0;i<256;i++){
    //   shortest_path.push([i,i])
    // }

    draw(distances, shortest_path)

    console.log((Date.now() - startTime) / 1000);

  });
});

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