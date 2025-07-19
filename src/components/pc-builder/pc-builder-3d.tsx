'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

type DraggableObject = THREE.Mesh;
type PortObject = THREE.Mesh;

const CONNECTION_DISTANCE_THRESHOLD = 2.0;

export function PCBuilder3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const draggableObjectsRef = useRef<DraggableObject[]>([]);
  const portsRef = useRef<PortObject[]>([]);
  const connectionsRef = useRef<Map<string, { line: THREE.Line, toPortId: string }>>(new Map());
  
  const selectedObjectRef = useRef<DraggableObject | null>(null);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectionRef = useRef(new THREE.Vector3());
  const offsetRef = useRef(new THREE.Vector3());

  const createComponent = useCallback((
    name: string,
    type: string,
    info: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number]
  ): DraggableObject => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData = { id: name, type, info };
    mesh.position.set(...position);
    sceneRef.current.add(mesh);
    if (name !== 'cpu-tower') {
      draggableObjectsRef.current.push(mesh);
    }
    return mesh;
  }, []);

  const createPort = useCallback((
    name: string,
    type: 'usb' | 'hdmi' | 'power',
    accepts: string[],
    parent: THREE.Object3D,
    position: [number, number, number],
    color: number
  ) => {
    const portGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.1);
    const portMaterial = new THREE.MeshStandardMaterial({ color });
    const port = new THREE.Mesh(portGeometry, portMaterial) as PortObject;
    port.name = name;
    port.userData = { id: name, type, accepts, connectedTo: null };
    port.position.set(...position);
    parent.add(port);
    portsRef.current.push(port);
  }, []);
  
  const updateConnection = useCallback((object: DraggableObject, port: PortObject) => {
    const isCorrect = port.userData.accepts.includes(object.userData.type);
    const color = isCorrect ? 0x22c55e : 0xef4444;
    
    if (connectionsRef.current.has(object.name)) {
        const existing = connectionsRef.current.get(object.name)!;
        sceneRef.current.remove(existing.line);
        const oldPort = portsRef.current.find(p => p.name === existing.toPortId);
        if(oldPort) oldPort.userData.connectedTo = null;
    }
    
    const startPoint = object.position.clone();
    startPoint.y = 0.2;
    const endPoint = port.getWorldPosition(new THREE.Vector3());
    
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const line = new THREE.Line(geometry, material);
    sceneRef.current.add(line);

    connectionsRef.current.set(object.name, { line, toPortId: port.name });
    port.userData.connectedTo = object.name;
    
    if (isCorrect) {
        const direction = new THREE.Vector3().subVectors(object.position, endPoint).normalize();
        const newPosition = endPoint.clone().add(direction.multiplyScalar(CONNECTION_DISTANCE_THRESHOLD * 0.75));
        newPosition.y = object.geometry.parameters.height / 2;
        object.position.copy(newPosition);
    }
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0xE0E0E0);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mountRef.current?.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(8, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const tower = createComponent('cpu-tower', 'central-unit', 'Central Unit', 
      new THREE.BoxGeometry(2, 5, 4.5), 
      new THREE.MeshStandardMaterial({ color: 0x333842 }), 
      [0, 2.5, 0]
    );
    tower.castShadow = true;
    
    createPort('usb1', 'usb', ['keyboard', 'mouse', 'printer'], tower, [-0.7, 0.5, 2.3], 0x0077ff);
    createPort('usb2', 'usb', ['keyboard', 'mouse', 'printer'], tower, [-0.4, 0.5, 2.3], 0x0077ff);
    createPort('hdmi1', 'hdmi', ['monitor'], tower, [0.2, 0, 2.3], 0xff8c00);
    createPort('power1', 'power', ['power'], tower, [0.7, -2, 2.3], 0xdddd00);

    const peripheralMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e });
    const monitor = createComponent('monitor', 'output', 'Output Device: Monitor', new THREE.BoxGeometry(4.5, 3.5, 0.3), peripheralMaterial, [-7, 1.75, -2]);
    const keyboard = createComponent('keyboard', 'input', 'Input Device: Keyboard', new THREE.BoxGeometry(3.5, 0.2, 1.2), peripheralMaterial, [7, 0.1, 2.5]);
    const mouse = createComponent('mouse', 'input', 'Input Device: Mouse', new THREE.BoxGeometry(0.6, 0.2, 1), peripheralMaterial, [9, 0.1, 2.5]);
    const printer = createComponent('printer', 'output', 'Output Device: Printer', new THREE.BoxGeometry(3, 1.5, 2.5), peripheralMaterial, [-8, 0.75, 4]);
    const power = createComponent('power', 'power', 'Power Source', new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }), [7, 0.3, 7]);
    
    [monitor, keyboard, mouse, printer, power].forEach(p => p.castShadow = true);

    const animate = () => {
      if (!rendererRef.current) return;
      requestAnimationFrame(animate);

      connectionsRef.current.forEach((conn, objectId) => {
          const obj = scene.getObjectByName(objectId) as DraggableObject;
          const port = scene.getObjectByName(conn.toPortId) as PortObject;
          if (obj && port && conn.line.geometry.attributes.position) {
              const positions = conn.line.geometry.attributes.position.array as Float32Array;
              const start = obj.position.clone();
              start.y = obj.geometry.parameters.height / 2;
              const end = port.getWorldPosition(new THREE.Vector3());
              positions[0] = start.x;
              positions[1] = start.y;
              positions[2] = start.z;
              positions[3] = end.x;
              positions[4] = end.y;
              positions[5] = end.z;
              conn.line.geometry.attributes.position.needsUpdate = true;
          }
      });
      
      rendererRef.current.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    
    const onPointerMove = (event: PointerEvent) => {
      if (!mountRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      const { left, top } = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - left) / clientWidth) * 2 - 1;
      mouseRef.current.y = -((event.clientY - top) / clientHeight) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      if(selectedObjectRef.current) {
        raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current);
        selectedObjectRef.current.position.copy(intersectionRef.current.sub(offsetRef.current));
      } else {
        const intersects = raycasterRef.current.intersectObjects(draggableObjectsRef.current);
        if (intersects.length > 0) {
          document.body.style.cursor = 'grab';
          const obj = intersects[0].object as DraggableObject;
          setTooltip({ content: obj.userData.info, x: event.clientX, y: event.clientY });
        } else {
          document.body.style.cursor = 'default';
          setTooltip(null);
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if(event.button !== 0) return;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(draggableObjectsRef.current);
      if (intersects.length > 0) {
        const object = intersects[0].object as DraggableObject;
        selectedObjectRef.current = object;
        document.body.style.cursor = 'grabbing';
        planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), object.position);
        if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
          offsetRef.current.copy(intersectionRef.current).sub(object.position);
        }
      }
    };
    
    const onPointerUp = () => {
      if (selectedObjectRef.current) {
        const selected = selectedObjectRef.current;
        document.body.style.cursor = 'grab';
        
        let closestPort: PortObject | null = null;
        let minDistance = Infinity;

        portsRef.current.forEach(port => {
          const portWorldPos = port.getWorldPosition(new THREE.Vector3());
          const distance = selected.position.distanceTo(portWorldPos);
          if (distance < minDistance) {
            minDistance = distance;
            closestPort = port;
          }
        });
        
        if(closestPort && minDistance < CONNECTION_DISTANCE_THRESHOLD) {
          if(closestPort.userData.connectedTo === null || closestPort.userData.connectedTo === selected.name) {
            updateConnection(selected, closestPort);
          }
        }
      }
      selectedObjectRef.current = null;
    };
    
    const currentMount = mountRef.current;
    handleResize();
    currentMount?.addEventListener('pointermove', onPointerMove);
    currentMount?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', handleResize);

    return () => {
      currentMount?.removeEventListener('pointermove', onPointerMove);
      currentMount?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && mountRef.current) {
        rendererRef.current.dispose();
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [createComponent, createPort, updateConnection]);

  return (
    <div className="relative h-[calc(100vh-theme(spacing.14))] w-full">
      <div ref={mountRef} className="h-full w-full" />
      {tooltip && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+1rem)] rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
