# Weather-Live: GraphCast Forecasting Webpage

This repository is for designing and hosting a webpage demo for GraphCast-style weather forecasting.

## Purpose

- Build a clean, shareable project webpage for GraphCast precipitation forecasting.
- Describe MVP scope, limitations, and project status for academic review.
- Publish the site using GitHub Pages.

## Structure

- `docs/` contains the static webpage content and interactive forecast demo.
- `.github/workflows/pages.yml` deploys the site via GitHub Actions.

## Demo Features

- Forecast start date constrained to year 2025.
- User-defined forecast window size (set to 5 days for your requested demo flow).
- Historical learning baseline selection:
  - 2010-2024
  - 2015-2024
  - 2000-2024
- US precipitation visualization on an interactive map panel.

## Publish

1. Push `main` to your GitHub repository.
2. Open `Settings -> Pages`.
3. Set `Source` to `GitHub Actions`.
4. Confirm the deploy workflow succeeds in `Actions`.
5. Your page URL will be:
   `https://<your-username>.github.io/<repo-name>/`
