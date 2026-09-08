---
name: echarts
description: "Guide for creating data visualizations and charts using Apache ECharts. Use for building interactive charts (bar, line, pie, scatter, map, etc.), configuring ECharts options, managing datasets, setting up ECharts 6.x features, and implementing server-side rendering (SSR)."
license: MIT
---

# Apache ECharts Skill

This skill provides comprehensive guidance for using Apache ECharts to create powerful, interactive data visualizations.

## When to Use This Skill

- When the user asks to build charts, dashboards, or data visualizations.
- When generating JavaScript/TypeScript code that uses the `echarts` library.
- When configuring complex chart options, responsive layouts, or theme switching.
- When implementing server-side rendering (SSR) for charts in Node.js environments.

## Core Concepts

ECharts visualizations are primarily driven by an `option` object. The key components of ECharts include:

1. **Dataset**: Recommended approach for data management. Separates data from styling.
2. **Series**: Defines the chart type (e.g., `bar`, `line`, `pie`) and how data maps to visual elements.
3. **Coordinate Systems**: Grid (Cartesian), Polar, Geo, Matrix (new in v6), etc.
4. **VisualMap**: Maps data values to visual channels (color, size, opacity).
5. **Components**: Tooltip, Legend, Title, DataZoom, Toolbox, etc.

## Best Practices

### 1. Data Management (Dataset)

Always prefer using `dataset` over defining data inside individual `series.data`, especially for multi-series charts.

```javascript
var option = {
  dataset: {
    source: [
      ['Product', '2023', '2024'],
      ['Matcha Latte', 43.3, 85.8],
      ['Milk Tea', 83.1, 73.4],
      ['Cheese Cocoa', 86.4, 65.2]
    ]
  },
  xAxis: { type: 'category' },
  yAxis: {},
  series: [{ type: 'bar' }, { type: 'bar' }]
};
```

### 2. Initialization and Responsiveness

Ensure the container has a defined width and height before initializing. Use `ResizeObserver` or window `resize` events to make charts responsive.

```javascript
var chartDom = document.getElementById('main');
var myChart = echarts.init(chartDom);
myChart.setOption(option);

window.addEventListener('resize', function() {
  myChart.resize();
});
```

### 3. Using ECharts 6.x Features

ECharts 6.0 (released 2025) introduces several key features:
- **Matrix Coordinate System**: For covariance matrix charts and periodic tables.
- **New Chart Types**: Chord Chart, Beeswarm Chart (using `jitter`), Custom Charts (Violin, Contour, Stage).
- **Dark Mode Support**: Listen to system preferences and switch themes dynamically using `myChart.setTheme('dark')`.

```javascript
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
darkModeMediaQuery.addEventListener('change', () => {
  myChart.setTheme(darkModeMediaQuery.matches ? 'dark' : 'default');
});
```

### 4. Server-Side Rendering (SSR)

For environments like Node.js or when generating static reports (PDF/Markdown), use the zero-dependency SVG SSR approach.

```javascript
const echarts = require('echarts');
// init(container, theme, opts)
const chart = echarts.init(null, null, {
  renderer: 'svg',
  ssr: true,
  width: 800,
  height: 600
});

chart.setOption({ /* ... */ });
const svgString = chart.renderToSVGString();
chart.dispose();
```

## Bundled Resources

- `references/echarts_option_cheatsheet.md`: A quick reference for common `option` configurations and properties.
- `templates/echarts_html_template.html`: A minimal HTML template with ECharts imported via CDN (jsDelivr) for quick prototyping.

## Installation / Import

For Node.js / Bundlers:
```bash
npm install echarts
```
```javascript
import * as echarts from 'echarts'; // Or use tree-shaking imports
```

For Browser / HTML (CDN):
```html
<script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script>
```

When generating HTML files for the user, always use the CDN link to ensure the chart renders immediately in the browser without a build step.
