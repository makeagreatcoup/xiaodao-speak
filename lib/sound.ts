// 音效：基于 Web Audio API 实时合成提示音，无需任何音频文件。
// 参考用户提供的「交谈话题.html」中的实现思路：
// - 查资料结束（该开口了）：上行三音 C5-E5-G5
// - 表达结束（时间到）：四音 G4-C5-E5-G5，更饱满

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // 浏览器策略要求音频在用户手势后才能播放；这里在计时开始（点击）时调用过一次，
  // 计时结束触发音效时通常已经在 running 状态。
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// 在用户手势（点击开始）时预热音频上下文，避免计时结束播放时仍处于 suspended。
export function primeAudio() {
  getCtx();
}

function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.22,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

// 查资料计时结束：上行三音（C5 → E5 → G5），提示「该开口讲了」。
export function playResearchEnd() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    tone(ac, f, t + i * 0.13, 0.2, "sine", 0.22);
  });
}

// 表达计时结束：四音（G4 → C5 → E5 → G5），提示「时间到」。
export function playSpeakEnd() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  [392, 523.25, 659.25, 784].forEach((f, i) => {
    tone(ac, f, t + i * 0.15, 0.24, "triangle", 0.2);
  });
}
