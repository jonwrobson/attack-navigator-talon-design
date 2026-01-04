import * as d3 from 'd3';
import { ChainNode } from '../services/attack-chain.service';

/**
 * Data structure for D3 tree nodes
 */
export interface TreeNode extends d3.HierarchyPointNode<ChainNode> {
    x: number;
    y: number;
    data: ChainNode;
}

/**
 * Configuration for tree rendering
 */
export interface TreeConfig {
    width: number;
    height: number;
    nodeWidth: number;
    nodeHeight: number;
    horizontalSpacing: number;
    verticalSpacing: number;
}

/**
 * Default tree configuration
 */
export const DEFAULT_TREE_CONFIG: TreeConfig = {
    width: 800,
    height: 400,
    nodeWidth: 120,
    nodeHeight: 80,
    horizontalSpacing: 200,
    verticalSpacing: 100
};

/**
 * Converts a chain path into a D3 hierarchy structure
 * @param path Array of chain nodes from the attack chain
 * @returns D3 hierarchy root node
 */
export function createTreeHierarchy(path: ChainNode[]): d3.HierarchyNode<ChainNode> | null {
    if (!path || path.length === 0) {
        return null;
    }

    // Create a simple linear hierarchy (left to right)
    // First node is the root, subsequent nodes are children
    const root: any = {
        ...path[0],
        children: []
    };

    let currentNode = root;
    for (let i = 1; i < path.length; i++) {
        const newNode: any = {
            ...path[i],
            children: []
        };
        currentNode.children = [newNode];
        currentNode = newNode;
    }

    return d3.hierarchy(root);
}

/**
 * Creates a horizontal tree layout
 * @param hierarchy D3 hierarchy node
 * @param config Tree configuration
 * @returns Array of tree nodes with calculated positions
 */
export function layoutTree(
    hierarchy: d3.HierarchyNode<ChainNode>,
    config: TreeConfig
): TreeNode[] {
    const treeLayout = d3.tree<ChainNode>()
        .size([config.height, config.width]);

    const root = treeLayout(hierarchy);
    
    // Convert to array and swap x/y for horizontal layout
    const nodes: TreeNode[] = [];
    root.each((node: any) => {
        nodes.push({
            ...node,
            x: node.y,
            y: node.x
        } as TreeNode);
    });

    return nodes;
}

/**
 * Generates SVG path data for edges between nodes
 * @param source Source node
 * @param target Target node
 * @param config Tree configuration for consistent sizing
 * @returns SVG path string
 */
export function generateEdgePath(source: TreeNode, target: TreeNode, config: TreeConfig): string {
    const nodeHalfWidth = config.nodeWidth / 2;
    const sourceX = source.x + nodeHalfWidth;
    const sourceY = source.y;
    const targetX = target.x - nodeHalfWidth;
    const targetY = target.y;
    
    const midX = (sourceX + targetX) / 2;

    return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
}

/**
 * Gets the CSS class for a node based on its selection state
 * @param node The chain node
 * @param anySelected Whether any nodes are selected
 * @returns CSS class string
 */
export function getNodeClass(node: ChainNode, anySelected: boolean): string {
    const classes = ['tree-node'];
    
    if (node.selected) {
        classes.push('selected');
    } else if (anySelected) {
        classes.push('faded');
    }
    
    return classes.join(' ');
}

/**
 * Calculates the position for an edge label
 * @param source Source node
 * @param target Target node
 * @param config Tree configuration for consistent sizing
 * @returns Position object with x and y coordinates
 */
export function calculateEdgeLabelPosition(source: TreeNode, target: TreeNode, config: TreeConfig): { x: number; y: number } {
    const nodeHalfWidth = config.nodeWidth / 2;
    return {
        x: (source.x + target.x) / 2 + nodeHalfWidth,
        y: (source.y + target.y) / 2
    };
}

/**
 * Determines if any nodes in the path are selected
 * @param path Array of chain nodes
 * @returns true if any node is selected
 */
export function hasSelectedNodes(path: ChainNode[]): boolean {
    return path.some(node => node.selected === true);
}

/**
 * Gets selected node IDs from a path
 * @param path Array of chain nodes
 * @returns Array of selected technique IDs
 */
export function getSelectedNodeIds(path: ChainNode[]): string[] {
    return path.filter(node => node.selected).map(node => node.id);
}

/**
 * Toggles selection state for a node
 * @param path Array of chain nodes
 * @param nodeId ID of the node to toggle
 * @returns Updated path with toggled selection
 */
export function toggleNodeSelection(path: ChainNode[], nodeId: string): ChainNode[] {
    return path.map(node => ({
        ...node,
        selected: node.id === nodeId ? !node.selected : node.selected
    }));
}
