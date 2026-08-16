// 音效：基于 Web Audio API 实时合成提示音，无需任何音频文件。
// 参考用户提供的「交谈话题.html」中的实现思路：
// - 查资料结束（该开口了）：上行三音 C5-E5-G5
// - 表达结束（时间到）：四音 G4-C5-E5-G5，更饱满

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

// 在用户手势（点击开始 / 试听）内调用：创建并解锁音频上下文。
// 部分浏览器（尤其移动端 Safari、微信/飞书内置浏览器）要求先播放一个极短
// (静音) 振荡器才能真正把 ctx 推进到 running 状态，否则后续调度不发声。
export function primeAudio() {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  if (!unlocked) {
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = 0; // 静音，仅用于解锁
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(0);
      osc.stop(0.001);
      unlocked = true;
    } catch {
      /* ignore */
    }
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.35,
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

function play(end: "research" | "speak") {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime;
  if (end === "research") {
    // 查资料结束：上行三音 C5-E5-G5，提示「该开口讲了」
    [523.25, 659.25, 783.99].forEach((f, i) => {
      tone(ac, f, t + i * 0.13, 0.2, "sine", 0.35);
    });
  } else {
    // 表达结束：四音 G4-C5-E5-G5，提示「时间到」
    [392, 523.25, 659.25, 784].forEach((f, i) => {
      tone(ac, f, t + i * 0.15, 0.24, "triangle", 0.35);
    });
  }
}

// 查资料计时结束：上行三音（C5 → E5 → G5），提示「该开口讲了」。
export function playResearchEnd() {
  play("research");
}

// 表达计时结束：四音（G4 → C5 → E5 → G5），提示「时间到」。
export function playSpeakEnd() {
  play("speak");
}
