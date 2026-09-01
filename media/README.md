# BlockTek Radio media

This directory is an operator-managed persistent media mount. The worker scans `music/`, `programmes/`, `podcasts/`, `jingles/`, `fallback/`, and `generated/` in deterministic filename order.

Supply only audio that BlockTek owns or is licensed to broadcast. Media is intentionally not committed to Git. With no media, the worker reports `NO MEDIA CONFIGURED` and does not claim the station is live. Set `RADIO_TEST_TONE_ENABLED=true` only for local/internal stream testing.
