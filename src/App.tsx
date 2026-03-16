import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useSphere, useBox, useCylinder } from '@react-three/cannon';
import { OrbitControls, PerspectiveCamera, Sky, Stars, Environment, Float, ContactShadows, Text, useHelper } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, MousePointer2, Zap, Star, Flame, Target, Camera } from 'lucide-react';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';

// --- Constants ---
const BALL_RADIUS = 0.4;
const HOOP_RADIUS = 0.6;
const HOOP_HEIGHT = 6;
const BACKBOARD_WIDTH = 4;
const BACKBOARD_HEIGHT = 3;

// --- Physics Materials ---
const ballMaterial = { restitution: 0.8, friction: 0.5 };
const courtMaterial = { restitution: 0.5, friction: 0.5 };

// --- Components ---

function Player({ ballPosition, isShooting, power }: { ballPosition: number[], isShooting: boolean, power: number }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!group.current) return;
    // Dynamic breathing/idle animation
    const t = state.clock.getElapsedTime();
    if (!isShooting) {
      group.current.position.y = Math.sin(t * 2) * 0.05;
    } else {
      // Jump animation based on power/charge
      group.current.position.y = power * 0.8;
    }
  });

  return (
    <group ref={group} position={[0, 0, 8.5]}>
      {/* Shoes */}
      <mesh position={[0.2, 0.1, 0]} castShadow>
        <boxGeometry args={[0.25, 0.2, 0.5]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[-0.2, 0.1, 0]} castShadow>
        <boxGeometry args={[0.25, 0.2, 0.5]} />
        <meshStandardMaterial color="#fff" />
      </mesh>

      {/* Legs */}
      <mesh position={[0.2, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.12, 1.4]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>
      <mesh position={[-0.2, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.12, 1.4]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>

      {/* Shorts */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.6, 16]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>

      {/* Torso/Jersey */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[0.7, 1, 0.4]} />
        <meshStandardMaterial color="#1e40af" />
      </mesh>
      
      {/* Jersey Number */}
      <Text
        position={[0, 2.1, 0.21]}
        fontSize={0.3}
        color="white"
        font="https://fonts.gstatic.com/s/inter/v12/UcCOjFwrHDOn45vYhNqPEV0VnLk3wtoJV7i6.woff"
      >
        26
      </Text>

      {/* Head */}
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#d2b48c" />
      </mesh>

      {/* Arms */}
      <group position={[0, 2.4, 0]}>
        <mesh position={[0.4, -0.2, 0.2]} rotation={[isShooting ? -Math.PI / 3 : 0.2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8]} />
          <meshStandardMaterial color="#d2b48c" />
        </mesh>
        <mesh position={[-0.4, -0.2, 0.2]} rotation={[isShooting ? -Math.PI / 3 : 0.2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.8]} />
          <meshStandardMaterial color="#d2b48c" />
        </mesh>
      </group>
    </group>
  );
}

function Ball({ onScore, resetKey, onPerfect, setBallPos }: { 
  onScore: () => void; 
  resetKey: number; 
  onPerfect: () => void;
  setBallPos: (pos: [number, number, number]) => void;
}) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: [0, 2, 8],
    args: [BALL_RADIUS],
    material: ballMaterial,
  }));

  const scoredRef = useRef(false);
  const pos = useRef<[number, number, number]>([0, 0, 0]);
  const [isPerfect, setIsPerfect] = useState(false);

  useEffect(() => {
    const unsubscribe = api.position.subscribe((v) => (pos.current = v));
    return unsubscribe;
  }, [api]);

  useEffect(() => {
    const handleShoot = (e: any) => {
      const { impulse, perfect } = e.detail;
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(Math.random() * 5, 0, 0);
      api.applyImpulse(impulse, [0, 0, 0]);
      if (perfect) {
        setIsPerfect(true);
        onPerfect();
      } else {
        setIsPerfect(false);
      }
    };
    window.addEventListener('shoot-ball', handleShoot);
    return () => window.removeEventListener('shoot-ball', handleShoot);
  }, [api, onPerfect]);

  useEffect(() => {
    api.position.set(0, 2, 8);
    api.velocity.set(0, 0, 0);
    api.angularVelocity.set(0, 0, 0);
    scoredRef.current = false;
    setIsPerfect(false);
  }, [resetKey, api]);

  useFrame(() => {
    setBallPos(pos.current as [number, number, number]);
    if (!scoredRef.current) {
      const distToHoopCenter = Math.sqrt(
        Math.pow(pos.current[0], 2) + Math.pow(pos.current[2] - (-5), 2)
      );
      
      if (
        distToHoopCenter < HOOP_RADIUS &&
        pos.current[1] < HOOP_HEIGHT + 0.2 &&
        pos.current[1] > HOOP_HEIGHT - 0.5 &&
        pos.current[2] > -5.5
      ) {
        scoredRef.current = true;
        onScore();
      }
    }

    if (pos.current[1] < -5) {
      api.position.set(0, 2, 8);
      api.velocity.set(0, 0, 0);
      scoredRef.current = false;
    }
  });

  return (
    <group>
      <mesh ref={ref as any} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial 
          color="#ff6b00" 
          roughness={0.3} 
          metalness={0.2} 
          emissive={isPerfect ? "#ffcc00" : "#000000"}
          emissiveIntensity={isPerfect ? 0.5 : 0}
        />
        {/* Ball lines */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[BALL_RADIUS + 0.005, 0.005, 16, 100]} />
          <meshBasicMaterial color="black" />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[BALL_RADIUS + 0.005, 0.005, 16, 100]} />
          <meshBasicMaterial color="black" />
        </mesh>
      </mesh>
      
      {/* Perfect Release Trail/Glow */}
      {isPerfect && (
        <Float speed={5} rotationIntensity={2} floatIntensity={2}>
          <mesh position={pos.current}>
            <sphereGeometry args={[BALL_RADIUS * 1.2, 16, 16]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.2} />
          </mesh>
        </Float>
      )}
    </group>
  );
}

function Hoop() {
  useCylinder(() => ({
    type: 'Static',
    position: [0, HOOP_HEIGHT, -5],
    args: [HOOP_RADIUS, HOOP_RADIUS, 0.1, 32],
  }));

  useBox(() => ({
    type: 'Static',
    position: [0, HOOP_HEIGHT + 1, -6],
    args: [BACKBOARD_WIDTH, BACKBOARD_HEIGHT, 0.2],
  }));

  useCylinder(() => ({
    type: 'Static',
    position: [0, HOOP_HEIGHT / 2, -6.5],
    args: [0.2, 0.2, HOOP_HEIGHT, 16],
  }));

  return (
    <group>
      {/* Rim */}
      <mesh position={[0, HOOP_HEIGHT, -5]}>
        <torusGeometry args={[HOOP_RADIUS, 0.05, 16, 100]} />
        <meshStandardMaterial color="#ff3300" emissive="#ff3300" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Backboard */}
      <mesh position={[0, HOOP_HEIGHT + 1, -6]}>
        <boxGeometry args={[BACKBOARD_WIDTH, BACKBOARD_HEIGHT, 0.2]} />
        <meshStandardMaterial 
          color="white" 
          transparent 
          opacity={0.4} 
          roughness={0.1} 
          metalness={0.1} 
        />
        {/* Backboard border */}
        <mesh position={[0, 0, 0.11]}>
          <planeGeometry args={[BACKBOARD_WIDTH, BACKBOARD_HEIGHT]} />
          <meshBasicMaterial color="#ff3300" wireframe wireframeLinewidth={3} />
        </mesh>
        {/* Backboard square */}
        <mesh position={[0, -0.5, 0.12]}>
          <planeGeometry args={[1.5, 1]} />
          <meshBasicMaterial color="#ff3300" wireframe wireframeLinewidth={2} />
        </mesh>
      </mesh>

      {/* Pole */}
      <mesh position={[0, HOOP_HEIGHT / 2, -6.5]}>
        <cylinderGeometry args={[0.2, 0.2, HOOP_HEIGHT, 16]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Net */}
      <mesh position={[0, HOOP_HEIGHT - 0.6, -5]}>
        <cylinderGeometry args={[HOOP_RADIUS, HOOP_RADIUS * 0.7, 1.2, 16, 1, true]} />
        <meshStandardMaterial color="white" wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Skyline() {
  const buildings = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      position: [(Math.random() - 0.5) * 250, 0, -70 - Math.random() * 50],
      scale: [8 + Math.random() * 12, 20 + Math.random() * 60, 8 + Math.random() * 12],
      color: i % 3 === 0 ? "#1a1a1a" : i % 3 === 1 ? "#222" : "#2a2a2a",
    }));
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.position as any}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
          {/* Building Lights */}
          <group position={[0, 0, 0.51]}>
            {Array.from({ length: 8 }).map((_, j) => (
              <mesh key={j} position={[(Math.random() - 0.5) * 0.6, (j - 4) * 4, 0]}>
                <planeGeometry args={[0.4, 0.4]} />
                <meshStandardMaterial 
                  emissive={i % 2 === 0 ? "#ffcc00" : "#ffffff"} 
                  emissiveIntensity={1.5} 
                  color={i % 2 === 0 ? "#ffcc00" : "#ffffff"} 
                />
              </mesh>
            ))}
          </group>
        </mesh>
      ))}
    </group>
  );
}

function Arena() {
  return (
    <group>
      {/* Court Floor */}
      <mesh receiveShadow position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#222" roughness={1} />
      </mesh>
      
      {/* Main Court Area (Wood Style) */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 15]} />
        <meshStandardMaterial color="#e5b981" roughness={0.1} metalness={0.2} />
      </mesh>

      {/* Court Lines */}
      <group position={[0, 0.01, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28.2, 15.2]} />
          <meshBasicMaterial color="#fff" wireframe />
        </mesh>
        
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -5]}>
          <ringGeometry args={[7.24, 7.34, 64, 1, 0, Math.PI]} />
          <meshBasicMaterial color="#fff" />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -5]}>
          <planeGeometry args={[4.9, 5.8]} />
          <meshBasicMaterial color="#1e40af" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Stadium Seating Silhouettes */}
      <group position={[0, 0, -20]}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[60, 6, 10]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Crowd Lights */}
        {Array.from({ length: 30 }).map((_, i) => (
          <pointLight 
            key={i} 
            position={[(Math.random() - 0.5) * 60, Math.random() * 6, 5]} 
            intensity={0.8} 
            color="#fff" 
          />
        ))}
      </group>

      {/* Side Walls (Glass-like for visibility) */}
      <mesh position={[-35, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[150, 15]} />
        <meshStandardMaterial color="#111" transparent opacity={0.3} />
      </mesh>
      <mesh position={[35, 5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[150, 15]} />
        <meshStandardMaterial color="#111" transparent opacity={0.3} />
      </mesh>

      {/* Jumbotron */}
      <group position={[0, 18, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 4, 8]} />
          <meshStandardMaterial color="#444" />
        </mesh>
        {/* Screen Faces */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, 0, 4.01]}>
            <planeGeometry args={[7.5, 3.5]} />
            <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.8} />
          </mesh>
        ))}
        <pointLight intensity={3} distance={50} color="#fff" />
      </group>

      <Skyline />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Sky sunPosition={[100, 50, 100]} turbidity={0.05} rayleigh={0.5} />
    </group>
  );
}

function CameraHandler({ mode, ballPos, timingGrade }: { mode: string, ballPos: [number, number, number], timingGrade: string | null }) {
  const { camera } = useThree();
  
  useFrame((state, delta) => {
    if (mode === 'follow') {
      const desiredPos = new THREE.Vector3(ballPos[0] + 12, ballPos[1] + 6, ballPos[2] + 12);
      camera.position.lerp(desiredPos, delta * 2);
      camera.lookAt(ballPos[0], ballPos[1], ballPos[2]);
    } else if (mode === '2k') {
      const desiredPos = new THREE.Vector3(0, 6, 18);
      camera.position.lerp(desiredPos, delta * 3);
      camera.lookAt(0, 3, -5);
    }
    // Broadcast mode is handled by OrbitControls
  });

  return null;
}

function Shooter({ setPower, setTimingGrade, setShotDistance }: { 
  setPower: (p: number) => void;
  setTimingGrade: (g: string | null) => void;
  setShotDistance: (d: number | null) => void;
}) {
  const chargingRef = useRef(false);
  const powerRef = useRef(0);
  
  // NBA 2K style "Green Window" is around 0.85 - 0.95
  const GREEN_START = 0.88;
  const GREEN_END = 0.94;

  useEffect(() => {
    const startCharging = () => {
      chargingRef.current = true;
      powerRef.current = 0;
      setTimingGrade(null);
      setShotDistance(null);
    };

    const stopCharging = () => {
      if (!chargingRef.current) return;
      chargingRef.current = false;
      
      const finalPower = powerRef.current;
      let grade = "Slightly Early";
      let isPerfect = false;

      if (finalPower >= GREEN_START && finalPower <= GREEN_END) {
        grade = "Excellent";
        isPerfect = true;
      } else if (finalPower > GREEN_END) {
        grade = "Slightly Late";
      } else if (finalPower < 0.5) {
        grade = "Very Early";
      }

      setTimingGrade(grade);
      
      // Calculate distance to hoop (-5 is hoop Z)
      const dist = Math.abs(8 - (-5)); // Fixed starting Z is 8
      setShotDistance(dist);
      
      // Physics calculation
      // Perfect release gets a slight boost and better accuracy
      const basePower = 12 + (isPerfect ? 2.5 : finalPower * 3);
      const upward = 6.5 + (isPerfect ? 1.5 : finalPower * 2);
      const spread = isPerfect ? 0 : (Math.random() - 0.5) * (1 - finalPower);
      
      window.dispatchEvent(new CustomEvent('shoot-ball', { 
        detail: { 
          impulse: [spread, upward, -basePower],
          perfect: isPerfect
        } 
      }));
      
      powerRef.current = 0;
      setPower(0);
    };

    window.addEventListener('start-charging', startCharging);
    window.addEventListener('stop-charging', stopCharging);

    return () => {
      window.removeEventListener('start-charging', startCharging);
      window.removeEventListener('stop-charging', stopCharging);
    };
  }, [setPower, setTimingGrade, setShotDistance]);

  useFrame((state, delta) => {
    if (chargingRef.current) {
      // NBA 2K meters are fast!
      powerRef.current = Math.min(1, powerRef.current + delta / 1.1);
      setPower(powerRef.current);
    }
  });

  return null;
}

export default function App() {
  const [score, setScore] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [power, setPower] = useState(0);
  const [timingGrade, setTimingGrade] = useState<string | null>(null);
  const [shotDistance, setShotDistance] = useState<number | null>(null);
  const [showPerfectEffect, setShowPerfectEffect] = useState(false);
  const [ballPos, setBallPos] = useState<[number, number, number]>([0, 2, 8]);
  const [cameraMode, setCameraMode] = useState<'follow' | 'broadcast' | '2k'>('broadcast');
  const [takeover, setTakeover] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'swish' | 'green' | 'bounce') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'green') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'swish') {
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < ctx.sampleRate * 0.5; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
      noise.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      noise.start();
      noise.stop(ctx.currentTime + 0.5);
    }
  }, []);

  useEffect(() => {
    const handleGlobalUp = () => {
      window.dispatchEvent(new CustomEvent('stop-charging'));
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  const handlePerfect = useCallback(() => {
    setShowPerfectEffect(true);
    setTakeover(prev => Math.min(100, prev + 25));
    setIsShaking(true);
    playSound('green');
    setTimeout(() => setIsShaking(false), 500);
    setTimeout(() => setShowPerfectEffect(false), 2000);
  }, [playSound]);

  const handleScore = useCallback(() => {
    setScore(s => s + 1);
    playSound('swish');
  }, [playSound]);

  return (
    <div className={`w-full h-screen bg-slate-900 overflow-hidden font-sans text-white select-none ${isShaking ? 'animate-bounce' : ''}`}>
      {/* Mobile Orientation Hint */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 md:hidden pointer-events-none opacity-0 portrait:opacity-100 transition-opacity duration-500">
        <div className="text-center p-8">
          <RotateCcw className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-lg font-black uppercase italic tracking-tighter">Rotate for the best experience</p>
        </div>
      </div>

      {/* 2K Style HUD */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-start z-10 pointer-events-none">
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-2 md:gap-3 bg-slate-800/90 px-4 md:px-6 py-1 md:py-2 border-l-4 border-blue-500 skew-x-[-12deg]">
            <div className="skew-x-[12deg] flex items-center gap-2 md:gap-3">
              <Trophy size={16} className="text-blue-400 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-sm font-black uppercase tracking-tighter italic">MyCareer Pts</span>
              <span className="text-xl md:text-3xl font-black italic ml-2 md:ml-4 text-blue-400">{score}</span>
            </div>
          </div>
          
          {/* Takeover Meter */}
          <div className="mt-2 md:mt-4 w-32 md:w-48 h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              animate={{ width: `${takeover}%` }}
              className={`h-full ${takeover >= 100 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]' : 'bg-blue-500'}`}
            />
          </div>
          <div className="text-[6px] md:text-[8px] uppercase font-black tracking-widest mt-1 text-white/40">Takeover Meter</div>
        </motion.div>

        <div className="flex flex-col gap-2 md:gap-4 items-end pointer-events-auto">
          <div className="flex gap-2">
            <button 
              onClick={() => setCameraMode(prev => prev === 'follow' ? 'broadcast' : prev === 'broadcast' ? '2k' : 'follow')}
              className="bg-slate-800/90 hover:bg-white/10 border border-white/10 p-2 md:p-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 skew-x-[-12deg]"
            >
              <div className="skew-x-[12deg] flex items-center gap-2">
                <MousePointer2 size={14} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[8px] md:text-[10px] font-bold uppercase">{cameraMode} Cam</span>
              </div>
            </button>
            <button 
              onClick={() => {
                setScore(0);
                setTakeover(0);
                setResetKey(prev => prev + 1);
              }}
              className="bg-slate-800/90 hover:bg-white/10 border border-white/10 p-2 md:p-3 rounded-xl transition-all active:scale-95 skew-x-[-12deg]"
            >
              <div className="skew-x-[12deg]">
                <RotateCcw size={14} className="md:w-[18px] md:h-[18px]" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 2K Shot Meter (Circular) */}
      <div className="absolute left-1/2 bottom-32 md:bottom-40 -translate-x-1/2 z-10 pointer-events-none">
        <div className="relative w-24 h-24 md:w-32 md:h-32">
          {/* Meter Background */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" 
            />
            {/* Green Window */}
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" stroke="#00ff00" strokeWidth="8" 
              strokeDasharray="15 283"
              strokeDashoffset="-248"
              className="opacity-50"
            />
            {/* Active Power */}
            <motion.circle 
              cx="50" cy="50" r="45" 
              fill="none" stroke={power > 0.85 && power < 0.95 ? "#00ff00" : "#ffffff"} 
              strokeWidth="8" 
              strokeDasharray={`${power * 283} 283`}
              transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
            />
          </svg>
          
          {/* Timing Grade Text */}
          <AnimatePresence>
            {timingGrade && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className={`absolute -top-10 md:-top-12 left-1/2 -translate-x-1/2 whitespace-nowrap font-black italic text-lg md:text-xl uppercase tracking-tighter ${
                  timingGrade === "Excellent" ? "text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" : "text-white"
                }`}
              >
                {timingGrade}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Perfect Release Splash */}
      <AnimatePresence>
        {showPerfectEffect && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-64 h-64 md:w-96 md:h-96 border-4 border-green-500/20 rounded-full blur-2xl" />
              </motion.div>
              <h1 className="text-5xl md:text-8xl font-black italic text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.8)] uppercase tracking-tighter">
                GREEN!
              </h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-30 p-4 md:p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <div className="max-w-xl w-full bg-slate-800/50 p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex items-center gap-4 mb-6 md:mb-8">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Target size={20} className="md:w-6 md:h-6" />
                </div>
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter">NBA 2K26: Web Edition</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10">
                  <div className="text-blue-400 mb-2 font-bold uppercase text-[10px]">Controls</div>
                  <p className="text-xs md:text-sm text-white/60 leading-relaxed">
                    <span className="text-white font-bold uppercase">Hold</span> the Shoot button.<br/>
                    <span className="text-white font-bold uppercase">Release</span> when the meter reaches the <span className="text-green-400 font-bold">GREEN WINDOW</span>.
                  </p>
                </div>
                <div className="bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10">
                  <div className="text-orange-400 mb-2 font-bold uppercase text-[10px]">Pro Tip</div>
                  <p className="text-xs md:text-sm text-white/60 leading-relaxed">
                    Excellent releases have a <span className="text-white font-bold">100% chance</span> of going in. Timing is everything.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowInstructions(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 md:py-5 rounded-2xl uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-600/20 text-sm md:text-base"
              >
                Start MyCareer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[25, 15, 25]} fov={45} />
        <Environment preset="city" />
        <ambientLight intensity={1.2} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={2.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
        />
        <spotLight position={[0, 25, 0]} angle={0.8} penumbra={0.5} castShadow intensity={10} color="#fff" />
        <spotLight position={[15, 15, 15]} angle={0.5} penumbra={1} intensity={4} color="#fff" />
        
        <Arena />
        <Player ballPosition={ballPos} isShooting={power > 0} power={power} />
        <CameraHandler mode={cameraMode} ballPos={ballPos} timingGrade={timingGrade} />

        <Physics gravity={[0, -9.81, 0]}>
          <Shooter setPower={setPower} setTimingGrade={setTimingGrade} setShotDistance={setShotDistance} />
          <Ball onScore={handleScore} resetKey={resetKey} onPerfect={handlePerfect} setBallPos={setBallPos} />
          <Hoop />
          <Court />
        </Physics>

        <OrbitControls 
          enabled={cameraMode === 'broadcast'}
          enablePan={false} 
          maxPolarAngle={Math.PI / 2.1} 
          minDistance={10} 
          maxDistance={60}
          target={[0, 5, -5]}
          autoRotate={!timingGrade && !showInstructions}
          autoRotateSpeed={0.3}
        />
        
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />

        {/* Post Processing */}
        <EffectComposer>
          <Bloom 
            intensity={1.5} 
            luminanceThreshold={0.9} 
            luminanceSmoothing={0.025} 
            mipmapBlur 
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
          <Noise opacity={0.02} />
        </EffectComposer>
      </Canvas>

      {/* 2K Style Shoot Button */}
      <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-10">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <button 
            onMouseDown={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('start-charging'));
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('stop-charging'));
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('start-charging'));
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('stop-charging'));
            }}
            className="relative bg-slate-800 border border-white/10 hover:border-white/20 text-white px-12 md:px-16 py-6 md:py-8 rounded-2xl font-black text-2xl md:text-3xl italic uppercase tracking-tighter shadow-2xl transition-all active:scale-90 select-none touch-none"
          >
            Shoot
          </button>
        </div>
      </div>

      {/* Post-Shot Feedback */}
      <AnimatePresence>
        {timingGrade && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="absolute right-4 md:right-8 bottom-32 md:bottom-40 z-10 bg-slate-800/80 backdrop-blur-md border border-white/10 p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 max-w-[200px] md:max-w-none"
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center shrink-0 ${
              timingGrade === "Excellent" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white"
            }`}>
              {timingGrade === "Excellent" ? <Star size={20} className="md:w-6 md:h-6" /> : <Zap size={20} className="md:w-6 md:h-6" />}
            </div>
            <div>
              <div className="text-[8px] md:text-[10px] uppercase font-bold text-white/40">Shot Feedback</div>
              <div className={`text-base md:text-xl font-black italic uppercase tracking-tighter ${
                timingGrade === "Excellent" ? "text-green-400" : "text-white"
              }`}>
                {timingGrade}
              </div>
              {shotDistance && (
                <div className="text-[8px] md:text-[10px] uppercase font-bold text-white/60 line-clamp-1">
                  {shotDistance.toFixed(1)}ft | Wide Open
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        canvas { touch-action: none; }
        body { user-select: none; background: #0f172a; }
        * { cursor: crosshair; }
      `}} />
    </div>
  );
}

// Re-using the Court component with better materials
function Court() {
  useBox(() => ({
    type: 'Static',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.1, 0],
    args: [50, 50, 0.2],
    material: courtMaterial
  }));

  return null; // Arena handles visuals
}
