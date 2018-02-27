const $ = require('jquery');
const net = require('net');
const CURSOR_SIZE = 1;

const BRAIN_SERVER = 'localhost';
const BRAIN_PORT = 2236;

let ctx;
let painting = false;
let lastCoords = [];
let corrupted, timer;

function resizeListener () {
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.font = "60px Ubuntu";

  console.log(window.innerWidth + 'x' + window.innerHeight);
}

function squareify () {
  if (corrupted[1][0]-corrupted[0][0] > corrupted[1][1]-corrupted[0][1]) {
    // w > h
    let overflow = (corrupted[1][0]-corrupted[0][0])
                    - (corrupted[1][1]-corrupted[0][1]);
    if (corrupted[0][1] < overflow/2) {
      corrupted[1][1] += overflow;
    } else if (corrupted[1][1] > (ctx.canvas.width-overflow/2)) {
      corrupted[0][1] -= overflow;
    } else {
      corrupted[0][1] -= overflow/2;
      corrupted[1][1] += overflow/2;
    }
  } else if (corrupted[1][1]-corrupted[0][1] > corrupted[1][0]-corrupted[0][0]) {
    // h > w
    let overflow = (corrupted[1][1]-corrupted[0][1])
                    - (corrupted[1][0]-corrupted[0][0]);
    if (corrupted[0][0] < overflow/2) {
      corrupted[1][0] += overflow;
    } else if (corrupted[1][0] > (ctx.canvas.width-overflow/2)) {
      corrupted[0][0] -= overflow;
    } else {
      corrupted[0][0] -= overflow/2;
      corrupted[1][0] += overflow/2;
    }
  }
}

function properscaleimage (imgdat) {
  let phantom = (new Array(784)).fill(0);

  for (let y = 0; y < imgdat.height; y++) {
    for (let x = 0; x < imgdat.width; x++) {
      let anyofthemrgood = false;
      for (let i = 0; i < 4; i++) {
        if (imgdat.data[4*(y*imgdat.width+x)+i]) anyofthemrgood = true;
      }
      if (anyofthemrgood)
        phantom[28*(Math.floor(y/imgdat.height*28))+Math.floor(x/imgdat.width*28)] = 255;
    }
  }
  return phantom;
}

function socksend (coords, imgdat) {
  let sock = net.createConnection(BRAIN_PORT, BRAIN_SERVER, () => {
    console.log('ayy');
    sock.write(JSON.stringify(imgdat));
  }).setEncoding('utf-8').on('data', (data) => {
    ctx.beginPath();
    ctx.fillText(data, coords[0]+20, coords[1]+45);
  }).on('end', () => {
    console.log('oof');
  });
}

function fullSend() {
  squareify();

  if (corrupted[1][0]-corrupted[0][0] <= 0
      || corrupted[1][1]-corrupted[0][1] <= 0) {
    resetlogs();
    return;
  }

  let imgdat;
  try {
    imgdat = ctx.getImageData(corrupted[0][0], corrupted[0][1],
                                corrupted[1][0]-corrupted[0][0],
                                corrupted[1][1]-corrupted[0][1]);
  } catch (e) {
    resetlogs();
    return;
  }

  let coords = corrupted[0];
  ctx.beginPath();
  ctx.clearRect(Math.floor(corrupted[0][0])-5, Math.floor(corrupted[0][1])-5,
           Math.ceil(corrupted[1][0]-corrupted[0][0])+10,
           Math.ceil(corrupted[1][1]-corrupted[0][1])+10);
  ctx.stroke();
  resetlogs();

  socksend(coords, properscaleimage(imgdat));
}

function logpos (x, y) {
  corrupted[0][0] = Math.min(corrupted[0][0], x);
  corrupted[0][1] = Math.min(corrupted[0][1], y);
  corrupted[1][0] = Math.max(corrupted[1][0], x);
  corrupted[1][1] = Math.max(corrupted[1][1], y);
  clearTimeout(timer);
  timer = setTimeout(fullSend, 1000);
}

function resetlogs () {
  corrupted = [[window.innerWidth, window.innerHeight], [0, 0]];
}

function distance (a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2);
}

$(function () {
  ctx = $('#banvas')[0].getContext('2d');
  resizeListener();
  resetlogs();
  $(window).on('resize', resizeListener);
  $('#banvas').mousedown(function (e) {
    logpos(e.clientX, e.clientY);
    painting = true;
  }).on('touchstart', function (e) {
    logpos(e.clientX, e.clientY);
    painting = true;
  }).mouseup(function (e) {
    logpos(e.clientX, e.clientY);
    painting = false;
    lastCoords = [];
  }).on('touchend', function (e) {
    logpos(e.clientX, e.clientY);
    painting = false;
    lastCoords = [];
  }).mousemove(function (e) {
    if (painting) {
      logpos(e.clientX, e.clientY);
      ctx.beginPath();
      if (lastCoords.length < 2) lastCoords = [e.clientX, e.clientY];
      ctx.moveTo(lastCoords[0], lastCoords[1]);
      ctx.lineTo(e.clientX, e.clientY);
      ctx.stroke();
      lastCoords = [e.clientX, e.clientY];
    }
  }).click(function (e) {
    logpos(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.arc(e.clientX, e.clientY, CURSOR_SIZE, 0, 2*Math.PI);
    ctx.fill();
    painting = false;
    lastCoords = [];
  });
});
