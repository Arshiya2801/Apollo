import React, { useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import './CodeVisualizer.css';

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  if (!nodes || nodes.length === 0) return { nodes: [], edges: [] };
  
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 150;
  const nodeHeight = 50;
  
  dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 40 });

  const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Sanitize nodes and edges to ensure string IDs and DOM-safe characters
  const safeNodes = nodes.map(n => ({ ...n, id: sanitizeId(n.id) }));
  const safeEdges = edges.map(e => ({ 
    ...e, 
    id: sanitizeId(e.id || `e${e.source}-${e.target}`), 
    source: sanitizeId(e.source), 
    target: sanitizeId(e.target) 
  }));

  safeNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  safeEdges.forEach((edge) => {
    if (safeNodes.some(n => n.id === edge.source) && safeNodes.some(n => n.id === edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const newNodes = safeNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      type: node.type || 'default',
      targetPosition: direction === 'TB' ? Position.Top : Position.Left,
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      width: nodeWidth,
      height: nodeHeight,
      style: { ...node.style }
    };
  });

  const newEdges = safeEdges.map((edge, idx) => ({
    id: edge.id || `edge-${idx}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.animated === true,
    style: { stroke: edge.animated ? '#9B40E0' : '#8b949e', strokeWidth: 3 },
    type: 'default'
  }));

  return { nodes: newNodes, edges: newEdges };
};

const CodeVisualizer = ({ content, isGenerating }) => {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [parseError, setParseError] = useState(null);

  const playIntervalRef = useRef(null);

  // Parse JSON and extract steps
  useEffect(() => {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        
        if (parsed.steps && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          setSteps(parsed.steps); // eslint-disable-line react-hooks/set-state-in-effect
          setParseError(null);
        } else if (parsed.nodes && parsed.edges) {
          setSteps([{
             explanation: 'Static data structure visualization.',
             nodes: parsed.nodes,
             edges: parsed.edges
          }]);
          setParseError(null);
        }
      } catch {
        if (!isGenerating) {
          setParseError('Failed to parse visualization data. Please try generating again.');
        }
      }
    }
  }, [content, isGenerating]);

  // Update React Flow when step changes (Apply Dagre Layout)
  useEffect(() => {
    if (steps.length > 0 && steps[currentStep]) {
      const step = steps[currentStep];
      
      // Fallback: If AI forgot edges/nodes in this step, use from previous step
      let currentEdges = step.edges;
      if (!currentEdges || currentEdges.length === 0) {
        let fallbackStep = currentStep;
        while (fallbackStep >= 0) {
          if (steps[fallbackStep].edges && steps[fallbackStep].edges.length > 0) {
            currentEdges = steps[fallbackStep].edges;
            break;
          }
          fallbackStep--;
        }
        currentEdges = currentEdges || [];
      }

      let currentNodes = step.nodes;
      if (!currentNodes || currentNodes.length === 0) {
        let fallbackStep = currentStep;
        while (fallbackStep >= 0) {
          if (steps[fallbackStep].nodes && steps[fallbackStep].nodes.length > 0) {
            currentNodes = steps[fallbackStep].nodes;
            break;
          }
          fallbackStep--;
        }
        currentNodes = currentNodes || [];
      }

      // Auto layout the graph
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        currentNodes,
        currentEdges,
        'TB' // Top to Bottom
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [currentStep, steps, setNodes, setEdges]);

  // Handle Playback Auto-Advance
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, steps.length]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleNext = () => setCurrentStep(p => Math.min(steps.length - 1, p + 1));
  const handlePrev = () => setCurrentStep(p => Math.max(0, p - 1));

  if (!content.includes('```json') && isGenerating) {
    return (
      <div className="visualizer-loading-glass">
        <div className="visualizer-spinner"></div>
        <p>Analyzing code structures...</p>
      </div>
    );
  }

  if (!isGenerating && steps.length === 0) {
    return (
      <div className="visualizer-error">
        <p>{parseError || "No visualizable structures found in the response."}</p>
        <div className="visualizer-raw-output">
          <strong>Raw Output:</strong>
          <pre>{content}</pre>
        </div>
      </div>
    );
  }

  const activeExplanation = steps[currentStep]?.explanation || '';

  return (
    <div className="code-visualizer-premium">
      <div className="visualizer-canvas-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-right"
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Controls className="premium-controls" />
          <Background color="#ccc" gap={16} />
        </ReactFlow>
      </div>

      <div className="visualizer-glass-panel">
        <div className="v-glass-header">
           <div className="v-step-badge">Step {currentStep + 1}/{steps.length}</div>
           <div className="v-explanation">{activeExplanation}</div>
        </div>

        {steps.length > 1 && (
          <div className="v-glass-controls">
             <button onClick={handlePrev} disabled={currentStep === 0} className="v-btn glass-btn">
               <LucideIcons.SkipBack size={18} />
             </button>
             
             <button onClick={handlePlayPause} className="v-btn glass-btn play-btn">
               {isPlaying ? <LucideIcons.Pause size={20} /> : <LucideIcons.Play size={20} />}
             </button>
             
             <button onClick={handleNext} disabled={currentStep === steps.length - 1} className="v-btn glass-btn">
               <LucideIcons.SkipForward size={18} />
             </button>

             <div className="v-slider-container">
                <input 
                   type="range" 
                   min="0" 
                   max={steps.length - 1} 
                   value={currentStep} 
                   onChange={(e) => {
                      setCurrentStep(parseInt(e.target.value));
                      setIsPlaying(false);
                   }} 
                   className="v-slider premium-slider"
                />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeVisualizer;
