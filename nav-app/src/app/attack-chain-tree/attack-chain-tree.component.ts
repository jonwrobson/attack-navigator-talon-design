import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewEncapsulation, ElementRef, AfterViewInit } from '@angular/core';
import { AttackChain, ChainNode } from '../services/attack-chain.service';
import * as d3 from 'd3';
import {
    createTreeHierarchy,
    layoutTree,
    generateEdgePath,
    getNodeClass,
    calculateEdgeLabelPosition,
    hasSelectedNodes,
    getSelectedNodeIds,
    DEFAULT_TREE_CONFIG,
    TreeConfig,
    TreeNode
} from './tree-utils';

/**
 * Campaign data for emission
 */
export interface Campaign {
    id: string;
    name: string;
}

@Component({
    selector: 'app-attack-chain-tree',
    templateUrl: './attack-chain-tree.component.html',
    styleUrls: ['./attack-chain-tree.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AttackChainTreeComponent implements OnChanges, AfterViewInit {
    @Input() chain: AttackChain;
    @Input() scores: Map<string, number> = new Map();
    @Output() nodeSelected = new EventEmitter<string[]>();
    @Output() campaignClicked = new EventEmitter<{campaigns: Campaign[], position: {x: number, y: number}}>();

    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    private config: TreeConfig = DEFAULT_TREE_CONFIG;
    private isInitialized = false;

    constructor(private elementRef: ElementRef) {}

    ngAfterViewInit(): void {
        this.isInitialized = true;
        this.initializeSVG();
        this.render();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.isInitialized) {
            if (changes['chain'] || changes['scores']) {
                this.render();
            }
        }
    }

    /**
     * Initialize the SVG container
     */
    private initializeSVG(): void {
        const element = this.elementRef.nativeElement;
        const container = d3.select(element).select('.tree-container');
        
        if (container.empty()) {
            return;
        }

        // Clear any existing SVG
        container.selectAll('*').remove();

        // Create new SVG
        this.svg = container.append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .attr('class', 'attack-chain-tree');

        // Add a group for transformations
        this.svg.append('g')
            .attr('class', 'tree-group')
            .attr('transform', `translate(${this.config.nodeWidth / 2}, ${this.config.height / 2})`);
    }

    /**
     * Render the tree visualization
     */
    private render(): void {
        if (!this.svg || !this.chain || !this.chain.path || this.chain.path.length === 0) {
            return;
        }

        const hierarchy = createTreeHierarchy(this.chain.path);
        if (!hierarchy) {
            return;
        }

        const nodes = layoutTree(hierarchy, this.config);
        const anySelected = hasSelectedNodes(this.chain.path);

        const group = this.svg.select('.tree-group');
        
        // Clear previous content
        group.selectAll('*').remove();

        // Render edges
        this.renderEdges(group, nodes, anySelected);

        // Render nodes
        this.renderNodes(group, nodes, anySelected);
    }

    /**
     * Render edges between nodes
     */
    private renderEdges(
        group: d3.Selection<any, unknown, null, undefined>,
        nodes: TreeNode[],
        anySelected: boolean
    ): void {
        const edges = nodes.slice(1).map((node, i) => ({
            source: nodes[i],
            target: node
        }));

        const edgeGroup = group.selectAll('.edge-group')
            .data(edges)
            .enter()
            .append('g')
            .attr('class', 'edge-group tree-edge')
            .on('click', (event, d) => this.onEdgeClick(event, d));

        // Edge path
        edgeGroup.append('path')
            .attr('class', d => {
                const classes = ['edge-path'];
                if (anySelected && !d.source.data.selected && !d.target.data.selected) {
                    classes.push('faded');
                }
                return classes.join(' ');
            })
            .attr('d', d => generateEdgePath(d.source, d.target, this.config))
            .attr('fill', 'none')
            .attr('stroke', '#999')
            .attr('stroke-width', 2);

        // Edge label (campaign count)
        edgeGroup.append('text')
            .attr('class', 'edge-label')
            .attr('x', d => calculateEdgeLabelPosition(d.source, d.target, this.config).x)
            .attr('y', d => calculateEdgeLabelPosition(d.source, d.target, this.config).y)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .text(this.chain.campaignCount);
    }

    /**
     * Render nodes
     */
    private renderNodes(
        group: d3.Selection<any, unknown, null, undefined>,
        nodes: TreeNode[],
        anySelected: boolean
    ): void {
        const nodeGroup = group.selectAll('.node-group')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', d => `node-group ${getNodeClass(d.data, anySelected)}`)
            .attr('transform', d => `translate(${d.x}, ${d.y})`)
            .on('click', (event, d) => this.onNodeClick(event, d));

        const halfWidth = this.config.nodeWidth / 2;
        const halfHeight = this.config.nodeHeight / 2;

        // Node rectangle
        nodeGroup.append('rect')
            .attr('class', 'node-rect')
            .attr('x', -halfWidth)
            .attr('y', -halfHeight)
            .attr('width', this.config.nodeWidth)
            .attr('height', this.config.nodeHeight)
            .attr('rx', 5)
            .attr('ry', 5);

        // Technique ID
        nodeGroup.append('text')
            .attr('class', 'node-id')
            .attr('x', 0)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .text(d => d.data.id);

        // Technique name
        nodeGroup.append('text')
            .attr('class', 'node-name')
            .attr('x', 0)
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .text(d => this.truncateName(d.data.name));

        // Score badge
        nodeGroup.each((d, i, nodes) => {
            const score = this.scores.get(d.data.id);
            if (score !== undefined) {
                const node = d3.select(nodes[i]);
                
                node.append('rect')
                    .attr('class', 'score-badge')
                    .attr('x', -15)
                    .attr('y', 15)
                    .attr('width', 30)
                    .attr('height', 20)
                    .attr('rx', 3)
                    .attr('ry', 3);

                node.append('text')
                    .attr('class', 'score-text')
                    .attr('x', 0)
                    .attr('y', 30)
                    .attr('text-anchor', 'middle')
                    .text(`[${score}]`);
            }
        });
    }

    /**
     * Handle node click events
     */
    private onNodeClick(event: MouseEvent, node: TreeNode): void {
        event.stopPropagation();
        
        // Toggle selection on the clicked node
        const updatedPath = this.chain.path.map(n => ({
            ...n,
            selected: n.id === node.data.id ? !n.selected : n.selected
        }));

        // Update the chain (this should be done by parent component)
        // For now, we emit the selected IDs
        const selectedIds = getSelectedNodeIds(updatedPath);
        this.nodeSelected.emit(selectedIds);
    }

    /**
     * Handle edge click events
     */
    private onEdgeClick(event: MouseEvent, edge: { source: TreeNode; target: TreeNode }): void {
        event.stopPropagation();
        
        const campaigns: Campaign[] = this.chain.campaigns.map(c => ({
            id: c.id,
            name: c.name
        }));

        const position = {
            x: event.clientX,
            y: event.clientY
        };

        this.campaignClicked.emit({ campaigns, position });
    }

    /**
     * Truncate technique name to fit in node
     */
    private truncateName(name: string): string {
        const maxLength = 12;
        if (name.length > maxLength) {
            return name.substring(0, maxLength - 2) + '..';
        }
        return name;
    }
}
