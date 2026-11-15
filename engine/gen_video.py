#!/usr/bin/env python3
"""RED ATLAS — 30s demo video generator (no external assets needed).
Voice: Windows SAPI (Zira, en-US). Encode: imageio-ffmpeg bundled binary."""
import json, math, os, subprocess, sys, wave, struct
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "video_build")
os.makedirs(OUT_DIR, exist_ok=True)
W, H, FPS = 1280, 720, 24
SCENE_S = 5.0
BG = (11, 13, 18); RED = (232, 73, 46); GOLD = (255, 196, 66); WHITE = (240, 240, 240)
GRAY = (150, 158, 170); GREEN = (80, 220, 120); ORANGE = (240, 150, 60)

F = lambda p, s: ImageFont.truetype(p, s)
FB = "C:/Windows/Fonts/arialbd.ttf"; FR = "C:/Windows/Fonts/arial.ttf"; FM = "C:/Windows/Fonts/consola.ttf"
f_title = F(FB, 96); f_big = F(FB, 56); f_mid = F(FB, 40); f_txt = F(FR, 30); f_sm = F(FR, 24); f_mono = F(FM, 26)

SCENES = [
    "We built a machine that searches for Mars on Earth. The machine found Morocco.",
    "We scanned one hundred fifty nine points across Morocco, using NASA's own climate data.",
    "Its top discovery was a place none of us had picked: the Guelmim Assa steppe.",
    "Morocco matches the Atacama's thermal stress, and beats Death Valley's heat.",
    "Every number reproduces live from NASA's API. Don't believe us. Run it.",
    "RED ATLAS. The Atlas Analog Station. Open source.",
]

def synth_voices():
    ps = []
    for i, txt in enumerate(SCENES):
        wav = os.path.join(OUT_DIR, f"scene{i}.wav")
        if os.path.exists(wav): continue
        esc = txt.replace("'", "''")
        cmd = (
            "Add-Type -AssemblyName System.Speech; "
            "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "$s.SelectVoice('Microsoft Zira Desktop'); $s.Rate = -1; "
            f"$s.SetOutputToWaveFile('{wav}'); $s.Speak('{esc}'); $s.Dispose();"
        )
        ps.append(subprocess.run(["powershell", "-Command", cmd], capture_output=True))
    for i, p in enumerate(ps):
        if p.returncode != 0: sys.exit(f"TTS failed scene {i}: {p.stderr.decode()}")

def read_wav(path):
    with wave.open(path, "rb") as w:
        n, sw, ch, fr = w.getnframes(), w.getsampwidth(), w.getnchannels(), w.getframerate()
        raw = w.readframes(n)
    return raw, sw, ch, fr

def build_audio():
    target_frames = int(SCENE_S * 22050)
    with wave.open(os.path.join(OUT_DIR, "voice.wav"), "wb") as out:
        out.setnchannels(1); out.setsampwidth(2); out.setframerate(22050)
        for i in range(6):
            raw, sw, ch, fr = read_wav(os.path.join(OUT_DIR, f"scene{i}.wav"))
            frames = [raw[j:j+sw*ch] for j in range(0, len(raw), sw*ch)]
            if len(frames) > target_frames: frames = frames[:target_frames]
            frames += [b"\x00" * (sw*ch)] * (target_frames - len(frames))
            out.writeframes(b"".join(frames))

# ---------- scene painters ----------
data = json.load(open(os.path.join(ROOT, "engine", "engine.json"), encoding="utf-8"))
PTS = data["points"]
TOP = data["top"][0] if isinstance(data["top"], list) else data["top"]
STATION = data["station"][0] if isinstance(data["station"], list) else data["station"]
LONS = [p["lon"] for p in PTS]; LATS = [p["lat"] for p in PTS]
MLIS = [p["mli"] for p in PTS]
LON0, LON1 = min(LONS)-0.4, max(LONS)+0.4; LAT0, LAT1 = min(LATS)-0.4, max(LATS)+0.4
def proj(lon, lat, box):
    x0, y0, x1, y1 = box
    return (x0 + (lon-LON0)/(LON1-LON0)*(x1-x0), y1 - (lat-LAT0)/(LAT1-LAT0)*(y1-y0))

def ctext(d, xy, s, font, fill, anchor="mm"):
    d.text(xy, s, font=font, fill=fill, anchor=anchor)

def base():
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)

def scene1(t):
    img, d = base()
    a = min(1, t/0.8)
    ctext(d, (W/2, 250), "RED ATLAS", f_title, tuple(int(c*a) for c in RED))
    ctext(d, (W/2, 360), "We built a machine that searches for Mars on Earth.", f_txt, WHITE)
    ctext(d, (W/2, 420), "The machine found Morocco.", f_mid, tuple(int(c*a) for c in GOLD))
    ctext(d, (W/2, 640), "NASA Space Apps Challenge 2026 — Casablanca", f_sm, GRAY)
    return img

def scatter_scene(t, highlight=False):
    img, d = base()
    box = (90, 90, 830, 630)
    d.rectangle(box, outline=(50, 55, 66), width=2)
    for p in PTS:
        x, y = proj(p["lon"], p["lat"], box)
        c = GOLD if p["cluster"] == "A" else (ORANGE if p["cluster"] == "B" else (110, 120, 140))
        d.ellipse([x-4, y-4, x+4, y+4], fill=c)
    if highlight:
        x, y = proj(TOP["lon"], TOP["lat"], box)
        r = 10 + 4*abs(math.sin(t*3))
        d.ellipse([x-r, y-r, x+r, y+r], outline=GOLD, width=3)
        ctext(d, (x+20, y+26), "Guelmim–Assa steppe — MLI 79.9", f_sm, GOLD, anchor="lm")
        sx, sy = proj(STATION["lon"], STATION["lat"], box)
        pts = []
        for k in range(10):
            rr = 14 if k % 2 == 0 else 6
            ang = -math.pi/2 + k*math.pi/5
            pts.append((sx + rr*math.cos(ang), sy + rr*math.sin(ang)))
        d.polygon(pts, fill=RED)
        ctext(d, (sx+22, sy-16), "Optimal station site (calculated)", f_sm, RED, anchor="lm")
        ctext(d, (862, 200), "The engine's top discovery", f_txt, WHITE, anchor="lm")
        ctext(d, (862, 244), "was on none of our", f_txt, GRAY, anchor="lm")
        ctext(d, (862, 284), "hand-picked lists.", f_txt, GRAY, anchor="lm")
    else:
        ctext(d, (900, 170), "159 points", f_big, WHITE, anchor="lm")
        ctext(d, (900, 230), "scanned across Morocco", f_txt, GRAY, anchor="lm")
        ctext(d, (900, 300), "NASA POWER API", f_mid, RED, anchor="lm")
        ctext(d, (900, 350), "k-means finds the", f_txt, GRAY, anchor="lm")
        ctext(d, (900, 388), "analog zones by itself", f_txt, GRAY, anchor="lm")
    ctext(d, (90, 660), "MLI = mean(thermal cycling · aridity · aeolian wind · solar load) × 100", f_sm, GRAY, anchor="lm")
    return img

def scene4(t):
    img, d = base()
    ctext(d, (W/2, 60), "Same thermal stress as the sites NASA already trusts", f_mid, WHITE)
    rows = [("Moon, equator (LRO Diviner)", 260, (110, 120, 140)),
            ("Moon, poles (LRO Diviner)", 60, (110, 120, 140)),
            ("Mars, Gale Crater (MSL REMS)", 60, RED),
            ("Death Valley, USA", 34.0, GRAY),
            ("Atacama, Chile", 31.1, GRAY),
            ("M'hamid, Morocco", 31.1, GOLD),
            ("Erg Chebbi, Morocco", 31.0, GOLD)]
    x0, y, bh, gap = 470, 130, 46, 22
    scale = (W - x0 - 160) / 260
    prog = min(1, t / 1.6)
    for name, v, c in rows:
        bw = v * scale * prog
        d.rectangle([x0, y, x0 + bw, y + bh], fill=c)
        ctext(d, (x0 - 16, y + bh/2), name, f_sm, WHITE, anchor="rm")
        ctext(d, (x0 + bw + 12, y + bh/2), f"{v:g} °C", f_sm, c, anchor="lm")
        y += bh + gap
    ctext(d, (W/2, 665), "Mean diurnal temperature swing — the stress that wears hardware down", f_sm, GRAY)
    return img

def scene5(t):
    img, d = base()
    ctext(d, (W/2, 70), "Don't believe us. Run it.", f_big, WHITE)
    bx, by, bw, bh = 200, 150, 880, 420
    d.rounded_rectangle([bx, by, bx+bw, by+bh], 14, fill=(18, 22, 30), outline=(60, 66, 80), width=2)
    d.ellipse([bx+18, by+14, bx+32, by+28], fill=(255, 95, 86)); d.ellipse([bx+40, by+14, bx+54, by+28], fill=(255, 189, 46)); d.ellipse([bx+62, by+14, bx+76, by+28], fill=(39, 201, 63))
    lines = ["$ python engine/verify.py",
             "[PASS] Erg Chebbi swing = 31.0 °C  (published 31.0)",
             "[PASS] M'hamid July max = 46.9 °C  (published 46.9)",
             "[PASS] Atacama swing = 31.1 °C  (published 31.1)",
             "[PASS] Death Valley July max = 46.2 °C  (published 46.2)",
             "All checks passed. The numbers are NASA's, not ours."]
    shown = min(len(lines), int(t / 0.45) + 1)
    for i, ln in enumerate(lines[:shown]):
        c = GREEN if ("PASS" in ln or "passed" in ln) else WHITE
        d.text((bx+28, by+56+i*52), ln, font=f_mono, fill=c)
    return img

def scene6(t):
    img, d = base()
    ctext(d, (W/2, 210), "RED ATLAS", f_title, RED)
    ctext(d, (W/2, 310), "The Atlas Analog Station — Morocco", f_mid, WHITE)
    ctext(d, (W/2, 400), "red-atlas-pi.vercel.app", f_txt, GOLD)
    ctext(d, (W/2, 450), "github.com/sara-zeroual/red-atlas  ·  MIT open source", f_sm, GRAY)
    ctext(d, (W/2, 620), "NASA Space Apps Challenge 2026 — Casablanca", f_sm, GRAY)
    return img

PAINTERS = [scene1, lambda t: scatter_scene(t, False), lambda t: scatter_scene(t, True), scene4, scene5, scene6]

def main():
    synth_voices(); build_audio()
    import imageio.v2 as imageio
    vid = os.path.join(OUT_DIR, "video_raw.mp4")
    total = int(SCENE_S * 6 * FPS); fade_f = int(0.5 * FPS)
    import numpy as np
    with imageio.get_writer(vid, fps=FPS, codec="libx264", quality=8) as wr:
        prev = None
        for f in range(total):
            si = min(5, f // int(SCENE_S * FPS)); t = (f % int(SCENE_S * FPS)) / FPS
            img = PAINTERS[si](t)
            if prev is not None and f % int(SCENE_S * FPS) < fade_f:
                a = (f % int(SCENE_S * FPS)) / fade_f
                img = Image.blend(prev, img, a)
            if f % int(SCENE_S * FPS) >= int(SCENE_S * FPS) - fade_f:
                prev = img
            wr.append_data(np.asarray(img))
        print("video rendered")
    # mux audio
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    out = os.path.join(ROOT, "RED-ATLAS-demo-30s.mp4")
    subprocess.run([ff, "-y", "-i", vid, "-i", os.path.join(OUT_DIR, "voice.wav"),
                    "-c:v", "copy", "-c:a", "aac", "-shortest", out], check=True, capture_output=True)
    print("DONE:", out)

if __name__ == "__main__":
    main()
