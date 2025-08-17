import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const USE_SERVER_PROXY = true;
const ANALYSIS_MODE = (process.env.NEXT_PUBLIC_ANALYSIS_MODE || 'hybrid').toLowerCase(); // 'ai' | 'hybrid'

export interface ComponentConnection {
  componentName: string;
  componentType: string;
  connectedTo: Array<{
    portName: string;
    targetComponent: string;
    connectionType: 'power' | 'data';
    portType: string;
  }>;
}

export interface ConnectivityAnalysis {
  isValid: boolean;
  score: number;
  feedback: string;
  issues: string[];
  suggestions: string[];
}

export class ConnectivityAnalyzer {
  // Direct provider (used only from server, not browser)
  private ollama = createOpenAI({
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.OLLAMA_API_KEY || 'ollama',
  });
  private model = this.ollama(process.env.OLLAMA_MODEL || 'deepseek-r1:8b');

  /**
   * Formats connection data for AI analysis
   */
  formatConnectionsForAI(connections: Map<string, any[]>, components: any[]): string {
    let connectionsText = "=== COMPUTER SETUP ANALYSIS ===\n\n";
    
    connectionsText += "COMPONENTS PLACED:\n";
    components.forEach(comp => {
      connectionsText += `- ${comp.userData.info}\n`;
    });
    
    connectionsText += "\nCONNECTIONS MADE:\n";
    connections.forEach((connList, componentName) => {
      const component = components.find(c => c.name === componentName);
      if (component && connList.length > 0) {
        connectionsText += `\n${component.userData.info}:\n`;
        connList.forEach(conn => {
          const portName = conn.toPortId.replace(/-/g, ' ').toUpperCase();
          const ownerType = conn.toComponentType || 'unknown';
          const ownerName = conn.toComponentName || 'unknown';
          connectionsText += `  → Connected to ${portName} on ${ownerType} [${ownerName}] (${conn.connectionType})\n`;
        });
      }
    });

    // Add components without connections
    const unconnectedComponents = components.filter(comp => 
      !connections.has(comp.name) || connections.get(comp.name)?.length === 0
    );
    
    if (unconnectedComponents.length > 0) {
      connectionsText += "\nUNCONNECTED COMPONENTS:\n";
      unconnectedComponents.forEach(comp => {
        connectionsText += `- ${comp.userData.info}\n`;
      });
    }

    return connectionsText;
  }

  /**
   * Analyzes connectivity using AI (Llama 3 via Ollama)
   */
  async analyzeConnectivity(
    connections: Map<string, any[]>, 
    components: any[]
  ): Promise<ConnectivityAnalysis> {
    try {
      if (USE_SERVER_PROXY && typeof window !== 'undefined') {
        // Call server API to avoid CORS from browser
        // Sanitize connections: remove non-serializable Three.js 'line'
        const plainConnections: Record<string, { toPortId: string; connectionType: string }[]> = {};
        connections.forEach((connList, key) => {
          plainConnections[key] = (connList || []).map((c: any) => ({
            toPortId: c.toPortId,
            connectionType: c.connectionType,
          }));
        });

        const body = {
          components,
          connections: plainConnections,
        };
        const res = await fetch('/api/connectivity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Server analysis failed');
        const aiAnalysis = (await res.json()) as ConnectivityAnalysis;
        return ANALYSIS_MODE === 'hybrid'
          ? this.postProcessWithDeterministicChecks(aiAnalysis, connections, components)
          : aiAnalysis;
      }

      // Direct call (SSR/server-only)
      const connectionsText = this.formatConnectionsForAI(connections, components);
      // Structured scene for model reasoning
      const scene = {
        components: components.map((c: any) => ({ id: c.userData.id, type: c.userData.type, info: c.userData.info, needs: c.userData.needs || {} })),
        connections: Array.from(connections.entries()).reduce((acc: any, [key, list]) => {
          acc[key] = (list || []).map((c: any) => ({ toPortId: c.toPortId, connectionType: c.connectionType, toComponentName: c.toComponentName, toComponentType: c.toComponentType }));
          return acc;
        }, {} as Record<string, any[]>)
      };
            const prompt = `You are an expert computer technician evaluating a student's computer setup for educational purposes.

${connectionsText}

SCENE_JSON=${'`'}${JSON.stringify(scene)}${'`'}

Requirements for a functional setup:
1. ESSENTIAL COMPONENTS: central-unit, monitor, keyboard, mouse, power-strip
2. POWER: central unit and monitor must be powered (ideally via power strip connected to wall)
3. DATA: monitor via HDMI to central unit, keyboard/mouse via USB to central unit (direct or via adapter)
4. ADAPTERS: if used, must be connected to central unit for devices behind them to work

Important modeling notes:
- Check for missing essential components FIRST before connection issues
- Treat the installation as a connection graph. A device may connect indirectly via an adapter
- Power must be provided separately. Power chains: device → power-strip-X and power-strip → wall-outlet
- If a device is connected to an adapter but the adapter is NOT connected to the central unit, data does not flow
- When an adapter is not linked to the central unit, explicitly list which devices are impacted
- Be precise about what's missing vs what's incorrectly connected

Please analyze this computer setup and provide feedback on:
1. Essential Components: Are all required components present?
2. Power Connections: Are power needs met?
3. Data Connections: Are data paths functional?

Respond in this EXACT JSON format:
{
  "isValid": boolean,
  "score": number (0-100),
  "feedback": "Bref résumé en français (1-2 phrases)",
  "issues": ["Puce courte en français (un point par problème)", "..."] ,
  "suggestions": ["Puce courte en français (amélioration concrète)", "..."]
}

Return ONLY a JSON object.`;

      const result = await generateText({ model: this.model, prompt, temperature: 0 });
      try {
        // Strip DeepSeek <think> tags if present
        const clean = String(result.text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const analysis = JSON.parse(clean);
        const aiAnalysis: ConnectivityAnalysis = {
          isValid: analysis.isValid || false,
          score: Math.min(100, Math.max(0, analysis.score || 0)),
          feedback: analysis.feedback || 'Analyse non disponible',
          issues: Array.isArray(analysis.issues) ? analysis.issues : [],
          suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
        };
        return ANALYSIS_MODE === 'hybrid'
          ? this.postProcessWithDeterministicChecks(aiAnalysis, connections, components)
          : aiAnalysis;
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return this.fallbackAnalysis(connections, components, 'Erreur lors du parsing de la réponse IA');
      }

    } catch (error) {
      console.error('Error in AI connectivity analysis:', error);
      // Fallback to rule-based analysis if AI is unavailable
      return this.fallbackAnalysis(connections, components, 'Service IA non disponible - analyse basique utilisée');
    }
  }

  /**
   * Deterministic, rule-based checks that must always be enforced.
   * Merged with either AI or fallback results to improve accuracy.
   */
  private postProcessWithDeterministicChecks(
    analysis: ConnectivityAnalysis,
    connections: Map<string, any[]>,
    components: any[],
  ): ConnectivityAnalysis {
    const details = this.getDetailedConnectivity(connections, components);
    const basic = this.validateBasicConnectivity(connections, components);

    // Start from AI issues/suggestions, then prune contradictions
    let issues: string[] = [...(analysis.issues || [])];
    const suggestions: string[] = [...(analysis.suggestions || [])];
    let scoreAdjustment = 0;

    const add = (arr: string[], value: string) => {
      if (!arr.includes(value)) arr.push(value);
    };

    const monitorHasValidDataPath = details.monitorConnectedToHdmi || (
      details.usbAdapterPresent && details.usbAdapterConnectedToCentral && details.inputDevicesConnectedViaAdapter.includes('monitor')
    );

    // Prune AI mistakes that contradict ground truth
    issues = issues.filter((msg) => {
      const m = msg.toLowerCase();
      if (!details.powerStripPresent && m.includes('multiprise')) return false;
      if (!basic.hasMonitor && (m.includes('moniteur') || m.includes('monitor'))) return false;
      if (!basic.hasCentralUnit && (m.includes('unité centrale') || m.includes('central'))) return false;
      if (details.powerStripConnectedToWall && m.includes('multiprise') && (m.includes('mur') || m.includes('wall') || m.includes('prise'))) return false;
      if (monitorHasValidDataPath && (m.includes('moniteur') || m.includes('monitor')) && (m.includes('pas') || m.includes("n'est pas") || m.includes('non')) && (m.includes('connect') || m.includes('reli'))) return false;
      if (details.usbAdapterPresent && details.usbAdapterConnectedToCentral && (m.includes('adaptateur') || m.includes('adapter')) && (m.includes('central') || m.includes('unité'))) return false;
      if (details.centralUnitPowered && (m.includes('unité centrale') || m.includes('central')) && (m.includes('alimentation') || m.includes('power')) && (m.includes('pas') || m.includes('non'))) return false;
      return true;
    });

    // Check for minimal functional setup requirements FIRST
    const requiredTypes = ['central-unit', 'monitor', 'keyboard', 'mouse', 'power-strip'];
    const missingRequired: string[] = [];
    const requiredLabels: Record<string, string> = {
      'central-unit': 'unité centrale',
      'monitor': 'moniteur',
      'keyboard': 'clavier',
      'mouse': 'souris',
      'power-strip': 'multiprise',
    };
    
    requiredTypes.forEach(type => {
      if (!components.find(c => c.userData.type === type)) {
        missingRequired.push(requiredLabels[type]);
      }
    });

    if (missingRequired.length > 0) {
      // Priority message for incomplete base setup
      const missingList = missingRequired.join(', ');
      add(issues, `Configuration de base incomplète. Composants manquants: ${missingList}.`);
      add(suggestions, `Pour une installation fonctionnelle, ajoutez d'abord: ${missingList}.`);
      scoreAdjustment -= missingRequired.length * 15; // severe penalty for missing essentials
    }

    // Missing essential components (legacy checks)
    if (!basic.hasCentralUnit) {
      add(issues, "Aucune unité centrale n'a été placée sur la scène.");
      add(suggestions, "Ajoutez une unité centrale pour pouvoir faire fonctionner les périphériques.");
      scoreAdjustment -= 40;
    }
    if (!basic.hasMonitor) {
      add(issues, "Aucun moniteur n'a été placé.");
      add(suggestions, "Ajoutez un moniteur et reliez-le en HDMI (directement ou via l'adaptateur).");
      scoreAdjustment -= 25;
    }

    // Power strip to wall
    if (details.powerStripPresent && !details.powerStripConnectedToWall) {
      add(issues, "La multiprise n'est pas branchée à la prise murale.");
      add(suggestions, "Branchez la multiprise à la prise murale pour alimenter les équipements.");
      scoreAdjustment -= 10;
    }

    // Central unit power via power strip
    if (details.hasCentralUnit) {
      if (!details.centralUnitPowered) {
        add(issues, "L'unité centrale n'est pas connectée à l'alimentation.");
        add(suggestions, "Branchez l'unité centrale sur une prise de la multiprise.");
        scoreAdjustment -= 30; // essential power
      } else if (!details.centralUnitPoweredViaPowerStrip) {
        add(issues, "L'unité centrale n'est pas branchée sur la multiprise.");
        add(suggestions, "Connectez l'unité centrale à une prise de la multiprise plutôt que directement ailleurs.");
        scoreAdjustment -= 10;
      }
    }

    // Monitor power + HDMI
    if (details.hasMonitor) {
      if (!details.monitorPowered) {
        add(issues, "Le moniteur n'est pas alimenté.");
        add(suggestions, "Branchez le moniteur à la multiprise.");
        scoreAdjustment -= 20;
      } else if (!details.monitorPoweredViaPowerStrip) {
        add(issues, "Le moniteur n'est pas branché sur la multiprise.");
        add(suggestions, "Connectez le moniteur à une prise de la multiprise.");
        scoreAdjustment -= 10;
      }
      if (!monitorHasValidDataPath) {
        add(issues, "Le moniteur n'est pas connecté au port HDMI de l'unité centrale.");
        add(suggestions, "Reliez le moniteur au port HDMI de l'unité centrale avec un câble HDMI.");
        scoreAdjustment -= 30; // no display path is critical
      }
    }

    // USB/HDMI adapter chain integrity
    if (details.usbAdapterPresent) {
      if (details.inputDevicesConnectedViaAdapter.length > 0 && !details.usbAdapterConnectedToCentral) {
        add(issues, "L'adaptateur USB est utilisé mais n'est pas connecté à l'unité centrale.");
        // Human-friendly names for affected devices
        const labels: Record<string, string> = {
          keyboard: 'clavier',
          mouse: 'souris',
          webcam: 'webcam',
          scanner: 'scanner',
          printer: 'imprimante',
          mic: 'microphone',
          monitor: 'moniteur',
        };
        const impacted = details.inputDevicesConnectedViaAdapter
          .map((t) => labels[t] || t)
          .sort();
        if (impacted.length > 0) {
          add(
            suggestions,
            `Ces périphériques ne fonctionneront pas tant que l'adaptateur n'est pas relié à l'unité centrale: ${impacted.join(", ")}.`
          );
        }
        add(suggestions, "Branchez l'adaptateur USB sur un port USB de l'unité centrale.");
        scoreAdjustment -= 25;
      }
    }

    // Report present peripherals and their connection status (brief)
    const human: Record<string, string> = {
      keyboard: 'clavier',
      mouse: 'souris',
      webcam: 'webcam',
      scanner: 'scanner',
      printer: 'imprimante',
      mic: 'microphone',
      monitor: 'moniteur',
    };
    if (details.presentDeviceTypes.length > 0) {
      const connected = details.deviceDataConnectedTypes.filter(t => t !== 'monitor').map(t => human[t] || t);
      const missing = details.presentDeviceTypes.filter(t => !details.deviceDataConnectedTypes.includes(t) && t !== 'monitor').map(t => human[t] || t);
      if (connected.length > 0) {
        add(suggestions, `Périphériques de données connectés: ${connected.sort().join(', ')}.`);
      }
      if (missing.length > 0) {
        add(issues, `Périphériques non reliés pour les données: ${missing.sort().join(', ')}.`);
        add(suggestions, `Reliez ces périphériques à l'unité centrale (directement USB/HDMI ou via l'adaptateur): ${missing.sort().join(', ')}.`);
        // apply a modest penalty proportional to missing devices (max -30)
        scoreAdjustment -= Math.min(30, missing.length * 8);
      }
    }

    // Strongly penalize when nothing is connected
    const nothingConnected = !details.centralUnitPowered && !details.monitorPowered && details.deviceDataConnectedTypes.length === 0;
    const base = (analysis.score || 0) + scoreAdjustment + (nothingConnected ? -30 : 0);
    const finalScore = Math.max(0, Math.min(100, base));
    const isValid = finalScore >= 80 && issues.length === 0
      ? true
      : analysis.isValid && scoreAdjustment >= 0;

    // Make feedback consistent with final score and issues
    const topIssues = issues.slice(0, 3).join('; ');
    let feedbackMsg = '';
    if (finalScore >= 80) {
      feedbackMsg = "Excellent travail ! Votre installation est globalement correcte.";
    } else if (finalScore >= 60) {
      feedbackMsg = "Bonne installation, quelques améliorations restent nécessaires.";
    } else if (finalScore >= 40) {
      feedbackMsg = "Installation partiellement correcte. Certaines connexions manquent.";
    } else {
      feedbackMsg = "Installation à améliorer. Plusieurs connexions essentielles sont absentes." + (topIssues ? ` (${topIssues})` : '');
    }

    return {
      isValid,
      score: finalScore,
      feedback: feedbackMsg,
      issues,
      suggestions,
    };
  }

  /**
   * Extracts detailed connectivity facts from the scene graph mapping.
   */
  private getDetailedConnectivity(
    connections: Map<string, any[]>,
    components: any[],
  ): {
    hasCentralUnit: boolean;
    centralUnitPowered: boolean;
    centralUnitPoweredViaPowerStrip: boolean;
    hasMonitor: boolean;
    monitorPowered: boolean;
    monitorPoweredViaPowerStrip: boolean;
    monitorConnectedToHdmi: boolean;
    hasPrinter: boolean;
    printerPowered: boolean;
    printerPoweredViaPowerStrip: boolean;
    hasScanner: boolean;
    scannerPowered: boolean;
    scannerPoweredViaPowerStrip: boolean;
    usbAdapterPresent: boolean;
    usbAdapterConnectedToCentral: boolean;
    inputDevicesConnectedViaAdapter: string[];
    presentDeviceTypes: string[];
    deviceDataConnectedTypes: string[];
    powerStripPresent: boolean;
    powerStripConnectedToWall: boolean;
  } {
    const getByType = (t: string) => components.find(c => c.userData.type === t);

    const centralUnit = getByType('central-unit');
    const monitor = getByType('monitor');
    const printer = getByType('printer');
    const scanner = getByType('scanner');
    const usbAdapter = getByType('adapter') || getByType('usb-adapter');
    const powerStrip = getByType('power-strip');

    const centralConns = centralUnit ? (connections.get(centralUnit.name) || []) : [];
    const monitorConns = monitor ? (connections.get(monitor.name) || []) : [];
    const printerConns = printer ? (connections.get(printer.name) || []) : [];
    const scannerConns = scanner ? (connections.get(scanner.name) || []) : [];
    const usbAdapterConns = usbAdapter ? (connections.get(usbAdapter.name) || []) : [];
    const powerStripConns = powerStrip ? (connections.get(powerStrip.name) || []) : [];

    const isPowerStripPort = (portId: string) => portId.startsWith('power-strip-');
    const isUsbOnCentral = (portId: string) => /^usb\d+$/i.test(portId);
    const isHdmiPort = (portId: string) => /^hdmi\d+$/i.test(portId);
    const isAdapterUsbPort = (portId: string) => /^(adapter|usb-adapter)-port\d+$/i.test(portId);
    const isAdapterHdmiPort = (portId: string) => /^(adapter|usb-adapter)-hdmi\d+$/i.test(portId);

    const centralUnitPowered = centralConns.some(c => c.connectionType === 'power');
    const centralUnitPoweredViaPowerStrip = centralConns.some(
      c => c.connectionType === 'power' && isPowerStripPort(c.toPortId)
    );

    const monitorPowered = monitorConns.some(c => c.connectionType === 'power');
    const monitorPoweredViaPowerStrip = monitorConns.some(
      c => c.connectionType === 'power' && isPowerStripPort(c.toPortId)
    );
    const monitorConnectedToHdmi = monitorConns.some(
      c => c.connectionType === 'data' && isHdmiPort(c.toPortId)
    );

    const printerPowered = printerConns.some(c => c.connectionType === 'power');
    const printerPoweredViaPowerStrip = printerConns.some(
      c => c.connectionType === 'power' && isPowerStripPort(c.toPortId)
    );
    const scannerPowered = scannerConns.some(c => c.connectionType === 'power');
    const scannerPoweredViaPowerStrip = scannerConns.some(
      c => c.connectionType === 'power' && isPowerStripPort(c.toPortId)
    );

    const usbAdapterConnectedToCentral = usbAdapterConns.some(
      c => c.connectionType === 'data' && isUsbOnCentral(c.toPortId)
    );

    const inputDeviceTypes = ['keyboard', 'mouse', 'webcam', 'scanner', 'printer', 'mic', 'monitor'];
    const inputDevicesConnectedViaAdapter: string[] = [];
    const presentDeviceTypes: string[] = [];
    const deviceDataConnectedTypes: string[] = [];
    inputDeviceTypes.forEach(type => {
      const dev = getByType(type);
      if (!dev) return;
      presentDeviceTypes.push(type);
      const devConns = connections.get(dev.name) || [];
      if (devConns.some(c => c.connectionType === 'data' && (isAdapterUsbPort(c.toPortId) || isAdapterHdmiPort(c.toPortId)))) {
        inputDevicesConnectedViaAdapter.push(type);
      }
      const hasAnyData = devConns.some(c => c.connectionType === 'data' && (
        isUsbOnCentral(c.toPortId) || isAdapterUsbPort(c.toPortId) || isAdapterHdmiPort(c.toPortId) || isHdmiPort(c.toPortId)
      ));
      if (hasAnyData) deviceDataConnectedTypes.push(type);
    });

    const powerStripConnectedToWall = powerStripConns.some(
      c => c.connectionType === 'power' && /wall/i.test(c.toPortId)
    );

    return {
      hasCentralUnit: !!centralUnit,
      centralUnitPowered,
      centralUnitPoweredViaPowerStrip,
      hasMonitor: !!monitor,
      monitorPowered,
      monitorPoweredViaPowerStrip,
      monitorConnectedToHdmi,
      hasPrinter: !!printer,
      printerPowered,
      printerPoweredViaPowerStrip,
      hasScanner: !!scanner,
      scannerPowered,
      scannerPoweredViaPowerStrip,
      usbAdapterPresent: !!usbAdapter,
      usbAdapterConnectedToCentral,
      inputDevicesConnectedViaAdapter,
      presentDeviceTypes,
      deviceDataConnectedTypes,
      powerStripPresent: !!powerStrip,
      powerStripConnectedToWall,
    };
  }

  /**
   * Fallback rule-based analysis when AI is not available
   */
  private fallbackAnalysis(
    connections: Map<string, any[]>, 
    components: any[], 
    reason: string
  ): ConnectivityAnalysis {
    const basic = this.validateBasicConnectivity(connections, components);
    const details = this.getDetailedConnectivity(connections, components);
    
    let score = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for central unit
    if (!basic.hasCentralUnit) {
      issues.push("Aucune unité centrale n'a été placée sur la scène");
      suggestions.push("Ajoutez une unité centrale - c'est le composant principal de l'ordinateur");
    } else {
      score += 20;
      
      // Check central unit power
      if (!basic.centralUnitPowered) {
        issues.push("L'unité centrale n'est pas connectée à l'alimentation");
        suggestions.push("Connectez l'unité centrale à une prise de la multiprise");
      } else {
        score += 15;
        if (!details.centralUnitPoweredViaPowerStrip) {
          issues.push("L'unité centrale n'est pas branchée sur la multiprise");
          suggestions.push("Branchez l'unité centrale sur la multiprise");
        }
      }
    }
    
    // Check for monitor
    if (!basic.hasMonitor) {
      issues.push("Aucun moniteur n'a été placé - impossible d'afficher l'interface");
      suggestions.push("Ajoutez un moniteur pour voir ce qui se passe sur l'ordinateur");
    } else {
      score += 15;
      
      // Check monitor connection
      if (!basic.monitorConnected) {
        issues.push("Le moniteur n'est pas connecté à l'unité centrale pour recevoir l'image");
        suggestions.push("Connectez le moniteur au port HDMI de l'unité centrale");
      } else {
        score += 15;
        if (!details.monitorConnectedToHdmi) {
          issues.push("Le moniteur doit être relié en HDMI à l'unité centrale");
          suggestions.push("Utilisez un câble HDMI entre le moniteur et le port HDMI de l'unité centrale");
        }
      }
      
      // Check monitor power
      const monitor = components.find(c => c.userData.type === 'monitor');
      const monitorConnections = monitor ? connections.get(monitor.name) || [] : [];
      const monitorPowered = monitorConnections.some(c => c.connectionType === 'power');
      if (!monitorPowered) {
        issues.push("Le moniteur n'est pas connecté à l'alimentation");
        suggestions.push("Connectez le moniteur à une source d'alimentation");
      } else {
        score += 10;
        if (!details.monitorPoweredViaPowerStrip) {
          issues.push("Le moniteur n'est pas branché sur la multiprise");
          suggestions.push("Branchez le moniteur sur une prise de la multiprise");
        }
      }
    }
    
    // Check for input devices
    if (!basic.hasInputDevices) {
      suggestions.push("Ajoutez un clavier et une souris pour pouvoir utiliser l'ordinateur");
    } else {
      score += 10;
      
      if (!basic.inputDevicesConnected) {
        issues.push("Les périphériques d'entrée ne sont pas connectés à l'unité centrale");
        suggestions.push("Connectez le clavier et la souris aux ports USB de l'unité centrale");
      } else {
        score += 15;
      }
    }
    
    // Check for power strip
    const powerStrip = components.find(c => c.userData.type === 'power-strip');
    if (powerStrip) {
      const powerStripConnections = connections.get(powerStrip.name) || [];
      const powerStripToWall = powerStripConnections.some(c => 
        c.toPortId.includes('wall') && c.connectionType === 'power'
      );
      
      if (!powerStripToWall) {
        issues.push("La multiprise n'est pas branchée au mur");
        suggestions.push("Connectez la multiprise à la prise murale");
      } else {
        score += 10;
      }
    }

    // USB adapter checks when used
    if (details.usbAdapterPresent && details.inputDevicesConnectedViaAdapter.length > 0 && !details.usbAdapterConnectedToCentral) {
      issues.push("Les périphériques sont branchés à l'adaptateur USB, mais l'adaptateur n'est pas relié à l'unité centrale");
      suggestions.push("Branchez l'adaptateur USB sur un port USB de l'unité centrale");
    }
    
    // Determine if setup is valid
    // If a power strip is present, require power to central unit and monitor via the power strip
    const requireViaStrip = !!details.powerStripPresent;
    const centralPowerOk = requireViaStrip ? details.centralUnitPoweredViaPowerStrip : basic.centralUnitPowered;
    const monitorPowerOk = requireViaStrip ? details.monitorPoweredViaPowerStrip : (components.find(c => c.userData.type === 'monitor') ? details.monitorPowered : true);
    const monitorHasValidPath = details.monitorConnectedToHdmi || (details.usbAdapterPresent && details.usbAdapterConnectedToCentral && details.inputDevicesConnectedViaAdapter.includes('monitor'));
    const hdmiOk = !details.hasMonitor || monitorHasValidPath;
    const usbAdapterOk = !details.usbAdapterPresent || details.inputDevicesConnectedViaAdapter.length === 0 || details.usbAdapterConnectedToCentral;
    const stripWallOk = !details.powerStripPresent || details.powerStripConnectedToWall;

    const isValid = basic.hasCentralUnit && centralPowerOk &&
                   basic.hasMonitor && hdmiOk && monitorPowerOk &&
                   (!basic.hasInputDevices || basic.inputDevicesConnected) &&
                   usbAdapterOk && stripWallOk;
    
    // Generate feedback
    let feedback = `[${reason}] `;
    if (score >= 80) {
      feedback += "Excellent travail ! Votre installation informatique est bien configurée et fonctionnelle.";
    } else if (score >= 60) {
      feedback += "Bonne installation ! Il reste quelques améliorations à apporter pour une configuration optimale.";
    } else if (score >= 40) {
      feedback += "Installation correcte mais incomplète. Vérifiez les connexions manquantes.";
    } else {
      feedback += "L'installation nécessite des améliorations importantes pour être fonctionnelle.";
    }
    
    if (issues.length === 0) {
      feedback += " Tous les composants essentiels sont correctement connectés.";
    }
    
    return {
      isValid,
      score: Math.min(100, score),
      feedback,
      issues,
      suggestions
    };
  }

  /**
   * Quick validation for basic connectivity rules
   */
  validateBasicConnectivity(connections: Map<string, any[]>, components: any[]): {
    hasCentralUnit: boolean;
    centralUnitPowered: boolean;
    hasMonitor: boolean;
    monitorConnected: boolean;
    hasInputDevices: boolean;
    inputDevicesConnected: boolean;
  } {
    const centralUnit = components.find(c => c.userData.type === 'central-unit');
    const monitor = components.find(c => c.userData.type === 'monitor');
    const inputDevices = components.filter(c => 
      ['keyboard', 'mouse', 'mic'].includes(c.userData.type)
    );

    const centralUnitConnections = centralUnit ? connections.get(centralUnit.name) || [] : [];
    const monitorConnections = monitor ? connections.get(monitor.name) || [] : [];
    const inputDeviceConnections = inputDevices.flatMap(device => 
      connections.get(device.name) || []
    );

    return {
      hasCentralUnit: !!centralUnit,
      centralUnitPowered: centralUnitConnections.some(c => c.connectionType === 'power'),
      hasMonitor: !!monitor,
      monitorConnected: monitorConnections.some(c => c.connectionType === 'data'),
      hasInputDevices: inputDevices.length > 0,
      inputDevicesConnected: inputDeviceConnections.length > 0
    };
  }
}

export const connectivityAnalyzer = new ConnectivityAnalyzer();
