'use strict';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

type SceneComponent = {
	name: string;
	userData: {
		id: string;
		type: string;
		info: string;
		inScene: boolean;
		needs: { power?: boolean; data?: boolean; dataType?: string | string[] };
	};
};

type Connection = { toPortId: string; connectionType: string; toComponentName?: string; toComponentType?: string };

type RequestBody = {
	components: SceneComponent[];
	connections: Record<string, Connection[]>;
};

function formatConnectionsForAI(connections: Record<string, Connection[]>, components: SceneComponent[]): string {
	let connectionsText = '=== COMPUTER SETUP ANALYSIS ===\n\n';

	connectionsText += 'COMPONENTS PLACED:\n';
	components.forEach((comp) => {
		connectionsText += `- ${comp.userData.info}\n`;
	});

	connectionsText += '\nCONNECTIONS MADE:\n';
	Object.entries(connections).forEach(([componentName, connList]) => {
		const component = components.find((c) => c.name === componentName);
		if (component && connList && connList.length > 0) {
			connectionsText += `\n${component.userData.info}:\n`;
			connList.forEach((conn) => {
				const portName = conn.toPortId.replace(/-/g, ' ').toUpperCase();
				connectionsText += `  → Connected to ${portName} on ${conn.toComponentType || 'unknown'} [${conn.toComponentName || 'unknown'}] (${conn.connectionType})\n`;
			});
		}
	});

	const unconnectedComponents = components.filter(
		(comp) => !connections[comp.name] || connections[comp.name].length === 0
	);

	if (unconnectedComponents.length > 0) {
		connectionsText += '\nUNCONNECTED COMPONENTS:\n';
		unconnectedComponents.forEach((comp) => {
			connectionsText += `- ${comp.userData.info}\n`;
		});
	}

	return connectionsText;
}

function validateBasicConnectivity(connections: Record<string, Connection[]>, components: SceneComponent[]) {
	const centralUnit = components.find((c) => c.userData.type === 'central-unit');
	const monitor = components.find((c) => c.userData.type === 'monitor');
	const inputDevices = components.filter((c) => ['keyboard', 'mouse', 'mic'].includes(c.userData.type));

	const centralUnitConnections = centralUnit ? connections[centralUnit.name] || [] : [];
	const monitorConnections = monitor ? connections[monitor.name] || [] : [];
	const inputDeviceConnections = inputDevices.flatMap((d) => connections[d.name] || []);

	return {
		hasCentralUnit: !!centralUnit,
		centralUnitPowered: centralUnitConnections.some((c) => c.connectionType === 'power'),
		hasMonitor: !!monitor,
		monitorConnected: monitorConnections.some((c) => c.connectionType === 'data'),
		hasInputDevices: inputDevices.length > 0,
		inputDevicesConnected: inputDeviceConnections.length > 0,
	};
}

function fallbackAnalysis(connections: Record<string, Connection[]>, components: SceneComponent[], reason: string) {
	const basic = validateBasicConnectivity(connections, components);

	let score = 0;
	const issues: string[] = [];
	const suggestions: string[] = [];

	if (!basic.hasCentralUnit) {
		issues.push("Aucune unité centrale n'a été placée sur la scène");
		suggestions.push("Ajoutez une unité centrale - c'est le composant principal de l'ordinateur");
	} else {
		score += 20;
		if (!basic.centralUnitPowered) {
			issues.push("L'unité centrale n'est pas connectée à l'alimentation");
			suggestions.push("Connectez l'unité centrale à une multiprise ou directement au mur");
		} else {
			score += 15;
		}
	}

	if (!basic.hasMonitor) {
		issues.push("Aucun moniteur n'a été placé - impossible d'afficher l'interface");
		suggestions.push("Ajoutez un moniteur pour voir ce qui se passe sur l'ordinateur");
	} else {
		score += 15;
		if (!basic.monitorConnected) {
			issues.push("Le moniteur n'est pas connecté à l'unité centrale pour recevoir l'image");
			suggestions.push("Connectez le moniteur au port HDMI de l'unité centrale");
		} else {
			score += 15;
		}
		const m = components.find((c) => c.userData.type === 'monitor');
		const monitorConnections = m ? connections[m.name] || [] : [];
		const monitorPowered = monitorConnections.some((c) => c.connectionType === 'power');
		if (!monitorPowered) {
			issues.push("Le moniteur n'est pas connecté à l'alimentation");
			suggestions.push("Connectez le moniteur à une source d'alimentation");
		} else {
			score += 10;
		}
	}

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

	const powerStrip = components.find((c) => c.userData.type === 'power-strip');
	if (powerStrip) {
		const powerStripConnections = connections[powerStrip.name] || [];
		const powerStripToWall = powerStripConnections.some((c) => c.toPortId.includes('wall') && c.connectionType === 'power');
		if (!powerStripToWall) {
			issues.push('La multiprise n\'est pas branchée au mur');
			suggestions.push('Connectez la multiprise à la prise murale');
		} else {
			score += 10;
		}
	}

	const isValid = basic.hasCentralUnit && basic.centralUnitPowered && basic.hasMonitor && basic.monitorConnected && (!basic.hasInputDevices || basic.inputDevicesConnected);

	let feedback = `[${reason}] `;
	if (score >= 80) feedback += 'Excellent travail ! Votre installation informatique est bien configurée et fonctionnelle.';
	else if (score >= 60) feedback += 'Bonne installation ! Il reste quelques améliorations à apporter pour une configuration optimale.';
	else if (score >= 40) feedback += 'Installation correcte mais incomplète. Vérifiez les connexions manquantes.';
	else feedback += "L'installation nécessite des améliorations importantes pour être fonctionnelle.";
	if (issues.length === 0) feedback += ' Tous les composants essentiels sont correctement connectés.';

	return { isValid, score: Math.min(100, score), feedback, issues, suggestions };
}

export async function POST(request: Request) {
	try {
		let components: RequestBody['components'] = [];
		let connections: RequestBody['connections'] = {} as any;
		try {
			const parsed = (await request.json()) as RequestBody;
			components = Array.isArray(parsed?.components) ? parsed.components : [];
			connections = parsed?.connections && typeof parsed.connections === 'object' ? parsed.connections : {} as any;
		} catch (e) {
			console.error('Failed to parse request body for /api/connectivity', e);
			const fb = fallbackAnalysis(connections, components, 'Requête invalide - analyse basique utilisée');
			return NextResponse.json(fb);
		}

		const scene = {
			components: components.map((c) => ({ id: c.userData.id, type: c.userData.type, info: c.userData.info, needs: c.userData.needs || {} })),
			connections,
		};

		const prompt = `You are an expert computer technician evaluating a student's computer setup for educational purposes.\n\n${formatConnectionsForAI(connections, components)}\n\nSCENE_JSON=\`${JSON.stringify(scene)}\`\n\nRequirements for a functional setup:\n1. ESSENTIAL COMPONENTS: central-unit, monitor, keyboard, mouse, power-strip\n2. POWER: central unit and monitor must be powered (ideally via power strip connected to wall)\n3. DATA: monitor via HDMI to central unit, keyboard/mouse via USB to central unit (direct or via adapter)\n4. ADAPTERS: if used, must be connected to central unit for devices behind them to work\n\nImportant modeling notes:\n- Check for missing essential components FIRST before connection issues\n- Treat the installation as a connection graph. A device may connect indirectly via an adapter\n- Power must be provided separately. Power chains: device → power-strip-X and power-strip → wall-outlet\n- If a device is connected to an adapter but the adapter is NOT connected to the central unit, data does not flow\n- When an adapter is not linked to the central unit, explicitly list which devices are impacted\n- Be precise about what's missing vs what's incorrectly connected\n\nPlease analyze this computer setup and provide feedback on:\n1. Essential Components: Are all required components present?\n2. Power Connections: Are power needs met?\n3. Data Connections: Are data paths functional?\n\nRespond in this EXACT JSON format:\n{\n  \"isValid\": boolean,\n  \"score\": number (0-100),\n  \"feedback\": \"Bref résumé en français (1-2 phrases)\",\n  \"issues\": [\"Puce courte en français (un point par problème)\", \"...\"],\n  \"suggestions\": [\"Puce courte en français (amélioration concrète)\", \"...\"]\n}\n\nReturn ONLY a JSON object.`;

		const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
		const baseRoot = baseURL.replace(/\/?v1\/?$/, '');
		const modelName = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';
		const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || '0');

		try {
			// Build compact scene JSON to reduce prompt size
			const scene = {
				components: components.map((c) => ({ id: c.userData.id, type: c.userData.type, info: c.userData.info })),
				connections,
			};

			// No client-side timeout; allow model to take required time

			const resp = await fetch(`${baseRoot}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: modelName,
					prompt: [
						"Tu es un technicien informatique expert.",
						"Analyse l'installation suivante (JSON) et renvoie UNIQUEMENT un JSON valide avec les clés: isValid (bool), score (0-100), feedback (français), issues[] (français), suggestions[] (français).",
						"Ne renvoie aucun texte en dehors du JSON.",
						"Scène:",
						JSON.stringify(scene)
					].join('\n'),
					stream: false,
					format: 'json',
					options: { temperature: 0, num_predict: 800 },
					keep_alive: '30m'
				}),
			});
			// No timeout to allow full response
			if (!resp.ok) {
				console.error('Ollama chat API error status:', resp.status);
				const fb = fallbackAnalysis(connections, components, `Ollama API ${resp.status} - analyse basique utilisée`);
				return NextResponse.json(fb);
			}
			const data = await resp.json() as any;
			let raw = String(data?.response ?? '').trim();
			// Clean DeepSeek-style thinking tags to improve JSON extraction
			raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
			if (process.env.NODE_ENV !== 'production') {
				console.log('[connectivity] Ollama raw length:', raw.length);
			}

			// Robust JSON extraction
			const tryParse = (txt: string) => {
				try { return JSON.parse(txt); } catch { return null; }
			};
			let analysis = tryParse(raw);
			if (!analysis) {
				// code fence ```json ... ```
				const fenceMatch = raw.match(/```json[\r\n]+([\s\S]*?)```/i) || raw.match(/```[\r\n]+([\s\S]*?)```/i);
				if (fenceMatch && fenceMatch[1]) analysis = tryParse(fenceMatch[1]);
			}
			if (!analysis) {
				// braces extraction
				const braceMatch = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').match(/\{[\s\S]*\}/);
				if (braceMatch) analysis = tryParse(braceMatch[0]);
			}

			if (analysis) {
				return NextResponse.json({
					isValid: !!analysis.isValid,
					score: Math.min(100, Math.max(0, analysis.score || 0)),
					feedback: analysis.feedback || 'Analyse non disponible',
					issues: Array.isArray(analysis.issues) ? analysis.issues : [],
					suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
				});
			}

			const fb = fallbackAnalysis(connections, components, 'Réponse IA invalide - analyse basique utilisée');
			return NextResponse.json(fb);
		} catch (error: any) {
			console.error('Error calling Ollama API:', error);
			const reason = 'Service IA non disponible';
			const fb = fallbackAnalysis(connections, components, `${reason} - analyse basique utilisée`);
			return NextResponse.json(fb);
		}
	} catch (error) {
		console.error('Unhandled error in /api/connectivity', error);
		const fb = fallbackAnalysis({}, [], 'Erreur serveur inattendue - analyse basique utilisée');
		return NextResponse.json(fb);
	}
}


