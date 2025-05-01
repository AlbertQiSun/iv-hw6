import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getNodes } from '../utils/getNodes';
import { getLinks } from '../utils/getLinks';
import { drag } from '../utils/drag';

export function Graph(props) {
  const { margin, svg_width, svg_height, data } = props;

  // 移动 useRef 到顶层
  const d3Selection = useRef();

  // 获取节点和边
  const nodes = getNodes({ rawData: data });
  const links = getLinks({ rawData: data });

  // Debug: Log nodes and links to verify data
  console.log("Nodes:", nodes);
  console.log("Links:", links);

  // 计算宽度和高度
  const width = svg_width - margin.left - margin.right;
  const height = svg_height - margin.top - margin.bottom;

  // 定义比例尺
  const lineWidth = d3.scaleLinear()
    .range([2, 6])
    .domain([d3.min(links, d => d.value) || 1, d3.max(links, d => d.value) || 1]); // 防止空数据
  const radius = d3.scaleLinear()
    .range([10, 50])
    .domain([d3.min(nodes, d => d.value) || 1, d3.max(nodes, d => d.value) || 1]); // 防止空数据
  const color = d3.scaleOrdinal()
    .range(d3.schemeCategory10)
    .domain(nodes.map(d => d.name) || []);

  // useEffect 移到顶层
  useEffect(() => {
    // 如果没有节点或边，直接返回，避免执行 D3 逻辑
    if (!nodes.length || !links.length) {
      return;
    }

    // 创建 tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "white")
      .style("border", "1px solid black")
      .style("padding", "5px")
      .style("border-radius", "3px")
      .style("font-size", "12px")
      .style("z-index", "10000")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("transition", "opacity 0.2s");

    // 设置力模拟
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.name).distance(d => 20 / d.value))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("y", d3.forceY([height / 2]).strength(0.02))
      .force("collide", d3.forceCollide().radius(d => radius(d.value) + 20))
      .tick(3000);

    // 选择 SVG 容器
    let g = d3.select(d3Selection.current);
    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => lineWidth(d.value));

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .enter();

    const point = node.append("circle")
      .attr("r", d => radius(d.value))
      .attr("fill", d => color(d.name))
      .call(drag(simulation))
      .on("mouseover", function(event, d) {
        console.log("Mouseover:", d.name, event.pageX, event.pageY);
        tooltip.style("visibility", "visible")
          .style("opacity", 1)
          .text(d.name)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden")
          .style("opacity", 0);
      });

    // 添加图例
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(10, 10)");

    const legendItems = legend.selectAll(".legend-item")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", d => color(d.name));

    legendItems.append("text")
      .attr("x", 16)
      .attr("y", 8)
      .style("fill", "black")
      .text(d => d.name);

    // 力模拟 tick 更新
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      point
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    // 清理 tooltip
    return () => {
      tooltip.remove();
    };
  }, [nodes, links, width, height, margin]); // 添加依赖项

  // 渲染 SVG，如果没有数据则显示提示
  return (
    <svg
      viewBox={`0 0 ${svg_width} ${svg_height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {nodes.length && links.length ? (
        <g ref={d3Selection} transform={`translate(${margin.left}, ${margin.top})`} />
      ) : (
        <text x="10" y="20">No data available</text>
      )}
    </svg>
  );
}
