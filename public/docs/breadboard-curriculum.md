# DubLab breadboard curriculum

Build the same **NJD-style dual NE555 + PT2399** dub siren you play in the DubLab PWA. Spine: [sound-system.fr DIY dub siren tutorial](https://www.sound-system.fr/en/how-to-make-a-diy-dub-siren-step-by-step-tutorial/).

**Goal:** understand by doing — audio oscillator first, then LFO into pin 5, then output attenuator, then PT2399 echo.

**Budget:** ~€35–50 without case · ~€50–70 with a neat Hammond 1590B-style enclosure.

**Prerequisites:** soldering iron (25–40 W), multimeter, cutters, fine pliers. If you have never soldered, start with a kit or practice joints before this build.

---

## Tools

| Tool | Notes |
| --- | --- |
| Soldering iron 25–40 W + tin | Station optional |
| Cutters + fine pliers | |
| Multimeter | Continuity + DC volts |
| Screwdrivers + drill | Case / panel holes |
| Optional | Third hand, desolder pump |

---

## Bill of materials (BOM)

### Core (dual NE555)

| Qty | Part | Teaching note |
| --- | --- | --- |
| 2 | **TLC555 / LMC555 (CMOS)** — NE555 also works | Chip A = audio astable · Chip B = LFO. CMOS 555s are made for 5 V; a bipolar NE555 runs at 5 V but its output only reaches about 3.3 V (≈ Vcc − 1.7 V) |
| 2 | DIP-8 socket | Avoid soldering chips directly |
| 4 | 10 kΩ **linear** pot | Pitch, Rate, Depth, Volume |
| 1 | 4.7 kΩ resistor | Audio R1 (astable) |
| several | 1 kΩ, 10 kΩ, 100 kΩ | Timing, dividers, LFO network |
| 1 | 100 nF ceramic | Audio C1 timing |
| 1–2 | 10 nF ceramic | Decoupling / filter |
| 1 | 10 µF or 100 µF electrolytic | LFO timing (slow) |
| 1 | 10 µF electrolytic | Output DC block |
| 1 | 100 µF electrolytic | +5 V bypass near the 555s (plus 100 nF ceramic right at each chip) |
| 4–6 | 1N4148 | Optional wave shaping |
| 1 | Momentary push-button | Trigger (gates pin-3-style out) |
| 1 | On/off switch | +5 V power |
| 1 | 6.35 mm jack | Line out |
| 1 | **5 V supply** | Easiest: USB 5 V (cable or power bank, via a breakout/USB-C sink board). Alternative: 3 × AA (4.5 V, fine) or 4 × AA through a 5 V regulator (78L05 / LM7805 plus 100 nF in and out). Never feed 9 V straight to a CMOS 555 or the PT2399 |
| 1 | Resistor for the LED | 470 Ω (≈ 6 mA at 5 V). 330 Ω ≈ 9 mA. Never connect the LED without it |
| 1 | LED (red) | Vf ≈ 2 V. Green/blue/white drop about 3 V, so use 220 Ω or less |
| 1 | Single-supply op-amp (for the wave shaper) | **MCP6002** (rail-to-rail, ideal at 5 V). LM358 works but its output stops about 1.5 V below +5 V (≈ 3.5 V max), so the wave clips earlier |
| 1 | Breadboard or PCB | Start on breadboard |
| 1 | Enclosure | Hammond 1590B classic |

### Echo upgrade (matches app PT2399 block)

| Qty | Part | Teaching note |
| --- | --- | --- |
| 1 | PT2399 / PE2399 module or DIP | Runs from **+5 V**, the same rail as everything else. Onboard delay ~50 ms–1 s practical |
| 2–3 | 10 kΩ linear pot | Time, Feedback, Echo volume (or module trimmers) |
| 1 | Tone pot or RC | LP on wet path (app **Tone**) |
| 1 | Momentary (N.C. or series mute) | **Echo Cut** — mute wet |
| assorted | Module passives | Follow module datasheet / Electrosmash notes |

---

## App control → physical part

| DubLab control | Physical part | Chip role |
| --- | --- | --- |
| **Pitch** | 10 kΩ pot (R2) | Audio NE555 astable timing |
| **Rate** | 10 kΩ pot | LFO NE555 timing R |
| **Depth** | 10 kΩ pot | LFO → audio **pin 5** attenuator |
| **Volume** | 10 kΩ pot | Output divider (raw 555 output is 3.3 to 5 Vpp, far too hot for line level) |
| **Trigger** | Momentary push-button | Gates pin-3-style output |
| **Trigger Mode (Latch)** | Optional toggle latching the gate | Panel convenience (app-only OK) |
| **LFO Hold** | Open Depth or hold LFO reset | Static pitch for tuning |
| **Mode** | RC / diode network presets | App models four LFO shapes into pin 5 |
| **Time** | PT2399 delay pot | Echo delay time |
| **Feedback** | PT2399 feedback pot | Repeats |
| **Echo Vol** | Wet mix pot | Delay level into mix |
| **Tone** | LP pot / RC on wet | Echo brightness |
| **Echo Cut** | Momentary wet mute | Kill echoes live |

Astable teaching default:

```
f = 1.44 / ((R1 + 2 × R2) × C1)
```

with R1 ≈ 4.7 kΩ, R2 = Pitch pot (10 kΩ), C1 ≈ 100 nF → **583 Hz (R2 = 10 k) to 3.06 kHz (R2 = 0)**. The DubLab Pitch knob models a wider 200 Hz–4 kHz teaching band; use a larger R2 or C1 on the bench to reach the low end.

The frequency formula does **not** depend on the supply voltage: the 555 thresholds sit at 1/3 and 2/3 of Vcc, so Vcc cancels out. What changes at 5 V:

- **Thresholds:** CTRL pin 5 sits at about 2/3 × Vcc = **3.33 V** (it was 6 V at 9 V). The LFO swings that level through the Depth pot, so the same Depth now moves it by a smaller number of volts.
- **Output level:** CMOS 555 (TLC555/LMC555): about 0 to 5 V. Bipolar NE555: about 0 to 3.3 V.
- **Minimum supply:** a bipolar NE555 is happy down to 4.5 V (3 × AA is fine); a CMOS 555 works from about 2 V.

---

## Breadboard layout (block map)

Match the app **signal flow** blocks left → right / top → bottom:

```
[5V · SW]── rails ─────────────────────────────────────────┐
                                                           │
[TRIGGER btn]──►[NE555 AUDIO]◄──pin5──[DEPTH]◄──[NE555 LFO]
                      │                      ▲
                   pitch R2                 RATE
                      │
              ┌───────┴────────┐
              │                │
            DRY           [PT2399 · Time/FB/Tone/Cut]
              │                │
              └────── MIX ─────┘
                       │
                   [VOLUME]──► jack
```

**Placement tips (solderless breadboard):**

1. Put **Audio NE555** left-center (DIP socket). Pin 1 toward the bottom rail (GND), pin 8 toward the top rail (+5 V).
2. Put **LFO NE555** to the right of audio, same orientation.
3. Keep **Pitch / Rate / Depth / Volume** pots on the panel; fly leads to the board.
4. Sit the **PT2399 module** below the audio chip or on a second board; wet out returns to the mix node before Volume.
5. Place **100 µF** bypass directly across +5 V / GND near the 555s, and a **100 nF** ceramic across pins 8 and 1 of each chip.
6. Feed everything from one **+5 V rail** (USB 5 V, 3 × AA, or a regulated 5 V). The op-amp, both 555s and the PT2399 share it.

Color the same mental map as the PWA: Audio = green when gated · LFO = amber pulse · PT2399 = echo loop.

---

## Wiring steps (ordered)

### 0. Safety first

- Check electrolytic **polarity** before power.
- If anything gets hot or smells burnt → power off immediately.
- 5 V will not shock you, but a short can kill chips in seconds. Do not exceed 5.5 V on a PT2399 or CMOS 555 (a 9 V battery will damage them).
- Light the LED only through its series resistor: I = (5 V − Vf) / R, so 470 Ω gives (5 − 2) / 470 ≈ 6.4 mA.

### 1. Panel / case prep

- Paper template for pots, trigger, jack, power switch.
- Put the **trigger** where your thumb lands (live instrument).
- Drill: ~7–8 mm pots · ~12 mm for 6.35 mm jack.

### 2. Audio oscillator only (test before LFO)

1. DIP socket for Audio NE555.
2. Wire astable: R1 = 4.7 kΩ, R2 = Pitch pot, C1 = 100 nF.
3. Power pins: pin 8 = +5 V, pin 1 = GND (via switch). Pin 4 (RESET) also goes to +5 V. Add a 10 nF from pin 5 to GND.
4. Output path: pin 3 → **Trigger button** → divider → 10 µF → **Volume** pot → jack.
5. Power on. Press trigger. Sweep Pitch — you should hear frequency move.
6. **Stop here if silent:** check grounds, then measure pin 8 = +5 V / pin 1 = GND. Pin 5 should read about 3.33 V (2/3 of 5 V).

### 3. LFO into pin 5 (test)

1. Second DIP socket — LFO NE555 astable with large C (10 µF or 100 µF).
2. **Rate** pot on LFO timing resistance.
3. LFO out → **Depth** pot → Audio NE555 **pin 5** (CV).
4. Press trigger, raise Depth, turn Rate — siren swing should appear.
5. Whistles with no knob turn → pot miswired.

### 4. Finish core panel

- Confirm Pitch / Rate / Depth / Volume leads match the app labels.
- Add 100 µF supply bypass near both 555s.
- **Op-amp shaper (single supply):** build the integrator around an MCP6002 (or LM358) with V+ = +5 V and V− = GND. Bias the + input at **Vcc/2 = 2.5 V** with two 10 kΩ resistors (+5 V / GND) and a 10 µF to GND, and AC-couple the 555 into the − input through a resistor. The output then swings around 2.5 V. An LM358 can only reach about 3.5 V, so keep the input small or accept clipping.
- **LED:** +5 V → 470 Ω → LED → GND, brightness follows the signal in the app.
- Bench checklist: headphones or mini-amp · pitch · rate · depth · volume.

### 5. PT2399 echo (upgrade — same as app Echo section)

1. Feed post-trigger audio into PT2399 input (or module IN).
2. Wire **Time**, **Feedback**, **Echo Vol**, **Tone** (LP).
3. Mix dry + wet before Volume (same topology as the PWA flow view). The PT2399 runs from the same **+5 V** rail (add 100 nF and 10 µF right at its VCC pin).
4. **Echo Cut** = momentary mute of wet only.
5. Honest chip window ≈ **50 ms–1 s**.

### 6. Close and calibrate

- Screw into case. Play. Adjust travel of Pitch / Depth / output level.
- Compare feel to DubLab PWA modes (Siren / Rise / Fall / Yelp) — hardware modes are RC/diode options; the app models them as LFO shapes into pin 5.

---

## Bench checklist

- [ ] Power LED / meter: +5 V on pin 8, GND on pin 1, about 3.33 V on pin 5
- [ ] Trigger pressed → tone present
- [ ] Pitch sweeps 200 Hz–4 kHz band
- [ ] Rate + Depth produce siren swing into pin 5
- [ ] Volume tames level into mixer/headphones
- [ ] Echo Time / Feedback / Wet / Tone / Cut behave like the app
- [ ] No heat, no burnt smell, no continuous whistle at idle

---

## Debug

| Symptom | Check |
| --- | --- |
| No sound | Grounds first · pin 8 = +5 V / pin 1 · trigger path · jack |
| Whistle with knobs at rest | Pot wiring (especially Depth / Pitch) |
| No modulation | LFO power · Depth pot · pin 5 connection |
| Echo silent | Module power · wet mix · Echo Cut stuck |
| Distortion / too hot | Volume divider · mixer input pad |

---

## References

- https://www.sound-system.fr/en/how-to-make-a-diy-dub-siren-step-by-step-tutorial/
- https://www.instructables.com/Dub-Siren-555-Timer/
- https://www.instructables.com/Dub-Siren-V3-555-Project/
- https://www.electrosmash.com/pt2399-analysis
- https://www.petervis.com/guitar-circuits/pt2399/basic-echo-circuit.html

The DubLab PWA **Build** tab shows the same BOM, breadboard block layout, wiring steps, and control map offline.
