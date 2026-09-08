# Corpus Fact Sheet — Nyx R7 (source of truth for eval assertions)

The Nyx R7 and Corvid Instruments are fully fictional. This file is the frozen
ground truth behind `src/corpus/*.md`. Every eval assertion (faithfulness,
correctness, hallucination, refusal) is checked against the values here. If a
corpus doc and this sheet ever disagree, fix the doc, not the sheet.

## Core facts

| Fact               | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| Product            | Nyx R7 Portable LiDAR Scanner                           |
| Manufacturer       | Corvid Instruments                                      |
| Category           | Handheld / SLAM LiDAR scanner                           |
| Released           | 2025                                                    |
| Range              | 0.3 m to 120 m                                          |
| Range accuracy     | ±3 mm at 50 m                                           |
| Scan rate          | 640,000 points/sec                                      |
| Field of view      | 360° horizontal × 285° vertical                         |
| Laser              | Class 1 eye-safe, 905 nm                                |
| Battery            | Swappable 5,200 mAh Li-ion, ~4.5 h continuous           |
| Charge             | 2 h full via 65 W USB-C PD; ships at ~40%               |
| Storage            | 256 GB internal SSD, no SD card slot                    |
| Connectivity       | Wi-Fi 6, Bluetooth 5.2, USB-C                           |
| Export formats     | .rvz (native), .rvx (interchange)                       |
| Weight             | 1.15 kg with battery                                    |
| Dimensions         | 180 × 95 × 62 mm                                        |
| IP rating          | IP54 (dust-protected, splash-resistant)                 |
| Operating temp     | -10 °C to 45 °C                                         |
| Display            | 2.4" touchscreen                                        |
| Firmware (current) | 3.2.1                                                   |
| Price              | €8,900 base kit                                         |
| Warranty           | 2 years                                                 |
| Companion app      | Nyx Studio (Windows / macOS / iOS / Android)            |
| Base kit contents  | Scanner, 1× 5,200 mAh battery, USB-C charger, hard case |
| Sold separately    | Second battery, Field Charging Dock                     |

## Trap facts (bad retrieval must visibly break these)

- Overheat pause at internal temp > 60 °C — distinct from the 45 °C operating max.
- Firmware update requires > 20% battery.
- Manual calibration ~90 seconds, on a flat surface (Settings > Calibration).
- Power on: hold power button 3 seconds; auto-calibration ~90 s on power-up.
- Charge at least 30 minutes before retrying a dead unit that will not power on.

## Error codes

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| E01  | Sensor obstruction (clean window, clear field of view)   |
| E02  | IMU calibration failed (restart on flat, stable surface) |
| E03  | Storage full (transfer + delete scans)                   |
| E04  | Over-temperature (same as overheat warning)              |

## Refusal targets (NOT in the corpus — model must answer "I don't know")

- Cellular / 5G connectivity
- GPS / GNSS
- Color options
- US dollar price
- Any competitor comparison

## Refusal string

The system prompt requires the exact refusal:
`I don't know based on the provided documents.`
