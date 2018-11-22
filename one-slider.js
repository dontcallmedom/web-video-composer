function runningTitle(filename, cv) {
  const ctx = cv.getContext("2d");
  const charDelay = 50;
  const lineDelay = 50;
  const endDelay = 1000;
  const fontSize = 60;
  const bgColor = 'transparent';
  const lineBgColor = 'rgba(255, 255, 255, 0.75)';
  const defaultColor = '#005A9C';
  const strokeColor = 'black';
  const highlightColor = '#CB6628';

  const removeSpecialChar = x => x !== '*';

  let text, start;
  cv.currentTime = 0;
  cv.videoWidth = cv.width;
  cv.videoHeight = cv.height;
  const sound = new Audio('key.mp3');
  
  const loaded = Promise.all([
    fetch(filename).then(r => r.text())
      .then(loadedtext => {
        text = loadedtext;
        cv.duration = (text.split("\n").length * lineDelay + text.split("\n").reduce((total, l) => total + [...l].filter(removeSpecialChar).length * charDelay, 0) + endDelay) / 1000;
      }),
    new Promise((res) => sound.onloadeddata = res)
  ]
  );

  function drawLineUpTo(line, i, withCaret, y) {
    if (withCaret) {
      const s = sound.cloneNode(true);
      s.play();
    }
    const rawchars = [...line];
    const chars = rawchars.filter(removeSpecialChar);
    ctx.fillText(chars.slice(0, i + 1).join('') +  (withCaret ? '_' : ''), 50, y);
    ctx.strokeText(chars.slice(0, i + 1).join(''), 50, y);

    // write highlights
    const tmp = ctx.fillStyle;
    ctx.fillStyle = highlightColor;
    let rawCur = 0, cur = 0;
    while (cur <= i && rawCur < rawchars.length) {
      if (rawchars[rawCur] == '*') {
        const {width: offset} = ctx.measureText(chars.slice(0,cur).join(''));
        rawCur++;
        ctx.fillText(chars[cur], 50 + offset, y);
      } else {
        cur++;
        rawCur++;
      }
    }
    ctx.fillStyle = tmp;
  }

  function clearRect(x, y, w, h) {
    let tmp = ctx.fillStyle;
    ctx.fillStyle = bgColor;
    // clear (transp) vs fill (solid)
    if (!bgColor || bgColor === 'transparent')
      ctx.clearRect(x, y, w, h);
    if (lineBgColor) {
      ctx.fillStyle = lineBgColor;
      ctx.fillRect(x, y, w, h);
    }
    ctx.fillStyle = tmp;
  }

  function drawLines(lines, i, j) {
    cv.currentTime = performance.now() - start;
    if (j >= lines.length)
      return setTimeout(() => {
        cv.currentTime = performance.now() - start;
        ctx.clearRect(0, 0, cv.width, cv.height);
      }, 1000);
    const y = 200 + j*150;
    const linelength = [...lines[j]].filter(removeSpecialChar).length;
    if (i >= linelength) {
      return setTimeout(() => {
        clearRect(50, 200 + j*150 - fontSize, cv.width - 50, fontSize*1.5);
        drawLineUpTo(lines[j], i, false, y);
        drawLines(lines, 0, j + 1);
      }, lineDelay);
    }
    clearRect(50, y - fontSize, cv.width - 50, fontSize*1.5);
    drawLineUpTo(lines[j], i, true,  y);
    setTimeout(() => drawLines(lines, i + 1, j), charDelay);
  }

  cv.play = function run() {
    start = performance.now();
    ctx.clearRect(0, 0, cv.width, cv.height);
    const lines = text.split("\n");
    ctx.font = '' + fontSize + 'px BaseTwelveSansB,Helvetica Neue, sans-serif';
    ctx.fillStyle = defaultColor;
    ctx.strokeStyle = strokeColor + ' 4px';
    drawLines(lines, 0, 0);
  }
  return loaded;
}
