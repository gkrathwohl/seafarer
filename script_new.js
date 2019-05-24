startTime = Date.now()

// watchify script.js -o bundle.js
_ = require('lodash')
png = require('pngjs')
Queue = require('tinyqueue')

// this url will be the smallest tile containing the two points we want to find a path between. 
// an improvement would be to get higher zoom (and resolution) tiles and combine them
url = "https://api.mapbox.com/styles/v1/gkrathwohl/cjvjqopg8169r1cpa951fcykp/tiles/256/0/0/0?access_token=pk.eyJ1IjoiZ2tyYXRod29obCIsImEiOiJ5bXlHNXJJIn0.gjNMPWKFNso_Z5EmEjsFGA"

fetch(url).then(function(response){
  return response.arrayBuffer();
}).then(function(buffer) {
  new png.PNG({ filterType:4 }).parse( buffer, function(error, image){
    pixels = _.chunk(image.data, 4);
    mask = pixels.map(function(p){ return p[3]}).map(function(p){return (p == 0) ? false : true})
    mask = _.chunk(mask, image.width)
    

    // start at the first pixel, enqueue all others that touch it.
    var distances = Array.from(Array(image.height), () => new Array(image.width))
    var q = new Queue();

    q.push([[0,0], 0])

    // process generation

    // for all pixels in the queue, give them the current distance
    while(curr_pixel = q.pop()) {
      var distance = curr_pixel[1]
      var pixel = curr_pixel[0]
      if(!mask[pixel[0]][pixel[1]]){ continue;}
      if(distances[pixel[0]][pixel[1]] == undefined){
        distances[pixel[0]][pixel[1]] = distance;
      }else{
        continue;
      }
      // add neighbors to queue
      var neighbors = [
        [pixel[0]+1, pixel[1]],
        [pixel[0], pixel[1]+1],
        [pixel[0]-1, pixel[1]],
        [pixel[0], pixel[1]-1]
      ];
      neighbors = neighbors.filter(function(p){ return p[0] <= 255 && p[0] >= 0 && p[1] <= 255 && p[1] >= 0});
      neighbors.forEach(function(n){ q.push([n, distance+1])});
    }

    
    console.log((Date.now() - startTime) / 1000);

    // check if valid
    d = distances.map(function(row){ return row.map(function(x){ return x == undefined ? false : true})})

    // console.log(mask.map(function(row, i){ return _.isEqual(row, d[i])}))
  });
});

