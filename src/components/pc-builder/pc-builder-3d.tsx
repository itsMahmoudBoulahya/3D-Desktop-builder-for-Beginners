'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from '../ui/button';
import { ConnectionDialog } from './connection-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export type DraggableObject = THREE.Group;
export type PortObject = THREE.Mesh;

const CONNECTION_DISTANCE_THRESHOLD = 2.0;

export function PCBuilder3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<DraggableObject | null>(null);
  const [isConnectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [wrongConnectionAlert, setWrongConnectionAlert] = useState<{ open: boolean, portType: string, deviceType: string }>({ open: false, portType: '', deviceType: '' });


  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const draggableObjectsRef = useRef<DraggableObject[]>([]);
  const portsRef = useRef<PortObject[]>([]);
  const connectionsRef = useRef<Map<string, { line: THREE.Line, toPortId: string }>>(new Map());
  
  const selectedObjectForDragRef = useRef<DraggableObject | null>(null);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectionRef = useRef(new THREE.Vector3());
  const offsetRef = useRef(new THREE.Vector3());

  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.BackSide });

  const applyOutline = (object: THREE.Object3D) => {
    if (object instanceof THREE.Mesh && object.name !== 'outline') {
      const outlineMesh = object.clone();
      outlineMesh.material = outlineMaterial;
      outlineMesh.scale.multiplyScalar(1.05);
      outlineMesh.name = 'outline';
      object.add(outlineMesh);
    }
  };

  const removeOutline = (object: THREE.Object3D) => {
    const outline = object.getObjectByName('outline');
    if (outline) {
      object.remove(outline);
    }
  };

  const createComponent = useCallback((
    name: string,
    type: string,
    info: string,
    position: [number, number, number],
    createGeometry: () => THREE.Group
  ): DraggableObject => {
    const group = createGeometry();
    group.name = name;
    group.userData = { id: name, type, info, inScene: true };
    group.position.set(...position);
    sceneRef.current.add(group);
    
    if (name !== 'cpu-tower') {
      // This was causing duplicates when dragging from sidebar
      // draggableObjectsRef.current.push(group);
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

  const createHeadphones = () => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
  
    // Headband
    const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(0.5, 1.1, 0),
        new THREE.Vector3(0.8, 0.8, 0),
        new THREE.Vector3(0.9, 0.4, 0),
        new THREE.Vector3(0.9, 0, 0),
    ]);
    const geometry = new THREE.TubeGeometry(path, 20, 0.1, 8, false);
    const headband = new THREE.Mesh(geometry, material);
    group.add(headband);

    const headbandMirror = headband.clone();
    headbandMirror.scale.x = -1;
    group.add(headbandMirror);
  
    // Earpieces
    const earpieceGeo = new THREE.CylinderGeometry(0.4, 0.3, 0.3, 32);
    const earpieceLeft = new THREE.Mesh(earpieceGeo, material);
    earpieceLeft.rotation.z = Math.PI / 2;
    earpieceLeft.position.set(-0.9, 0, 0);
    group.add(earpieceLeft);
  
    const earpieceRight = earpieceLeft.clone();
    earpieceRight.position.x = 0.9;
    group.add(earpieceRight);
  
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    group.scale.set(0.8, 0.8, 0.8);
    return group;
  }
  
  const createMicrophone = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });

    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.2, 32), bodyMaterial);
    standBase.position.y = 0.1;
    group.add(standBase);

    const standArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 16), bodyMaterial);
    standArm.position.y = 0.95;
    group.add(standArm);

    const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), headMaterial);
    micHead.position.y = 1.9;
    group.add(micHead);

    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    return group;
  }


  const createPort = useCallback((
    name: string,
    type: 'usb' | 'hdmi' | 'power' | 'audio-out' | 'mic-in',
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
  
  const handleConnection = useCallback((deviceId: string, portId: string) => {
    const object = sceneRef.current.getObjectByName(deviceId) as DraggableObject;
    const port = portsRef.current.find(p => p.name === portId);

    if (!object || !port) return;

    const isCorrect = port.userData.accepts.includes(object.userData.type);
    
    if (connectionsRef.current.has(object.name)) {
        const existing = connectionsRef.current.get(object.name)!;
        sceneRef.current.remove(existing.line);
        const oldPort = portsRef.current.find(p => p.name === existing.toPortId);
        if(oldPort) oldPort.userData.connectedTo = null;
        connectionsRef.current.delete(object.name);
    }
    
    const color = isCorrect ? 0x22c55e : 0xef4444;
    
    const startPoint = new THREE.Vector3();
    object.getWorldPosition(startPoint);
    startPoint.y = object.position.y - (new THREE.Box3().setFromObject(object).max.y - new THREE.Box3().setFromObject(object).min.y)/2 + 0.1;

    const endPoint = port.getWorldPosition(new THREE.Vector3());
    
    const material = new THREE.LineBasicMaterial({ color, linewidth: 3 });
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const line = new THREE.Line(geometry, material);
    line.name = `line_${object.name}`;
    sceneRef.current.add(line);

    connectionsRef.current.set(object.name, { line, toPortId: port.name });
    port.userData.connectedTo = object.name;
    
    if (isCorrect) {
        toast({ title: "Connection Successful!", description: `${object.userData.type} connected to ${port.userData.type} port.` });
    } else {
        setWrongConnectionAlert({
            open: true,
            portType: port.userData.type.toUpperCase(),
            deviceType: object.userData.type.toUpperCase(),
        });
        setTimeout(() => {
            sceneRef.current.remove(line);
            connectionsRef.current.delete(object.name);
            port.userData.connectedTo = null;
        }, 500);
    }
  }, [toast]);
  
  // Drag and drop from sidebar
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const componentData = e.dataTransfer?.getData('application/json');
      if (!componentData) return;
      const {type, name, info} = JSON.parse(componentData);

      // Avoid adding duplicates
      if (draggableObjectsRef.current.find(obj => obj.name === name)) {
        toast({
          title: 'Component already in scene',
          description: `The ${info.split(': ')[1]} is already in the scene.`,
          variant: 'destructive'
        });
        return;
      }
      
      const rect = mountRef.current!.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const dropPoint = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(groundPlane, dropPoint);


      let newComponent: DraggableObject | null = null;
      switch(type) {
        case 'monitor': newComponent = createComponent(name, type, info, [dropPoint.x, 2.9, dropPoint.z], createMonitor); break;
        case 'keyboard': newComponent = createComponent(name, type, info, [dropPoint.x, 0.1, dropPoint.z], createKeyboard); break;
        case 'mouse': newComponent = createComponent(name, type, info, [dropPoint.x, 0.1, dropPoint.z], createMouse); break;
        case 'printer': newComponent = createComponent(name, type, info, [dropPoint.x, 0.75, dropPoint.z], createPrinter); break;
        case 'power': newComponent = createComponent(name, type, info, [dropPoint.x, 0.2, dropPoint.z], createPowerStrip); break;
        case 'headphones': newComponent = createComponent(name, type, info, [dropPoint.x, 1, dropPoint.z], createHeadphones); break;
        case 'mic': newComponent = createComponent(name, type, info, [dropPoint.x, 1, dropPoint.z], createMicrophone); break;
      }

      if(newComponent) {
        draggableObjectsRef.current.push(newComponent);
      }
    };
    
    const mountEl = mountRef.current;
    mountEl?.addEventListener('dragover', handleDragOver);
    mountEl?.addEventListener('drop', handleDrop);

    return () => {
      mountEl?.removeEventListener('dragover', handleDragOver);
      mountEl?.removeEventListener('drop', handleDrop);
    }

  }, [createComponent, toast]);

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

    controlsRef.current = new OrbitControls(camera, renderer.domElement);
    controlsRef.current.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(8, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, name: 'ground' })
    );
    ground.name = 'ground';
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const tower = createComponent('cpu-tower', 'central-unit', 'Central Unit', 
      [0, 2.5, 0],
      createTower
    );
    tower.userData.inScene = true;
    
    createPort('usb1', 'usb', ['keyboard', 'mouse', 'printer', 'mic'], tower, [-0.7, 1.5, -2.3], 0x0077ff);
    createPort('usb2', 'usb', ['keyboard', 'mouse', 'printer', 'mic'], tower, [-0.4, 1.5, -2.3], 0x0077ff);
    createPort('hdmi1', 'hdmi', ['monitor'], tower, [0.2, 1.5, -2.3], 0xff8c00);
    createPort('power1', 'power', ['power'], tower, [0.7, -2, -2.3], 0xdddd00);
    createPort('audio-out1', 'audio-out', ['headphones'], tower, [-0.7, -0.5, -2.3], 0x32CD32);
    createPort('mic-in1', 'mic-in', ['mic'], tower, [-0.4, -0.5, -2.3], 0xff69b4);

    const animate = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);

      controlsRef.current?.update();

      connectionsRef.current.forEach((conn, objectId) => {
          const obj = scene.getObjectByName(objectId) as DraggableObject;
          const port = portsRef.current.find(p => p.name === conn.toPortId) as PortObject;
          if (obj && port && conn.line.geometry.attributes.position) {
              const positions = conn.line.geometry.attributes.position.array as Float32Array;
              const start = new THREE.Vector3();
              obj.getWorldPosition(start);
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
      
        if(selectedObjectForDragRef.current) {
            if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
                selectedObjectForDragRef.current.position.copy(intersectionRef.current.sub(offsetRef.current));
            }
        } else {
            const objectsToIntersect = draggableObjectsRef.current.filter(o => o.userData.inScene).flatMap(o => o.children);
            const intersects = raycasterRef.current.intersectObjects(objectsToIntersect, true);
        
            let hoveredObject = null;
            if (intersects.length > 0) {
                let parentGroup = intersects[0].object.parent;
                while(parentGroup && !(parentGroup instanceof THREE.Group && parentGroup.userData.id)) {
                    parentGroup = parentGroup.parent;
                }
                if (parentGroup && draggableObjectsRef.current.includes(parentGroup as DraggableObject)) {
                    hoveredObject = parentGroup;
                }
            }
        
            if (hoveredObject) {
                document.body.style.cursor = 'grab';
                const obj = hoveredObject as DraggableObject;
                setTooltip({ content: obj.userData.info, x: event.clientX, y: event.clientY });
            } else {
                document.body.style.cursor = 'default';
                setTooltip(null);
            }
        }
    };

    const onPointerDown = (event: PointerEvent) => {
      if(event.button !== 0 || !cameraRef.current || controlsRef.current?.state !== -1) return;
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const objectsToIntersect = draggableObjectsRef.current.filter(o => o.userData.inScene);
      const intersects = raycasterRef.current.intersectObjects(objectsToIntersect, true);

      if (intersects.length > 0) {
        let parentGroup = intersects[0].object.parent;
          while(parentGroup && !(parentGroup instanceof THREE.Group && parentGroup.userData.id)) {
            parentGroup = parentGroup.parent;
          }
        
        if (parentGroup && draggableObjectsRef.current.includes(parentGroup as DraggableObject)) {
            const object = parentGroup as DraggableObject;
            selectedObjectForDragRef.current = object;
            document.body.style.cursor = 'grabbing';
            controlsRef.current.enabled = false;
            planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), object.position);
            if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
              offsetRef.current.copy(intersectionRef.current).sub(object.position);
            }
        }
      }
    };
    
    const onPointerUp = () => {
      if (selectedObjectForDragRef.current) {
        selectedObjectForDragRef.current = null;
        document.body.style.cursor = 'default';
        controlsRef.current.enabled = true;
      }
    };

    const onClick = (event: MouseEvent) => {
        if (selectedObjectForDragRef.current) return;
        if (!cameraRef.current) return;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const objectsToIntersect = draggableObjectsRef.current.filter(o => o.userData.inScene);
        const intersects = raycasterRef.current.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0) {
            let parentGroup = intersects[0].object.parent;
            while (parentGroup && !(parentGroup instanceof THREE.Group && parentGroup.userData.id)) {
                parentGroup = parentGroup.parent;
            }

            if (parentGroup && draggableObjectsRef.current.includes(parentGroup as DraggableObject)) {
                const object = parentGroup as DraggableObject;
                
                if(selectedComponent && selectedComponent.userData.id === object.userData.id) {
                    selectedComponent.traverse(child => removeOutline(child));
                    setSelectedComponent(null);
                } else {
                    if(selectedComponent) {
                        selectedComponent.traverse(child => removeOutline(child));
                    }
                    object.traverse(child => applyOutline(child));
                    setSelectedComponent(object);
                }
            }
        } else {
            const groundIntersect = raycasterRef.current.intersectObjects(scene.getObjectsByProperty('name', 'ground'));
            if(groundIntersect.length > 0) {
              if (selectedComponent) {
                  selectedComponent.traverse(child => removeOutline(child));
                  setSelectedComponent(null);
              }
            }
        }
    };
    
    const currentMount = mountRef.current;
    handleResize();
    currentMount?.addEventListener('pointermove', onPointerMove);
    currentMount?.addEventListener('pointerdown', onPointerDown);
    currentMount?.addEventListener('click', onClick);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', handleResize);

    return () => {
      currentMount?.removeEventListener('pointermove', onPointerMove);
      currentMount?.removeEventListener('pointerdown', onPointerDown);
      currentMount?.removeEventListener('click', onClick);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      controlsRef.current?.dispose();
      if (rendererRef.current && mountRef.current) {
        rendererRef.current.dispose();
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [createComponent, createPort, handleConnection, toast]);

  const onConnectClick = () => {
    setConnectionDialogOpen(true);
  }

  const onDialogConnect = (portId: string) => {
    if (selectedComponent) {
      handleConnection(selectedComponent.name, portId);
    }
    setConnectionDialogOpen(false);
    if(selectedComponent) {
        selectedComponent.traverse(child => removeOutline(child));
    }
    setSelectedComponent(null);
  }


  return (
    <div className="relative h-[calc(100vh-theme(spacing.14))] w-full">
      <div ref={mountRef} className="h-full w-full" />
      {tooltip && !selectedComponent && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+1rem)] rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
      {selectedComponent && (
          <div className='absolute bottom-5 left-1/2 -translate-x-1/2 bg-card p-4 rounded-lg shadow-2xl border flex items-center gap-4'>
              <p className='font-semibold text-card-foreground'>Selected: {selectedComponent.userData.info.split(': ')[1]}</p>
              <Button onClick={onConnectClick}>Connect</Button>
          </div>
      )}
      <ConnectionDialog 
        isOpen={isConnectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
        device={selectedComponent}
        ports={portsRef.current}
        onConnect={onDialogConnect}
      />
      <AlertDialog open={wrongConnectionAlert.open} onOpenChange={(open) => setWrongConnectionAlert(prev => ({...prev, open}))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incorrect Connection</AlertDialogTitle>
            <AlertDialogDescription>
              You cannot connect a {wrongConnectionAlert.deviceType} to a {wrongConnectionAlert.portType} port. Please choose a compatible port.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setWrongConnectionAlert({ open: false, portType: '', deviceType: '' })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
