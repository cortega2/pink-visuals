const WIDTH = 775;
const HEIGHT = 575;

var drawVisual;
var canvas = document.querySelector('.visualizer');
var canvasCtx = canvas.getContext('2d');

//TODO: Think of a better way to do this
var frameCounter1 = 0;
var frameCounter2 = 0;
var frameCounter3 = 0;
const FRAMERATE = 60;                     // Assumes frame rate will be ~60 because I am lazy

//const RADSPERFRAME = ((ROTATIONSPERMIN * 2 * Math.PI) / 60) / FRAMERATE;
const RADSPERFRAME1 = ((2 * 2 * Math.PI) / 60) / FRAMERATE;
const RADSPERFRAME2 = ((4 * 2 * Math.PI) / 60) / FRAMERATE;
const RADSPERFRAME3 = ((8 * 2 * Math.PI) / 60) / FRAMERATE;

var angleDelta1 = 0;
var angleDelta2 = 0;
var angleDelta3 = 0;

const MAXOSCIS = 30;
const OSCIDELAY = 30;
var osciHistory = [];
var osciDelayCount = 0;

chrome.tabCapture.capture({audio: true}, function(cap){
  var audioContext = new AudioContext();
  var source = audioContext.createMediaStreamSource(cap);

  var destination = audioContext.destination;
  //TODO: For some reason this stopped working need to look into why
  //destination.maxChannelCount = 2;

  var analyser = audioContext.createAnalyser();
  var analyser2 = audioContext.createAnalyser();

  source.connect(analyser);
  source.connect(analyser2);

  //only need one to work
  analyser.connect(destination);
  visualize(analyser, analyser2, canvasCtx)
});

function visualize(analyser, analyser2) {
  analyser.fftSize = 2048
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  analyser2.fftSize = 256
  var bufferLength2 = analyser2.frequencyBinCount;
  var dataArray2 = new Uint8Array(bufferLength2);

  var initOsciCount = 0

  function draw(){
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    drawVisual = requestAnimationFrame(draw);

    drawOsci();
    drawCircle();
  };

  function drawOsci(){
    analyser.getByteTimeDomainData(dataArray);

    var delta = HEIGHT / (MAXOSCIS + 1);
    var alphaDelta = 1 / MAXOSCIS;
    var alphaRate = alphaDelta / OSCIDELAY;

    if(initOsciCount < MAXOSCIS){
      osciHistory.push(dataArray.slice(0));
      initOsciCount++;
    }
    else if(osciDelayCount == OSCIDELAY){
      osciHistory.push(dataArray.slice(0));
      osciDelayCount = 0;
    }
    else{
      osciHistory[osciHistory.length - 1] = dataArray.slice(0);
      osciDelayCount++;
    }

    if(osciHistory.length > MAXOSCIS){
      osciHistory.shift();
    }

    osciHistory.forEach(function(arr, idx){
      var yPos = delta * (idx + 1) - (delta / OSCIDELAY);
      if(idx == osciHistory.length - 1)
        osciDraw(arr, bufferLength, yPos, 1);
      else
        osciDraw(arr, bufferLength, (yPos + delta) - osciDelayCount * ( (delta - delta / OSCIDELAY) / OSCIDELAY), (alphaDelta * idx) - (alphaRate * (OSCIDELAY - osciDelayCount))); // Im so sorry
    })
  }

  function osciDraw(values, length, yLoc, alphaLevel){
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgba(255, 255, 255,' + alphaLevel  +')';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / length;
    var x = 0;

    for(var i = 0; i < length; i++) {
      var v = values[i]/4 - 32;
      var y = v + yLoc;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      }
      else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth
    }

    canvasCtx.stroke();
  }

  function drawCircle(){
    analyser2.getByteFrequencyData(dataArray2);

    var angleOffSet1 = RADSPERFRAME1 * frameCounter1 + angleDelta1;
    var angleOffSet2 = (2* Math.PI) - RADSPERFRAME2 * frameCounter2 - angleDelta2;
    var angleOffSet3 = RADSPERFRAME3 * frameCounter3 + angleDelta3;

    if(angleOffSet1 > 2 * Math.PI){
      angleDelta1 = angleOffSet1 - 2 * Math.PI;
      angleOffSet1 = angleDelta1
      frameCounter1 = 0
    }
    if(angleOffSet2 < 0){
      angleDelta2 = -1 * angleOffSet2;
      angleOffSet2 = angleDelta2

      frameCounter2 = 0
    }
    if(angleOffSet3 > 2 * Math.PI){
      angleDelta3 = angleOffSet3 - 2 * Math.PI;
      angleOffSet3 = angleDelta3
      frameCounter3 = 0
    }

    canvasCtx.lineWidth = 5;

    canvasCtx.strokeStyle = 'rgba(255, 100, 100, 0.75)';
    circularDraw(canvasCtx, WIDTH/2, HEIGHT/2, dataArray2, 0, Math.floor(bufferLength2/3), angleOffSet1)

    canvasCtx.strokeStyle = 'rgba(0, 250, 250, 0.75)';
    circularDraw(canvasCtx, WIDTH/2, HEIGHT/2, dataArray2, Math.floor(bufferLength2/3 ) + 1, bufferLength2 - Math.floor(bufferLength2/3), angleOffSet2);

    canvasCtx.strokeStyle = 'rgba(255, 255, 100, 0.75)';
    circularDraw(canvasCtx, WIDTH/2, HEIGHT/2, dataArray2, Math.floor(bufferLength2 - (bufferLength2/3) + 1), bufferLength2, angleOffSet3);

    frameCounter1++;
    frameCounter2++;
    frameCounter3++;
  }

  draw();
}

function circularDraw(ctx, midX, midY, values, lo, hi, startAngle){
  var x;
  var y;

  var bufLength = hi - lo;
  var numLoops = 4;
  var delta = 2 * Math.PI / (bufLength * numLoops);

  ctx.beginPath();
  ctx.moveTo(midX, midY);


  var goingForward = true
  var loopCount = 0
  var lineCount = 0
  for(var i = lo - 1; ; ) {
    if(loopCount == numLoops && i == lo - 1)
      break;

    if(goingForward)
      i++;
    else
      i--;

    var hypot = values[i];

    var angle = lineCount * delta + startAngle;
    if (angle > 2 * Math.PI)
      angle = angle - (2 * Math.PI)

    var a = Math.abs(Math.cos(angle) * hypot);
    var b = Math.abs(Math.sin(angle) * hypot);

    if(angle > Math.PI/2 && angle < 3*Math.PI/2)
      x = midX + a;
    else
      x = midX - a;

    y = midY - b;
    if(angle > Math.PI)
      y = midY + b;

    ctx.lineTo(x, y);
    ctx.lineTo(midX, midY);

    if(goingForward && i == hi - 1){
      loopCount++;
      goingForward = false;
      i++;
    }
    else if(!goingForward && i == lo){
      loopCount++;
      goingForward = true;
      i--;
    }
    lineCount++
  }

  ctx.lineTo(midX, midY);
  ctx.stroke();
}

