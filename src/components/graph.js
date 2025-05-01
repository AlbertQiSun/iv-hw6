import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getNodes } from '../utils/getNodes';
import { getLinks } from '../utils/getLinks';
import { drag } from '../utils/drag';

export function Graph(props) {
    const { margin, svg_width, svg_height, data } = props;

    const nodes = getNodes({ rawData: data });
    const links = getLinks({ rawData: data });

    // Debug: Log nodes and links to verify data
    console.log("Nodes:", nodes);
    console.log("Links:", links);

    // Fallback if no nodes or links
    if (!nodes.length || !links.length) {
        return <svg width={svg_width} height={svg_height}>
            <text x="10" y="20">No data available</text>
        </svg>;
    }

    const width = svg_width - margin.left - margin.right;
    const height = svg_height - margin.top - margin.bottom;

    const lineWidth = d3.scaleLinear()
        .range([2, 6])
        .domain([d3.min(links, d => d.value), d3.max(links, d => d.value)]);
    const radius = d3.scaleLinear()
        .range([10, 50])
        .domain([d3.min(nodes, d => d.value), d3.max(nodes, d => d.value)]);
    const color = d3.scaleOrdinal()
        .range(d3.schemeCategory10)
        .domain(nodes.map(d => d.name));

    const d3Selection = useRef();

    useEffect(() => {
        // Create tooltip div
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

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.name).distance(d => 20 / d.value))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2)) // Fixed typo
            .force("y", d3.forceY([height / 2]).strength(0.02))
            .force("collide", d3.forceCollide().radius(d => radius(d.value) + 20))
            .tick(3000);

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
                console.log("Mouseover:", d.name, event.pageX, event.pageY); // Debug
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

        // Add legend
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

        // Cleanup tooltip on component unmount
        return () => {
            tooltip.remove();
        };
    }, []);

    return (
        <svg
            viewBox={`0 0 ${svg_width} ${svg_height}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%" }}
        >
            <g ref={d3Selection} transform={`translate(${margin.left}, ${margin.top})`}></g>
        </svg>
    );
}