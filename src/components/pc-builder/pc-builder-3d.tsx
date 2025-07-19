'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

type DraggableObject = THREE.Group;
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
    position: [number, number, number],
    createGeometry: () => THREE.Group
  ): DraggableObject => {
    const group = createGeometry();
    group.name = name;
    group.userData = { id: name, type, info, height: 5 }; // Assuming a generic height for positioning
    group.position.set(...position);
    sceneRef.current.add(group);
    
    // Make children of the group draggable as one unit
    const draggableMeshes: THREE.Object3D[] = [];
    group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            draggableMeshes.push(child);
        }
    });

    if (name !== 'cpu-tower') {
      draggableObjectsRef.current.push(group);
    }
    return group;
  }, []);

  const createTower = () => {
    const group = new THREE.Group();
    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x333842 });
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 4.5), caseMaterial);
    caseMesh.castShadow = true;
    caseMesh.receiveShadow = true;
    group.add(caseMesh);

    // Add some details
    const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x444952 }));
    frontPanel.position.set(0, 2, 2.26);
    group.add(frontPanel);
    
    const powerButton = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x00aaff }));
    powerButton.position.set(0, 2.35, 2.26);
    powerButton.rotation.x = Math.PI / 2;
    group.add(powerButton);

    return group;
  };

  const createMonitor = () => {
    const group = new THREE.Group();
    const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.2 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e });

    const screen = new THREE.Mesh(new THREE.BoxGeometry(4.3, 3.3, 0.1), screenMaterial);
    screen.position.z = -0.1;
    group.add(screen);
    
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 0.3), frameMaterial);
    group.add(frame);
    
    const standNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 16), frameMaterial);
    standNeck.position.y = -2.25;
    group.add(standNeck);

    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 0.2, 32), frameMaterial);
    standBase.position.y = -2.8;
    group.add(standBase);
    
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });

    return group;
  }
  
  const createKeyboard = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e });
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 1.2), bodyMaterial);
    group.add(body);

    for(let i = 0; i < 6; i++) {
        for (let j = 0; j < 15; j++) {
            const key = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), keyMaterial);
            key.position.set(-1.6 + j * 0.22, 0.15, -0.45 + i * 0.18);
            group.add(key);
        }
    }
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });

    return group;
  }
  
  const createMouse = () => {
      const group = new THREE.Group();
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e });
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1), bodyMaterial);
      group.add(body);
      
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.15, -0.2);
      group.add(wheel);
      
      group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
      return group;
  }
  
  const createPrinter = () => {
      const group = new THREE.Group();
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const detailMaterial = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });

      const mainBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2.5), bodyMaterial);
      group.add(mainBody);
      
      const paperTray = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1.5), detailMaterial);
      paperTray.position.set(0, -0.65, 1);
      group.add(paperTray);
      
      const topCover = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 2), detailMaterial);
      topCover.position.y = 0.55;
      group.add(topCover);
      
      group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
      return group;
  }
  
  const createPowerStrip = () => {
      const group = new THREE.Group();
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 0.8), bodyMaterial);
      group.add(strip);
      
      group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
      return group;
  }

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
        
        const boundingBox = new THREE.Box3().setFromObject(object);
        const height = boundingBox.max.y - boundingBox.min.y;
        newPosition.y = height / 2;
        object.position.copy(newPosition);
    }
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0xE0E0E0);
    const darkBackground = new THREE.Color(0x282c34);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        scene.background = darkBackground;
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        scene.background = event.matches ? darkBackground : new THREE.Color(0xE0E0E0);
    });

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
      [0, 2.5, 0],
      createTower
    );
    
    createPort('usb1', 'usb', ['keyboard', 'mouse', 'printer'], tower, [-0.7, 0.5, 2.3], 0x0077ff);
    createPort('usb2', 'usb', ['keyboard', 'mouse', 'printer'], tower, [-0.4, 0.5, 2.3], 0x0077ff);
    createPort('hdmi1', 'hdmi', ['monitor'], tower, [0.2, 0, 2.3], 0xff8c00);
    createPort('power1', 'power', ['power'], tower, [0.7, -2, 2.3], 0xdddd00);

    createComponent('monitor', 'monitor', 'Output Device: Monitor', [-7, 2.9, -2], createMonitor);
    createComponent('keyboard', 'keyboard', 'Input Device: Keyboard', [7, 0.1, 2.5], createKeyboard);
    createComponent('mouse', 'mouse', 'Input Device: Mouse', [9, 0.1, 2.5], createMouse);
    createComponent('printer', 'printer', 'Output Device: Printer', [-8, 0.75, 4], createPrinter);
    createComponent('power', 'power', 'Power Source', [7, 0.2, 7], createPowerStrip);
    
    const animate = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);

      connectionsRef.current.forEach((conn, objectId) => {
          const obj = scene.getObjectByName(objectId) as DraggableObject;
          const port = scene.getObjectByName(conn.toPortId) as PortObject;
          if (obj && port && conn.line.geometry.attributes.position) {
              const positions = conn.line.geometry.attributes.position.array as Float32Array;
              const start = obj.position.clone();
              const boundingBox = new THREE.Box3().setFromObject(obj);
              const height = boundingBox.max.y - boundingBox.min.y;
              start.y = obj.position.y - height / 2 + 0.1;

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
      
      rendererRef.current.render(scene, cameraRef.current);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const { clientWidth, clientHeight } = mountRef.current;
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
    };
    
    const onPointerMove = (event: PointerEvent) => {
        if (!mountRef.current || !cameraRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      
      if(selectedObjectRef.current) {
        raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current);
        selectedObjectRef.current.position.copy(intersectionRef.current.sub(offsetRef.current));
      } else {
        const intersects = raycasterRef.current.intersectObjects(draggableObjectsRef.current.flatMap(o => o.children));
        if (intersects.length > 0) {
          document.body.style.cursor = 'grab';
          let parentGroup = intersects[0].object.parent;
          while(parentGroup && !(parentGroup instanceof THREE.Group && parentGroup.userData.id)) {
            parentGroup = parentGroup.parent;
          }
          if(parentGroup) {
            const obj = parentGroup as DraggableObject;
            setTooltip({ content: obj.userData.info, x: event.clientX, y: event.clientY });
          }
        } else {
          document.body.style.cursor = 'default';
          setTooltip(null);
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if(event.button !== 0 || !cameraRef.current) return;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(draggableObjectsRef.current.flatMap(o => o.children));

      if (intersects.length > 0) {
        let parentGroup = intersects[0].object.parent;
          while(parentGroup && !(parentGroup instanceof THREE.Group && parentGroup.userData.id)) {
            parentGroup = parentGroup.parent;
          }
        
        if (parentGroup && draggableObjectsRef.current.includes(parentGroup as DraggableObject)) {
            const object = parentGroup as DraggableObject;
            selectedObjectRef.current = object;
            document.body.style.cursor = 'grabbing';
            planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), object.position);
            if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
              offsetRef.current.copy(intersectionRef.current).sub(object.position);
            }
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
