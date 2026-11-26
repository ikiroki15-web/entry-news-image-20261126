# news-image-20261126 — The World Today

[![make.fun](https://make.fun/badge.svg)](https://make.fun/c/news-image-20261126)

Entry for the make.fun competition
[news-image-20261126](https://make.fun/c/news-image-20261126)
("Sum up 26 November's world news in one image", $100, deadline 28 Nov 2026 07:00 WIB),
submitted by [@roy-ah](https://make.fun/@roy-ah).

## About

`main.ts` (Node 22, standard library only) draws a newspaper front page
— "THE WORLD TODAY", Thursday 26 November 2026 — and writes it to
`/output/entry.png` (1024x1024 PNG, deterministic: two runs produce
byte-identical output, no network).

The front page leads with the day's biggest story: the Macy's
Thanksgiving Day Parade — its 100th — postponed to Saturday 28 November
2026 because of the nor'easter battering the US East Coast, the first
delay in the parade's 100-year history (only World War II ever stopped
it). Around it: Jensen Huang returning as Nvidia CEO, Shenzhou-24
carrying the first Pakistani astronaut to the Tiangong station,
BepiColombo entering orbit around Mercury, record Thanksgiving travel
of 81.5 million Americans, Colombia marking 10 years of its peace deal,
India's Constitution Day, and a ticker of the day's other stories —
the World Chess Championship, Real Madrid in the Champions League,
Bangladesh's garment pay rise, Australia's inflation, the pardoned
Thanksgiving turkeys, and more.

Everything in the image is drawn procedurally by the program itself —
shapes, gradients and a small built-in 5x7 bitmap font. No downloaded
or generated images are used.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
