import { useEffect, useRef } from "react";
import * as d3 from "d3";

// TreeMap component to visualize hierarchical data using a treemap
export function TreeMap(props) {
    const { margin, svg_width, svg_height, tree, selectedCell, setSelectedCell } = props;

    // Define inner dimensions by subtracting margins
    const innerWidth = svg_width - margin.left - margin.right;
    const innerHeight = svg_height - margin.top - margin.bottom;

    // Reference for the SVG group element
    const d3Selection = useRef();

    useEffect(() => {
        // Clear previous content to avoid overlap on re-render
        d3.select(d3Selection.current).selectAll("*").remove();

        // Create the treemap layout
        const treemapLayout = d3.treemap()
            .size([innerWidth, innerHeight])
            .paddingOuter(4) // Space around the outermost rectangles
            .paddingInner(2) // Space between nested rectangles
            .round(true); // Round pixel values for cleaner rendering

        // Create hierarchy from the tree data
        const root = d3.hierarchy(tree)
            .sum(d => d.value || 0) // Sum the values (patient counts) for sizing
            .sort((a, b) => b.value - a.value); // Sort by value for better layout

        // Apply the treemap layout to the hierarchy
        treemapLayout(root);

        // Select the SVG group and append elements
        const g = d3.select(d3Selection.current);

        // Create a tooltip for interactivity
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

        // Plot the rectangles for each node (including non-leaves for hierarchy)
        const cell = g.selectAll("g")
            .data(root.descendants())
            .enter()
            .append("g")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // Add rectangles
        cell.append("rect")
            .attr("width", d => Math.max(0, d.x1 - d.x0))
            .attr("height", d => Math.max(0, d.y1 - d.y0))
            .attr("fill", d => {
                // Color based on attribute
                if (d.data.attr === "heart_disease") return d.data.name === "0" ? "#66c2a5" : "#fc8d62"; // Green shades for heart_disease
                if (d.data.attr === "gender") return d.data.name === "Female" ? "#8da0cb" : "#8da0cb"; // Blue for gender (same shade for simplicity)
                if (d.data.attr === "ever_married") return d.data.name === "Yes" ? "#e78ac3" : "#e78ac3"; // Orange for ever_married (same shade for simplicity)
                return "#ffffff"; // White for the root node
            })
            .attr("stroke", d => (selectedCell === d.data.name ? "black" : "white"))
            .attr("stroke-width", 1)
            .attr("opacity", d => d.depth === 0 ? 0 : 0.8); // Hide the root node rectangle

        // Add interactivity to leaf nodes only
        cell.filter(d => !d.children)
            .on("click", (event, d) => {
                setSelectedCell(d.data.name); // Update selected cell for highlighting
            })
            .on("mouseover", function(event, d) {
                const path = [];
                let current = d;
                while (current.parent) {
                    if (current.data.attr) {
                        path.unshift(`${current.data.attr}: ${current.data.name}`);
                    }
                    current = current.parent;
                }
                tooltip.style("visibility", "visible")
                    .style("opacity", 1)
                    .text(`${path.join(", ")}, Value: ${d.data.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden")
                    .style("opacity", 0);
            });

        // Add text labels for non-root nodes
        cell.filter(d => d.depth > 0)
            .each(function(d) {
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                const minDimension = Math.min(width, height);

                // Add text if the rectangle is large enough
                if (minDimension > 20) {
                    const textGroup = d3.select(this)
                        .append("text")
                        .attr("x", width / 2)
                        .attr("y", height / 2)
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "middle")
                        .attr("fill", "black")
                        .style("font-size", "10px");

                    // Show attribute and name for non-leaf nodes, only value for leaf nodes
                    if (d.children) {
                        textGroup.append("tspan")
                            .attr("x", width / 2)
                            .attr("dy", "-0.5em")
                            .text(`${d.data.attr}: ${d.data.name}`);
                    } else {
                        textGroup.text(`${d.data.value}`);
                    }
                }
            });

        // Add annotations for interactivity
        const annotationGroup = g.append("g")
            .attr("transform", `translate(${innerWidth - 100}, 10)`);

        annotationGroup.append("text")
            .attr("x", 0)
            .attr("y", 10)
            .attr("fill", "black")
            .style("font-size", "10px")
            .text("Click to select");

        annotationGroup.append("text")
            .attr("x", 0)
            .attr("y", 25)
            .attr("fill", "black")
            .style("font-size", "10px")
            .text("Hover for details");

        // Cleanup tooltip on component unmount
        return () => {
            tooltip.remove();
        };
    }, [tree, selectedCell]); // Re-render when tree or selectedCell changes

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
