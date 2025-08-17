
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from '../ui/button';
import { ConnectionDialog } from './connection-dialog';
import { useToast } from '@/hooks/use-toast';
import { useScene } from './scene-context';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Trash2 } from 'lucide-react';

export type DraggableObject = THREE.Group;
export type PortObject = THREE.Mesh;

const DESK_LEVEL = 3.5;

export function PCBuilder3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { setSceneComponents, setConnections } = useScene();
  
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<DraggableObject | null>(null);
  const selectedComponentRef = useRef<DraggableObject | null>(null);

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

  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Sync scene data with context
  const syncSceneData = useCallback(() => {
    // Update scene components
    const sceneComponentsData = draggableObjectsRef.current.map(obj => ({
      name: obj.name,
      userData: {
        id: obj.userData.id || obj.name,
        type: obj.userData.type || 'unknown',
        info: obj.userData.info || obj.name,
        inScene: obj.userData.inScene || true,
        needs: obj.userData.needs || {}
      }
    }));
    setSceneComponents(sceneComponentsData);
    
    // Update connections
    setConnections(new Map(connectionsRef.current));
  }, [setSceneComponents, setConnections]);

  const applyOutline = (object: THREE.Object3D) => {
    object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === 'body') {
            if (child.getObjectByName('outline')) return;

            const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.BackSide, transparent: true, opacity: 0.5 });
            const outlineMesh = new THREE.Mesh(child.geometry, outlineMaterial);
            outlineMesh.scale.multiplyScalar(1.05);
            outlineMesh.name = 'outline';
            child.add(outlineMesh);
        }
    });
  };

  const removeOutline = (object: THREE.Object3D) => {
    object.traverse((child) => {
        const outline = child.getObjectByName('outline');
        if (outline) {
            child.remove(outline);
        }
    });
  };

  const createTower = () => {
    const group = new THREE.Group();
    const caseMaterial = new THREE.MeshStandardMaterial({ color: 0x333842, metalness: 0.5, roughness: 0.6 });
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 4.5), caseMaterial);
    caseMesh.userData.isSelectable = true;
    caseMesh.name = "body";
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
    frame.name = "body";
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
    body.name = "body";
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
      body.name = "body";
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
      mainBody.name = "body";
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
    strip.name = "body";
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
    headband.name = "body";
    group.add(headband);

    const headbandMirror = headband.clone();
    headbandMirror.userData.isSelectable = false;
    headbandMirror.scale.x = -1;
    group.add(headbandMirror);
  
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
    standBase.name = "body";
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
        body.name = "body";
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
    body.name = "body";
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
    body.name = "body";
    group.add(body);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), glassMaterial);
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = 0.26;
    group.add(glass);
    
    group.scale.set(0.7, 0.7, 0.7);
    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    return group;
  }

  const createUsbAdapter = () => {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
    const portMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const bluePortInsertMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF }); // USB 3.0 blue

    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.8), bodyMaterial);
    mainBody.userData.isSelectable = true;
    mainBody.name = "body";
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    group.add(mainBody);

    const portSpacing = 0.25;
    const startX = -0.55;
    const portY = 0.26;
    const portZ = 0.4;

    for (let i = 0; i < 3; i++) {
      const portBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), portMaterial);
      portBase.position.set(startX + i * portSpacing, portY, portZ);
      group.add(portBase);

      const portInsert = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.05), bluePortInsertMaterial);
      portInsert.position.set(startX + i * portSpacing, portY, portZ + 0.025);
      group.add(portInsert);
    }

    for (let i = 0; i < 3; i++) {
      const portBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), portMaterial);
      portBase.position.set(startX + i * portSpacing, portY - 0.25, portZ);
      group.add(portBase);

      const portInsert = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.05), bluePortInsertMaterial);
      portInsert.position.set(startX + i * portSpacing, portY - 0.25, portZ + 0.025);
      group.add(portInsert);
    }

    group.traverse(child => { child.castShadow = true; child.receiveShadow = true; });
    group.scale.set(0.8, 0.8, 0.8);
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

  const createComponent = useCallback((
    name: string,
    type: string,
    info: string,
    position: [number, number, number],
    createGeometry: () => THREE.Group,
    needs: { power?: boolean; data?: boolean, dataType?: string | string[] }
  ): DraggableObject => {
    const group = createGeometry();
    group.name = name;
    group.userData = { id: name, type, info, inScene: true, needs };
    group.position.set(...position);
    sceneRef.current.add(group);
    
    return group;
  }, []);
  
  const handleConnection = useCallback((portId: string, connectionType: 'power' | 'data' | string) => {
    const object = selectedComponentRef.current;
    if (!object) return;

    const port = portsRef.current.find(p => p.name === portId);

    if (!object || !port) return;

    const existingConnections = connectionsRef.current.get(object.name) || [];
    
    const hasConnectionOfType = existingConnections.some(c => c.connectionType === connectionType);

    if (hasConnectionOfType && port.userData.connectionType === 'power') {
        toast({
            variant: 'destructive',
            title: "Connexion déjà existante",
            description: `Une connexion de type ${connectionType} existe déjà pour cet appareil.`,
        });
        return;
    }

    if (port.userData.connectedTo) {
      toast({
            variant: 'destructive',
            title: "Port utilisé",
            description: `Ce port est déjà connecté à un autre appareil.`,
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
    
    // Resolve the component that owns this port (for graph reasoning)
    let owner: THREE.Object3D | null = port.parent;
    while (owner && !(owner instanceof THREE.Group && (owner as any).userData?.id)) {
      owner = owner.parent;
    }
    const ownerGroup = owner as DraggableObject | null;
    const newConnection = { 
      line, 
      toPortId: port.name, 
      connectionType, 
      toComponentName: ownerGroup?.name, 
      toComponentType: ownerGroup?.userData?.type 
    };
    connectionsRef.current.set(object.name, [...existingConnections, newConnection]);
    port.userData.connectedTo = object.name;
    
    if (isCorrect) {
        toast({ title: "Connexion réussie !", description: `${object.userData.info.split(': ')[1] || object.userData.info} connecté à ${port.name.replace(/-/g, ' ')}.` });
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
            syncSceneData();
        }, 500);
    }
    setConnectionDialogOpen(false);
    syncSceneData();
  }, [toast, setWrongConnectionAlert, syncSceneData]);
  
  // Drag and drop from sidebar
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const componentData = e.dataTransfer?.getData('application/json');
    if (!componentData) return;
    
    const {type, name, info} = JSON.parse(componentData);

    if (draggableObjectsRef.current.find(obj => obj.name === name)) {
      toast({
        title: 'Composant déjà sur la scène',
        description: `Le composant ${info.split(': ')[1] || info} est déjà présent.`,
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
      case 'central-unit':
        const tower = createComponent(name, type, 'Unité centrale', [dropPoint.x, DESK_LEVEL + 2.0, dropPoint.z], createTower, {power: true});
        createPort('usb1', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer', 'mic', 'adapter'], tower, [-0.7, 1.5, -2.3], 0x0077ff);
        createPort('usb2', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer', 'mic', 'adapter'], tower, [-0.4, 1.5, -2.3], 0x0077ff);
        createPort('usb3', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer', 'mic', 'adapter'], tower, [-0.7, 1.2, -2.3], 0x0077ff);
        createPort('usb4', 'usb', 'data', ['keyboard', 'mouse', 'webcam', 'scanner', 'printer', 'mic', 'adapter'], tower, [-0.4, 1.2, -2.3], 0x0077ff);
        createPort('hdmi1', 'hdmi', 'data', ['monitor'], tower, [0.2, 1.5, -2.3], 0xff8c00);
        createPort('audio-out', 'audio-out', 'data', ['headphones', 'speakers'], tower, [-0.7, -0.5, -2.3], 0x32CD32);
        createPort('mic-in', 'mic-in', 'data', ['mic'], tower, [-0.1, -0.5, -2.3], 0xff69b4);
        newComponent = tower;
        break;
      case 'monitor': newComponent = createComponent(name, type, 'Périphérique de sortie : Moniteur', [dropPoint.x, DESK_LEVEL + 2.8, dropPoint.z], createMonitor, {power: true, data: true, dataType: 'hdmi'}); break;
      case 'keyboard': newComponent = createComponent(name, type, 'Périphérique d\'entrée : Clavier', [dropPoint.x, DESK_LEVEL + 0.08, dropPoint.z], createKeyboard, {data: true, dataType: 'usb'}); break;
      case 'mouse': newComponent = createComponent(name, type, 'Périphérique d\'entrée : Souris', [dropPoint.x, DESK_LEVEL + 0.08, dropPoint.z], createMouse, {data: true, dataType: 'usb'}); break;
      case 'printer': newComponent = createComponent(name, type, 'Périphérique de sortie : Imprimante', [dropPoint.x, DESK_LEVEL + 0.45, dropPoint.z], createPrinter, {power: true, data: true, dataType: 'usb'}); break;
      case 'power-strip':
        const powerStrip = createComponent(name, type, 'Multiprise', [dropPoint.x, 0.2, dropPoint.z], createPowerStrip, {power: true});
        const powerStripAccepts = ['central-unit', 'monitor', 'printer', 'scanner'];
        createPort('power-strip-1', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [-0.9, 0.21, 0.05], 0x111111);
        createPort('power-strip-2', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [-0.3, 0.21, 0.05], 0x111111);
        createPort('power-strip-3', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [0.3, 0.21, 0.05], 0x111111);
        createPort('power-strip-4', 'power-strip-outlet', 'power', powerStripAccepts, powerStrip, [0.9, 0.21, 0.05], 0x111111);
        newComponent = powerStrip;
        break;
      case 'headphones': newComponent = createComponent(name, type, 'Périphérique de sortie : Casque', [dropPoint.x, DESK_LEVEL + 0.7, dropPoint.z], createHeadphones, {data: true, dataType: 'audio-out'}); break;
      case 'mic': newComponent = createComponent(name, type, 'Périphérique d\'entrée : Microphone', [dropPoint.x, DESK_LEVEL + 0.6, dropPoint.z], createMicrophone, {data: true, dataType: ['mic-in', 'usb']}); break;
      case 'speakers': newComponent = createComponent(name, type, 'Périphérique de sortie : Haut-parleurs', [dropPoint.x, DESK_LEVEL + 0.6, dropPoint.z], createSpeakers, {data: true, dataType: 'audio-out'}); break;
      case 'webcam': newComponent = createComponent(name, type, 'Périphérique d\'entrée : Webcam', [dropPoint.x, DESK_LEVEL + 0.2, dropPoint.z], createWebcam, {data: true, dataType: 'usb'}); break;
      case 'scanner': newComponent = createComponent(name, type, 'Périphérique d\'entrée : Scanner', [dropPoint.x, DESK_LEVEL + 0.175, dropPoint.z], createScanner, {power: true, data: true, dataType: 'usb'}); break;
      case 'adapter':
        const adapter = createComponent(name, type, 'Adaptateur (USB x6, HDMI x3)', [dropPoint.x, DESK_LEVEL + 0.25, dropPoint.z], createUsbAdapter, {data: true, dataType: 'usb'});
        // USB ports (6)
        const adapterUsbAccepts = ['keyboard', 'mouse', 'webcam', 'scanner', 'printer', 'mic'];
        createPort('adapter-port1', 'usb', 'data', adapterUsbAccepts, adapter, [-0.55, 0.26, 0.45], 0x0077ff);
        createPort('adapter-port2', 'usb', 'data', adapterUsbAccepts, adapter, [-0.3, 0.26, 0.45], 0x0077ff);
        createPort('adapter-port3', 'usb', 'data', adapterUsbAccepts, adapter, [-0.05, 0.26, 0.45], 0x0077ff);
        createPort('adapter-port4', 'usb', 'data', adapterUsbAccepts, adapter, [-0.55, 0.01, 0.45], 0x0077ff);
        createPort('adapter-port5', 'usb', 'data', adapterUsbAccepts, adapter, [-0.3, 0.01, 0.45], 0x0077ff);
        createPort('adapter-port6', 'usb', 'data', adapterUsbAccepts, adapter, [-0.05, 0.01, 0.45], 0x0077ff);
        // HDMI ports (3)
        const adapterHdmiAccepts = ['monitor', 'scanner', 'printer'];
        createPort('adapter-hdmi1', 'hdmi', 'data', adapterHdmiAccepts, adapter, [0.25, 0.26, 0.45], 0xff8c00);
        createPort('adapter-hdmi2', 'hdmi', 'data', adapterHdmiAccepts, adapter, [0.5, 0.26, 0.45], 0xff8c00);
        createPort('adapter-hdmi3', 'hdmi', 'data', adapterHdmiAccepts, adapter, [0.75, 0.26, 0.45], 0xff8c00);
        newComponent = adapter;
        break;
    }

    if(newComponent) {
      draggableObjectsRef.current.push(newComponent);
      syncSceneData();
    }
  }, [createComponent, createPort, toast, handleConnection, syncSceneData]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const mountEl = mountRef.current;
    mountEl?.addEventListener('dragover', handleDragOver);
    mountEl?.addEventListener('drop', handleDrop);

    return () => {
      mountEl?.removeEventListener('dragover', handleDragOver);
      mountEl?.removeEventListener('drop', handleDrop);
    }

  }, [handleDrop]);

  useEffect(() => {
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x87CEEB); 

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
    controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(8, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xDEB887 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMaterial);
    floor.name = 'ground';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xF5F5DC });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 0.5), wallMaterial);
    backWall.position.set(0, 10, -20);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 40), wallMaterial);
    leftWall.position.set(-20, 10, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const wallOutletGroup = new THREE.Group();
    wallOutletGroup.userData = { id: 'wall', info: 'Mur' };
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

    const deskGroup = new THREE.Group();
    const tabletopMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, metalness: 0.8, roughness: 0.4 });
    
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

            if (event.shiftKey) {
                const currentY = selectedObjectForDragRef.current.position.y;
                const newY = currentY - event.movementY * 0.05;
                selectedObjectForDragRef.current.position.y = newY;
            } else { 
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
      if(event.button !== 0 || !cameraRef.current || (event.target as HTMLElement).tagName !== 'CANVAS') return;
      if (selectedObjectForDragRef.current) return; 
      
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
        
        if (selectedObjectForDragRef.current) {
            controlsRef.current.enabled = true;
            selectedObjectForDragRef.current = null;
        }

        document.body.style.cursor = 'default';
        isDraggingRef.current = false;

        if (wasDragging) {
            return;
        }
        
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
                removeOutline(prevSelected);
            }
            if (clickedObject && clickedObject !== prevSelected) {
                applyOutline(clickedObject);
                return clickedObject;
            }
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
  }, [createComponent, createPort, handleConnection, handleDrop]);

  const onConnectClick = () => {
    if (selectedComponent) {
      setConnectionDialogOpen(true);
    }
  }

  const handleDeleteComponent = () => {
    if (!selectedComponent) return;

    const objectId = selectedComponent.name;

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
    
    connectionsRef.current.forEach((connections, otherObjectId) => {
        const remainingConnections = connections.filter(conn => {
            const port = portsRef.current.find(p => p.name === conn.toPortId);
            let portParent = port?.parent;
            let found = false;
            while(portParent) {
              if (portParent.name === objectId) {
                found = true;
                break;
              }
              portParent = portParent.parent;
            }

            if (found) {
              sceneRef.current.remove(conn.line);
              return false;
            }

            return true;
        });
        if(remainingConnections.length !== connections.length) {
            connectionsRef.current.set(otherObjectId, remainingConnections);
        }
    });

    portsRef.current = portsRef.current.filter(p => {
      let parent = p.parent;
      while(parent) {
        if (parent.name === objectId) {
          return false;
        }
        parent = parent.parent;
      }
      return true;
    });

    sceneRef.current.remove(selectedComponent);

    draggableObjectsRef.current = draggableObjectsRef.current.filter(obj => obj.name !== objectId);

    setSelectedComponent(null);
    setConnectionDialogOpen(false);
    syncSceneData();
    toast({
      title: 'Composant supprimé',
      description: `Le composant ${selectedComponent.userData.info.split(': ')[1] || selectedComponent.userData.info} a été retiré.`,
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
                <p className='font-semibold text-card-foreground'>Sélectionné : {selectedComponent.userData.info.split(': ')[1] || selectedComponent.userData.info}</p>
                <Button onClick={onConnectClick}>Connecter</Button>
                <Button variant="destructive" size="icon" onClick={handleDeleteComponent}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Supprimer</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Maintenez <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-muted border rounded-md">Maj</kbd> pour déplacer verticalement.</p>
          </div>
      )}
      <ConnectionDialog 
        isOpen={isConnectionDialogOpen}
        onOpenChange={(isOpen) => {
            setConnectionDialogOpen(isOpen);
            if (!isOpen && selectedComponent) {
                removeOutline(selectedComponent);
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
            <AlertDialogTitle>Connexion incorrecte</AlertDialogTitle>
            <AlertDialogDescription>
              Vous ne pouvez pas connecter un {wrongConnectionAlert.deviceType} à un port {wrongConnectionAlert.portType}. Veuillez choisir un port compatible.
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
