
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from '../ui/button';
import { ConnectionDialog } from './connection-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Trash2 } from 'lucide-react';

export type DraggableObject = THREE.Group;
export type PortObject = THREE.Mesh;

const DESK_LEVEL = 3.5;

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
  const connectionsRef = useRef<Map<string, { line: THREE.Line, toPortId: string, connectionType: string }[]>>(new Map());
  
  const selectedObjectForDragRef = useRef<DraggableObject | null>(null);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const intersectionRef = useRef(new THREE.Vector3());
  const offsetRef = useRef(new THREE.Vector3());
  const isDraggingRef = useRef(false);

  const applyOutline = (object: THREE.Object3D) => {
    if (object instanceof THREE.Mesh && object.userData.isSelectable) {
      const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.BackSide, transparent: true, opacity: 0.5 });
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
    createGeometry: () => THREE.Group,
    needs: { power?: boolean; data?: boolean, dataType?: string }
  ): DraggableObject => {
    const group = createGeometry();
    group.name = name;
    group.userData = { id: name, type, info, inScene: true, needs };
    group.position.set(...position);
    sceneRef.current.add(group);
    
    return group;
  }, []);

  const createTower = () => {
    const group = new THREE.Group();
    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x333842, metalness: 0.5, roughness: 0.6 });
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 4.5), caseMaterial);
    caseMesh.userData.isSelectable = true;
    caseMesh.castShadow = true;
    caseMesh.receiveShadow = true;
    group.add(caseMesh);

    const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x444952 }));
    frontPanel.position.set(0, 2, 2.26);
    group.add(frontPanel);
    
    const powerButton = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.5 }));
    powerButton.position.set(0, 2.35, 2.26);
    powerButton.rotation.x = Math.PI / 2;
    group.add(powerButton);

    const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (let i = 0; i < 10; i++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.05), ventMaterial);
        vent.position.set(0, 1.5 - i * 0.2, 2.26);
        group.add(vent);
    }

    group.scale.set(0.8, 0.8, 0.8);
    return group;
  };

  const createMonitor = () => {
    const group = new THREE.Group();
    const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.2 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e, roughness: 0.4 });

    const screen = new THREE.Mesh(new THREE.BoxGeometry(4.3, 3.3, 0.1), screenMaterial);
    screen.position.z = -0.1;
    group.add(screen);
    
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 0.3), frameMaterial);
    frame.userData.isSelectable = true;
    group.add(frame);
    
    const standNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 16), frameMaterial);
    standNeck.position.y = -2.25;
    group.add(standNeck);

    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 0.2, 32), frameMaterial);
    standBase.position.y = -2.8;
    group.add(standBase);
    
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });

    group.scale.set(0.8, 0.8, 0.8);
    return group;
  }
  
  const createKeyboard = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e, roughness: 0.5 });
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 1.2), bodyMaterial);
    body.userData.isSelectable = true;
    group.add(body);

    for(let i = 0; i < 6; i++) {
        for (let j = 0; j < 15; j++) {
            const key = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), keyMaterial);
            key.position.set(-1.6 + j * 0.22, 0.15, -0.45 + i * 0.18);
            group.add(key);
        }
    }
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });

    group.scale.set(0.8, 0.8, 0.8);
    return group;
  }
  
  const createMouse = () => {
      const group = new THREE.Group();
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e, roughness: 0.4 });
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1), bodyMaterial);
      body.userData.isSelectable = true;
      group.add(body);
      
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.15, -0.2);
      group.add(wheel);
      
      group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
      group.scale.set(0.8, 0.8, 0.8);
      return group;
  }
  
  const createPrinter = () => {
      const group = new THREE.Group();
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
      const detailMaterial = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.7 });

      const mainBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2.5), bodyMaterial);
      mainBody.userData.isSelectable = true;
      group.add(mainBody);
      
      const paperTray = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 1.5), detailMaterial);
      paperTray.position.set(0, -0.65, 1);
      group.add(paperTray);
      
      const topCover = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 2), detailMaterial);
      topCover.position.y = 0.55;
      group.add(topCover);
      
      group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
      group.scale.set(0.6, 0.6, 0.6);
      return group;
  }
  
  const createPowerStrip = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.6 });
    const outletMaterial = new THREE.MeshStandardMaterial({color: 0x222222});

    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.8), bodyMaterial);
    strip.userData.isSelectable = true;
    strip.castShadow = true;
    strip.receiveShadow = true;
    group.add(strip);
    
    for(let i=0; i < 4; i++) {
        const outletGroup = new THREE.Group();
        outletGroup.position.set(-0.9 + i * 0.6, 0.21, 0);

        const outletBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.55), outletMaterial);
        outletGroup.add(outletBase);

        const groundGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16);
        const ground = new THREE.Mesh(groundGeo, outletMaterial);
        ground.rotation.x = Math.PI / 2;
        ground.position.y = 0.01;
        outletGroup.add(ground);

        const slotGeo = new THREE.BoxGeometry(0.03, 0.03, 0.15);
        const slot1 = new THREE.Mesh(slotGeo, outletMaterial);
        slot1.position.set(-0.1, 0.01, 0);
        outletGroup.add(slot1);
        const slot2 = new THREE.Mesh(slotGeo, outletMaterial);
        slot2.position.set(0.1, 0.01, 0);
        outletGroup.add(slot2);
        
        group.add(outletGroup);
    }
    
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    group.scale.set(0.8, 0.8, 0.8);
    return group;
  }

  const createHeadphones = () => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.5, metalness: 0.2 });
  
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
    headband.userData.isSelectable = true;
    group.add(headband);

    const headbandMirror = headband.clone();
    headbandMirror.userData.isSelectable = false; // Don't select the mirror
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
    group.scale.set(0.7, 0.7, 0.7);
    return group;
  }
  
  const createMicrophone = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555b6e, roughness: 0.6 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });

    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.2, 32), bodyMaterial);
    standBase.userData.isSelectable = true;
    standBase.position.y = 0.1;
    group.add(standBase);

    const standArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 16), bodyMaterial);
    standArm.position.y = 0.95;
    group.add(standArm);

    const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), headMaterial);
    micHead.position.y = 1.9;
    group.add(micHead);

    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    group.scale.set(0.6, 0.6, 0.6);
    return group;
  }

  const createSpeakers = () => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const coneMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    
    const createSpeaker = () => {
        const speakerGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), material);
        body.userData.isSelectable = true;
        speakerGroup.add(body);

        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 32), coneMaterial);
        cone.rotation.x = Math.PI / 2;
        cone.position.z = 0.41;
        cone.position.y = 0.2;
        speakerGroup.add(cone);
        
        const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 32), coneMaterial);
        tweeter.rotation.x = Math.PI / 2;
        tweeter.position.z = 0.41;
        tweeter.position.y = -0.3;
        speakerGroup.add(tweeter);

        return speakerGroup;
    }
    
    const speaker1 = createSpeaker();
    speaker1.position.x = -0.6;
    group.add(speaker1);

    const speaker2 = speaker1.clone();
    speaker2.position.x = 0.6;
    // We only want the main body to be selectable, but the clone will have it too.
    // So we iterate and disable it.
    speaker2.traverse(child => {
        if (child instanceof THREE.Mesh && child.userData.isSelectable) {
            child.userData.isSelectable = false;
        }
    });
    group.add(speaker2);

    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    return group;
  }

  const createWebcam = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 });
    const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.3), bodyMaterial);
    body.userData.isSelectable = true;
    group.add(body);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), lensMaterial);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.15;
    group.add(lens);

    group.scale.set(0.7, 0.7, 0.7);
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    return group;
  }

  const createScanner = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x88aaff, transparent: true, opacity: 0.3, roughness: 0.1 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 2.5), bodyMaterial);
    body.userData.isSelectable = true;
    group.add(body);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), glassMaterial);
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = 0.26;
    group.add(glass);
    
    group.scale.set(0.7, 0.7, 0.7);
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    return group;
  }

  const createPort = useCallback((
    name: string,
    type: string,
    connectionType: 'power' | 'data',
    accepts: string[],
    parent: THREE.Object3D,
    position: [number, number, number],
    color: number
  ) => {
    const portGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.1);
    const portMaterial = new THREE.MeshStandardMaterial({ color });
    const port = new THREE.Mesh(portGeometry, portMaterial) as PortObject;
    port.name = name;
    port.userData = { id: name, type, connectionType, accepts, connectedTo: null };
    port.position.set(...position);
    parent.add(port);
    portsRef.current.push(port);
  }, []);
  
  const handleConnection = useCallback((portId: string, connectionType: 'power' | 'data' | string) => {
    if (!selectedComponent) return;

    const object = selectedComponent;
    const port = portsRef.current.find(p => p.name === portId);

    if (!object || !port) return;

    const existingConnections = connectionsRef.current.get(object.name) || [];
    const hasConnectionOfType = existingConnections.some(c => c.connectionType === connectionType);

    if (hasConnectionOfType) {
        toast({
            variant: 'destructive',
            title: "Connection already exists",
            description: `A ${connectionType} connection for this device already exists.`,
        });
        return;
    }

    if (port.userData.connectedTo) {
      toast({
            variant: 'destructive',
            title: "Port is in use",
            description: `This port is already connected to another device.`,
        });
        return;
    }

    const isCorrect = port.userData.accepts.includes(object.userData.type) && port.userData.connectionType === connectionType;

    const color = isCorrect ? 0x22c55e : 0xef4444;
    
    const startPoint = new THREE.Vector3();
    object.getWorldPosition(startPoint);
    startPoint.y = object.position.y - (new THREE.Box3().setFromObject(object).max.y - new THREE.Box3().setFromObject(object).min.y)/2 + 0.1;

    const endPoint = port.getWorldPosition(new THREE.Vector3());
    
    const material = new THREE.LineBasicMaterial({ color, linewidth: 3 });
    const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
    const line = new THREE.Line(geometry, material);
    line.name = `line_${object.name}_to_${port.name}`;
    sceneRef.current.add(line);
    
    const newConnection = { line, toPortId: port.name, connectionType };
    connectionsRef.current.set(object.name, [...existingConnections, newConnection]);
    port.userData.connectedTo = object.name;
    
    if (isCorrect) {
        toast({ title: "Connection Successful!", description: `${object.userData.info.split(': ')[1] || object.userData.info} connected to ${port.name.replace(/-/g, ' ')}.` });
    } else {
        setWrongConnectionAlert({
            open: true,
            portType: port.userData.type.toUpperCase(),
            deviceType: object.userData.type.toUpperCase(),
        });
        setTimeout(() => {
            sceneRef.current.remove(line);
            const connections = (connectionsRef.current.get(object.name) || []).filter(c => c.line !== line);
            connectionsRef.current.set(object.name, connections);
            port.userData.connectedTo = null;
        }, 500);
    }
    setConnectionDialogOpen(false);
  }, [selectedComponent, toast]);
  
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
          description: `The ${info.split(': ')[1] || info} is already in the scene.`,
          variant: 'destructive'
        });
        return;
      }
      
      if (!mountRef.current || !cameraRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DESK_LEVEL);
      const dropPoint = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(deskPlane, dropPoint);


      let newComponent: DraggableObject | null = null;
      switch(type) {
        case 'monitor': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 2.8, dropPoint.z], createMonitor, {power: true, data: true, dataType: 'hdmi'}); break;
        case 'keyboard': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.08, dropPoint.z], createKeyboard, {data: true, dataType: 'usb'}); break;
        case 'mouse': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.08, dropPoint.z], createMouse, {data: true, dataType: 'usb'}); break;
        case 'printer': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.45, dropPoint.z], createPrinter, {power: true, data: true, dataType: 'usb'}); break;
        case 'power-strip': newComponent = createComponent(name, 'power-strip', info, [dropPoint.x, DESK_LEVEL + 0.16, dropPoint.z], createPowerStrip, {power: true}); break;
        case 'headphones': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.7, dropPoint.z], createHeadphones, {data: true, dataType: 'audio-out'}); break;
        case 'mic': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.6, dropPoint.z], createMicrophone, {data: true, dataType: 'mic-in'}); break;
        case 'speakers': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.6, dropPoint.z], createSpeakers, {data: true, dataType: 'audio-out'}); break;
        case 'webcam': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.2, dropPoint.z], createWebcam, {data: true, dataType: 'usb'}); break;
        case 'scanner': newComponent = createComponent(name, type, info, [dropPoint.x, DESK_LEVEL + 0.175, dropPoint.z], createScanner, {power: true, data: true, dataType: 'usb'}); break;
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
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 8, 10);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mountRef.current?.appendChild(renderer.domElement);

    controlsRef.current = new OrbitControls(camera, renderer.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking below the floor

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(8, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Office Floor
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887 }); // BurlyWood
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMaterial);
    floor.name = 'ground';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Office Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5DC }); // Beige
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 0.5), wallMaterial);
    backWall.position.set(0, 10, -20);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 40), wallMaterial);
    leftWall.position.set(-20, 10, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Wall Outlet as a "port"
    const wallOutletGroup = new THREE.Group();
    wallOutletGroup.userData = { id: 'wall', info: 'Wall' };
    wallOutletGroup.position.set(5, 2, -19.7);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.1), new THREE.MeshStandardMaterial({color: 0xffffff}));
    wallOutletGroup.add(plate);

    const createOutlet = (yPos: number) => {
      const outlet = new THREE.Group();
      outlet.position.y = yPos;
      
      const socket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.05), new THREE.MeshStandardMaterial({color: 0x222222}));
      socket.position.z = 0.05;
      outlet.add(socket);

      const groundGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16);
      const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
      ground.rotation.x = Math.PI / 2;
      ground.position.set(0, -0.05, 0.06);
      outlet.add(ground);

      const slotGeo = new THREE.BoxGeometry(0.03, 0.03, 0.1);
      const slot1 = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
      slot1.position.set(-0.1, 0.05, 0.06);
      outlet.add(slot1);
      const slot2 = slot1.clone();
      slot2.position.x = 0.1;
      outlet.add(slot2);

      return outlet;
    }
    wallOutletGroup.add(createOutlet(0.15));
    wallOutletGroup.add(createOutlet(-0.15));

    scene.add(wallOutletGroup);
    createPort('wall-outlet', 'wall-power', 'power', ['power-strip'], wallOutletGroup, [0, 0, 0.1], 0x111111);


    // Office Desk
    const deskGroup = new THREE.Group();
    const tabletopMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }); // SaddleBrown
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, metalness: 0.8, roughness: 0.4 }); // DimGray
    
    const tabletop = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 6), tabletopMaterial);
    tabletop.position.y = DESK_LEVEL;
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    deskGroup.add(tabletop);

    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, DESK_LEVEL, 0.3), legMaterial);
    leg1.position.set(-5.5, DESK_LEVEL / 2, 2.5);
    deskGroup.add(leg1);
    const leg2 = leg1.clone();
    leg2.position.set(5.5, DESK_LEVEL / 2, 2.5);
    deskGroup.add(leg2);
    const leg3 = leg1.clone();
    leg3.position.set(-5.5, DESK_LEVEL / 2, -2.5);
    deskGroup.add(leg3);
    const leg4 = leg1.clone();
    leg4.position.set(5.5, DESK_LEVEL / 2, -2.5);
    deskGroup.add(leg4);
    
    scene.add(deskGroup);

    const tower = createComponent('cpu-tower', 'central-unit', 'Central Unit', 
      [-3, DESK_LEVEL + 2.0, 0],
      createTower,
      { power: true }
    );
    tower.userData.inScene = true;
    draggableObjectsRef.current.push(tower);
    
    createPort('usb1', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer'], tower, [-0.7, 1.5, -2.3], 0x0077ff);
    createPort('usb2', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer'], tower, [-0.4, 1.5, -2.3], 0x0077ff);
    createPort('usb3', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer'], tower, [-0.7, 1.2, -2.3], 0x0077ff);
    createPort('usb4', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer'], tower, [-0.4, 1.2, -2.3], 0x0077ff);
    createPort('usb5', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer'], tower, [-0.7, 0.9, -2.3], 0x0077ff);
    createPort('usb6', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer'], tower, [-0.4, 0.9, -2.3], 0x0077ff);
    
    createPort('hdmi1', 'hdmi', 'data', ['monitor'], tower, [0.2, 1.5, -2.3], 0xff8c00);
    
    createPort('audio-out', 'audio-out', 'data', ['headphones', 'speakers'], tower, [-0.7, -0.5, -2.3], 0x32CD32);
    createPort('mic-in', 'mic-in', 'data', ['mic'], tower, [-0.1, -0.5, -2.3], 0xff69b4);

    const powerStrip = createComponent('power-strip', 'power-strip', 'Power Strip', 
      [3, 0.2, 0],
      createPowerStrip,
      { power: true }
    );
    powerStrip.userData.inScene = true;
    draggableObjectsRef.current.push(powerStrip);
    const powerStripAccepts = ['central-unit', 'monitor', 'printer', 'scanner'];
    createPort('power-strip-1', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [-0.9, 0.21, 0.05], 0x111111);
    createPort('power-strip-2', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [-0.3, 0.21, 0.05], 0x111111);
    createPort('power-strip-3', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [0.3, 0.21, 0.05], 0x111111);
    createPort('power-strip-4', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [0.9, 0.21, 0.05], 0x111111);

    const animate = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      requestAnimationFrame(animate);

      controlsRef.current?.update();

      connectionsRef.current.forEach((connections, objectId) => {
        connections.forEach(conn => {
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
            isDraggingRef.current = true;

            // Vertical movement
            if (event.shiftKey) {
                const currentY = selectedObjectForDragRef.current.position.y;
                // The sensitivity factor (e.g., 0.05) might need tweaking
                const newY = currentY - event.movementY * 0.05;
                selectedObjectForDragRef.current.position.y = newY;
            } else { // Horizontal movement
                if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
                    selectedObjectForDragRef.current.position.set(
                        intersectionRef.current.x - offsetRef.current.x,
                        selectedObjectForDragRef.current.position.y,
                        intersectionRef.current.z - offsetRef.current.z
                    );
                }
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
                setTooltip({ content: (hoveredObject as DraggableObject).userData.info, x: event.clientX, y: event.clientY });
            } else {
                document.body.style.cursor = 'default';
                setTooltip(null);
            }
        }
    };

    const onPointerDown = (event: PointerEvent) => {
      // Only handle left clicks on the canvas
      if(event.button !== 0 || !cameraRef.current || (event.target as HTMLElement).tagName !== 'CANVAS') return;
      if (selectedObjectForDragRef.current) return; // Prevent new drag if one is in progress
      
      event.preventDefault();
      isDraggingRef.current = false;

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
            
            controlsRef.current.enabled = false;
            selectedObjectForDragRef.current = object;
            document.body.style.cursor = 'grabbing';

            planeRef.current.setFromNormalAndCoplanarPoint(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(0, object.position.y, 0)
            );

            if (raycasterRef.current.ray.intersectPlane(planeRef.current, intersectionRef.current)) {
              offsetRef.current.copy(intersectionRef.current).sub(object.position);
            }
        }
      }
    };
    
    const onPointerUp = (event: PointerEvent) => {
        const wasDragging = isDraggingRef.current;
        
        selectedObjectForDragRef.current = null;
        controlsRef.current.enabled = true;
        document.body.style.cursor = 'default';
        isDraggingRef.current = false;

        // If it was a drag, don't process as a click
        if (wasDragging) {
            return;
        }
        
        // Only handle clicks on the canvas, ignore UI elements
        const target = event.target as HTMLElement;
        if (target !== rendererRef.current?.domElement) {
            return;
        }

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
        const objectsToIntersect = draggableObjectsRef.current.filter(o => o.userData.inScene);
        const intersects = raycasterRef.current.intersectObjects(objectsToIntersect, true);

        let clickedObject: DraggableObject | null = null;
        if (intersects.length > 0) {
            let parentGroup = intersects[0].object.parent;
            while (parentGroup && !(parentGroup instanceof THREE.Group && parentGroup.userData.id)) {
                parentGroup = parentGroup.parent;
            }
            if (parentGroup && draggableObjectsRef.current.includes(parentGroup as DraggableObject)) {
                clickedObject = parentGroup as DraggableObject;
            }
        }

        setSelectedComponent(prevSelected => {
            if (prevSelected) {
                prevSelected.traverse(child => removeOutline(child));
            }
            // If we clicked a new object, select it.
            if (clickedObject && clickedObject !== prevSelected) {
                clickedObject.traverse(child => applyOutline(child));
                return clickedObject;
            }
            // If we clicked the same object or empty space, deselect.
            setConnectionDialogOpen(false);
            return null;
        });
    };

    const currentMount = mountRef.current;
    handleResize();
    currentMount?.addEventListener('pointermove', onPointerMove);
    currentMount?.addEventListener('pointerdown', onPointerDown);
    currentMount?.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', handleResize);

    return () => {
      currentMount?.removeEventListener('pointermove', onPointerMove);
      currentMount?.removeEventListener('pointerdown', onPointerDown);
      currentMount?.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      controlsRef.current?.dispose();
      if (rendererRef.current && mountRef.current) {
        rendererRef.current.dispose();
        if(rendererRef.current.domElement.parentElement === mountRef.current) {
           mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [createComponent, createPort, handleConnection, toast]);

  const onConnectClick = () => {
    if (selectedComponent) {
      setConnectionDialogOpen(true);
    }
  }

  const handleDeleteComponent = () => {
    if (!selectedComponent) return;

    // Prevent deleting core components
    if (selectedComponent.name === 'cpu-tower' || selectedComponent.name === 'power-strip') {
      toast({
        variant: 'destructive',
        title: 'Cannot delete core component',
        description: 'The PC Tower and initial Power Strip cannot be deleted.',
      });
      return;
    }

    const objectId = selectedComponent.name;

    // Remove connection lines
    const objectConnections = connectionsRef.current.get(objectId);
    if (objectConnections) {
      objectConnections.forEach(conn => {
        sceneRef.current.remove(conn.line);
        const port = portsRef.current.find(p => p.name === conn.toPortId);
        if (port) {
          port.userData.connectedTo = null;
        }
      });
      connectionsRef.current.delete(objectId);
    }
    
    // Also remove lines connected TO this object
    connectionsRef.current.forEach((connections, otherObjectId) => {
        const remainingConnections = connections.filter(conn => {
            const port = portsRef.current.find(p => p.name === conn.toPortId);
            if (port && port.parent?.name === objectId) {
                sceneRef.current.remove(conn.line);
                return false;
            }
            return true;
        });
        if(remainingConnections.length !== connections.length) {
            connectionsRef.current.set(otherObjectId, remainingConnections);
        }
    });

    // Remove ports belonging to the object
    portsRef.current = portsRef.current.filter(p => p.parent?.name !== objectId);

    // Remove the object from the scene
    sceneRef.current.remove(selectedComponent);

    // Remove the object from the draggable objects array
    draggableObjectsRef.current = draggableObjectsRef.current.filter(obj => obj.name !== objectId);

    // Deselect the component
    setSelectedComponent(null);
    setConnectionDialogOpen(false);
    toast({
      title: 'Component Deleted',
      description: `${selectedComponent.userData.info.split(': ')[1] || selectedComponent.userData.info} has been removed.`,
    });
  };

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
          <div className='absolute bottom-5 left-1/2 -translate-x-1/2 bg-card p-4 rounded-lg shadow-2xl border flex flex-col items-center gap-2'>
              <div className='flex items-center gap-4'>
                <p className='font-semibold text-card-foreground'>Selected: {selectedComponent.userData.info.split(': ')[1] || selectedComponent.userData.info}</p>
                <Button onClick={onConnectClick}>Connect</Button>
                <Button variant="destructive" size="icon" onClick={handleDeleteComponent}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Hold <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border rounded-md">Shift</kbd> to move vertically.</p>
          </div>
      )}
      <ConnectionDialog 
        isOpen={isConnectionDialogOpen}
        onOpenChange={(isOpen) => {
            setConnectionDialogOpen(isOpen);
            if (!isOpen && selectedComponent) {
                // If closing dialog, deselect component
                selectedComponent.traverse(child => removeOutline(child));
                setSelectedComponent(null);
            }
        }}
        device={selectedComponent}
        ports={portsRef.current}
        onConnect={handleConnection}
        connections={connectionsRef.current}
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

    