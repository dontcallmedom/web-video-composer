export function fader(duration, direction='out', cv) {
  const ctx = cv.getContext("2d");
  cv.duration = duration;
  cv.currentTime = 0;
  let start;
  const drawFrame = () => {
    const now = performance.now();
    cv.currentTime = (now - start)/1000;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (cv.currentTime >= duration) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const opacity = direction === 'out' ? cv.currentTime/duration : 1 - cv.currentTime/duration;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + opacity + ')';
    ctx.fillRect(0, 0, cv.width, cv.height);
    requestAnimationFrame(drawFrame);
  };

  cv.play = function play () {
    start = performance.now();

    requestAnimationFrame(drawFrame);
  };

  return new Promise((res, rej) => res());
};
