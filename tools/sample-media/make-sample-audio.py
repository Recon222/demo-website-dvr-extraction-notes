"""Authoring-time generator for the demo's bundled SAMPLE audio note.
Writes a 4s mono WAV: three short soft tones, obviously synthetic, plainly a placeholder."""
import math, struct, sys, wave

rate, seconds = 22050, 4.0
frames = int(rate * seconds)
# Three 250ms pulses at 0.4s / 1.6s / 2.8s — a placeholder cadence, not speech.
pulses = [(0.4, 660.0), (1.6, 520.0), (2.8, 440.0)]
data = bytearray()
for n in range(frames):
    t = n / rate
    amp = 0.0
    for start, freq in pulses:
        d = t - start
        if 0.0 <= d < 0.25:
            env = math.sin(math.pi * (d / 0.25)) ** 2  # smooth attack/decay, no clicks
            amp += 0.28 * env * math.sin(2 * math.pi * freq * d)
    data += struct.pack("<h", max(-32768, min(32767, int(amp * 32767))))

with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
    w.writeframes(bytes(data))
print("wrote", sys.argv[1])
