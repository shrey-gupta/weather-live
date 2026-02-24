# GraphCast Forecasting Setup

This repository is focused on setting up and running a GraphCast-based weather forecasting workflow.

It includes:
- ERA5 sample NetCDF inputs under `era5_daily_nc/`
- Environment setup and validation scripts for local/HPC usage
- A lightweight GitHub Pages site for sharing project scope and status

## Project Scope

Current scope is a practical forecasting setup MVP:
- Configure environment for GraphCast dependencies
- Use ERA5 data as model input for fixed demo workflows
- Run notebook-based experiments with GraphCast demos

Out of scope for this MVP:
- Production-grade realtime ingestion and orchestration
- Full API hardening (auth, rate limiting, retries, caching)
- Full monitoring/alerting and end-to-end test infrastructure

## Quick Start

1. Create and activate your environment.
2. Install dependencies from `requirements.txt`.
3. Verify environment:
   - `python scripts/verify_environment.py`
4. Use GraphCast notebooks from the official GraphCast repository.

## GitHub Pages (for sharing)

This repo includes a static page in `docs/` and deployment workflow in `.github/workflows/pages.yml`.

Publish steps:
1. Push this repository to your GitHub account.
2. Open `Settings -> Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or run the workflow manually from `Actions`.
5. Site URL: `https://<your-username>.github.io/<repo-name>/`
