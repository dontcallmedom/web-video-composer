import {parseTimeline} from './parse-timeline.mjs';
import {adjustVTT} from './adjust-vtt.mjs';

const canvas = document.getElementById('composer');
const ctx = canvas.getContext('2d');
const loadBtn = document.getElementById('load');
const startBtn = document.getElementById('start');

const urlInput = document.getElementById('url');
const fileInput = document.getElementById('file');

if (urlInput.value || fileInput.files.length) loadBtn.disabled = false;

const setLoadState = ev => {
  console.log(ev);
  if (urlInput.value) {
    fileInput.disabled = true;
    loadBtn.disabled = false;
  } else {
    fileInput.disabled = false;
    if (fileInput.value) {
      urlInput.disabled = true;
      loadBtn.disabled = false;
    } else {
      urlInput.disabled = false;
      loadBtn.disabled = true;
    }
  }
};

urlInput.addEventListener("onchange", setLoadState);
fileInput.addEventListener("onchange", setLoadState);
loadBtn.addEventListener("click", start);

if (location.search) {
  urlInput.value = location.search.slice(1);
}

/*
const videoStream = canvas.captureStream();
const stream = new MediaStream([...videoStream.getVideoTracks()]);

const recorder = new MediaRecorder(stream, {mimeType: 'video/webm'});

const chunks = [];
recorder.ondataavailable = (e) => {
  chunks.push(e.data);
};
recorder.onstop = () => {
  const blob = new Blob(chunks, {'type': 'video/webm'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('download', 'video.webm');
  link.href = url;
  link.textContent = "video";
  document.querySelector('body').appendChild(link);
};
*/

// from https://gist.github.com/Anveio/05d65f759e3ab0ecd97542b04192deb4#file-readuploadedfileastext-js
const readUploadedFileAsText = (inputFile) => {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result);
    };
    temporaryFileReader.readAsText(inputFile);
  });
};

const loadFromInput = () => {
  if (urlInput.value) {
    return fetch(urlInput.value).then(r => r.text());
  } else {
    return readUploadedFileAsText(fileInput.files[0]);
  }
};


function start() {
  document.getElementById('loader').style.display = 'none';
  loadFromInput()
    .then(text => parseTimeline(text, canvas.width, canvas.height))
    .then(({timeline, assets}) => {
      const vttByKind = adjustVTT({timeline, assets});
      Object.keys(vttByKind).forEach(k => {
        const vtt = vttByKind[k];
        const link = document.createElement('a');
        link.setAttribute('download', k + '.webvtt');
        link.href = "data: text/webvtt," + encodeURIComponent(vtt);
        link.textContent = "merged " + k;
        document.querySelector('body').appendChild(link);
      });
      let start;
      const end = Math.max.apply(null, timeline.map(t => t.end));
      const render = () => {
        const now = performance.now() - start;
        timeline.filter(t => t.start <= now && t.end >= now)
          .forEach(t => t.commands.forEach(command => {
            const {verb, target, options} = command;
            const type = target.slice(0, 1);
            const targetEl = assets[target].el;
            const dur = t.end - t.start;
            ctx.globalAlpha = 1;
            if (!command.done) {
              if (verb === 'pause') {
                targetEl.pause();
              } else if (verb === 'play') {
                if (type !== 'i')
                  targetEl.play();
              }
            }
            if (!options.includes("fadein") && !options.includes("fadeout"))
              command.done = true;
            if (options.includes("fadein")) {
              ctx.globalAlpha = 1 - (t.end - now)/dur;
            } else if (options.includes("fadeout")) {
              ctx.globalAlpha = (t.end - now)/dur;
            }
            if (type === 'v' || type === 't' || type === 'i' || type === 'f') {
              ctx.drawImage(targetEl, 0, 0, canvas.width, canvas.height);
            }
          })
                  );
        if (now <= end) {
          requestAnimationFrame(render);
        } else {
          //recorder.stop();
        }
      };
      startBtn.disabled = false;
      const run = () => {
        start = performance.now();
        //recorder.start();
        requestAnimationFrame(render);
      };
      startBtn.onclick = run;
      document.addEventListener("keypress", run);
    });
}
