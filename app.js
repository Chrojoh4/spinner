'use strict';
const spinButton = document.querySelector('#spin');
const resultLabel = document.querySelector('#result');
const reels = [...document.querySelectorAll('.reel')];
const permutations = [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];

function randomOrder() {
  // Reject the incomplete group at the top of the uint32 range to avoid modulo bias.
  const bytes = new Uint32Array(1);
  const limit = 4294967296 - (4294967296 % 6);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return permutations[bytes[0] % 6].slice();
}

async function roll(reel, finalNumber, index) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reel.textContent = finalNumber;
    return;
  }
  const start = Number(reel.textContent) || 1;
  const strip = document.createElement('div');
  strip.className = 'strip';
  const steps = 12 + index * 3;
  for (let n = 0; n <= steps; n++) {
    const digit = document.createElement('div');
    digit.className = 'digit';
    digit.textContent = n === steps ? finalNumber : (start + n - 1) % 3 + 1;
    strip.append(digit);
  }
  reel.replaceChildren(strip);
  const animation = strip.animate([
    {transform: 'translateY(0)'},
    {transform: `translateY(-${steps * 100}%)`}
  ], {duration: 700 + index * 150, easing: 'cubic-bezier(.12,.55,.25,1)', fill: 'forwards'});
  try { await animation.finished; }
  finally { animation.cancel(); reel.textContent = finalNumber; }
}

spinButton.addEventListener('click', async () => {
  if (spinButton.disabled) return;
  const order = randomOrder();
  spinButton.disabled = true;
  resultLabel.textContent = 'Spinning…';
  try {
    await Promise.all(reels.map((reel, i) => roll(reel, order[i], i)));
    resultLabel.textContent = order.join(' · ');
  } catch {
    reels.forEach((reel, i) => { reel.textContent = order[i]; });
    resultLabel.textContent = order.join(' · ');
  } finally { spinButton.disabled = false; }
});

let installPrompt;
const installButton = document.querySelector('#install');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt; installPrompt = null; installButton.hidden = true;
  await prompt.prompt(); await prompt.userChoice;
});
window.addEventListener('appinstalled', () => { installPrompt = null; installButton.hidden = true; });

const offlineLabel = document.querySelector('#offline');
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(async () => {
    await navigator.serviceWorker.ready;
    offlineLabel.textContent = 'Ready for offline use. After installation, this app works without a connection.';
  }).catch(() => {
    offlineLabel.textContent = 'Offline setup could not finish. Reopen the link while connected to try again.';
  });
} else {
  offlineLabel.textContent = 'To install, open the hosted HTTPS link in Chrome. Opening this HTML file directly only provides a preview.';
}
