# ECharts Option Configuration Cheat Sheet

This document serves as a quick reference for the most commonly used `option` properties when building Apache ECharts visualizations.

## Top-Level Properties

- `title`: Configures the chart title. (e.g., `{ text: 'Sales Report', subtext: '2025' }`)
- `tooltip`: Configures the hover tooltip. (e.g., `{ trigger: 'axis' }` for line/bar charts, `{ trigger: 'item' }` for pie/scatter)
- `legend`: Configures the legend. Automatically binds to series names. (e.g., `{ top: 'bottom' }`)
- `grid`: Configures the drawing grid in Cartesian coordinates. Adjust `left`, `right`, `top`, `bottom` to prevent label clipping. (e.g., `{ containLabel: true }`)
- `dataset`: Manages the data centrally. (e.g., `{ source: [...] }`)
- `color`: Global color palette array. (e.g., `['#c23531','#2f4554', '#61a0a8']`)

## Cartesian Coordinate System (Grid)

- `xAxis`: Configures the X-axis. 
  - `type: 'category'` for discrete categories (e.g., months, names).
  - `type: 'value'` for continuous numerical values.
  - `type: 'time'` for time-series data.
- `yAxis`: Configures the Y-axis. Usually `type: 'value'`.

## Series Configuration

The `series` array defines the actual charts to be drawn.

### Bar Chart
```javascript
{
  type: 'bar',
  encode: { x: 'Year', y: 'Sales' }, // When using dataset
  itemStyle: { borderRadius: [5, 5, 0, 0] } // Rounded corners
}
```

### Line Chart
```javascript
{
  type: 'line',
  smooth: true, // Curved line
  areaStyle: {}, // Fill area under line
  encode: { x: 'Year', y: 'Sales' }
}
```

### Pie Chart
```javascript
{
  type: 'pie',
  radius: ['40%', '70%'], // Donut chart
  encode: { itemName: 'Product', value: 'Sales' },
  itemStyle: {
    borderRadius: 10,
    borderColor: '#fff',
    borderWidth: 2
  }
}
```

### Scatter Chart
```javascript
{
  type: 'scatter',
  symbolSize: function (data) {
    return Math.sqrt(data[2]) / 5e2; // Dynamic size based on 3rd dimension
  },
  encode: { x: 'Income', y: 'Life Expectancy' }
}
```

## Advanced Components

### DataZoom
Adds zooming and panning capabilities.
```javascript
dataZoom: [
  { type: 'slider', xAxisIndex: 0 }, // UI slider
  { type: 'inside', xAxisIndex: 0 }  // Mouse wheel / touch pad
]
```

### VisualMap
Maps data to visual channels (color, size).
```javascript
visualMap: {
  type: 'continuous', // or 'piecewise'
  min: 0,
  max: 100,
  dimension: 2, // Which data dimension to map
  inRange: {
    color: ['#313695', '#4575b4', '#74add1']
  }
}
```

## Styling and Emphasis

Use `itemStyle`, `lineStyle`, `areaStyle`, and `label` to customize appearance.
Use `emphasis` to define hover state styles.

```javascript
emphasis: {
  focus: 'series', // Dims other series when hovering
  itemStyle: {
    shadowBlur: 10,
    shadowColor: 'rgba(0,0,0,0.3)'
  }
}
```
