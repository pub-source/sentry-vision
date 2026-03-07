
/**
 * Visual Diagrams for Research Documentation
 * ERD, Use Case, Activity, DFD, Sequence, and State diagrams
 */

/* ============================================================
 * 1. USE CASE DIAGRAM — Section 1: Fundamentals
 * Shows actors and their interactions with the system
 * ============================================================ */
export function UseCaseDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 1.2 — Use Case Diagram
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 520" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* System boundary */}
          <rect x="200" y="20" width="500" height="480" rx="12" className="fill-primary/5 stroke-primary" strokeWidth="1.5" strokeDasharray="6,4"/>
          <text x="450" y="50" textAnchor="middle" className="fill-primary text-[11px] font-mono font-bold">
            Multimodal Saliency Detection System
          </text>

          {/* Actor 1: Homeowner (left) */}
          <circle cx="80" cy="150" r="18" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <line x1="80" y1="168" x2="80" y2="210" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="55" y1="185" x2="105" y2="185" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="80" y1="210" x2="55" y2="240" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="80" y1="210" x2="105" y2="240" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="80" y="260" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">Homeowner</text>
          <text x="80" y="272" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">(Primary Actor)</text>

          {/* Actor 2: Household Member (left bottom) */}
          <circle cx="80" cy="370" r="18" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <line x1="80" y1="388" x2="80" y2="430" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="55" y1="405" x2="105" y2="405" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="80" y1="430" x2="55" y2="460" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="80" y1="430" x2="105" y2="460" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="80" y="478" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">Household</text>
          <text x="80" y="490" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">Member</text>

          {/* Actor 3: Camera/Mic (right) */}
          <rect x="810" y="100" width="60" height="40" rx="4" className="fill-accent/10 stroke-accent" strokeWidth="1.5"/>
          <text x="840" y="118" textAnchor="middle" className="fill-accent text-[8px] font-mono">Camera</text>
          <text x="840" y="130" textAnchor="middle" className="fill-accent text-[8px] font-mono">+ Mic</text>
          <text x="840" y="155" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">(Device Actor)</text>

          {/* Actor 4: Cloud Database (right bottom) */}
          <ellipse cx="840" cy="350" rx="35" ry="12" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <rect x="805" y="350" width="70" height="25" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <ellipse cx="840" cy="375" rx="35" ry="12" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <text x="840" y="400" textAnchor="middle" className="fill-info text-[8px] font-mono">Cloud DB</text>

          {/* Use Cases (ellipses) */}
          {/* UC1: Configure System */}
          <ellipse cx="350" cy="90" rx="90" ry="22" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="350" y="88" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC1: Configure</text>
          <text x="350" y="99" textAnchor="middle" className="fill-foreground text-[8px] font-mono">System Settings</text>

          {/* UC2: Monitor Live Feed */}
          <ellipse cx="450" cy="150" rx="90" ry="22" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="450" y="148" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC2: Monitor</text>
          <text x="450" y="159" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Live Camera Feed</text>

          {/* UC3: Set Wake Words */}
          <ellipse cx="350" cy="210" rx="90" ry="22" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="350" y="208" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC3: Manage</text>
          <text x="350" y="219" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Wake Words</text>

          {/* UC4: Receive Alerts */}
          <ellipse cx="450" cy="280" rx="90" ry="22" className="fill-destructive/10 stroke-destructive" strokeWidth="1"/>
          <text x="450" y="278" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC4: Receive</text>
          <text x="450" y="289" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Security Alerts</text>

          {/* UC5: Detect Saliency */}
          <ellipse cx="550" cy="210" rx="90" ry="22" className="fill-warning/10 stroke-warning" strokeWidth="1"/>
          <text x="550" y="208" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC5: Compute</text>
          <text x="550" y="219" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Saliency Map</text>

          {/* UC6: Classify Audio */}
          <ellipse cx="550" cy="340" rx="90" ry="22" className="fill-warning/10 stroke-warning" strokeWidth="1"/>
          <text x="550" y="338" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC6: Classify</text>
          <text x="550" y="349" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Audio Events</text>

          {/* UC7: Detect Objects */}
          <ellipse cx="400" cy="340" rx="90" ry="22" className="fill-warning/10 stroke-warning" strokeWidth="1"/>
          <text x="400" y="338" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC7: Detect</text>
          <text x="400" y="349" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Objects (COCO-SSD)</text>

          {/* UC8: Log Alert History */}
          <ellipse cx="450" cy="410" rx="90" ry="22" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="450" y="408" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC8: Log Alert</text>
          <text x="450" y="419" textAnchor="middle" className="fill-foreground text-[8px] font-mono">to Cloud History</text>

          {/* UC9: Manage Household */}
          <ellipse cx="320" cy="460" rx="90" ry="22" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="320" y="458" textAnchor="middle" className="fill-foreground text-[8px] font-mono">UC9: Create/Join</text>
          <text x="320" y="469" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Household</text>

          {/* UC10: Trigger 911 */}
          <ellipse cx="580" cy="460" rx="90" ry="22" className="fill-destructive/10 stroke-destructive" strokeWidth="1.5"/>
          <text x="580" y="458" textAnchor="middle" className="fill-destructive text-[8px] font-mono font-bold">UC10: Trigger</text>
          <text x="580" y="469" textAnchor="middle" className="fill-destructive text-[8px] font-mono font-bold">911 Emergency</text>

          {/* Association lines - Homeowner */}
          <line x1="110" y1="145" x2="260" y2="90" className="stroke-foreground/50" strokeWidth="1"/>
          <line x1="110" y1="150" x2="360" y2="150" className="stroke-foreground/50" strokeWidth="1"/>
          <line x1="110" y1="160" x2="260" y2="210" className="stroke-foreground/50" strokeWidth="1"/>
          <line x1="110" y1="170" x2="360" y2="280" className="stroke-foreground/50" strokeWidth="1"/>

          {/* Association lines - Household Member */}
          <line x1="110" y1="370" x2="360" y2="280" className="stroke-foreground/50" strokeWidth="1"/>
          <line x1="110" y1="380" x2="230" y2="460" className="stroke-foreground/50" strokeWidth="1"/>
          <line x1="110" y1="385" x2="490" y2="460" className="stroke-foreground/50" strokeWidth="1"/>

          {/* Association lines - Camera/Mic */}
          <line x1="810" y1="120" x2="640" y2="210" className="stroke-accent/50" strokeWidth="1"/>
          <line x1="810" y1="130" x2="640" y2="340" className="stroke-accent/50" strokeWidth="1"/>
          <line x1="810" y1="125" x2="540" y2="150" className="stroke-accent/50" strokeWidth="1"/>

          {/* Association lines - Cloud DB */}
          <line x1="805" y1="360" x2="540" y2="410" className="stroke-info/50" strokeWidth="1"/>

          {/* Include/Extend relationships */}
          {/* UC4 includes UC5 */}
          <line x1="510" y1="265" x2="530" y2="225" className="stroke-warning" strokeWidth="1" strokeDasharray="4,3"/>
          <text x="540" y="248" className="fill-warning text-[7px] font-mono">{'<<include>>'}</text>

          {/* UC4 includes UC6 */}
          <line x1="490" y1="295" x2="520" y2="325" className="stroke-warning" strokeWidth="1" strokeDasharray="4,3"/>

          {/* UC4 includes UC7 */}
          <line x1="430" y1="300" x2="410" y2="320" className="stroke-warning" strokeWidth="1" strokeDasharray="4,3"/>
          <text x="380" y="310" className="fill-warning text-[7px] font-mono">{'<<include>>'}</text>

          {/* UC4 extends UC10 */}
          <line x1="500" y1="295" x2="540" y2="445" className="stroke-destructive" strokeWidth="1" strokeDasharray="4,3"/>
          <text x="540" y="380" className="fill-destructive text-[7px] font-mono">{'<<extend>>'}</text>

          {/* UC4 extends UC8 */}
          <line x1="450" y1="302" x2="450" y2="388" className="stroke-info" strokeWidth="1" strokeDasharray="4,3"/>
          <text x="468" y="365" className="fill-info text-[7px] font-mono">{'<<extend>>'}</text>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        The Use Case Diagram illustrates all primary and secondary actors and their interactions. 
        UC4 (Receive Alerts) is the central use case that <em>includes</em> UC5, UC6, UC7 as prerequisite 
        processing steps, and <em>extends</em> to UC8 (logging) and UC10 (911 emergency) under specific conditions.
      </p>
    </div>
  );
}

/* ============================================================
 * 2. DATA FLOW DIAGRAM (DFD Level 0 + Level 1) — Section 2
 * ============================================================ */
export function DataFlowDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 2.2 — Data Flow Diagram (Level 1)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 450" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* External Entities */}
          <rect x="10" y="30" width="110" height="45" rx="0" className="fill-primary/10 stroke-primary" strokeWidth="2"/>
          <text x="65" y="50" textAnchor="middle" className="fill-primary text-[9px] font-mono font-bold">Webcam</text>
          <text x="65" y="63" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Video Source</text>

          <rect x="10" y="110" width="110" height="45" rx="0" className="fill-info/10 stroke-info" strokeWidth="2"/>
          <text x="65" y="130" textAnchor="middle" className="fill-info text-[9px] font-mono font-bold">Microphone</text>
          <text x="65" y="143" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Audio Source</text>

          <rect x="10" y="350" width="110" height="45" rx="0" className="fill-foreground/10 stroke-foreground" strokeWidth="2"/>
          <text x="65" y="370" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">User</text>
          <text x="65" y="383" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Homeowner</text>

          {/* Processes (circles) */}
          {/* P1: Frame Capture */}
          <circle cx="250" cy="52" r="35" className="fill-primary/10 stroke-primary" strokeWidth="1.5"/>
          <text x="250" y="48" textAnchor="middle" className="fill-primary text-[8px] font-mono font-bold">P1</text>
          <text x="250" y="60" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Capture</text>

          {/* P2: Saliency Engine */}
          <circle cx="420" cy="52" r="40" className="fill-accent/10 stroke-accent" strokeWidth="1.5"/>
          <text x="420" y="45" textAnchor="middle" className="fill-accent text-[8px] font-mono font-bold">P2</text>
          <text x="420" y="57" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Saliency</text>
          <text x="420" y="67" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Engine</text>

          {/* P3: Audio Analyzer */}
          <circle cx="420" cy="160" r="40" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <text x="420" y="153" textAnchor="middle" className="fill-info text-[8px] font-mono font-bold">P3</text>
          <text x="420" y="165" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Audio</text>
          <text x="420" y="175" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Analyzer</text>

          {/* P4: Object Detection */}
          <circle cx="420" cy="270" r="40" className="fill-warning/10 stroke-warning" strokeWidth="1.5"/>
          <text x="420" y="263" textAnchor="middle" className="fill-warning text-[8px] font-mono font-bold">P4</text>
          <text x="420" y="275" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Object</text>
          <text x="420" y="285" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Detection</text>

          {/* P5: Attention Fusion */}
          <circle cx="630" cy="160" r="45" className="fill-destructive/10 stroke-destructive" strokeWidth="2"/>
          <text x="630" y="153" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">P5</text>
          <text x="630" y="165" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Attention</text>
          <text x="630" y="177" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Fusion</text>

          {/* P6: Alert Engine */}
          <circle cx="800" cy="160" r="40" className="fill-destructive/10 stroke-destructive" strokeWidth="1.5"/>
          <text x="800" y="153" textAnchor="middle" className="fill-destructive text-[8px] font-mono font-bold">P6</text>
          <text x="800" y="165" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Alert</text>
          <text x="800" y="175" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Engine</text>

          {/* Data Store */}
          <line x1="680" y1="380" x2="880" y2="380" className="stroke-info" strokeWidth="1.5"/>
          <line x1="680" y1="400" x2="880" y2="400" className="stroke-info" strokeWidth="1.5"/>
          <text x="780" y="394" textAnchor="middle" className="fill-info text-[8px] font-mono font-bold">D1 alert_history</text>

          <line x1="680" y1="420" x2="880" y2="420" className="stroke-accent" strokeWidth="1.5"/>
          <line x1="680" y1="440" x2="880" y2="440" className="stroke-accent" strokeWidth="1.5"/>
          <text x="780" y="434" textAnchor="middle" className="fill-accent text-[8px] font-mono font-bold">D2 wake_words</text>

          {/* Data Flows (arrows with labels) */}
          {/* Webcam → P1 */}
          <line x1="120" y1="52" x2="215" y2="52" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="168" y="45" textAnchor="middle" className="fill-primary text-[7px] font-mono">RGB frames</text>

          {/* Mic → P3 */}
          <line x1="120" y1="132" x2="380" y2="155" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="240" y="138" textAnchor="middle" className="fill-info text-[7px] font-mono">PCM audio</text>

          {/* P1 → P2 */}
          <line x1="285" y1="52" x2="380" y2="52" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="333" y="44" textAnchor="middle" className="fill-accent text-[7px] font-mono">ImageData</text>

          {/* P1 → P4 */}
          <line x1="270" y1="82" x2="395" y2="240" className="stroke-warning" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="310" y="170" className="fill-warning text-[7px] font-mono">V(t)</text>

          {/* P2 → P5 */}
          <line x1="460" y1="52" x2="600" y2="140" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="530" y="85" textAnchor="middle" className="fill-accent text-[7px] font-mono">S(t) score</text>

          {/* P3 → P5 */}
          <line x1="460" y1="160" x2="585" y2="160" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="523" y="153" textAnchor="middle" className="fill-info text-[7px] font-mono">E(t), dB</text>

          {/* P4 → P5 */}
          <line x1="450" y1="245" x2="605" y2="190" className="stroke-warning" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="530" y="225" textAnchor="middle" className="fill-warning text-[7px] font-mono">O(t) objects</text>

          {/* P5 → P6 */}
          <line x1="675" y1="160" x2="760" y2="160" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="718" y="153" textAnchor="middle" className="fill-destructive text-[7px] font-mono">alpha(t)</text>

          {/* P6 → D1 */}
          <line x1="810" y1="200" x2="810" y2="380" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="825" y="290" className="fill-info text-[7px] font-mono">alert log</text>

          {/* P6 → User */}
          <line x1="770" y1="195" x2="120" y2="365" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="400" y="305" textAnchor="middle" className="fill-destructive text-[7px] font-mono">SMS / Push / 911 prompt</text>

          {/* D2 → P3 (wake words check) */}
          <line x1="680" y1="430" x2="450" y2="190" className="stroke-accent" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#arrowDFD)"/>
          <text x="550" y="330" className="fill-accent text-[7px] font-mono">wake word list</text>

          {/* User → P1 (settings) */}
          <line x1="90" y1="350" x2="240" y2="85" className="stroke-foreground/40" strokeWidth="1" markerEnd="url(#arrowDFD)"/>
          <text x="140" y="220" className="fill-muted-foreground text-[7px] font-mono">config</text>

          <defs>
            <marker id="arrowDFD" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        Level-1 DFD showing six processes (P1–P6), two data stores (D1: alert_history, D2: wake_words), 
        and external entities (Webcam, Microphone, User). Data flows are labeled with their content type. 
        Dashed lines indicate lookup/reference flows.
      </p>
    </div>
  );
}

/* ============================================================
 * 3. ACTIVITY DIAGRAM — Section 3: Algorithm Design
 * ============================================================ */
export function ActivityDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 3.2 — Activity Diagram (Alert Processing Pipeline)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 800 680" className="w-full max-w-3xl mx-auto" style={{ minWidth: '500px' }}>
          {/* Swimlane labels */}
          <rect x="20" y="10" width="240" height="660" rx="6" className="fill-primary/3 stroke-primary/20" strokeWidth="1"/>
          <text x="140" y="30" textAnchor="middle" className="fill-primary text-[9px] font-mono font-bold">VIDEO PIPELINE</text>

          <rect x="280" y="10" width="240" height="660" rx="6" className="fill-info/3 stroke-info/20" strokeWidth="1"/>
          <text x="400" y="30" textAnchor="middle" className="fill-info text-[9px] font-mono font-bold">AUDIO PIPELINE</text>

          <rect x="540" y="10" width="240" height="660" rx="6" className="fill-destructive/3 stroke-destructive/20" strokeWidth="1"/>
          <text x="660" y="30" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">FUSION + ALERT</text>

          {/* Start (filled circle) */}
          <circle cx="260" cy="55" r="10" className="fill-foreground"/>

          {/* Fork bar */}
          <rect x="100" y="80" width="320" height="4" rx="2" className="fill-foreground"/>
          <line x1="260" y1="65" x2="260" y2="80" className="stroke-foreground" strokeWidth="1.5"/>

          {/* Video branch */}
          <line x1="140" y1="84" x2="140" y2="110" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="60" y="110" width="160" height="35" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="140" y="132" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Capture Frame V(t)</text>

          <line x1="140" y1="145" x2="140" y2="170" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="60" y="170" width="160" height="35" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="140" y="192" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Convert to Grayscale</text>

          <line x1="140" y1="205" x2="140" y2="230" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          {/* Decision diamond */}
          <polygon points="140,230 190,260 140,290 90,260" className="fill-accent/10 stroke-accent" strokeWidth="1.5"/>
          <text x="140" y="258" textAnchor="middle" className="fill-accent text-[7px] font-mono">Mode?</text>

          <line x1="90" y1="260" x2="50" y2="260" className="stroke-accent" strokeWidth="1"/>
          <line x1="50" y1="260" x2="50" y2="310" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <text x="55" y="295" className="fill-accent text-[6px] font-mono">Sobel</text>

          <line x1="140" y1="290" x2="140" y2="310" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <text x="155" y="303" className="fill-accent text-[6px] font-mono">Lap</text>

          <line x1="190" y1="260" x2="230" y2="260" className="stroke-accent" strokeWidth="1"/>
          <line x1="230" y1="260" x2="230" y2="310" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <text x="215" y="295" className="fill-accent text-[6px] font-mono">Motion</text>

          {/* Three action boxes */}
          <rect x="30" y="310" width="42" height="30" rx="4" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="51" y="329" textAnchor="middle" className="fill-foreground text-[6px] font-mono">3x3</text>

          <rect x="119" y="310" width="42" height="30" rx="4" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="140" y="329" textAnchor="middle" className="fill-foreground text-[6px] font-mono">Lap</text>

          <rect x="209" y="310" width="42" height="30" rx="4" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="230" y="329" textAnchor="middle" className="fill-foreground text-[6px] font-mono">Diff</text>

          {/* Merge */}
          <line x1="51" y1="340" x2="51" y2="365" className="stroke-accent" strokeWidth="1"/>
          <line x1="140" y1="340" x2="140" y2="365" className="stroke-accent" strokeWidth="1"/>
          <line x1="230" y1="340" x2="230" y2="365" className="stroke-accent" strokeWidth="1"/>
          <line x1="51" y1="365" x2="230" y2="365" className="stroke-primary" strokeWidth="1"/>

          <line x1="140" y1="365" x2="140" y2="390" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="60" y="390" width="160" height="35" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="140" y="407" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Apply Threshold</text>
          <text x="140" y="419" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">S(t) = saliency score</text>

          <line x1="140" y1="425" x2="140" y2="445" className="stroke-primary" strokeWidth="1"/>

          {/* Object Detection */}
          <line x1="140" y1="445" x2="140" y2="470" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="60" y="470" width="160" height="35" rx="6" className="fill-warning/10 stroke-warning" strokeWidth="1"/>
          <text x="140" y="492" textAnchor="middle" className="fill-foreground text-[8px] font-mono">COCO-SSD Inference</text>

          {/* Audio branch */}
          <line x1="400" y1="84" x2="400" y2="110" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="320" y="110" width="160" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="400" y="132" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Sample Audio A(t)</text>

          <line x1="400" y1="145" x2="400" y2="170" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="320" y="170" width="160" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="400" y="192" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Compute FFT + dB</text>

          <line x1="400" y1="205" x2="400" y2="230" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="320" y="230" width="160" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="400" y="252" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Band Energy + ZCR</text>

          <line x1="400" y1="265" x2="400" y2="290" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="320" y="290" width="160" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="400" y="312" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Classify Event E(t)</text>

          <line x1="400" y1="325" x2="400" y2="350" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="320" y="350" width="160" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="400" y="372" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Pitch Autocorrelation</text>

          {/* Join bar */}
          <rect x="100" y="530" width="420" height="4" rx="2" className="fill-foreground"/>
          <line x1="140" y1="505" x2="140" y2="530" className="stroke-primary" strokeWidth="1"/>
          <line x1="400" y1="385" x2="400" y2="530" className="stroke-info" strokeWidth="1"/>

          {/* Fusion in right swimlane */}
          <line x1="520" y1="534" x2="660" y2="554" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <rect x="580" y="555" width="160" height="40" rx="6" className="fill-destructive/10 stroke-destructive" strokeWidth="1.5"/>
          <text x="660" y="573" textAnchor="middle" className="fill-destructive text-[8px] font-mono font-bold">Compute alpha(t)</text>
          <text x="660" y="586" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">S + speech + dB boost</text>

          <line x1="660" y1="595" x2="660" y2="615" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          {/* Decision: alert threshold */}
          <polygon points="660,615 710,640 660,665 610,640" className="fill-destructive/10 stroke-destructive" strokeWidth="1.5"/>
          <text x="660" y="643" textAnchor="middle" className="fill-destructive text-[7px] font-mono">alpha &gt; T?</text>

          {/* End (circle with inner circle) */}
          <circle cx="580" cy="640" r="10" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <circle cx="580" cy="640" r="6" className="fill-foreground"/>
          <line x1="610" y1="640" x2="593" y2="640" className="stroke-muted-foreground" strokeWidth="1"/>
          <text x="580" y="660" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">No → loop</text>

          <line x1="710" y1="640" x2="760" y2="640" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowAct)"/>
          <text x="735" y="633" className="fill-destructive text-[6px] font-mono">Yes</text>
          <rect x="760" y="622" width="30" height="36" rx="4" className="fill-destructive/20 stroke-destructive" strokeWidth="1.5"/>
          <text x="775" y="638" textAnchor="middle" className="fill-destructive text-[7px] font-mono font-bold">!</text>
          <text x="775" y="650" textAnchor="middle" className="fill-destructive text-[6px] font-mono">Alert</text>

          <defs>
            <marker id="arrowAct" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        The Activity Diagram uses swim lanes to separate Video, Audio, and Fusion pipelines. 
        A fork bar splits processing into parallel video and audio branches. After independent analysis, 
        a join bar synchronizes results for the Attention Fusion step, which decides whether to trigger an alert.
      </p>
    </div>
  );
}

/* ============================================================
 * 4. SEQUENCE DIAGRAM — Section 4: Mathematical Model
 * Shows the mathematical transformation flow over time
 * ============================================================ */
export function SequenceDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 4.2 — Sequence Diagram (One Processing Cycle)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 560" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* Lifeline headers */}
          {[
            { x: 80, label: 'Dashboard', sub: 'Index.tsx', color: 'primary' },
            { x: 230, label: 'Camera', sub: 'useCamera', color: 'primary' },
            { x: 380, label: 'Saliency', sub: 'saliency.ts', color: 'accent' },
            { x: 530, label: 'Audio', sub: 'useAudio', color: 'info' },
            { x: 680, label: 'COCO-SSD', sub: 'useObjDet', color: 'warning' },
            { x: 830, label: 'Cloud', sub: 'useHousehold', color: 'destructive' },
          ].map(({ x, label, sub, color }) => (
            <g key={label}>
              <rect x={x - 45} y="10" width="90" height="40" rx="4" className={`fill-${color}/10 stroke-${color}`} strokeWidth="1.5"/>
              <text x={x} y="28" textAnchor="middle" className={`fill-${color} text-[8px] font-mono font-bold`}>{label}</text>
              <text x={x} y="42" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">{sub}</text>
              <line x1={x} y1="50" x2={x} y2="550" className="stroke-border" strokeWidth="1" strokeDasharray="4,4"/>
            </g>
          ))}

          {/* Messages */}
          {/* 1: requestAnimationFrame */}
          <rect x="68" y="70" width="24" height="480" className="fill-primary/5 stroke-primary/20" strokeWidth="0.5"/>

          {/* 2: getFrame() */}
          <line x1="92" y1="90" x2="230" y2="90" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="160" y="85" textAnchor="middle" className="fill-primary text-[7px] font-mono">getImageData()</text>

          <line x1="230" y1="110" x2="92" y2="110" className="stroke-primary" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="160" y="105" textAnchor="middle" className="fill-primary text-[7px] font-mono">ImageData V(t)</text>

          {/* 3: computeSaliency */}
          <line x1="92" y1="135" x2="380" y2="135" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="236" y="130" textAnchor="middle" className="fill-accent text-[7px] font-mono">computeSaliency(V(t), mode, tau)</text>

          {/* Activation box on Saliency */}
          <rect x="368" y="135" width="24" height="60" className="fill-accent/10 stroke-accent" strokeWidth="0.5"/>
          <text x="380" y="155" textAnchor="middle" className="fill-accent text-[6px] font-mono">Gray</text>
          <text x="380" y="165" textAnchor="middle" className="fill-accent text-[6px] font-mono">Conv</text>
          <text x="380" y="175" textAnchor="middle" className="fill-accent text-[6px] font-mono">Thresh</text>

          <line x1="380" y1="195" x2="92" y2="195" className="stroke-accent" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="236" y="190" textAnchor="middle" className="fill-accent text-[7px] font-mono">S(t): saliency map + score</text>

          {/* 4: Audio (parallel) */}
          <line x1="92" y1="220" x2="530" y2="220" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="310" y="215" textAnchor="middle" className="fill-info text-[7px] font-mono">getByteFrequencyData() + getByteTimeDomainData()</text>

          <rect x="518" y="220" width="24" height="60" className="fill-info/10 stroke-info" strokeWidth="0.5"/>
          <text x="530" y="240" textAnchor="middle" className="fill-info text-[6px] font-mono">RMS</text>
          <text x="530" y="250" textAnchor="middle" className="fill-info text-[6px] font-mono">FFT</text>
          <text x="530" y="260" textAnchor="middle" className="fill-info text-[6px] font-mono">ZCR</text>

          <line x1="530" y1="280" x2="92" y2="280" className="stroke-info" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="310" y="275" textAnchor="middle" className="fill-info text-[7px] font-mono">AudioFeatures: dB, E(t), f0, waveform</text>

          {/* 5: Object Detection */}
          <line x1="92" y1="305" x2="680" y2="305" className="stroke-warning" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="386" y="300" textAnchor="middle" className="fill-warning text-[7px] font-mono">model.detect(canvas) [async, ~50ms]</text>

          <rect x="668" y="305" width="24" height="50" className="fill-warning/10 stroke-warning" strokeWidth="0.5"/>
          <text x="680" y="325" textAnchor="middle" className="fill-warning text-[6px] font-mono">CNN</text>
          <text x="680" y="335" textAnchor="middle" className="fill-warning text-[6px] font-mono">NMS</text>

          <line x1="680" y1="355" x2="92" y2="355" className="stroke-warning" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="386" y="350" textAnchor="middle" className="fill-warning text-[7px] font-mono">O(t): DetectedObject[] with bbox + confidence</text>

          {/* 6: Fusion (self-call) */}
          <line x1="92" y1="385" x2="110" y2="385" className="stroke-destructive" strokeWidth="1"/>
          <line x1="110" y1="385" x2="110" y2="405" className="stroke-destructive" strokeWidth="1"/>
          <line x1="110" y1="405" x2="92" y2="405" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowSeqR)"/>
          <text x="140" y="393" className="fill-destructive text-[7px] font-mono">alpha = S + speech(20) + dB_boost</text>

          {/* 7: Threshold check */}
          <rect x="50" y="420" width="170" height="30" rx="4" className="fill-destructive/5 stroke-destructive" strokeWidth="1" strokeDasharray="4,3"/>
          <text x="135" y="433" textAnchor="middle" className="fill-destructive text-[7px] font-mono">alt [alpha &gt; threshold]</text>

          {/* 8: logAlert */}
          <line x1="92" y1="460" x2="830" y2="460" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="460" y="455" textAnchor="middle" className="fill-destructive text-[7px] font-mono">logAlert(type, message, snapshotUrl)</text>

          <rect x="818" y="460" width="24" height="30" className="fill-destructive/10 stroke-destructive" strokeWidth="0.5"/>
          <text x="830" y="480" textAnchor="middle" className="fill-destructive text-[6px] font-mono">INSERT</text>

          <line x1="830" y1="490" x2="92" y2="490" className="stroke-destructive" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="460" y="500" textAnchor="middle" className="fill-destructive text-[7px] font-mono">alert logged to alert_history</text>

          {/* Loop frame */}
          <rect x="40" y="60" width="860" height="480" rx="6" className="fill-none stroke-muted-foreground" strokeWidth="1" strokeDasharray="6,4"/>
          <rect x="40" y="60" width="60" height="16" className="fill-muted stroke-muted-foreground" strokeWidth="1"/>
          <text x="70" y="72" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono font-bold">loop</text>
          <text x="110" y="72" className="fill-muted-foreground text-[6px] font-mono">[each animation frame @ ~30fps]</text>

          <defs>
            <marker id="arrowSeq" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
            <marker id="arrowSeqR" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
              <polygon points="8 0, 0 3, 8 6" className="fill-foreground/40"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        The Sequence Diagram shows one complete processing cycle across six components. The loop frame 
        repeats at ~30fps. The "alt" fragment represents conditional alert logging when the attention 
        score alpha(t) exceeds the configured threshold. Dashed return arrows carry computed results.
      </p>
    </div>
  );
}

/* ============================================================
 * 5. ENTITY RELATIONSHIP DIAGRAM — Section 5: Implementation
 * Shows the database schema with cardinalities
 * ============================================================ */
export function ERDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 5.2 — Entity Relationship Diagram (Database Schema)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 520" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* ===== ENTITY: auth.users ===== */}
          <rect x="20" y="100" width="180" height="160" rx="0" className="fill-muted/30 stroke-muted-foreground" strokeWidth="1.5"/>
          <rect x="20" y="100" width="180" height="30" rx="0" className="fill-muted stroke-muted-foreground" strokeWidth="1.5"/>
          <text x="110" y="120" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">auth.users</text>
          <text x="30" y="148" className="fill-primary text-[8px] font-mono font-bold">PK id : uuid</text>
          <line x1="20" y1="155" x2="200" y2="155" className="stroke-border" strokeWidth="0.5"/>
          <text x="30" y="170" className="fill-foreground text-[8px] font-mono">email : text</text>
          <text x="30" y="185" className="fill-foreground text-[8px] font-mono">encrypted_password</text>
          <text x="30" y="200" className="fill-foreground text-[8px] font-mono">created_at : timestamptz</text>
          <text x="30" y="215" className="fill-muted-foreground text-[7px] font-mono italic">Managed by Supabase Auth</text>

          {/* ===== ENTITY: households ===== */}
          <rect x="360" y="20" width="200" height="170" rx="0" className="fill-primary/5 stroke-primary" strokeWidth="1.5"/>
          <rect x="360" y="20" width="200" height="30" rx="0" className="fill-primary/20 stroke-primary" strokeWidth="1.5"/>
          <text x="460" y="40" textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">households</text>
          <text x="370" y="68" className="fill-primary text-[8px] font-mono font-bold">PK id : uuid</text>
          <line x1="360" y1="75" x2="560" y2="75" className="stroke-border" strokeWidth="0.5"/>
          <text x="370" y="90" className="fill-foreground text-[8px] font-mono">name : text</text>
          <text x="370" y="105" className="fill-foreground text-[8px] font-mono">invite_code : text (unique)</text>
          <text x="370" y="120" className="fill-accent text-[8px] font-mono">FK created_by : uuid</text>
          <text x="370" y="135" className="fill-foreground text-[8px] font-mono">created_at : timestamptz</text>
          <text x="370" y="155" className="fill-muted-foreground text-[7px] font-mono italic">invite_code = substr(md5(random()),1,8)</text>

          {/* ===== ENTITY: household_members ===== */}
          <rect x="330" y="250" width="230" height="190" rx="0" className="fill-accent/5 stroke-accent" strokeWidth="1.5"/>
          <rect x="330" y="250" width="230" height="30" rx="0" className="fill-accent/20 stroke-accent" strokeWidth="1.5"/>
          <text x="445" y="270" textAnchor="middle" className="fill-accent text-[10px] font-mono font-bold">household_members</text>
          <text x="340" y="298" className="fill-primary text-[8px] font-mono font-bold">PK id : uuid</text>
          <line x1="330" y1="305" x2="560" y2="305" className="stroke-border" strokeWidth="0.5"/>
          <text x="340" y="320" className="fill-accent text-[8px] font-mono">FK household_id : uuid</text>
          <text x="340" y="335" className="fill-accent text-[8px] font-mono">FK user_id : uuid</text>
          <text x="340" y="350" className="fill-foreground text-[8px] font-mono">display_name : text</text>
          <text x="340" y="365" className="fill-foreground text-[8px] font-mono">phone_number : text</text>
          <text x="340" y="380" className="fill-foreground text-[8px] font-mono">is_admin : boolean</text>
          <text x="340" y="395" className="fill-foreground text-[8px] font-mono">created_at : timestamptz</text>
          <text x="340" y="415" className="fill-muted-foreground text-[7px] font-mono italic">UNIQUE(user_id, household_id)</text>

          {/* ===== ENTITY: wake_words ===== */}
          <rect x="650" y="20" width="220" height="170" rx="0" className="fill-warning/5 stroke-warning" strokeWidth="1.5"/>
          <rect x="650" y="20" width="220" height="30" rx="0" className="fill-warning/20 stroke-warning" strokeWidth="1.5"/>
          <text x="760" y="40" textAnchor="middle" className="fill-warning text-[10px] font-mono font-bold">wake_words</text>
          <text x="660" y="68" className="fill-primary text-[8px] font-mono font-bold">PK id : uuid</text>
          <line x1="650" y1="75" x2="870" y2="75" className="stroke-border" strokeWidth="0.5"/>
          <text x="660" y="90" className="fill-accent text-[8px] font-mono">FK household_id : uuid</text>
          <text x="660" y="105" className="fill-foreground text-[8px] font-mono">phrase : text</text>
          <text x="660" y="120" className="fill-foreground text-[8px] font-mono">is_emergency : boolean</text>
          <text x="660" y="135" className="fill-accent text-[8px] font-mono">FK created_by : uuid</text>
          <text x="660" y="150" className="fill-foreground text-[8px] font-mono">created_at : timestamptz</text>

          {/* ===== ENTITY: alert_history ===== */}
          <rect x="650" y="260" width="220" height="180" rx="0" className="fill-destructive/5 stroke-destructive" strokeWidth="1.5"/>
          <rect x="650" y="260" width="220" height="30" rx="0" className="fill-destructive/20 stroke-destructive" strokeWidth="1.5"/>
          <text x="760" y="280" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">alert_history</text>
          <text x="660" y="308" className="fill-primary text-[8px] font-mono font-bold">PK id : uuid</text>
          <line x1="650" y1="315" x2="870" y2="315" className="stroke-border" strokeWidth="0.5"/>
          <text x="660" y="330" className="fill-accent text-[8px] font-mono">FK household_id : uuid</text>
          <text x="660" y="345" className="fill-foreground text-[8px] font-mono">alert_type : text</text>
          <text x="660" y="360" className="fill-foreground text-[8px] font-mono">message : text</text>
          <text x="660" y="375" className="fill-accent text-[8px] font-mono">FK triggered_by : uuid</text>
          <text x="660" y="390" className="fill-foreground text-[8px] font-mono">snapshot_url : text (nullable)</text>
          <text x="660" y="405" className="fill-foreground text-[8px] font-mono">created_at : timestamptz</text>

          {/* ===== RELATIONSHIPS (lines with crow's foot notation) ===== */}

          {/* auth.users 1──┤< household_members (one user has many memberships) */}
          <line x1="200" y1="180" x2="330" y2="335" className="stroke-foreground" strokeWidth="1.5"/>
          {/* "1" side at auth.users */}
          <text x="215" y="195" className="fill-foreground text-[9px] font-mono font-bold">1</text>
          {/* "many" crow's foot at household_members */}
          <line x1="330" y1="330" x2="318" y2="322" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="330" y1="335" x2="318" y2="335" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="330" y1="340" x2="318" y2="348" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="305" y="355" className="fill-foreground text-[9px] font-mono font-bold">*</text>

          {/* households 1──┤< household_members */}
          <line x1="460" y1="190" x2="445" y2="250" className="stroke-primary" strokeWidth="1.5"/>
          <text x="468" y="205" className="fill-primary text-[9px] font-mono font-bold">1</text>
          <line x1="445" y1="250" x2="433" y2="242" className="stroke-primary" strokeWidth="1.5"/>
          <line x1="445" y1="250" x2="433" y2="250" className="stroke-primary" strokeWidth="1.5"/>
          <line x1="445" y1="250" x2="433" y2="258" className="stroke-primary" strokeWidth="1.5"/>
          <text x="425" y="243" className="fill-primary text-[9px] font-mono font-bold">*</text>

          {/* households 1──┤< wake_words */}
          <line x1="560" y1="80" x2="650" y2="90" className="stroke-warning" strokeWidth="1.5"/>
          <text x="575" y="75" className="fill-warning text-[9px] font-mono font-bold">1</text>
          <line x1="650" y1="85" x2="638" y2="77" className="stroke-warning" strokeWidth="1.5"/>
          <line x1="650" y1="90" x2="638" y2="90" className="stroke-warning" strokeWidth="1.5"/>
          <line x1="650" y1="95" x2="638" y2="103" className="stroke-warning" strokeWidth="1.5"/>
          <text x="625" y="103" className="fill-warning text-[9px] font-mono font-bold">*</text>

          {/* households 1──┤< alert_history */}
          <line x1="560" y1="150" x2="650" y2="330" className="stroke-destructive" strokeWidth="1.5"/>
          <text x="575" y="180" className="fill-destructive text-[9px] font-mono font-bold">1</text>
          <line x1="650" y1="325" x2="638" y2="317" className="stroke-destructive" strokeWidth="1.5"/>
          <line x1="650" y1="330" x2="638" y2="330" className="stroke-destructive" strokeWidth="1.5"/>
          <line x1="650" y1="335" x2="638" y2="343" className="stroke-destructive" strokeWidth="1.5"/>
          <text x="625" y="343" className="fill-destructive text-[9px] font-mono font-bold">*</text>

          {/* Legend */}
          <rect x="20" y="470" width="860" height="40" rx="4" className="fill-card stroke-border" strokeWidth="1"/>
          <text x="40" y="488" className="fill-muted-foreground text-[8px] font-mono font-bold">LEGEND:</text>
          <text x="110" y="488" className="fill-primary text-[8px] font-mono">PK = Primary Key</text>
          <text x="240" y="488" className="fill-accent text-[8px] font-mono">FK = Foreign Key</text>
          <line x1="360" y1="485" x2="390" y2="485" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="395" y="488" className="fill-foreground text-[8px] font-mono">1 ──┤{'<'} * (One-to-Many)</text>
          <text x="560" y="488" className="fill-muted-foreground text-[8px] font-mono">Crow's foot notation used</text>
          <text x="750" y="488" className="fill-muted-foreground text-[8px] font-mono italic">RLS enabled on all tables</text>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        The ERD uses crow's foot notation to show cardinality. A <strong>household</strong> contains many 
        <strong> members</strong>, <strong>wake words</strong>, and <strong>alert records</strong>. Each member 
        references an <strong>auth.users</strong> entry. All tables have Row-Level Security (RLS) policies 
        restricting access to household members only.
      </p>
    </div>
  );
}

/* ============================================================
 * 6. STATE DIAGRAM — Section 6: Complexity Analysis
 * Shows system states and transitions
 * ============================================================ */
export function StateDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 6.2 — State Machine Diagram (System Lifecycle)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 850 400" className="w-full max-w-3xl mx-auto" style={{ minWidth: '500px' }}>
          {/* Initial state */}
          <circle cx="50" cy="200" r="10" className="fill-foreground"/>
          <line x1="60" y1="200" x2="110" y2="200" className="stroke-foreground" strokeWidth="1.5" markerEnd="url(#arrowState)"/>

          {/* State: IDLE */}
          <rect x="110" y="170" width="130" height="60" rx="12" className="fill-muted/30 stroke-foreground" strokeWidth="1.5"/>
          <text x="175" y="195" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">IDLE</text>
          <text x="175" y="210" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Camera off, no processing</text>

          {/* Transition: start() */}
          <line x1="240" y1="200" x2="310" y2="200" className="stroke-primary" strokeWidth="1.5" markerEnd="url(#arrowState)"/>
          <text x="275" y="193" textAnchor="middle" className="fill-primary text-[7px] font-mono">start()</text>

          {/* State: INITIALIZING */}
          <rect x="310" y="160" width="140" height="80" rx="12" className="fill-primary/10 stroke-primary" strokeWidth="1.5"/>
          <text x="380" y="190" textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">INIT</text>
          <text x="380" y="205" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Loading COCO-SSD</text>
          <text x="380" y="218" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Opening camera/mic</text>

          {/* Transition: ready */}
          <line x1="380" y1="160" x2="380" y2="80" className="stroke-accent" strokeWidth="1.5"/>
          <line x1="380" y1="80" x2="530" y2="80" className="stroke-accent" strokeWidth="1.5" markerEnd="url(#arrowState)"/>
          <text x="455" y="73" textAnchor="middle" className="fill-accent text-[7px] font-mono">model loaded + stream ready</text>

          {/* State: MONITORING */}
          <rect x="530" y="50" width="150" height="80" rx="12" className="fill-accent/10 stroke-accent" strokeWidth="2"/>
          <text x="605" y="80" textAnchor="middle" className="fill-accent text-[10px] font-mono font-bold">MONITORING</text>
          <text x="605" y="95" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Processing frames</text>
          <text x="605" y="108" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">@ ~30fps loop</text>
          {/* Self loop */}
          <path d="M 605 50 C 605 20, 660 20, 660 50" className="fill-none stroke-accent" strokeWidth="1" markerEnd="url(#arrowState)"/>
          <text x="645" y="28" className="fill-accent text-[6px] font-mono">next frame</text>

          {/* Transition: alpha > threshold */}
          <line x1="680" y1="90" x2="750" y2="90" className="stroke-destructive" strokeWidth="1.5"/>
          <line x1="750" y1="90" x2="750" y2="200" className="stroke-destructive" strokeWidth="1.5" markerEnd="url(#arrowState)"/>
          <text x="770" y="145" className="fill-destructive text-[7px] font-mono">alpha &gt; T</text>

          {/* State: ALERTING */}
          <rect x="680" y="200" width="150" height="80" rx="12" className="fill-destructive/10 stroke-destructive" strokeWidth="2"/>
          <text x="755" y="230" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">ALERTING</text>
          <text x="755" y="245" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Log + SMS + Push</text>
          <text x="755" y="258" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Snapshot capture</text>

          {/* Emergency sub-state */}
          <rect x="700" y="310" width="120" height="50" rx="8" className="fill-destructive/20 stroke-destructive" strokeWidth="1.5" strokeDasharray="4,3"/>
          <text x="760" y="335" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">911 PROMPT</text>
          <text x="760" y="348" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">isEmergency || scream</text>
          <line x1="755" y1="280" x2="760" y2="310" className="stroke-destructive" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowState)"/>

          {/* Transition: cooldown expired */}
          <line x1="680" y1="240" x2="605" y2="130" className="stroke-accent" strokeWidth="1.5" markerEnd="url(#arrowState)"/>
          <text x="620" y="185" className="fill-accent text-[7px] font-mono">cooldown</text>
          <text x="620" y="195" className="fill-accent text-[7px] font-mono">expired</text>

          {/* Transition: stop() from MONITORING */}
          <line x1="530" y1="100" x2="240" y2="195" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#arrowState)"/>
          <text x="380" y="155" className="fill-muted-foreground text-[7px] font-mono">stop()</text>

          {/* Transition: error */}
          <line x1="380" y1="240" x2="240" y2="215" className="stroke-destructive/50" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowState)"/>
          <text x="300" y="240" className="fill-destructive/60 text-[7px] font-mono">error</text>

          {/* State Complexity Labels */}
          <rect x="20" y="330" width="300" height="60" rx="6" className="fill-card stroke-border" strokeWidth="1"/>
          <text x="30" y="348" className="fill-muted-foreground text-[8px] font-mono font-bold">STATE RESOURCE USAGE:</text>
          <text x="30" y="363" className="fill-foreground text-[7px] font-mono">IDLE: ~0 MB | INIT: ~4 MB (model load)</text>
          <text x="30" y="378" className="fill-foreground text-[7px] font-mono">MONITORING: ~5.2 MB | ALERTING: +15 MB (snapshots)</text>

          <defs>
            <marker id="arrowState" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        The State Machine Diagram shows four primary states: IDLE → INIT → MONITORING → ALERTING. 
        MONITORING self-loops on each frame. ALERTING transitions back after cooldown expiry. 
        The 911 PROMPT is a conditional sub-state triggered by emergency wake words or scream detection. 
        Memory usage grows from ~0 MB (IDLE) to ~20.2 MB peak (ALERTING with snapshot buffer).
      </p>
    </div>
  );
}

/* ============================================================
 * 7. CONCEPTUAL FRAMEWORK DIAGRAM
 * Methodological pipeline similar to academic thesis figures
 * ============================================================ */

interface FrameworkStepProps {
  number: number;
  title: string;
  items: string[];
  color: string;
  x: number;
  y: number;
  width?: number;
}

function FrameworkStep({ number, title, items, color, x, y, width = 220 }: FrameworkStepProps) {
  const height = 38 + items.length * 16;
  return (
    <g>
      {/* Box */}
      <rect x={x} y={y} width={width} height={height} rx="8" 
        className="fill-card" stroke={color} strokeWidth="2"/>
      {/* Number circle */}
      <circle cx={x + 20} cy={y - 0} r="14" fill={color} />
      <text x={x + 20} y={y + 5} textAnchor="middle" className="fill-primary-foreground text-[11px] font-mono font-bold">{number}</text>
      {/* Title */}
      <text x={x + 42} y={y + 18} className="text-[10px] font-mono font-bold" fill={color}>{title}</text>
      {/* Separator */}
      <line x1={x + 10} y1={y + 26} x2={x + width - 10} y2={y + 26} stroke={color} strokeWidth="0.5" strokeOpacity="0.4"/>
      {/* Items */}
      {items.map((item, i) => (
        <text key={i} x={x + 16} y={y + 42 + i * 16} className="fill-foreground text-[8px] font-mono">• {item}</text>
      ))}
    </g>
  );
}

function FrameworkArrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isHorizontal = Math.abs(y2 - y1) < 10;
  
  if (isHorizontal) {
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2 - 8} y2={y2} className="stroke-primary" strokeWidth="2.5" strokeLinecap="round"/>
        <polygon points={`${x2},${y2} ${x2 - 10},${y2 - 5} ${x2 - 10},${y2 + 5}`} className="fill-primary"/>
      </g>
    );
  }
  // Vertical with curve
  return (
    <g>
      <path d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - 8}`} className="stroke-primary" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <polygon points={`${x2},${y2} ${x2 - 5},${y2 - 10} ${x2 + 5},${y2 - 10}`} className="fill-primary"/>
    </g>
  );
}

export function ConceptualFrameworkDiagram() {
  const stages = [
    {
      number: 1, title: 'Data Collection',
      items: ['Camera video feed', 'Microphone audio', 'Device sensors', 'User preferences', 'Household settings'],
    },
    {
      number: 2, title: 'Pre-processing',
      items: ['Image resizing', 'Noise filtering', 'Audio normalization', 'Frame alignment', 'Data validation'],
    },
    {
      number: 3, title: 'Feature Extraction',
      items: ['Edge detection', 'Motion analysis', 'Audio energy levels', 'Speech patterns', 'Color analysis'],
    },
    {
      number: 4, title: 'Detection Models',
      items: ['Object recognition', 'Person detection', 'Sound classification', 'Anomaly detection', 'Priority scoring'],
    },
    {
      number: 5, title: 'Multimodal Fusion',
      items: ['Combine visual + audio', 'Weighted scoring', 'Temporal smoothing', 'Context awareness', 'Confidence rating'],
    },
    {
      number: 6, title: 'Decision & Alerting',
      items: ['Severity classification', 'Threshold evaluation', 'Alert generation', 'Emergency detection', 'User notification'],
    },
    {
      number: 7, title: 'Output & Storage',
      items: ['Real-time dashboard', 'Cloud storage', 'Alert history', 'Research export', 'Household sharing'],
    },
  ];

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 7 — Conceptual Framework: Methodological Pipeline
      </p>
      <div className="bg-background rounded-md p-6 border border-border">
        {/* Row 1: Steps 1-4 */}
        <div className="flex flex-wrap justify-center items-start gap-2 mb-4">
          {stages.slice(0, 4).map((stage, i) => (
            <div key={stage.number} className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">
                  {stage.number}
                </div>
              </div>
              <div className="border border-border rounded-lg p-3 w-44 bg-card">
                <p className="text-[11px] font-mono font-bold text-foreground mb-2">{stage.title}</p>
                <ul className="space-y-0.5">
                  {stage.items.map((item, j) => (
                    <li key={j} className="text-[9px] font-mono text-muted-foreground flex items-start gap-1">
                      <span className="text-primary mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              {i < 3 && (
                <div className="flex items-center self-center text-muted-foreground text-lg font-mono">→</div>
              )}
            </div>
          ))}
        </div>

        {/* Arrow down */}
        <div className="flex justify-end pr-20 mb-4">
          <span className="text-muted-foreground text-lg font-mono">↓</span>
        </div>

        {/* Row 2: Steps 5-7 (right to left) */}
        <div className="flex flex-wrap justify-center items-start gap-2">
          {stages.slice(4).reverse().map((stage, i) => (
            <div key={stage.number} className="flex items-start gap-2">
              {i > 0 && (
                <div className="flex items-center self-center text-muted-foreground text-lg font-mono">←</div>
              )}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">
                  {stage.number}
                </div>
              </div>
              <div className="border border-border rounded-lg p-3 w-44 bg-card">
                <p className="text-[11px] font-mono font-bold text-foreground mb-2">{stage.title}</p>
                <ul className="space-y-0.5">
                  {stage.items.map((item, j) => (
                    <li key={j} className="text-[9px] font-mono text-muted-foreground flex items-start gap-1">
                      <span className="text-primary mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback loop */}
        <div className="mt-4 pt-3 border-t border-dashed border-border">
          <p className="text-[9px] font-mono text-muted-foreground text-center italic">
            ↻ Continuous feedback loop — repeats every frame cycle
          </p>
        </div>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        The Conceptual Framework illustrates the complete 7-stage pipeline from data collection through 
        pre-processing, feature extraction, detection, fusion, alerting, and output storage.
      </p>
    </div>
  );
}
