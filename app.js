// שימוש ב-Import ישיר כדי לוודא שאין שגיאות טעינה
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { ARButton } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;

// פונקציית אתחול עם בדיקת שגיאות
async function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    
    // מצלמה עם טווח רחב יותר
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // תאורה חזקה כדי לראות את האלמנטים בחוץ
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // הגדרת ה-Renderer עם הגדרות שקיפות קריטיות ל-AR
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true // עוזר למנוע מסך שחור בחלק מהמכשירים
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // יצירת כפתור ה-AR עם דרישה מפורשת למצלמה (hit-test)
    const arButton = ARButton.createButton(renderer, { 
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.getElementById('ui-overlay') } 
    });
    document.getElementById('ar-controls').appendChild(arButton);

    // יצירת ה-Reticle (העיגול שמוצא רצפה)
    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x39FF14 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // שליטה בחיצים דרך בקר ה-XR
    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', () => {
        if (reticle.visible) {
            spawnArrow(reticle.matrix);
        }
    });
    scene.add(controller);

    window.addEventListener('resize', onWindowResize);
    
    renderer.setAnimationLoop(render);
}

function spawnArrow(matrix) {
    // בניית צורת החץ מהתמונה שלך
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.25);
    shape.lineTo(0.18, 0);
    shape.lineTo(0.08, 0);
    shape.lineTo(0.08, -0.35);
    shape.lineTo(-0.08, -0.35);
    shape.lineTo(-0.08, 0);
    shape.lineTo(-0.18, 0);
    shape.lineTo(0, 0.25);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x39FF14, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8 
    });
    
    const arrow = new THREE.Mesh(geometry, material);
    arrow.position.setFromMatrixPosition(matrix);
    arrow.quaternion.setFromMatrixRotation(matrix);
    arrow.rotateX(-Math.PI / 2);
    
    scene.add(arrow);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((refSpace) => {
                session.requestHitTestSource({ space: refSpace }).then((source) => {
                    hitTestSource = source;
                });
            });
            session.hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
                document.getElementById('status-indicator').innerText = "רצפה זוהתה! לחץ להוספת חץ";
            } else {
                reticle.visible = false;
                document.getElementById('status-indicator').innerText = "סרוק את הרצפה באיטיות...";
            }
        }
    }
    renderer.render(scene, camera);
}

// הפעלה
init().catch(err => {
    console.error("Initialization failed", err);
    document.getElementById('status-indicator').innerText = "שגיאה באתחול המצלמה";
});
