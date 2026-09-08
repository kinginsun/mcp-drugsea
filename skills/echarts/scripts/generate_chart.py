#!/usr/bin/env python3
import json
import argparse
import os

def generate_html(option_json, output_file="chart.html"):
    """
    Generates an HTML file with ECharts using the provided option JSON.
    """
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ECharts Visualization</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script>
  <style>
    body {{ margin: 0; padding: 20px; font-family: sans-serif; background: #f0f2f5; }}
    #chart-container {{ width: 100%; height: 600px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 15px; box-sizing: border-box; }}
  </style>
</head>
<body>
  <div id="chart-container"></div>
  <script>
    var myChart = echarts.init(document.getElementById('chart-container'));
    var option = {option_json};
    myChart.setOption(option);
    window.addEventListener('resize', function() {{ myChart.resize(); }});
  </script>
</body>
</html>
"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_template)
    print(f"Chart successfully generated at: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate an ECharts HTML file from an option JSON string or file.")
    parser.add_argument("--option", type=str, help="JSON string of the ECharts option object.")
    parser.add_argument("--file", type=str, help="Path to a JSON file containing the ECharts option object.")
    parser.add_argument("--out", type=str, default="chart.html", help="Output HTML file path.")
    
    args = parser.parse_args()
    
    option_data = None
    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            option_data = f.read()
    elif args.option:
        option_data = args.option
    else:
        # Default simple option if none provided
        default_option = {
            "title": {"text": "Default Chart"},
            "xAxis": {"type": "category", "data": ["A", "B", "C"]},
            "yAxis": {"type": "value"},
            "series": [{"type": "bar", "data": [10, 20, 30]}]
        }
        option_data = json.dumps(default_option)
        
    generate_html(option_data, args.out)
